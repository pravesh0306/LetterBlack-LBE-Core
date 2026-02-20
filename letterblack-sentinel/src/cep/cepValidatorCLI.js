/**
 * cepValidatorCLI.js
 * 
 * Option A: Call Sentinel CLI from CEP via Node child_process
 * More features (signatures, nonce store), but external process overhead
 * 
 * Usage:
 *   const { validateViaCliSync, validateViaCliAsync } = require('./cepValidatorCLI.js');
 *   const result = validateViaCliSync(proposal, sentinelBinPath, policyPath);
 *   if (result.decision === 'ALLOW') { execute(); }
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Synchronous validation via Sentinel CLI
 * Good for: UI response needed immediately
 * 
 * @param {Object} proposal - Unsigned proposal JSON
 * @param {String} sentinelBinPath - Path to sentinel/bin/lbe.js
 * @param {String} policyPath - Path to policy.default.json
 * @returns {Object} { decision: 'ALLOW'|'DENY', message, commandId, ... }
 */
function validateViaCliSync(proposal, sentinelBinPath, policyPath) {
    try {
        // Step 1: Write proposal to temp file
        const tempDir = os.tmpdir();
        const proposalFile = path.join(tempDir, `proposal-${Date.now()}.json`);

        fs.writeFileSync(proposalFile, JSON.stringify(proposal, null, 2), 'utf8');

        // Step 2: Call Sentinel CLI
        const command = `node "${sentinelBinPath}" verify --in "${proposalFile}" --policy "${policyPath}"`;

        const output = execSync(command, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 5000  // 5s timeout
        });

        // Step 3: Parse result
        const result = JSON.parse(output);

        // Step 4: Cleanup
        fs.unlinkSync(proposalFile);

        return result;

    } catch (err) {
        return {
            decision: 'DENY',
            reason: 'VALIDATION_ERROR',
            message: `Sentinel validation error: ${err.message}`,
            commandId: proposal.commandId || null
        };
    }
}

/**
 * Asynchronous validation via Sentinel CLI
 * Good for: Non-blocking background validation
 * 
 * @param {Object} proposal - Unsigned proposal JSON
 * @param {String} sentinelBinPath - Path to sentinel/bin/lbe.js
 * @param {String} policyPath - Path to policy.default.json
 * @returns {Promise<Object>} Decision result
 */
async function validateViaCliAsync(proposal, sentinelBinPath, policyPath) {
    return new Promise((resolve) => {
        try {
            const tempDir = os.tmpdir();
            const proposalFile = path.join(tempDir, `proposal-${Date.now()}.json`);

            fs.writeFileSync(proposalFile, JSON.stringify(proposal, null, 2), 'utf8');

            const child = spawnSync('node', [
                sentinelBinPath,
                'verify',
                '--in', proposalFile,
                '--policy', policyPath
            ], {
                encoding: 'utf-8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (child.error) {
                return resolve({
                    decision: 'DENY',
                    reason: 'SPAWN_ERROR',
                    message: child.error.message,
                    commandId: proposal.commandId || null
                });
            }

            if (child.status !== 0) {
                return resolve({
                    decision: 'DENY',
                    reason: 'VALIDATION_FAILED',
                    message: child.stderr || 'Sentinel validation failed',
                    commandId: proposal.commandId || null
                });
            }

            const result = JSON.parse(child.stdout);
            fs.unlinkSync(proposalFile);

            resolve(result);

        } catch (err) {
            resolve({
                decision: 'DENY',
                reason: 'VALIDATION_ERROR',
                message: err.message,
                commandId: proposal.commandId || null
            });
        }
    });
}

/**
 * Health check: Verify Sentinel CLI is available
 * @param {String} sentinelBinPath - Path to sentinel/bin/lbe.js
 * @returns {Boolean} true if Sentinel is reachable
 */
function sentinelHealthCheck(sentinelBinPath) {
    try {
        const output = execSync(`node "${sentinelBinPath}" health --json true`, {
            encoding: 'utf-8',
            timeout: 3000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        const health = JSON.parse(output);
        return health.status === 'ok';
    } catch (err) {
        return false;
    }
}

/**
 * Create minimal unsigned proposal (copy of inline version for consistency)
 */
function createProposal(aiGeneratedCode, requesterId = 'agent:cep-extension') {
    return {
        id: 'RUN_SCRIPT',
        commandId: generateUUID(),
        requesterId: requesterId,
        sessionId: 'session:cep-' + Date.now(),
        timestamp: Math.floor(Date.now() / 1000),
        nonce: generateNonce(32),
        requires: ['evalScript'],
        risk: 'MEDIUM',
        payload: {
            adapter: 'noop',
            code: aiGeneratedCode
        }
    };
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateNonce(bytes = 32) {
    let nonce = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < bytes * 2; i++) {
        nonce += chars[Math.floor(Math.random() * 16)];
    }
    return nonce;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateViaCliSync,
        validateViaCliAsync,
        sentinelHealthCheck,
        createProposal,
        generateUUID,
        generateNonce
    };
}
