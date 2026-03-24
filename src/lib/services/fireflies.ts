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
 * Fetch ALL transcripts from Fireflies using cursor-based pagination.
 * The API returns up to `limit` per page; we keep fetching until we get
 * fewer results than the page size, indicating we've reached the end.
 */
export async function fetchTranscripts(limit = 50): Promise<FirefliesTranscript[]> {
    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) throw new Error('FIREFLIES_API_KEY is not set');

    console.log(`[Fireflies] Fetching all transcripts (page size: ${limit})...`);

    const allTranscripts: FirefliesTranscript[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
        const query = `
            query {
                transcripts(limit: ${limit}, skip: ${skip}) {
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

        try {
            const response = await fetch(FIREFLIES_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Fireflies] HTTP Error ${response.status}:`, errorText);
                throw new Error(`Fireflies HTTP Error: ${response.status}`);
            }

            const result = await response.json();

            if (result.errors) {
                console.error("[Fireflies] GraphQL Errors:", JSON.stringify(result.errors, null, 2));
                throw new Error(`Fireflies GraphQL error: ${result.errors[0].message}`);
            }

            const page = result.data?.transcripts || [];
            allTranscripts.push(...page);

            console.log(`[Fireflies] Page ${Math.floor(skip / limit) + 1}: fetched ${page.length} transcripts (total so far: ${allTranscripts.length})`);

            if (page.length < limit) {
                hasMore = false; // Last page
            } else {
                skip += limit;
            }
        } catch (err: any) {
            console.error("[Fireflies] Fetch failed:", err.message);
            throw err;
        }
    }

    console.log(`[Fireflies] ✅ Total transcripts fetched: ${allTranscripts.length}`);
    return allTranscripts;
}

export async function getTranscriptDetails(transcriptId: string): Promise<FirefliesTranscript> {
    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) throw new Error('FIREFLIES_API_KEY is not set');

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
