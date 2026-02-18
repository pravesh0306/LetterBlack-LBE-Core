// src/core/executionReceipt.js
// Signed execution receipts for non-repudiation

import { signEd25519, verifyEd25519 } from './signature.js';
import crypto from 'crypto';

/**
 * Generate a signed execution receipt
 * 
 * Provides cryptographic proof that:
 * - A specific command was executed
 * - At a specific time
 * - With a specific result
 * - By this controller instance
 */
export function generateReceipt({ commandId, requesterId, status, output, exitCode, riskLevel, timestamp }, secretKeyB64) {
    const receipt = {
        receiptId: crypto.randomUUID(),
        commandId,
        requesterId,
        executionResult: {
            status,
            exitCode,
            outputHash: crypto.createHash('sha256').update(output || '').digest('hex'),
            outputLength: (output || '').length
        },
        riskLevel,
        timestamp: timestamp || new Date().toISOString(),
        controllerVersion: '0.1.0',
        signature: {
            alg: 'ed25519',
            keyId: 'controller',
            sig: '' // Will be filled
        }
    };

    // Sign the receipt
    const receiptForSigning = { ...receipt };
    delete receiptForSigning.signature;
    const signResult = signEd25519({
        payloadObj: receiptForSigning,
        secretKeyB64
    });

    if (signResult.error) {
        throw new Error(`Receipt signing failed: ${signResult.error}`);
    }

    receipt.signature.sig = signResult.signature;

    return receipt;
}

/**
 * Verify an execution receipt
 */
export function verifyReceipt(receipt, pubKeyB64) {
    const { signature, ...receiptWithoutSig } = receipt;

    return verifyEd25519({
        payloadObj: receiptWithoutSig,
        sigB64: signature.sig,
        pubKeyB64
    });
}

/**
 * Generate a minimal receipt (for bandwidth optimization)
 */
export function generateMinimalReceipt({ commandId, status, exitCode, timestamp }, secretKeyB64) {
    const receipt = {
        id: commandId,
        s: status,
        c: exitCode,
        t: timestamp || Date.now(),
        sig: ''
    };

    const forSigning = { ...receipt };
    delete forSigning.sig;
    const signResult = signEd25519({
        payloadObj: forSigning,
        secretKeyB64
    });

    if (signResult.error) {
        throw new Error(`Minimal receipt signing failed: ${signResult.error}`);
    }

    receipt.sig = signResult.signature;

    return receipt;
}
