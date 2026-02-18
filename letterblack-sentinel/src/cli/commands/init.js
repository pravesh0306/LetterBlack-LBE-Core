// src/cli/commands/init.js
// Initialize LetterBlack Sentinel environment

import fs from 'fs';
import path from 'path';
import { generateKeyPair } from '../../core/signature.js';
import { createPolicySignatureEnvelope } from '../../core/policySignature.js';

export function initCommand() {
    const cwd = process.cwd();
    const defaultKeyId = 'agent:gpt-v1-2026Q1';
    const policySignerKeyId = 'policy-signer-v1-2026Q1';
    const defaultPolicyVersion = '1.0.0';
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + (180 * 24 * 60 * 60 * 1000)).toISOString();

    console.log('🔐 Initializing LetterBlack Sentinel environment...\n');

    // Create directories
    const dirs = ['./config', './data', './keys'];
    for (const dir of dirs) {
        const fullPath = path.join(cwd, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✓ Created directory: ${dir}`);
        } else {
            console.log(`✓ Directory exists: ${dir}`);
        }
    }

    // Create or migrate policy
    const policyPath = path.join(cwd, 'config/policy.default.json');
    let policyObj;
    let policyChanged = false;
    if (!fs.existsSync(policyPath)) {
        policyObj = {
            default: 'DENY',
            version: defaultPolicyVersion,
            createdAt: nowIso,
            security: {
                maxClockSkewSec: 600,
                maxPolicyCreatedAtSkewSec: 31536000,
                defaultRateLimit: {
                    windowSec: 60,
                    maxRequests: 30
                }
            },
            requesters: {
                'agent:gpt': {
                    allowAdapters: ['noop', 'shell'],
                    allowCommands: ['RUN_SHELL'],
                    rateLimit: {
                        windowSec: 60,
                        maxRequests: 30
                    },
                    filesystem: {
                        roots: [cwd],
                        denyPatterns: ['**/.git/**', '**/secrets/**', '**/*.key']
                    },
                    exec: {
                        allowCmds: ['ls', 'node', 'python', 'echo'],
                        denyCmds: ['rm', 'chmod', 'chown', 'curl', 'wget', 'su', 'sudo']
                    }
                }
            }
        };
        policyChanged = true;
        console.log('✓ Created default policy: config/policy.default.json');
    } else {
        try {
            policyObj = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
        } catch (error) {
            throw new Error(`Invalid policy file: ${error.message}`);
        }
    }

    if (!policyObj || typeof policyObj !== 'object') {
        throw new Error('Policy file must contain a JSON object');
    }
    if (typeof policyObj.version === 'undefined') {
        policyObj.version = defaultPolicyVersion;
        policyChanged = true;
    }
    if (typeof policyObj.createdAt === 'undefined') {
        policyObj.createdAt = nowIso;
        policyChanged = true;
    }
    if (!policyObj.security || typeof policyObj.security !== 'object') {
        policyObj.security = {};
        policyChanged = true;
    }
    if (!Number.isFinite(policyObj.security.maxClockSkewSec)) {
        policyObj.security.maxClockSkewSec = 600;
        policyChanged = true;
    }
    if (!Number.isFinite(policyObj.security.maxPolicyCreatedAtSkewSec)) {
        policyObj.security.maxPolicyCreatedAtSkewSec = 31536000;
        policyChanged = true;
    }
    if (!policyObj.security.defaultRateLimit || typeof policyObj.security.defaultRateLimit !== 'object') {
        policyObj.security.defaultRateLimit = { windowSec: 60, maxRequests: 30 };
        policyChanged = true;
    } else {
        if (!Number.isFinite(policyObj.security.defaultRateLimit.windowSec)) {
            policyObj.security.defaultRateLimit.windowSec = 60;
            policyChanged = true;
        }
        if (!Number.isFinite(policyObj.security.defaultRateLimit.maxRequests)) {
            policyObj.security.defaultRateLimit.maxRequests = 30;
            policyChanged = true;
        }
    }

    if (policyChanged) {
        fs.writeFileSync(policyPath, JSON.stringify(policyObj, null, 2));
        console.log('✓ Created/updated policy: config/policy.default.json');
    }

    const keysPath = path.join(cwd, 'keys');
    const publicKeyPath = path.join(keysPath, 'public.key');
    const secretKeyPath = path.join(keysPath, 'secret.key');
    let publicKeyB64;
    let secretKeyB64;

    // Generate keypair only if missing; never rotate implicitly on init.
    if (fs.existsSync(publicKeyPath) && fs.existsSync(secretKeyPath)) {
        publicKeyB64 = fs.readFileSync(publicKeyPath, 'utf-8').trim();
        secretKeyB64 = fs.readFileSync(secretKeyPath, 'utf-8').trim();
        console.log('✓ Existing Ed25519 keypair preserved');
    } else {
        const keyPair = generateKeyPair();
        publicKeyB64 = keyPair.publicKey;
        secretKeyB64 = keyPair.secretKey;

        fs.writeFileSync(publicKeyPath, keyPair.publicKey);
        fs.writeFileSync(secretKeyPath, keyPair.secretKey, { mode: 0o600 });
        console.log('✓ Generated Ed25519 keypair');
    }

    const keysStorePath = path.join(cwd, 'config/keys.json');
    let keysStore = {
        schemaVersion: '1',
        defaultKeyId,
        trustedKeys: {}
    };
    let keysStoreChanged = false;
    if (fs.existsSync(keysStorePath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(keysStorePath, 'utf-8'));
            if (existing && typeof existing === 'object') {
                keysStore = {
                    schemaVersion: String(existing.schemaVersion || '1'),
                    defaultKeyId: String(existing.defaultKeyId || defaultKeyId),
                    trustedKeys: (existing.trustedKeys && typeof existing.trustedKeys === 'object')
                        ? existing.trustedKeys
                        : {}
                };
            }
        } catch {
            // Keep defaults and rewrite below.
            keysStoreChanged = true;
        }
    } else {
        keysStoreChanged = true;
    }

    if (!keysStore.trustedKeys[defaultKeyId]) {
        keysStore.trustedKeys[defaultKeyId] = {
            requesterId: 'agent:gpt',
            publicKey: publicKeyB64,
            rotationBatch: '2026Q1',
            notBefore: nowIso,
            expiresAt: expiresAtIso,
            validFrom: new Date().toISOString(),
            validUntil: null,
            deprecated: false
        };
        keysStoreChanged = true;
    }
    if (!keysStore.trustedKeys[policySignerKeyId]) {
        keysStore.trustedKeys[policySignerKeyId] = {
            publicKey: publicKeyB64,
            rotationBatch: '2026Q1',
            notBefore: nowIso,
            expiresAt: expiresAtIso,
            validFrom: new Date().toISOString(),
            validUntil: null,
            deprecated: false
        };
        keysStoreChanged = true;
    }

    // Lifecycle hardening migration for existing keys.
    for (const [keyId, keyCfg] of Object.entries(keysStore.trustedKeys)) {
        if (!keyCfg || typeof keyCfg !== 'object') {
            continue;
        }

        if (typeof keyCfg.notBefore !== 'string' || !keyCfg.notBefore.trim()) {
            keyCfg.notBefore = (typeof keyCfg.validFrom === 'string' && keyCfg.validFrom.trim())
                ? keyCfg.validFrom
                : nowIso;
            keysStoreChanged = true;
        }

        if (typeof keyCfg.expiresAt !== 'string' || !keyCfg.expiresAt.trim()) {
            keyCfg.expiresAt = (typeof keyCfg.validUntil === 'string' && keyCfg.validUntil.trim())
                ? keyCfg.validUntil
                : expiresAtIso;
            keysStoreChanged = true;
        }

        // Keep legacy aliases populated for compatibility with old tooling.
        if (typeof keyCfg.validFrom !== 'string' || !keyCfg.validFrom.trim()) {
            keyCfg.validFrom = keyCfg.notBefore;
            keysStoreChanged = true;
        }
        if (typeof keyCfg.validUntil !== 'string' || !keyCfg.validUntil.trim()) {
            keyCfg.validUntil = keyCfg.expiresAt;
            keysStoreChanged = true;
        }

        keysStore.trustedKeys[keyId] = keyCfg;
    }

    if (keysStore.defaultKeyId !== defaultKeyId) {
        keysStore.defaultKeyId = defaultKeyId;
        keysStoreChanged = true;
    }

    if (keysStoreChanged) {
        fs.writeFileSync(keysStorePath, JSON.stringify(keysStore, null, 2));
        console.log('✓ Created/updated trusted key store: config/keys.json');
    } else {
        console.log('✓ Trusted key store exists: config/keys.json');
    }

    // Policy signature envelope (strict-mode preflight support)
    const policySignResult = createPolicySignatureEnvelope({
        policyObj,
        secretKeyB64,
        keyId: policySignerKeyId
    });
    if (!policySignResult.ok) {
        throw new Error(`Policy signing failed: ${policySignResult.message}`);
    }
    fs.writeFileSync(path.join(cwd, 'config/policy.sig.json'), JSON.stringify(policySignResult.envelope, null, 2));
    console.log('✓ Wrote policy signature: config/policy.sig.json');

    console.log(`  Public Key:  keys/public.key`);
    console.log(`  Secret Key:  keys/secret.key`);
    console.log(`  Trusted Key: config/keys.json -> ${defaultKeyId}`);
    console.log(`  Policy Sig:  config/policy.sig.json (${policySignerKeyId})`);

    // Initialize data stores
    const nonceDbPath = path.join(cwd, 'data/nonce.db.json');
    if (!fs.existsSync(nonceDbPath)) {
        fs.writeFileSync(nonceDbPath, JSON.stringify({ entries: [] }, null, 2));
        console.log('✓ Created nonce store: data/nonce.db.json');
    }

    const auditLogPath = path.join(cwd, 'data/audit.log.jsonl');
    if (!fs.existsSync(auditLogPath)) {
        fs.writeFileSync(auditLogPath, '');
        console.log('✓ Created audit log: data/audit.log.jsonl');
    }

    const rateLimitDbPath = path.join(cwd, 'data/rate-limit.db.json');
    if (!fs.existsSync(rateLimitDbPath)) {
        fs.writeFileSync(rateLimitDbPath, JSON.stringify({ entries: [] }, null, 2));
        console.log('✓ Created rate limiter store: data/rate-limit.db.json');
    }

    const policyStatePath = path.join(cwd, 'data/policy.state.json');
    if (!fs.existsSync(policyStatePath)) {
        fs.writeFileSync(policyStatePath, JSON.stringify({
            schemaVersion: '1',
            lastAccepted: null,
            updatedAt: null
        }, null, 2));
        console.log('✓ Created policy state store: data/policy.state.json');
    }

    console.log('\n✅ LetterBlack Sentinel initialized successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review and customize: config/policy.default.json');
    console.log('  2. Re-sign after policy edits: lbe policy-sign --config config/policy.default.json');
    console.log('  3. Review trusted keys: config/keys.json');
    console.log('  4. Protect your secret key: keys/secret.key');
    console.log('  5. Create a proposal.json and run: lbe verify --in proposal.json');

    return { success: true };
}
