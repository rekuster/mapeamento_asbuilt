import fs from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getDb, ifcFiles } from './db';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ifc');

// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating upload directory:', error);
    }
}

/**
 * Handle IFC file upload
 */
export async function handleIfcUpload(
    fileBuffer: Buffer,
    fileName: string,
    edificacao: string | null,
    uploadedBy: number = 1
): Promise<{
    success: boolean;
    fileId: number;
    filePath: string;
}> {
    try {
        await ensureUploadDir();

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
        const filePath = path.join(UPLOAD_DIR, uniqueFileName);

        // Save file to disk
        await fs.writeFile(filePath, fileBuffer);

        // Save to database
        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        const insertData: any = { // Changed from InsertIfcFile to any as per instruction
            fileName: sanitizedFileName,
            filePath: `/uploads/ifc/${uniqueFileName}`,
            edificacao: edificacao || null,
            uploadedBy,
            fileSize: fileBuffer.length,
        };

        const result = await db.insert(ifcFiles).values(insertData).returning({ id: ifcFiles.id });
        const fileId = result[0].id;

        return {
            success: true,
            fileId,
            filePath: `/uploads/ifc/${uniqueFileName}`,
        };
    } catch (error) {
        console.error('Error handling IFC upload:', error);
        throw error;
    }
}

/**
 * Delete IFC file
 */
export async function deleteIfcFile(fileId: number): Promise<boolean> {
    try {
        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        // Get file info
        const fileResult = await db.select().from(ifcFiles).where(eq(ifcFiles.id, fileId)).limit(1);
        if (fileResult.length === 0) {
            throw new Error('File not found');
        }

        const file = fileResult[0];
        // Remove leading slash if present to join correctly with process.cwd()
        const relativePath = file.filePath.startsWith('/') ? file.filePath.substring(1) : file.filePath;
        const fullPath = path.join(process.cwd(), relativePath);

        // Delete from disk
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            console.warn('Error deleting file from disk:', error);
        }

        // Delete from database
        await db.delete(ifcFiles).where(eq(ifcFiles.id, fileId));

        return true;
    } catch (error) {
        console.error('Error deleting IFC file:', error);
        throw error;
    }
}
