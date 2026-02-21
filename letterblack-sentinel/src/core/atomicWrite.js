// src/core/atomicWrite.js
// Atomic file writing (write to temp → rename)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function atomicWriteFileSync(filePath, data, options = {}) {
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Create temp file in same directory (required for atomic rename)
    const tempFile = path.join(dir, `.tmp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);

    try {
        // Write to temp file
        fs.writeFileSync(tempFile, data, options);

        // Atomic rename (POSIX atomic operation)
        fs.renameSync(tempFile, filePath);
    } catch (error) {
        // Clean up temp file on error
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        throw error;
    }
}

export function atomicAppendFileSync(filePath, data, options = {}) {
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // For append operations, we need to read existing content first
    let existingContent = '';
    if (fs.existsSync(filePath)) {
        existingContent = fs.readFileSync(filePath, options.encoding || 'utf8');
    }

    // Combine existing + new data
    const combinedData = existingContent + data;

    // Write atomically
    atomicWriteFileSync(filePath, combinedData, options);
}

/**
 * Atomically write JSON data
 */
export async function atomicWriteJSON(filePath, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    atomicWriteFileSync(filePath, jsonStr, { encoding: 'utf8' });
}

/**
 * Safely read JSON file (returns null on error)
 */
export function readJSONSafe(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error(`[atomicWrite] Failed to read JSON from ${filePath}:`, e.message);
        return null;
    }
}
