/**
 * test-cep-integration.js
 * 
 * Test both Option A (CLI) and Option B (Inline) validators
 * Run: node test-cep-integration.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// LOAD VALIDATORS
// ============================================

const { validateProposal, createProposal: createProposalInline, DEFAULT_CEP_POLICY } =
    require('./src/cep/cepValidatorInline.js');

const { validateViaCliSync, createProposal: createProposalCli } =
    require('./src/cep/cepValidatorCLI.js');

// ============================================
// TEST DATA
// ============================================

const TEST_CASES = [
    {
        name: 'Valid: Simple JSX expression',
        code: 'this.position[0] = 100;',
        requesterId: 'agent:cep-extension',
        adapter: 'noop',
        shouldPass: true
    },
    {
        name: 'Valid: Composition name check',
        code: 'if (comp && comp.name) { alert(comp.name); }',
        requesterId: 'agent:cep-extension',
        adapter: 'noop',
        shouldPass: true
    },
    {
        name: 'Invalid: Unauthorized requester',
        code: 'this.position[0] = 100;',
        requesterId: 'agent:unauthorized',
        adapter: 'noop',
        shouldPass: false
    },
    {
        name: 'Invalid: Unauthorized adapter',
        code: 'fs.writeFileSync("/tmp/test.txt", "data");',
        requesterId: 'agent:cep-extension',
        adapter: 'shell',
        shouldPass: false
    },
    {
        name: 'Invalid: Requires filesystem',
        code: 'fs.readFileSync("/etc/passwd");',
        requesterId: 'agent:cep-extension',
        adapter: 'noop',
        requires: ['filesystem'],
        shouldPass: false
    },
];

// ============================================
// OPTION B: INLINE VALIDATOR TEST
// ============================================

console.log('\n' + '='.repeat(60));
console.log('OPTION B: INLINE VALIDATOR (No External Process)');
console.log('='.repeat(60) + '\n');

let inlinePassCount = 0;
let inlineFailCount = 0;

TEST_CASES.forEach((testCase) => {
    const proposal = {
        id: 'RUN_SCRIPT',
        commandId: 'test-' + Date.now(),
        requesterId: testCase.requesterId,
        sessionId: 'session:test',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: '0'.repeat(64),
        requires: testCase.requires || ['evalScript'],
        risk: 'MEDIUM',
        payload: {
            adapter: testCase.adapter,
            code: testCase.code
        }
    };

    const result = validateProposal(proposal, DEFAULT_CEP_POLICY);

    const passed = (result.decision === 'ALLOW') === testCase.shouldPass;

    console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] ${testCase.name}`);
    console.log(`  Decision: ${result.decision}`);
    console.log(`  Message: ${result.message}`);
    console.log(`  Expected: ${testCase.shouldPass ? 'ALLOW' : 'DENY'}`);
    console.log('');

    if (passed) inlinePassCount++;
    else inlineFailCount++;
});

console.log(`Inline Validator: ${inlinePassCount} pass, ${inlineFailCount} fail\n`);

// ============================================
// OPTION A: CLI VALIDATOR TEST
// ============================================

console.log('='.repeat(60));
console.log('OPTION A: CLI VALIDATOR (Via Sentinel CLI)');
console.log('='.repeat(60) + '\n');

const SENTINEL_BIN = path.join(__dirname, 'bin', 'lbe.js');
const POLICY_PATH = path.join(__dirname, 'config', 'policy.default.json');

if (!fs.existsSync(SENTINEL_BIN)) {
    console.log('⚠️  Sentinel CLI not found at ' + SENTINEL_BIN);
    console.log('Skipping CLI tests. Run this from the sentinel root directory.\n');
} else {
    let cliPassCount = 0;
    let cliFailCount = 0;

    TEST_CASES.forEach((testCase) => {
        const proposal = {
            id: 'RUN_SCRIPT',
            commandId: 'test-' + Date.now(),
            requesterId: testCase.requesterId,
            sessionId: 'session:test',
            timestamp: Math.floor(Date.now() / 1000),
            nonce: '0'.repeat(64),
            requires: testCase.requires || ['evalScript'],
            risk: 'MEDIUM',
            payload: {
                adapter: testCase.adapter,
                code: testCase.code
            }
        };

        try {
            const result = validateViaCliSync(proposal, SENTINEL_BIN, POLICY_PATH);
            const passed = (result.decision === 'ALLOW') === testCase.shouldPass;

            console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] ${testCase.name}`);
            console.log(`  Decision: ${result.decision}`);
            console.log(`  Message: ${result.message}`);
            console.log(`  Expected: ${testCase.shouldPass ? 'ALLOW' : 'DENY'}`);
            console.log('');

            if (passed) cliPassCount++;
            else cliFailCount++;

        } catch (err) {
            console.log(`[❌ ERROR] ${testCase.name}`);
            console.log(`  Error: ${err.message}\n`);
            cliFailCount++;
        }
    });

    console.log(`CLI Validator: ${cliPassCount} pass, ${cliFailCount} fail\n`);
}

// ============================================
// COMPARISON
// ============================================

console.log('='.repeat(60));
console.log('COMPARISON');
console.log('='.repeat(60));
console.log(`
Option A (CLI):
  ✅ Full Sentinel features (signatures, nonce store, audit logging)
  ❌ External process overhead
  ❌ Requires Sentinel CLI installed
  ✅ Best for: Production with cryptographic proof

Option B (Inline):
  ✅ No external process (faster, fewer dependencies)
  ✅ Instant validation feedback
  ❌ No cryptographic signatures yet
  ✅ Best for: Rapid prototyping, simple policy enforcement

Recommendation: Start with Option B. Graduate to Option A when you need full governance.
`);
