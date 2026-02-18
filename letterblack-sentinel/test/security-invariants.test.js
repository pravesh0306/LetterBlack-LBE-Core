import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { signEd25519 } from '../src/core/signature.js';

const BIN_PATH = path.resolve('bin/lbe.js');

function makeSandbox(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbe-security-'));
    t.after(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });
    return dir;
}

function runLbe(cwd, args) {
    const result = spawnSync(process.execPath, [BIN_PATH, ...args], {
        cwd,
        encoding: 'utf8'
    });
    return {
        status: result.status ?? -1,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        combined: `${result.stdout || ''}${result.stderr || ''}`
    };
}

function assertExit(result, expectedExit, message) {
    assert.equal(result.status, expectedExit, `${message}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function initSandbox(cwd) {
    const initResult = runLbe(cwd, ['init']);
    assertExit(initResult, 0, 'init should succeed');
}

function resignPolicy(cwd) {
    const signResult = runLbe(cwd, ['policy-sign', '--config', 'config/policy.default.json', '--policy-sig', 'config/policy.sig.json']);
    assertExit(signResult, 0, 'policy-sign should succeed');
}

function createSignedProposal(cwd, overrides = {}) {
    const keysStore = readJson(path.join(cwd, 'config/keys.json'));
    const secretKeyB64 = fs.readFileSync(path.join(cwd, 'keys/secret.key'), 'utf8').trim();
    const nowSec = Math.floor(Date.now() / 1000);

    const proposal = {
        id: 'RUN_SHELL',
        commandId: crypto.randomUUID(),
        requesterId: 'agent:gpt',
        sessionId: 'session:test-security',
        timestamp: nowSec,
        nonce: crypto.randomBytes(32).toString('hex'),
        requires: ['shell:execute'],
        risk: 'LOW',
        payload: {
            adapter: 'noop',
            cmd: 'echo',
            args: ['security-test'],
            cwd
        },
        ...overrides
    };

    const keyId = overrides.signature?.keyId || keysStore.defaultKeyId || 'agent:gpt-v1-2026Q1';
    const unsigned = { ...proposal };
    delete unsigned.signature;

    const signed = signEd25519({
        payloadObj: unsigned,
        secretKeyB64
    });
    assert.equal(signed.error, null, `failed to sign proposal: ${signed.error}`);

    proposal.signature = {
        alg: 'ed25519',
        keyId,
        sig: signed.signature
    };

    if (overrides.signature?.alg || overrides.signature?.sig || overrides.signature?.keyId) {
        proposal.signature = { ...proposal.signature, ...overrides.signature };
    }

    return proposal;
}

function writeProposal(cwd, filename, proposal) {
    const proposalPath = path.join(cwd, filename);
    writeJson(proposalPath, proposal);
    return filename;
}

function createRunEntry(cwd, filename) {
    const proposal = createSignedProposal(cwd);
    const proposalFile = writeProposal(cwd, filename, proposal);
    const runResult = runLbe(cwd, ['run', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(runResult, 0, `run should succeed for ${filename}`);
}

test('policy integrity: valid signature passes verify', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox);
    const proposalFile = writeProposal(sandbox, 'proposal-valid.json', proposal);

    const verifyResult = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyResult, 0, 'verify should pass with valid signed policy');
});

test('policy integrity: tampered policy fails with exit 8', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const policyPath = path.join(sandbox, 'config/policy.default.json');
    const policy = readJson(policyPath);
    policy.default = policy.default === 'DENY' ? 'ALLOW' : 'DENY';
    writeJson(policyPath, policy);

    const proposal = createSignedProposal(sandbox);
    const proposalFile = writeProposal(sandbox, 'proposal-policy-tamper.json', proposal);

    const verifyResult = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyResult, 8, 'verify should fail when policy is tampered');
    assert.match(verifyResult.combined, /POLICY_SIGNATURE_INVALID/);
});

test('policy integrity: missing policy signature in strict mode fails with exit 8', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    fs.renameSync(
        path.join(sandbox, 'config/policy.sig.json'),
        path.join(sandbox, 'config/policy.sig.json.missing')
    );

    const proposal = createSignedProposal(sandbox);
    const proposalFile = writeProposal(sandbox, 'proposal-policy-missing-sig.json', proposal);

    const verifyResult = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyResult, 8, 'verify should fail when policy signature is missing');
    assert.match(verifyResult.combined, /POLICY_SIGNATURE_MISSING/);
});

test('policy integrity: missing policy signature with dev override passes', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    fs.renameSync(
        path.join(sandbox, 'config/policy.sig.json'),
        path.join(sandbox, 'config/policy.sig.json.missing')
    );

    const proposal = createSignedProposal(sandbox);
    const proposalFile = writeProposal(sandbox, 'proposal-policy-missing-sig-dev.json', proposal);

    const verifyResult = runLbe(sandbox, [
        'verify',
        '--in',
        proposalFile,
        '--keys-store',
        'config/keys.json',
        '--policy-unsigned-ok'
    ]);
    assertExit(verifyResult, 0, 'verify should pass when unsigned policy is explicitly allowed');
});

test('audit integrity: clean chain validates', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    createRunEntry(sandbox, 'proposal-audit-clean-1.json');
    createRunEntry(sandbox, 'proposal-audit-clean-2.json');

    const auditVerifyResult = runLbe(sandbox, ['audit-verify', '--audit', 'data/audit.log.jsonl', '--json', 'true']);
    assertExit(auditVerifyResult, 0, 'audit-verify should pass for clean chain');
    const parsed = JSON.parse(auditVerifyResult.stdout.trim());
    assert.equal(parsed.valid, true);
});

test('audit integrity: mutating an entry yields HASH_MISMATCH', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    createRunEntry(sandbox, 'proposal-audit-mutate-1.json');
    createRunEntry(sandbox, 'proposal-audit-mutate-2.json');

    const auditPath = path.join(sandbox, 'data/audit.log.jsonl');
    const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
    const first = JSON.parse(lines[0]);
    first.status = 'tampered-status';
    lines[0] = JSON.stringify(first);
    fs.writeFileSync(auditPath, `${lines.join('\n')}\n`);

    const auditVerifyResult = runLbe(sandbox, ['audit-verify', '--audit', 'data/audit.log.jsonl', '--json', 'true']);
    assertExit(auditVerifyResult, 8, 'audit-verify should fail when an entry is mutated');
    assert.match(auditVerifyResult.stdout, /HASH_MISMATCH/);
});

test('audit integrity: removing an entry yields PREV_HASH_MISMATCH', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    createRunEntry(sandbox, 'proposal-audit-remove-1.json');
    createRunEntry(sandbox, 'proposal-audit-remove-2.json');

    const auditPath = path.join(sandbox, 'data/audit.log.jsonl');
    const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
    lines.splice(0, 1);
    fs.writeFileSync(auditPath, `${lines.join('\n')}\n`);

    const auditVerifyResult = runLbe(sandbox, ['audit-verify', '--audit', 'data/audit.log.jsonl', '--json', 'true']);
    assertExit(auditVerifyResult, 8, 'audit-verify should fail when an entry is removed');
    assert.match(auditVerifyResult.stdout, /PREV_HASH_MISMATCH/);
});

test('audit integrity: reordering entries yields PREV_HASH_MISMATCH', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    createRunEntry(sandbox, 'proposal-audit-reorder-1.json');
    createRunEntry(sandbox, 'proposal-audit-reorder-2.json');

    const auditPath = path.join(sandbox, 'data/audit.log.jsonl');
    const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
    [lines[0], lines[1]] = [lines[1], lines[0]];
    fs.writeFileSync(auditPath, `${lines.join('\n')}\n`);

    const auditVerifyResult = runLbe(sandbox, ['audit-verify', '--audit', 'data/audit.log.jsonl', '--json', 'true']);
    assertExit(auditVerifyResult, 8, 'audit-verify should fail when entries are reordered');
    assert.match(auditVerifyResult.stdout, /PREV_HASH_MISMATCH/);
});

test('replay protection: second run with same nonce exits 4', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox);
    const proposalFile = writeProposal(sandbox, 'proposal-replay.json', proposal);

    const firstRun = runLbe(sandbox, ['run', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(firstRun, 0, 'first run should succeed');

    const secondRun = runLbe(sandbox, ['run', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(secondRun, 4, 'second run should fail replay protection');
    assert.match(secondRun.combined, /REPLAY_NONCE|Nonce has already been used/);
});

test('rate limiting: second run in window exits 7', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const policyPath = path.join(sandbox, 'config/policy.default.json');
    const policy = readJson(policyPath);
    policy.requesters['agent:gpt'].rateLimit = {
        windowSec: 60,
        maxRequests: 1
    };
    writeJson(policyPath, policy);
    resignPolicy(sandbox);

    const proposal1 = createSignedProposal(sandbox, { commandId: crypto.randomUUID(), nonce: crypto.randomBytes(32).toString('hex') });
    const proposal2 = createSignedProposal(sandbox, { commandId: crypto.randomUUID(), nonce: crypto.randomBytes(32).toString('hex') });
    const proposal1File = writeProposal(sandbox, 'proposal-rate-1.json', proposal1);
    const proposal2File = writeProposal(sandbox, 'proposal-rate-2.json', proposal2);

    const firstRun = runLbe(sandbox, ['run', '--in', proposal1File, '--keys-store', 'config/keys.json']);
    assertExit(firstRun, 0, 'first run should pass rate limit');

    const secondRun = runLbe(sandbox, ['run', '--in', proposal2File, '--keys-store', 'config/keys.json']);
    assertExit(secondRun, 7, 'second run should fail rate limit');
    assert.match(secondRun.combined, /RATE_LIMIT_EXCEEDED/);
});

test('timestamp skew: past and future timestamps beyond tolerance exit 6', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const nowSec = Math.floor(Date.now() / 1000);
    const futureProposal = createSignedProposal(sandbox, {
        timestamp: nowSec + 7200,
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const pastProposal = createSignedProposal(sandbox, {
        timestamp: nowSec - 7200,
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });

    const futureFile = writeProposal(sandbox, 'proposal-future-skew.json', futureProposal);
    const pastFile = writeProposal(sandbox, 'proposal-past-skew.json', pastProposal);

    const futureVerify = runLbe(sandbox, ['verify', '--in', futureFile, '--keys-store', 'config/keys.json']);
    assertExit(futureVerify, 6, 'future timestamp outside skew window should fail');
    assert.match(futureVerify.combined, /TIMESTAMP_SKEW_EXCEEDED/);

    const pastVerify = runLbe(sandbox, ['verify', '--in', pastFile, '--keys-store', 'config/keys.json']);
    assertExit(pastVerify, 6, 'past timestamp outside skew window should fail');
    assert.match(pastVerify.combined, /TIMESTAMP_SKEW_EXCEEDED/);
});

test('key lifecycle: expired signing key is rejected', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-key-expired.json', proposal);

    const keysPath = path.join(sandbox, 'config/keys.json');
    const keysStore = readJson(keysPath);
    const signingKeyId = proposal.signature.keyId;
    keysStore.trustedKeys[signingKeyId].notBefore = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)).toISOString();
    keysStore.trustedKeys[signingKeyId].expiresAt = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    keysStore.trustedKeys[signingKeyId].validFrom = keysStore.trustedKeys[signingKeyId].notBefore;
    keysStore.trustedKeys[signingKeyId].validUntil = keysStore.trustedKeys[signingKeyId].expiresAt;
    writeJson(keysPath, keysStore);

    const verifyResult = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyResult, 3, 'verify should fail when signing key is expired');
    assert.match(verifyResult.combined, /KEY_EXPIRED/);
});

test('key lifecycle: missing lifecycle metadata is rejected', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-key-lifecycle-missing.json', proposal);

    const keysPath = path.join(sandbox, 'config/keys.json');
    const keysStore = readJson(keysPath);
    const signingKeyId = proposal.signature.keyId;
    delete keysStore.trustedKeys[signingKeyId].notBefore;
    delete keysStore.trustedKeys[signingKeyId].expiresAt;
    delete keysStore.trustedKeys[signingKeyId].validFrom;
    delete keysStore.trustedKeys[signingKeyId].validUntil;
    writeJson(keysPath, keysStore);

    const verifyResult = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyResult, 3, 'verify should fail when key lifecycle metadata is missing');
    assert.match(verifyResult.combined, /KEY_LIFECYCLE_INVALID/);
});

test('controller integrity: strict mode fails when manifest is missing', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-integrity-missing-manifest.json', proposal);

    const verifyResult = runLbe(sandbox, [
        'verify',
        '--in',
        proposalFile,
        '--keys-store',
        'config/keys.json',
        '--integrity-strict',
        '--integrity-manifest',
        'config/missing.integrity.manifest.json'
    ]);

    assertExit(verifyResult, 8, 'strict integrity mode should fail when manifest is missing');
    assert.match(verifyResult.combined, /INTEGRITY_MANIFEST_MISSING/);
});

test('controller integrity: strict mode passes with valid manifest and fails with tampered manifest', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-integrity-valid-manifest.json', proposal);

    const manifestPath = path.join(sandbox, 'config/integrity.manifest.json');
    const generateResult = runLbe(sandbox, [
        'integrity-generate',
        '--out',
        manifestPath
    ]);
    assertExit(generateResult, 0, 'integrity-generate should succeed');

    const verifyOk = runLbe(sandbox, [
        'verify',
        '--in',
        proposalFile,
        '--keys-store',
        'config/keys.json',
        '--integrity-strict',
        '--integrity-manifest',
        manifestPath
    ]);
    assertExit(verifyOk, 0, 'strict integrity mode should pass with valid manifest');

    const manifest = readJson(manifestPath);
    const firstKey = Object.keys(manifest)[0];
    manifest[firstKey] = '0'.repeat(64);
    writeJson(manifestPath, manifest);

    const verifyTampered = runLbe(sandbox, [
        'verify',
        '--in',
        proposalFile,
        '--keys-store',
        'config/keys.json',
        '--integrity-strict',
        '--integrity-manifest',
        manifestPath
    ]);
    assertExit(verifyTampered, 8, 'strict integrity mode should fail with tampered manifest');
    assert.match(verifyTampered.combined, /INTEGRITY_CHECK_FAILED/);
});

test('policy version binding: version bump without re-sign is blocked', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-policy-version-no-resign.json', proposal);

    const policyPath = path.join(sandbox, 'config/policy.default.json');
    const policy = readJson(policyPath);
    policy.version = '1.0.1';
    policy.createdAt = new Date().toISOString();
    writeJson(policyPath, policy);

    const verifyResult = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyResult, 8, 'policy version bump without re-sign must fail');
    assert.match(verifyResult.combined, /POLICY_SIGNATURE_INVALID/);
});

test('policy version binding: rollback to older version is blocked', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-policy-rollback.json', proposal);

    const policyPath = path.join(sandbox, 'config/policy.default.json');
    const sigPath = path.join(sandbox, 'config/policy.sig.json');
    const oldPolicy = readJson(policyPath);
    const oldSig = readJson(sigPath);

    const upgraded = { ...oldPolicy };
    upgraded.version = '1.0.1';
    upgraded.createdAt = new Date(Date.now() + 1000).toISOString();
    writeJson(policyPath, upgraded);
    resignPolicy(sandbox);

    const verifyNew = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyNew, 0, 'upgraded policy should be accepted first');

    writeJson(policyPath, oldPolicy);
    writeJson(sigPath, oldSig);

    const verifyRollback = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyRollback, 8, 'rollback to older policy version must fail');
    assert.match(verifyRollback.combined, /POLICY_VERSION_REGRESSION/);
});

test('policy version binding: createdAt regression at same version is blocked', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const proposal = createSignedProposal(sandbox, {
        commandId: crypto.randomUUID(),
        nonce: crypto.randomBytes(32).toString('hex')
    });
    const proposalFile = writeProposal(sandbox, 'proposal-policy-createdat-regression.json', proposal);

    const policyPath = path.join(sandbox, 'config/policy.default.json');
    const current = readJson(policyPath);

    const promoted = { ...current };
    promoted.version = '1.0.1';
    promoted.createdAt = new Date().toISOString();
    writeJson(policyPath, promoted);
    resignPolicy(sandbox);

    const verifyPromoted = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyPromoted, 0, 'promoted policy should be accepted');

    const regressed = { ...promoted };
    regressed.createdAt = new Date(Date.now() - 60_000).toISOString();
    writeJson(policyPath, regressed);
    resignPolicy(sandbox);

    const verifyRegressed = runLbe(sandbox, ['verify', '--in', proposalFile, '--keys-store', 'config/keys.json']);
    assertExit(verifyRegressed, 8, 'createdAt regression must fail');
    assert.match(verifyRegressed.combined, /POLICY_CREATED_AT_REGRESSION/);
});

test('health command: initialized workspace is healthy', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    const result = runLbe(sandbox, ['health', '--json', 'true']);
    assertExit(result, 0, 'health should pass for initialized workspace');
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.ok, true);
    assert.equal(parsed.status, 'healthy');
});

test('health command: missing policy is unhealthy', (t) => {
    const sandbox = makeSandbox(t);
    initSandbox(sandbox);

    fs.renameSync(
        path.join(sandbox, 'config/policy.default.json'),
        path.join(sandbox, 'config/policy.default.json.missing')
    );

    const result = runLbe(sandbox, ['health', '--json', 'true']);
    assertExit(result, 8, 'health should fail when required policy file is missing');
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.ok, false);
    assert.equal(parsed.status, 'unhealthy');
});
