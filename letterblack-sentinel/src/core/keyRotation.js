// src/core/keyRotation.js
// Multi-key support and key rotation for Ed25519 signatures

import fs from 'fs';
import path from 'path';
import { verifyEd25519, generateKeyPair } from './signature.js';

export class KeyRegistry {
    constructor(keysDir = './keys') {
        this.keysDir = keysDir;
        this.keys = new Map();
    }

    /**
     * Load public keys from keys directory
     * Expected format: <keyId>.pub (e.g., "primary.pub", "2024-02-v1.pub")
     */
    loadPublicKeys() {
        if (!fs.existsSync(this.keysDir)) {
            throw new Error(`Keys directory not found: ${this.keysDir}`);
        }

        const files = fs.readdirSync(this.keysDir);
        const pubKeyFiles = files.filter(f => f.endsWith('.pub') || f === 'public.key');

        for (const file of pubKeyFiles) {
            const keyId = file.replace(/\.(pub|key)$/, '');
            const keyPath = path.join(this.keysDir, file);
            const keyB64 = fs.readFileSync(keyPath, 'utf-8').trim();

            this.keys.set(keyId, {
                keyId,
                publicKey: keyB64,
                type: 'ed25519',
                loadedAt: new Date().toISOString()
            });
        }

        return this.keys.size;
    }

    /**
     * Get public key by keyId
     */
    getPublicKey(keyId) {
        const key = this.keys.get(keyId);
        if (!key) {
            throw new Error(`Key not found: ${keyId}`);
        }
        return key.publicKey;
    }

    /**
     * List all loaded keys
     */
    listKeys() {
        return Array.from(this.keys.values());
    }

    /**
     * Verify signature with specific keyId
     */
    verify({ payloadObj, sigB64, keyId }) {
        const pubKeyB64 = this.getPublicKey(keyId);
        return verifyEd25519({ payloadObj, sigB64, pubKeyB64 });
    }

    /**
     * Check if a key is valid and not expired
     */
    isKeyValid(keyId, maxAgeMs = null) {
        const key = this.keys.get(keyId);
        if (!key) return false;

        if (maxAgeMs) {
            const age = Date.now() - new Date(key.loadedAt).getTime();
            if (age > maxAgeMs) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate a new keypair with versioned keyId
     */
    static generateVersionedKey(keyId = null) {
        if (!keyId) {
            const date = new Date().toISOString().split('T')[0];
            keyId = `key-${date}-v1`;
        }

        const keyPair = generateKeyPair();

        return {
            keyId,
            publicKey: keyPair.publicKey,
            secretKey: keyPair.secretKey,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Save a keypair to disk
     */
    static saveKeyPair({ keyId, publicKey, secretKey }, keysDir = './keys') {
        if (!fs.existsSync(keysDir)) {
            fs.mkdirSync(keysDir, { recursive: true });
        }

        const pubKeyPath = path.join(keysDir, `${keyId}.pub`);
        const secretKeyPath = path.join(keysDir, `${keyId}.key`);

        fs.writeFileSync(pubKeyPath, publicKey, { mode: 0o644 });
        fs.writeFileSync(secretKeyPath, secretKey, { mode: 0o600 });

        console.log(`✅ Key pair saved:`);
        console.log(`   Public:  ${pubKeyPath}`);
        console.log(`   Secret:  ${secretKeyPath}`);
        console.log(`   Key ID:  ${keyId}`);

        return { pubKeyPath, secretKeyPath };
    }

    /**
     * Rotate to a new key (generate and save)
     */
    static rotateKey(oldKeyId = null, keysDir = './keys') {
        const newKeyId = `rotated-${Date.now()}`;
        const keyPair = KeyRegistry.generateVersionedKey(newKeyId);
        const paths = KeyRegistry.saveKeyPair(keyPair, keysDir);

        console.log(`\n🔄 Key rotation complete:`);
        if (oldKeyId) {
            console.log(`   Deprecated: ${oldKeyId}`);
        }
        console.log(`   New key ID: ${newKeyId}`);
        console.log(`\n⚠️  Update policy.json to trust the new key`);
        console.log(`   Distribute ${paths.pubKeyPath} to agents`);

        return keyPair;
    }
}

/**
 * Policy-based key trust configuration
 * 
 * Example in policy.json:
 * {
 *   "trustedKeys": {
 *     "primary": {
 *       "publicKey": "base64...",
 *       "validFrom": "2024-01-01T00:00:00Z",
 *       "validUntil": null,
 *       "deprecated": false
 *     },
 *     "2024-02-v1": {
 *       "publicKey": "base64...",
 *       "validFrom": "2024-02-17T00:00:00Z",
 *       "validUntil": null,
 *       "deprecated": false
 *     }
 *   }
 * }
 */
export function evaluateKeyTrust(keyId, policy) {
    const trustedKeys = policy.trustedKeys || {};
    const keyConfig = trustedKeys[keyId];

    if (!keyConfig) {
        return {
            trusted: false,
            reason: 'KEY_NOT_TRUSTED',
            message: `Key '${keyId}' is not in trusted keys list`
        };
    }

    if (keyConfig.deprecated) {
        return {
            trusted: false,
            reason: 'KEY_DEPRECATED',
            message: `Key '${keyId}' is deprecated`
        };
    }

    const now = new Date();

    if (keyConfig.validFrom) {
        const validFrom = new Date(keyConfig.validFrom);
        if (now < validFrom) {
            return {
                trusted: false,
                reason: 'KEY_NOT_YET_VALID',
                message: `Key '${keyId}' not valid until ${keyConfig.validFrom}`
            };
        }
    }

    if (keyConfig.validUntil) {
        const validUntil = new Date(keyConfig.validUntil);
        if (now > validUntil) {
            return {
                trusted: false,
                reason: 'KEY_EXPIRED',
                message: `Key '${keyId}' expired on ${keyConfig.validUntil}`
            };
        }
    }

    return {
        trusted: true,
        publicKey: keyConfig.publicKey
    };
}
