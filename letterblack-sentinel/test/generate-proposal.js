// test/generate-proposal.js
// Generate a valid signed proposal for testing

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signEd25519 } from '../src/core/signature.js';
import { canonicalize } from 'json-canonicalize';

// Read secret key
const secretKeyPath = path.join(process.cwd(), 'keys/secret.key');
const secretKeyB64 = fs.readFileSync(secretKeyPath, 'utf-8').trim();

// Read public key
const publicKeyPath = path.join(process.cwd(), 'keys/public.key');
const publicKeyB64 = fs.readFileSync(publicKeyPath, 'utf-8').trim();

// Resolve default keyId from trusted keys store if present
let keyId = 'agent:gpt-v1-2026Q1';
const keysStorePath = path.join(process.cwd(), 'config/keys.json');
if (fs.existsSync(keysStorePath)) {
    try {
        const keysStore = JSON.parse(fs.readFileSync(keysStorePath, 'utf-8'));
        if (typeof keysStore.defaultKeyId === 'string' && keysStore.defaultKeyId.trim()) {
            keyId = keysStore.defaultKeyId.trim();
        }
    } catch {
        // Fallback to default keyId above.
    }
}

// Create a test proposal
const proposal = {
    id: 'RUN_SHELL',
    commandId: '550e8400-e29b-41d4-a716-446655440000',
    requesterId: 'agent:gpt',
    sessionId: 'session:test-001',
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(32).toString('hex'),
    requires: ['shell:execute'],
    risk: 'LOW',
    payload: {
        adapter: 'noop',
        cmd: 'echo',
        args: ['hello', 'world'],
        cwd: process.cwd()
    },
    signature: {
        alg: 'ed25519',
        keyId,
        sig: '' // Will be filled in
    }
};

// Remove signature from proposal for signing
const { signature, ...proposalForSigning } = proposal;

// Create canonical JSON for signing
const canonicalJson = canonicalize(proposalForSigning);
console.log('Canonical JSON:', canonicalJson);

// Sign it
const signResult = signEd25519({
    payloadObj: proposalForSigning,
    secretKeyB64
});

if (signResult.error) {
    console.error('Signing error:', signResult.error);
    process.exit(1);
}

console.log('Signature:', signResult.signature);

proposal.signature.sig = signResult.signature;

// Output the proposal
const outputPath = path.join(process.cwd(), 'test-proposal.json');
fs.writeFileSync(outputPath, JSON.stringify(proposal, null, 2));

console.log('\n✅ Test proposal generated:');
console.log('   File:', outputPath);
console.log('   Public Key:', publicKeyB64);
console.log('\nTo verify:');
console.log('   lbe verify --in test-proposal.json --keys-store config/keys.json');
