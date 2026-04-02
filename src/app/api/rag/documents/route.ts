import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import OpenAI from "openai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (dataBuffer: Buffer, options?: object) => Promise<{ text: string; numpages: number }> = require("pdf-parse");
import { v4 as uuidv4 } from "uuid";

// Configure Cloudflare R2 Client (AWS S3 Compatible)
// Strip any accidental quotes from env vars (common Render dashboard mistake)
const R2_ACCOUNT_ID = (process.env.CLOUDFLARE_R2_ACCOUNT_ID || '').replace(/"/g, '').trim();
const R2_ACCESS_KEY = (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').replace(/"/g, '').trim();
const R2_SECRET_KEY = (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').replace(/"/g, '').trim();

const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
    },
});

// OpenAI client — lazy initialized inside POST to avoid build-time env errors
function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const documents = await prisma.knowledgeDocument.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { chunks: true }
                }
            }
        });

        const mappedDocs = documents.map(doc => ({
            id: doc.id,
            name: doc.name,
            isActive: doc.isActive,
            useInCall1: doc.useInCall1,
            useInCall2: doc.useInCall2,
            chunkCount: doc._count.chunks,
            createdAt: doc.createdAt
        }));

        return NextResponse.json(mappedDocs);
    } catch (e) {
        console.error("[API] Error fetching documents:", e);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    let documentId: string = '';

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const useInCall1 = formData.get('useInCall1') === 'true';
        const useInCall2 = formData.get('useInCall2') === 'true';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 1. Upload Original File to Cloudflare R2
        const fileKey = `rag/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
        await r2Client.send(new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
            Key: fileKey,
            Body: buffer,
            ContentType: file.type || 'application/pdf',
        }));

        // 2. Extract Text from PDF
        console.log(`[RAG] Extracting text from: ${file.name}`);
        const pdfData = await pdfParse(buffer);
        let extractedText = pdfData.text || '';
        if (extractedText.trim().length === 0) {
            return NextResponse.json({ error: 'Failed to extract text from PDF (might be image-based or scanned)' }, { status: 400 });
        }
        console.log(`[RAG] Extracted ${extractedText.length} chars from ${pdfData.numpages} pages`);

        // 3. Save Document to DB
        documentId = uuidv4();
        await prisma.knowledgeDocument.create({
            data: {
                id: documentId,
                name: file.name,
                r2Url: fileKey,
                extractedText: extractedText.substring(0, 100000),
                isActive: true,
                useInCall1,
                useInCall2
            }
        });

        // 4. Chunk the text (1000 words per chunk, 200-word overlap)
        const CHUNK_SIZE = 1000;
        const CHUNK_OVERLAP = 200;
        const textWords = extractedText.split(/\s+/);
        const chunks: string[] = [];

        for (let i = 0; i < textWords.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
            const chunk = textWords.slice(i, i + CHUNK_SIZE).join(" ");
            if (chunk.trim().length > 10) {
                chunks.push(chunk.trim());
            }
        }
        console.log(`[RAG] Created ${chunks.length} chunks`);

        // 5. Generate OpenAI Embeddings (text-embedding-3-small = 1536 dims) & Save
        const openai = getOpenAI();
        // Batch for efficiency
        const BATCH_SIZE = 20;
        let savedChunks = 0;

        for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
            const batch = chunks.slice(b, b + BATCH_SIZE);

            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: batch,
                encoding_format: "float",
            });

            for (let i = 0; i < batch.length; i++) {
                const embeddingArray = embeddingResponse.data[i].embedding; // 1536 floats
                const chunkId = uuidv4();
                const formatVectorStr = `[${embeddingArray.join(',')}]`;

                await prisma.$executeRaw`
                    INSERT INTO "KnowledgeChunk" (id, "documentId", content, embedding, "createdAt")
                    VALUES (${chunkId}, ${documentId}, ${batch[i]}, ${formatVectorStr}::vector, NOW())
                `;
                savedChunks++;
            }

            console.log(`[RAG] Embedded batch ${Math.ceil((b + BATCH_SIZE) / BATCH_SIZE)}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
        }

        return NextResponse.json({
            success: true,
            message: `Document processed: ${savedChunks} chunks embedded via OpenAI text-embedding-3-small.`
        });

    } catch (error: any) {
        console.error('[RAG] Upload pipeline error:', error);

        // Rollback orphan document if created
        if (documentId) {
            try {
                await prisma.knowledgeDocument.delete({ where: { id: documentId } });
            } catch { /* ignore rollback errors */ }
        }

        return NextResponse.json({ error: error.message || 'Failed to process document' }, { status: 500 });
    }
}
