// src/cli/commands/run.js
// Validate and execute a proposal

import fs from 'fs';
import path from 'path';
import { validateCommand } from '../../core/validator.js';
import { NonceStore } from '../../core/nonceStore.js';
import { executeAdapter } from '../../adapters/index.js';
import { appendAudit } from '../../core/auditLog.js';
import { loadKeysStore } from '../../core/trustedKeys.js';
import { RequestRateLimiter } from '../../core/requestRateLimiter.js';
import { verifyPolicySignature } from '../../core/policySignature.js';
import { validateAndUpdatePolicyVersionState } from '../../core/policyVersionGuard.js';

export async function runCommand(opts) {
    const { in: inFile } = opts;
    const config = opts.config || opts.policy;
    const pubKey = opts['pub-key'];
    const keysStorePath = opts['keys-store'] || path.resolve('config/keys.json');
    const policySigPath = opts['policy-sig'] || path.resolve('config/policy.sig.json');
    const policyStatePath = opts['policy-state'] || path.resolve('data/policy.state.json');
    const allowUnsignedPolicy = opts['policy-unsigned-ok'] === true || String(opts['policy-unsigned-ok']).toLowerCase() === 'true';
    // Validate required arguments
    if (!inFile) {
        console.error('Error: --in <file> is required');
        process.exit(1);
    }

    // Read proposal file
    let proposal;
    try {
        const filePath = path.resolve(inFile);
        const content = fs.readFileSync(filePath, 'utf-8');
        proposal = JSON.parse(content);
    } catch (error) {
        console.error(JSON.stringify({
            status: 'error',
            error: 'INVALID_PROPOSAL_FILE',
            message: error.message
        }));
        process.exit(5);
    }

    // Load policy
    let policy;
    try {
        const policyPath = config || path.resolve('config/policy.default.json');
        if (!fs.existsSync(policyPath)) {
            console.error(JSON.stringify({
                status: 'error',
                error: 'MISSING_POLICY',
                message: `Policy file not found: ${policyPath}`
            }));
            process.exit(1);
        }
        const policyContent = fs.readFileSync(policyPath, 'utf-8');
        policy = JSON.parse(policyContent);
    } catch (error) {
        console.error(JSON.stringify({
            status: 'error',
            error: 'INVALID_POLICY',
            message: error.message
        }));
        process.exit(1);
    }

    // Load key store (preferred) with legacy pub-key fallback
    const keyStoreResult = loadKeysStore(keysStorePath);
    const keyStore = keyStoreResult.ok ? keyStoreResult.store : null;

    // Preflight: policy signature verification (strict by default)
    const policySigCheck = verifyPolicySignature({
        policyObj: policy,
        keyStore,
        policySigPath,
        allowUnsigned: allowUnsignedPolicy
    });
    if (!policySigCheck.ok) {
        console.error(JSON.stringify({
            status: 'error',
            error: policySigCheck.reason,
            message: policySigCheck.message
        }, null, 2));
        process.exit(8);
    }

    const versionCheck = validateAndUpdatePolicyVersionState({
        policyObj: policy,
        statePath: policyStatePath,
        maxCreatedAtSkewSec: policy?.security?.maxPolicyCreatedAtSkewSec
    });
    if (!versionCheck.ok) {
        console.error(JSON.stringify({
            status: 'error',
            error: versionCheck.reason,
            message: versionCheck.message
        }, null, 2));
        process.exit(8);
    }

    // Load nonce store
    const nonceDb = new NonceStore(path.resolve('data/nonce.db.json'));
    await nonceDb.load();

    if (!keyStore && !pubKey) {
        console.error(JSON.stringify({
            status: 'error',
            error: 'MISSING_KEY_MATERIAL',
            message: `${keyStoreResult.message}. Provide --pub-key/--pub-key-file or create config/keys.json`
        }));
        process.exit(1);
    }

    // Load requester rate limiter
    const rateLimiter = new RequestRateLimiter(path.resolve('data/rate-limit.db.json'));
    await rateLimiter.load();

    // Validate command
    const validateResult = validateCommand({
        commandObj: proposal,
        pubKeyB64: pubKey,
        keyStore,
        nonceDb,
        policy,
        rateLimiter
    });

    if (!validateResult.valid) {
        // Persist state from checks that may record entries prior to rejection.
        try {
            await nonceDb.save();
            await rateLimiter.save();
        } catch {
            // Continue with rejection path even if state persistence fails.
        }

        const output = {
            status: 'invalid',
            commandId: proposal.commandId || 'N/A',
            checks: validateResult.checks,
            errors: validateResult.errors || [],
            executionResult: null
        };
        console.error(JSON.stringify(output, null, 2));

        // Load audit log and append this rejection
        const auditPath = path.resolve('data/audit.log.jsonl');
        appendAudit(auditPath, {
            commandId: proposal.commandId || 'N/A',
            status: 'rejected',
            requesterId: proposal.requesterId || 'unknown',
            reason: validateResult.checks,
            timestamp: new Date().toISOString()
        });

        if (validateResult.checks.schema === false) process.exit(5);
        if (validateResult.checks.signature === false) process.exit(3);
        if (validateResult.checks.nonce === false) process.exit(4);
        if (validateResult.checks.timestamp === false) process.exit(6);
        if (validateResult.checks.rateLimit === false) process.exit(7);
        if (validateResult.checks.policy === false) process.exit(2);
        process.exit(9);
    }

    // Execute with appropriate adapter
    let executionResult;
    try {
        const adapterName = proposal.payload.adapter || 'shell';
        const requesterPolicy = policy.requesters?.[proposal.requesterId];
        executionResult = await executeAdapter(
            adapterName,
            proposal,
            policy,
            requesterPolicy
        );
    } catch (error) {
        executionResult = {
            adapter: proposal.payload.adapter || 'shell',
            status: 'error',
            error: error.message,
            exitCode: 1
        };
    }

    // Log to audit trail
    const auditPath = path.resolve('data/audit.log.jsonl');
    appendAudit(auditPath, {
        commandId: proposal.commandId || 'N/A',
        status: executionResult.status || 'completed',
        requesterId: proposal.requesterId || 'unknown',
        adapter: executionResult.adapter,
        riskLevel: validateResult.risk,
        exitCode: executionResult.exitCode || 0,
        timestamp: new Date().toISOString()
    });

    // Save nonce DB (records the nonce as used)
    await nonceDb.save();
    await rateLimiter.save();

    // Output structured result
    const output = {
        status: 'executed',
        commandId: proposal.commandId || 'N/A',
        checks: validateResult.checks,
        executionResult: {
            adapter: executionResult.adapter,
            status: executionResult.status || 'completed',
            output: executionResult.output || executionResult.error || '',
            exitCode: executionResult.exitCode || 0
        }
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(executionResult.exitCode || 0);
}
