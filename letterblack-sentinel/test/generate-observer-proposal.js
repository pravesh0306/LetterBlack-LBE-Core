// test/generate-observer-proposal.js
// Generate a signed observer proposal (non-mutating observation)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signEd25519 } from '../src/core/signature.js';

// Read secret key
const secretKeyPath = path.join(process.cwd(), 'keys/secret.key');
const secretKeyB64 = fs.readFileSync(secretKeyPath, 'utf-8').trim();

// Read public key
const publicKeyPath = path.join(process.cwd(), 'keys/public.key');
const publicKeyB64 = fs.readFileSync(publicKeyPath, 'utf-8').trim();

// Resolve keyId for observer requester
let keyId = 'agent:observer-v1-2026Q1';  // Force observer key
const keysStorePath = path.join(process.cwd(), 'config/keys.json');
if (fs.existsSync(keysStorePath)) {
    try {
        const keysStore = JSON.parse(fs.readFileSync(keysStorePath, 'utf-8'));
        // Verify the key exists for observer
        if (!keysStore.trustedKeys['agent:observer-v1-2026Q1']) {
            console.warn('⚠️  agent:observer-v1-2026Q1 not in trusted keys. Adding it...');
        }
    } catch {
        // Fallback to default
    }
}

// Helper: generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Create an observer proposal (no mutations)
// Note: id MUST match policy.requesters['agent:observer'].allowCommands
const proposal = {
    id: 'OBSERVE_IRREGULARITY',  // Must match allowCommands in policy
    commandId: generateUUID(),  // Must be UUID
    requesterId: 'agent:observer',
    sessionId: 'session:observer-test',
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(32).toString('hex'),
    requires: ['observe'],
    risk: 'LOW',  // Must be LOW, MEDIUM, HIGH, or CRITICAL
    payload: {
        adapter: 'observer',  // Required field
        source: 'CEP',
        context: 'AfterEffects',
        issueType: 'NO_LAYER_SELECTED',
        description: 'Attempted property expression application with no active layer',
        severity: 'low',
        metadata: {
            compName: 'MainComp',
            attemptedAction: 'applyPropertyExpression',
            timestamp: Math.floor(Date.now() / 1000)
        }
    },
    signature: {
        alg: 'ed25519',
        keyId,
        sig: '' // Will be filled in
    }
};

// Remove signature from proposal for signing
const { signature, ...proposalForSigning } = proposal;

// Sign it
const signResult = signEd25519({
    payloadObj: proposalForSigning,
    secretKeyB64
});

if (signResult.error) {
    console.error('Signing error:', signResult.error);
    process.exit(1);
}

console.log('Observer proposal signature:', signResult.signature);

proposal.signature.sig = signResult.signature;

// Output the proposal
const outputPath = path.join(process.cwd(), 'observer-proposal.json');
fs.writeFileSync(outputPath, JSON.stringify(proposal, null, 2));

console.log('✅ Observer proposal generated:', outputPath);
console.log('');
console.log('Next steps:');
console.log('  npm run verify -- --in observer-proposal.json --keys-store config/keys.json');
console.log('  npm run run -- --in observer-proposal.json --keys-store config/keys.json');
console.log('');
console.log('Then check audit log:');
console.log('  Get-Content data/audit.log.jsonl | Select-Object -Last 1 | ConvertFrom-Json | ConvertTo-Json -Depth 10');
