import { Call, CallType, Analysis } from "@/types";
import { getPromptSettings } from "./promptSettings";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

/**
 * Determine which provider a model belongs to based on its prefix
 */
function getProvider(model: string): 'gemini' | 'claude' | 'openai' {
    if (model.startsWith('claude-')) return 'claude';
    if (model.startsWith('gpt-')) return 'openai';
    return 'gemini';
}

export async function analyzeSalesCall(
    transcript: string,
    metadata: Partial<Call>,
    callType: CallType
): Promise<Partial<Analysis>> {

    // 0. Fetch the dynamic model selection from Prisma Settings
    let selectedModel = DEFAULT_MODEL;
    try {
        const settingObj = await prisma.setting.findUnique({ where: { key: "fireflies_pipeline" } });
        const settings = (settingObj?.value as any) || {};
        if (settings.aiModel) {
            selectedModel = settings.aiModel;
        }
    } catch (err) {
        console.warn('Could not fetch dynamic model from settings. Using default.', err);
    }

    const provider = getProvider(selectedModel);

    // Validate API key for selected provider
    if (provider === 'gemini' && !GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
    if (provider === 'claude' && !ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set. Add it in Render Environment Variables.");
    if (provider === 'openai' && !OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set. Add it in Render Environment Variables.");

    // 1. Fetch relevant reference docs from PostgreSQL
    const callField = callType === 'evaluation' ? 'useInCall1' : 'useInCall2';
    
    const docs = await prisma.knowledgeDocument.findMany({
        where: {
            isActive: true,
            [callField]: true
        }
    });

    const selectedDocNames: string[] = [];
    const contextRubrics: string[] = [];

    docs.forEach(d => {
        if (d.extractedText) {
            selectedDocNames.push(d.name);
            contextRubrics.push(`--- DOCUMENT: ${d.name} ---\n${d.extractedText}\n`);
        }
    });

    // 2. Fetch specific instructions (Prompts) 
    const promptSettings = await getPromptSettings();
    const systemPrompt = callType === 'evaluation'
        ? promptSettings.call1Prompt
        : promptSettings.call2Prompt;

    const callTypeLabel = callType === 'evaluation' ? 'CALL 1 (Business Evaluation)' : 'CALL 2 (Follow-Up)';

    const userPromptContent = `
        # ANALYSIS TYPE: ${callTypeLabel}
        You are analyzing a ${callTypeLabel} transcript. Apply ONLY the ${callTypeLabel} scoring framework.

        # REFERENCE DOCUMENTS / RUBRICS ATTACHED (${selectedDocNames.length} documents)
        The following frameworks have been provided as context text. You MUST strictly reference these documents and use them as your primary scoring rubric:
        ${selectedDocNames.map((name, i) => `${i + 1}. "${name}"`).join('\n        ')}

        ${contextRubrics.length > 0 ? contextRubrics.join("\n") : '⚠️ WARNING: No reference documents were provided for this call type. Score using the system prompt instructions only.'}

        # CALL INFORMATION
        **Call Type:** ${callTypeLabel}
        **Call ID:** ${metadata.id}
        **Call Title:** ${metadata.title}
        **Date:** ${metadata.date ? new Date((metadata.date as any).toDate ? (metadata.date as any).toDate() : metadata.date as any).toLocaleDateString() : 'Unknown'}
        **Sales Rep:** ${metadata.repName || 'Unknown'} (${metadata.repEmail || 'Unknown'})
        **Prospect:** ${metadata.prospectName || 'Unknown'}

        ---
        # FULL TRANSCRIPT
        ${transcript}
    `;

    const fullPrompt = systemPrompt + "\n\n" + userPromptContent;

    console.log(`[AI/${provider}] Starting ${callTypeLabel} analysis for "${metadata.title}" using ${selectedModel}...`);
    console.log(`[AI/${provider}] Injected ${docs.length} native Postgres documents as text rubric context: ${selectedDocNames.join(', ') || '(none)'}`);

    let responseText: string;

    // ─── Route to the appropriate provider ───
    if (provider === 'claude') {
        responseText = await callClaude(selectedModel, systemPrompt, userPromptContent);
    } else if (provider === 'openai') {
        responseText = await callOpenAI(selectedModel, systemPrompt, userPromptContent);
    } else {
        responseText = await callGemini(selectedModel, fullPrompt);
    }

    // ─── Parse the JSON response ───
    try {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || [null, responseText];
        const cleanedJson = jsonMatch[1]!.trim();
        const analysisData = JSON.parse(cleanedJson);

        return {
            ...analysisData,
            callId: metadata.id,
            repEmail: metadata.repEmail,
            analyzedAt: new Date(),
            callType
        };
    } catch (error) {
        console.error(`Failed to parse ${provider} response:`, responseText, error);
        throw new Error(`Analysis failed: Invalid JSON format from ${provider} AI (${selectedModel})`);
    }
}

// ════════════════════════════════════════════════════════════════
// Provider-specific API calls
// ════════════════════════════════════════════════════════════════

async function callGemini(model: string, fullPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        })
    });

    const result = await response.json();
    if (result.error) throw new Error(`Gemini API error: ${result.error.message}`);

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini");
    return text;
}

async function callClaude(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 8192,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
        })
    });

    const result = await response.json();
    if (result.error) throw new Error(`Claude API error: ${result.error.message}`);

    const text = result.content?.[0]?.text;
    if (!text) throw new Error("Empty response from Claude");
    return text;
}

async function callOpenAI(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 8192
        })
    });

    const result = await response.json();
    if (result.error) throw new Error(`OpenAI API error: ${result.error.message}`);

    const text = result.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");
    return text;
}
