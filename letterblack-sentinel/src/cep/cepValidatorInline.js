/**
 * cepValidatorInline.js
 * 
 * Minimal validator module for CEP integration (Option B)
 * No external process, no cryptographic overhead
 * Drop this into your CEP extension and reference it
 * 
 * Usage:
 *   const { validateProposal } = require('./cepValidatorInline.js');
 *   const result = validateProposal(proposal, policyConfig);
 *   if (result.decision === 'ALLOW') { execute(); }
 */

/**
 * Validate proposal against simple CEP policy
 * @param {Object} proposal - Unsigned proposal JSON
 * @param {Object} policy - Policy config (or path to policy.json)
 * @returns {Object} { decision: 'ALLOW'|'DENY', message, commandId }
 */
function validateProposal(proposal, policy) {
    const errors = [];

    // ============================================
    // GATE 1: SCHEMA VALIDATION
    // ============================================
    if (!proposal || typeof proposal !== 'object') {
        return denialResult('SCHEMA_ERROR', 'Proposal must be a JSON object');
    }

    const requiredFields = ['id', 'commandId', 'requesterId', 'payload'];
    for (const field of requiredFields) {
        if (!proposal[field]) {
            return denialResult('SCHEMA_ERROR', `Missing required field: ${field}`);
        }
    }

    // ============================================
    // GATE 2: REQUESTER CHECK
    // ============================================
    const requesterPolicy = policy.requesters && policy.requesters[proposal.requesterId];
    if (!requesterPolicy) {
        return denialResult(
            'POLICY_DENIED',
            `Requester '${proposal.requesterId}' not registered in policy`
        );
    }

    // ============================================
    // GATE 3: ADAPTER AUTHORIZATION
    // ============================================
    const adapter = proposal.payload.adapter || 'noop';
    if (!requesterPolicy.allowAdapters || !requesterPolicy.allowAdapters.includes(adapter)) {
        return denialResult(
            'POLICY_DENIED',
            `Adapter '${adapter}' not in allowAdapters for ${proposal.requesterId}`
        );
    }

    // ============================================
    // GATE 4: COMMAND AUTHORIZATION
    // ============================================
    const commandId = proposal.id;
    if (!requesterPolicy.allowCommands || !requesterPolicy.allowCommands.includes(commandId)) {
        return denialResult(
            'POLICY_DENIED',
            `Command '${commandId}' not in allowCommands for ${proposal.requesterId}`
        );
    }

    // ============================================
    // GATE 5: CAPABILITY VALIDATION (CEP-specific)
    // ============================================
    const requiredCapabilities = proposal.requires || [];
    const availableCapabilities = ['evalScript']; // CEP offers only evalScript

    for (const cap of requiredCapabilities) {
        if (!availableCapabilities.includes(cap)) {
            return denialResult(
                'CAPABILITY_DENIED',
                `CEP does not support capability: ${cap}`
            );
        }
    }

    // ============================================
    // ALL GATES PASSED
    // ============================================
    return {
        decision: 'ALLOW',
        commandId: proposal.commandId,
        message: 'All validation gates passed',
        adapter: adapter,
        payload: proposal.payload
    };
}

/**
 * Helper: Create a denial result
 */
function denialResult(reason, message) {
    return {
        decision: 'DENY',
        reason: reason,
        message: message,
        commandId: null
    };
}

/**
 * Create minimal unsigned proposal
 * @param {String} aiGeneratedCode - JSX code from LLM
 * @param {String} requesterId - Who is requesting (e.g., 'agent:cep-extension')
 * @returns {Object} Unsigned proposal ready for validation
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

/**
 * Generate UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate random nonce (hex string)
 * @param {Number} bytes - Number of bytes (will output 2x hex chars)
 * @returns {String} Hex nonce
 */
function generateNonce(bytes = 32) {
    let nonce = '';
    const chars = '0123456789abcdef';
    for (let i = 0; i < bytes * 2; i++) {
        nonce += chars[Math.floor(Math.random() * 16)];
    }
    return nonce;
}

/**
 * Minimal default policy for CEP
 * Use this or load from your own policy.json
 */
const DEFAULT_CEP_POLICY = {
    version: 1,
    default: 'DENY',
    requesters: {
        'agent:cep-extension': {
            allowAdapters: ['noop'],
            allowCommands: ['RUN_SCRIPT'],
            description: 'CEP panel AI execution (observation-only)'
        }
    }
};

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateProposal,
        createProposal,
        generateUUID,
        generateNonce,
        DEFAULT_CEP_POLICY
    };
}

// Export for ES Modules (add 'type: "module"' to package.json if using)
// export { validateProposal, createProposal, generateUUID, generateNonce, DEFAULT_CEP_POLICY };
