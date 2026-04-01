import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Next 15 Dynamic Route Promise structure handling

        const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
        if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

        // Try Delete from R2
        if (doc.r2Url) {
            try {
                await r2Client.send(new DeleteObjectCommand({
                    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
                    Key: doc.r2Url,
                }));
            } catch (err) {
                console.error("[RAG] Failed to delete from R2 (Continuing to remove DB record):", err);
            }
        }

        // Deleting doc cascade-deletes KnowledgeChunk records from SQL due to onDelete:Cascade in schema
        await prisma.knowledgeDocument.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[API] Error deleting RAG document:", e);
        return NextResponse.json({ error: e.message || "Failed to delete" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const doc = await prisma.knowledgeDocument.update({
            where: { id },
            data: {
                isActive: body.isActive,
                useInCall1: body.useInCall1,
                useInCall2: body.useInCall2,
            }
        });

        return NextResponse.json(doc);
    } catch (e: any) {
        console.error("[API] Error updating RAG document:", e);
        return NextResponse.json({ error: e.message || "Failed to update" }, { status: 500 });
    }
}
