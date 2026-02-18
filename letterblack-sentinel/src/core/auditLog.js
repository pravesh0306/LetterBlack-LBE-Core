// src/core/auditLog.js
// Immutable append-only audit log with hash chaining
// Atomic writes with race condition protection

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { atomicAppendFileSync } from './atomicWrite.js';

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

export function loadAuditLog(logPath) {
    try {
        if (!fs.existsSync(logPath)) {
            return { entries: [] };
        }
        const content = fs.readFileSync(logPath, 'utf8').trim();
        if (!content) return { entries: [] };

        const lines = content.split('\n');
        const entries = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (err) {
                console.warn('Warning: Could not parse audit log line:', line.substring(0, 50));
                return null;
            }
        }).filter(e => e !== null);

        return { entries };
    } catch (err) {
        console.warn(`Warning: Could not load audit log at ${logPath}:`, err.message);
        return { entries: [] };
    }
}

export function getLastHash(logPath) {
    try {
        if (!fs.existsSync(logPath)) return 'GENESIS';

        const content = fs.readFileSync(logPath, 'utf8').trim();
        if (!content) return 'GENESIS';

        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1];

        try {
            const lastEntry = JSON.parse(lastLine);
            return lastEntry.hash || 'GENESIS';
        } catch (err) {
            return 'GENESIS';
        }
    } catch (err) {
        return 'GENESIS';
    }
}

export function appendAudit(logPath, entry) {
    try {
        const dir = path.dirname(logPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const prevHash = getLastHash(logPath);
        const record = {
            ...entry,
            prevHash,
            timestamp: new Date().toISOString()
        };

        // Remove hash field if present, to calculate fresh
        delete record.hash;

        const recordStr = JSON.stringify(record);
        const hash = sha256(recordStr);

        const final = JSON.stringify({ ...record, hash });

        // Atomic append with lock protection
        try {
            atomicAppendFileSync(logPath, final + '\n', { encoding: 'utf8' });
        } catch (err) {
            console.error('Error writing audit log:', err.message);
            throw new Error(`Audit log write failed: ${err.message}`);
        }

        return {
            success: true,
            hash,
            prevHash,
            message: 'Audit entry appended'
        };
    } catch (err) {
        return {
            success: false,
            error: `Failed to append audit log: ${err.message}`
        };
    }
}

export function verifyAuditLogIntegrity(logPath, options = {}) {
    const failFast = options.failFast !== false;
    const maxEntries = Number.isFinite(options.maxEntries) && options.maxEntries > 0
        ? Math.floor(options.maxEntries)
        : null;

    const response = {
        ok: true,
        file: path.resolve(logPath),
        entries: 0,
        valid: true,
        firstInvalidIndex: null,
        reason: null,
        errors: [],
        message: 'Audit log verified'
    };

    try {
        if (!fs.existsSync(logPath)) {
            response.message = 'Audit log file not found (treated as empty)';
            return response;
        }

        const raw = fs.readFileSync(logPath, 'utf8').trim();
        if (!raw) {
            response.message = 'Empty audit log';
            return response;
        }

        const allLines = raw.split('\n');
        const lines = maxEntries ? allLines.slice(0, maxEntries) : allLines;
        response.entries = lines.length;

        let expectedPrevHash = 'GENESIS';

        for (let i = 0; i < lines.length; i++) {
            let entry;
            try {
                entry = JSON.parse(lines[i]);
            } catch {
                const errObj = {
                    index: i,
                    reason: 'INVALID_JSON_LINE',
                    message: `Line ${i} is not valid JSON`
                };
                response.valid = false;
                response.ok = false;
                response.firstInvalidIndex ??= i;
                response.reason ??= errObj.reason;
                response.errors.push(errObj);
                if (failFast) break;
                continue;
            }

            if (entry.prevHash !== expectedPrevHash) {
                const errObj = {
                    index: i,
                    reason: 'PREV_HASH_MISMATCH',
                    message: `Expected prevHash '${expectedPrevHash}', got '${entry.prevHash}'`
                };
                response.valid = false;
                response.ok = false;
                response.firstInvalidIndex ??= i;
                response.reason ??= errObj.reason;
                response.errors.push(errObj);
                if (failFast) break;
            }

            const recordCopy = { ...entry };
            const recordHash = recordCopy.hash;
            delete recordCopy.hash;

            const expectedHash = sha256(JSON.stringify(recordCopy));
            if (recordHash !== expectedHash) {
                const errObj = {
                    index: i,
                    reason: 'HASH_MISMATCH',
                    message: `Expected hash '${expectedHash}', got '${recordHash}'`
                };
                response.valid = false;
                response.ok = false;
                response.firstInvalidIndex ??= i;
                response.reason ??= errObj.reason;
                response.errors.push(errObj);
                if (failFast) break;
            }

            expectedPrevHash = recordHash;
        }

        response.message = response.valid
            ? `Audit log verified: ${response.entries} entries`
            : `Audit log integrity failed at index ${response.firstInvalidIndex}`;

        return response;
    } catch (err) {
        return {
            ok: false,
            file: path.resolve(logPath),
            entries: 0,
            valid: false,
            firstInvalidIndex: null,
            reason: 'AUDIT_VERIFY_ERROR',
            errors: [{ index: null, reason: 'AUDIT_VERIFY_ERROR', message: err.message }],
            message: `Integrity check failed: ${err.message}`
        };
    }
}
