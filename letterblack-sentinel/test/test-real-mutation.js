/**
 * test/test-real-mutation.js
 * 
 * Quick test: Generate, sign, validate, and execute a real mutation proposal
 * This is Level 1 testing (shell adapter with safe command)
 * 
 * Run: node test/test-real-mutation.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signEd25519 } from '../src/core/signature.js';

const cwd = process.cwd();

console.log('🧪 Testing Real Mutation (Level 1)');
console.log('='.repeat(60));

// Step 1: Create unsafe proposal (should be BLOCKED)
console.log('\n1️⃣  Test DANGEROUS command (should be DENIED)...\n');

const dangerousProposal = {
    id: 'RUN_SHELL',
    commandId: crypto.randomUUID(),
    requesterId: 'agent:gpt',
    sessionId: `session:test-dangerous-${Date.now()}`,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(32).toString('hex'),
    requires: ['shell:execute'],
    risk: 'HIGH',
    payload: {
        adapter: 'shell',
        cmd: 'rm',  // ❌ Not in allowlist
        args: ['-rf', 'test'],
        cwd: '.'
    },
    signature: {
        alg: 'ed25519',
        keyId: 'agent:gpt-v1-2026Q1',
        sig: ''
    }
};

// Sign it
const secretKeyB64 = fs.readFileSync(path.join(cwd, 'keys/secret.key'), 'utf-8').trim();
const { signature: sig1, ...dangerousUnsigned } = dangerousProposal;
const dangerousSign = signEd25519({
    payloadObj: dangerousUnsigned,
    secretKeyB64
});
dangerousProposal.signature.sig = dangerousSign.signature;

// Save it
fs.writeFileSync('test-dangerous-proposal.json', JSON.stringify(dangerousProposal, null, 2));
console.log('✅ Created dangerous proposal (rm command)');
console.log('   Run: npm run verify -- --in test-dangerous-proposal.json');
console.log('   Expected: ❌ COMMAND_NOT_ALLOWED (rm not in allowlist)\n');

// Step 2: Create SAFE proposal (should ALLOW)
console.log('2️⃣  Test SAFE command (should be ALLOWED)...\n');

const safeProposal = {
    id: 'RUN_SHELL',
    commandId: crypto.randomUUID(),
    requesterId: 'agent:gpt',
    sessionId: `session:test-safe-${Date.now()}`,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(32).toString('hex'),
    requires: ['shell:execute'],
    risk: 'LOW',
    payload: {
        adapter: 'shell',
        cmd: 'ls',  // ✅ In allowlist
        args: ['-la', '.'],
        cwd: '.'
    },
    signature: {
        alg: 'ed25519',
        keyId: 'agent:gpt-v1-2026Q1',
        sig: ''
    }
};

const { signature: sig2, ...safeUnsigned } = safeProposal;
const safeSign = signEd25519({
    payloadObj: safeUnsigned,
    secretKeyB64
});
safeProposal.signature.sig = safeSign.signature;

fs.writeFileSync('test-safe-proposal.json', JSON.stringify(safeProposal, null, 2));
console.log('✅ Created safe proposal (ls command)');
console.log('   Run: npm run verify -- --in test-safe-proposal.json');
console.log('   Expected: ✅ Valid (all 4 gates pass)\n');

console.log('3️⃣  Commands to run next:\n');
console.log('# Test dangerous (should be blocked):');
console.log('npm run verify -- --in test-dangerous-proposal.json --keys-store config/keys.json');
console.log('');
console.log('# Test safe (should pass all gates):');
console.log('npm run verify -- --in test-safe-proposal.json --keys-store config/keys.json');
console.log('');
console.log('# Execute safe proposal:');
console.log('npm run run -- --in test-safe-proposal.json --keys-store config/keys.json --audit data/audit.log.jsonl');
console.log('');
console.log('# Check audit trail:');
console.log('npm run audit:verify -- --audit data/audit.log.jsonl');
console.log('');
console.log('='.repeat(60));
console.log('\n✅ Proposals generated. Go run the commands above!\n');
