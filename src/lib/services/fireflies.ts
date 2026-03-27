export interface FirefliesTranscript {
    id: string;
    title: string;
    date: number;
    duration: number;
    organizer_email: string;
    host_email: string;
    transcript_url: string;
    participants: string[];
    sentences: Array<{
        index: number;
        speaker_name: string;
        text: string;
        start_time: number;
        end_time: number;
    }>;
}

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

/**
 * Fetch transcripts from Fireflies.
 * First attempts a high-limit single call.
 * If the API caps results, tries pagination with skip.
 * If skip isn't supported, returns what we got from the first call.
 */
export async function fetchTranscripts(limit = 50): Promise<FirefliesTranscript[]> {
    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) throw new Error('FIREFLIES_API_KEY is not set');

    console.log(`[Fireflies] Fetching transcripts...`);

    // First call — no skip, just limit
    const firstPage = await fetchPage(apiKey, limit);
    console.log(`[Fireflies] First page: ${firstPage.length} transcripts`);

    // If we got fewer than limit, we have everything
    if (firstPage.length < limit) {
        console.log(`[Fireflies] ✅ All ${firstPage.length} transcripts fetched (single page)`);
        return firstPage;
    }

    // We hit the limit — try to paginate with skip
    const allTranscripts = [...firstPage];
    let skip = limit;

    while (true) {
        try {
            const page = await fetchPageWithSkip(apiKey, limit, skip);
            console.log(`[Fireflies] Page at skip=${skip}: ${page.length} transcripts`);
            allTranscripts.push(...page);

            if (page.length < limit) break; // Last page
            skip += limit;
        } catch (err: any) {
            // Skip might not be supported — return what we have
            console.warn(`[Fireflies] Pagination with skip=${skip} failed: ${err.message}. Returning ${allTranscripts.length} transcripts.`);
            break;
        }
    }

    console.log(`[Fireflies] ✅ Total transcripts fetched: ${allTranscripts.length}`);
    return allTranscripts;
}

/** Simple fetch without skip — guaranteed to work */
async function fetchPage(apiKey: string, limit: number): Promise<FirefliesTranscript[]> {
    const query = `
        query Transcripts($limit: Int) {
            transcripts(limit: $limit) {
                id
                title
                date
                duration
                host_email
                organizer_email
                transcript_url
                participants
            }
        }
    `;

    const response = await fetch(FIREFLIES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, variables: { limit } }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fireflies HTTP Error: ${response.status} — ${errorText}`);
    }

    const result = await response.json();
    if (result.errors) {
        throw new Error(`Fireflies GraphQL error: ${result.errors[0].message}`);
    }

    return result.data?.transcripts || [];
}

/** Fetch with skip for pagination — may not be supported on all API plans */
async function fetchPageWithSkip(apiKey: string, limit: number, skip: number): Promise<FirefliesTranscript[]> {
    const query = `
        query Transcripts($limit: Int, $skip: Int) {
            transcripts(limit: $limit, skip: $skip) {
                id
                title
                date
                duration
                host_email
                organizer_email
                transcript_url
                participants
            }
        }
    `;

    const response = await fetch(FIREFLIES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, variables: { limit, skip } }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }

    return result.data?.transcripts || [];
}

export async function getTranscriptDetails(transcriptId: string): Promise<FirefliesTranscript> {
    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) throw new Error('FIREFLIES_API_KEY is not set');

    // Use inline id since transcript() expects a direct String argument
    const query = `
        query {
            transcript(id: "${transcriptId}") {
                id
                title
                date
                duration
                host_email
                organizer_email
                transcript_url
                participants
                sentences {
                    index
                    speaker_name
                    text
                    start_time
                    end_time
                }
            }
        }
    `;

    const response = await fetch(FIREFLIES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query }),
    });

    const result = await response.json();
    if (result.errors) {
        throw new Error(`Fireflies API error: ${JSON.stringify(result.errors)}`);
    }

    return result.data.transcript;
}

export function formatTranscript(transcript: FirefliesTranscript): string {
    if (!transcript || !transcript.sentences) {
        console.warn("[Fireflies] No sentences found in transcript object");
        return "Transcript content is not yet available from Fireflies.";
    }
    return transcript.sentences
        .map(s => {
            const minutes = Math.floor(s.start_time / 60);
            const seconds = Math.floor(s.start_time % 60).toString().padStart(2, '0');
            return `[${minutes}:${seconds}] ${s.speaker_name || 'Unknown'}: ${s.text}`;
        })
        .join('\n');
}
