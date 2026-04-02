import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenerativeAI } from "@google/generative-ai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse");
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

// Load Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = ai.getGenerativeModel({ model: "text-embedding-004" });

// Increase max payload size limit to handle PDF payloads
export const maxDuration = 120; // 2 minutes max
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

        const r2Url = `https://pub-${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.dev/${fileKey}`; // We'll save relative path or public if enabled

        // 2. Extract Text from PDF using pdf-parse natively
        const pdfData = await pdfParse(buffer);
        let extractedText = pdfData.text || '';
        if (extractedText.trim().length === 0) {
            return NextResponse.json({ error: 'Failed to extract text from PDF (might be image-based)' }, { status: 400 });
        }

        // 3. Save Document Base to DB
        documentId = uuidv4();
        await prisma.knowledgeDocument.create({
            data: {
                id: documentId,
                name: file.name,
                r2Url: fileKey,
                extractedText: extractedText.substring(0, 100000), // Safety cap the raw column
                isActive: true,
                useInCall1,
                useInCall2
            }
        });

        // 4. Chunking Logic (Recursive strict word approx length)
        const CHUNK_SIZE = 1000;
        const CHUNK_OVERLAP = 200;
        const textWords = extractedText.split(/\s+/);
        const chunks: string[] = [];

        for (let i = 0; i < textWords.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
            const chunk = textWords.slice(i, i + CHUNK_SIZE).join(" ");
            if (chunk.trim().length > 10) { // Don't embed tiny chunks
                chunks.push(chunk.trim());
            }
        }

        // 5. Generate Embeddings & Save Chunks iteratively
        for (const chunk of chunks) {
            const result = await embeddingModel.embedContent(chunk);
            const embeddingArray = result.embedding.values; // Expected Array(768)

            // Since Prisma natively handles unsupported pgvector fields via raw queries:
            const chunkId = uuidv4();
            
            // Format array to pgvector string format: '[0.1, 0.2, ...]'
            const formatVectorStr = `[${embeddingArray.join(',')}]`;

            await prisma.$executeRaw`
                INSERT INTO "KnowledgeChunk" (id, "documentId", content, embedding, "createdAt")
                VALUES (${chunkId}, ${documentId}, ${chunk}, ${formatVectorStr}::vector, NOW())
            `;
        }

        return NextResponse.json({ success: true, message: `Vectorized ${chunks.length} chunks.` });

    } catch (error: any) {
        console.error('[RAG] Upload pipeline error:', error);
        
        // Rolling back orphan document
        if (documentId) {
             try {
                 await prisma.knowledgeDocument.delete({ where: { id: documentId } });
             } catch {}
        }

        return NextResponse.json({ error: error.message || 'Failed to process RAG payload' }, { status: 500 });
    }
}
