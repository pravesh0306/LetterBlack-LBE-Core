// src/core/validator.js
// Main validation orchestrator

import { COMMAND_SCHEMA, validateSchema } from './schema.js';
import { verifyEd25519 } from './signature.js';
import { checkAndRecordNonce } from './nonceStore.js';
import { evaluatePolicy, riskLevel } from './policyEngine.js';
import { isValidKeyId, resolveTrustedPublicKey } from './trustedKeys.js';

export function validateCommand({
    commandObj,
    pubKeyB64,
    keyStore,
    nonceDb,
    policy,
    rateLimiter
}) {
    const result = {
        valid: false,
        commandId: commandObj?.commandId,
        checks: {},
        errors: []
    };

    // 1. Schema validation
    const schemaCheck = validateSchema(commandObj, COMMAND_SCHEMA);
    result.checks.schema = schemaCheck.valid;
    if (!schemaCheck.valid) {
        result.errors.push(...schemaCheck.errors.map(e => ({ type: 'SCHEMA_ERROR', message: e })));
        return result;
    }

    // 2. Key metadata validation
    const signatureKeyId = commandObj.signature?.keyId;
    result.checks.keyId = isValidKeyId(signatureKeyId);
    if (!result.checks.keyId) {
        result.errors.push({
            type: 'KEY_ID_INVALID',
            message: `Invalid keyId '${signatureKeyId}'. Use versioned IDs like 'agent:gpt-v1-2026Q1'`
        });
        return result;
    }

    // 3. Timestamp skew protection
    const nowSec = Math.floor(Date.now() / 1000);
    const maxClockSkewSec = Number.isFinite(policy?.security?.maxClockSkewSec)
        ? policy.security.maxClockSkewSec
        : 600;
    const skewSec = Math.abs(nowSec - commandObj.timestamp);
    result.checks.timestamp = skewSec <= maxClockSkewSec;
    if (!result.checks.timestamp) {
        result.errors.push({
            type: 'TIMESTAMP_SKEW_EXCEEDED',
            message: `Command timestamp skew ${skewSec}s exceeds allowed ${maxClockSkewSec}s`
        });
        return result;
    }

    // 4. Signature verification
    let effectivePubKey = null;
    if (keyStore) {
        const keyResolution = resolveTrustedPublicKey({
            keyStore,
            keyId: signatureKeyId,
            requesterId: commandObj.requesterId
        });
        if (!keyResolution.ok) {
            result.checks.signature = false;
            result.errors.push({
                type: keyResolution.reason,
                message: keyResolution.message
            });
            return result;
        }
        effectivePubKey = keyResolution.publicKey;
    }
    if (!effectivePubKey && pubKeyB64) {
        effectivePubKey = pubKeyB64;
    }

    if (!effectivePubKey) {
        result.checks.signature = false;
        result.errors.push({
            type: 'SIGNATURE_KEY_UNAVAILABLE',
            message: 'No public key available. Provide --pub-key/--pub-key-file or config/keys.json'
        });
        return result;
    }

    const commandWithoutSignature = { ...commandObj };
    delete commandWithoutSignature.signature;
    const signatureCheck = verifyEd25519({
        payloadObj: commandWithoutSignature,
        sigB64: commandObj.signature.sig,
        pubKeyB64: effectivePubKey
    });
    result.checks.signature = signatureCheck.valid;
    if (!signatureCheck.valid) {
        result.errors.push({
            type: 'SIGNATURE_INVALID',
            message: signatureCheck.message
        });
        return result;
    }

    // 5. Requester rate limiting
    if (rateLimiter && typeof rateLimiter.checkAndRecord === 'function') {
        const rateCfg = policy?.requesters?.[commandObj.requesterId]?.rateLimit || {};
        const defaultRateCfg = policy?.security?.defaultRateLimit || {};
        const rateCheck = rateLimiter.checkAndRecord({
            requesterId: commandObj.requesterId,
            nowSec,
            windowSec: rateCfg.windowSec ?? defaultRateCfg.windowSec ?? 60,
            maxRequests: rateCfg.maxRequests ?? defaultRateCfg.maxRequests ?? 30
        });
        result.checks.rateLimit = rateCheck.ok;
        if (!rateCheck.ok) {
            result.errors.push({
                type: rateCheck.reason,
                message: `${rateCheck.message}. Retry after ${rateCheck.retryAfterSec}s`
            });
            return result;
        }
    }

    // 6. Nonce replay check
    let nonceCheck;
    if (nonceDb && typeof nonceDb.checkAndRecord === 'function') {
        // NonceStore instance
        nonceCheck = nonceDb.checkAndRecord({
            requesterId: commandObj.requesterId,
            sessionId: commandObj.sessionId,
            nonce: commandObj.nonce
        });
    } else {
        // Plain object
        nonceCheck = checkAndRecordNonce(nonceDb, {
            requesterId: commandObj.requesterId,
            sessionId: commandObj.sessionId,
            nonce: commandObj.nonce,
            timestamp: commandObj.timestamp
        });
    }
    result.checks.nonce = nonceCheck.ok;
    if (!nonceCheck.ok) {
        result.errors.push({
            type: nonceCheck.reason,
            message: nonceCheck.message
        });
        return result;
    }

    // 7. Policy enforcement
    const policyCheck = evaluatePolicy(policy, commandObj);
    result.checks.policy = policyCheck.allowed;
    result.risk = riskLevel(commandObj);
    if (!policyCheck.allowed) {
        result.errors.push({
            type: policyCheck.reason,
            message: policyCheck.message
        });
        return result;
    }

    // All checks passed
    result.valid = true;
    result.message = 'Command validation successful';

    return result;
}

export function makeValidationReport(validation) {
    return {
        success: validation.valid,
        commandId: validation.commandId,
        checks: validation.checks,
        risk: validation.risk,
        errors: validation.errors,
        timestamp: new Date().toISOString()
    };
}
