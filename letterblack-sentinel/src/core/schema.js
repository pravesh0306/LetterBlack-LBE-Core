// src/core/schema.js
// Command schema validation

export const COMMAND_SCHEMA = {
    type: 'object',
    required: [
        'id',
        'commandId',
        'requesterId',
        'sessionId',
        'timestamp',
        'nonce',
        'requires',
        'payload',
        'signature'
    ],
    properties: {
        id: {
            type: 'string',
            pattern: '^[A-Z_]+$',
            minLength: 1,
            maxLength: 50
        },
        commandId: {
            type: 'string',
            pattern: '^[a-f0-9\\-]+$',
            minLength: 36,
            maxLength: 36
        },
        requesterId: {
            type: 'string',
            minLength: 3,
            maxLength: 100
        },
        sessionId: {
            type: 'string',
            minLength: 3
        },
        timestamp: {
            type: 'number',
            minimum: 1000000000
        },
        nonce: {
            type: 'string',
            minLength: 32,
            maxLength: 128
        },
        requires: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
        },
        risk: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        },
        payload: {
            type: 'object',
            required: ['adapter'],
            properties: {
                adapter: { type: 'string' },
                cmd: { type: 'string' },
                args: { type: 'array' },
                cwd: { type: 'string' }
            }
        },
        signature: {
            type: 'object',
            required: ['alg', 'keyId', 'sig'],
            properties: {
                alg: { type: 'string', enum: ['ed25519'] },
                keyId: { type: 'string' },
                sig: { type: 'string', minLength: 10 }
            }
        }
    }
};

export function validateSchema(obj, schema) {
    const errors = [];

    // Check required fields
    if (schema.required) {
        for (const field of schema.required) {
            if (!(field in obj)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }

    // Check field types and properties
    for (const [field, fieldSchema] of Object.entries(schema.properties || {})) {
        if (!(field in obj)) continue;

        const value = obj[field];

        // Type check
        if (fieldSchema.type === 'string' && typeof value !== 'string') {
            errors.push(`Field '${field}' must be string, got ${typeof value}`);
        }
        if (fieldSchema.type === 'number' && typeof value !== 'number') {
            errors.push(`Field '${field}' must be number, got ${typeof value}`);
        }
        if (fieldSchema.type === 'object' && typeof value !== 'object') {
            errors.push(`Field '${field}' must be object, got ${typeof value}`);
        }
        if (fieldSchema.type === 'array' && !Array.isArray(value)) {
            errors.push(`Field '${field}' must be array, got ${typeof value}`);
        }

        // String validations
        if (fieldSchema.type === 'string' && typeof value === 'string') {
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
                errors.push(`Field '${field}' must be at least ${fieldSchema.minLength} chars`);
            }
            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
                errors.push(`Field '${field}' must be at most ${fieldSchema.maxLength} chars`);
            }
            if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
                errors.push(`Field '${field}' does not match pattern: ${fieldSchema.pattern}`);
            }
            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                errors.push(`Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`);
            }
        }

        // Number validations
        if (fieldSchema.type === 'number' && typeof value === 'number') {
            if (fieldSchema.minimum && value < fieldSchema.minimum) {
                errors.push(`Field '${field}' must be >= ${fieldSchema.minimum}`);
            }
        }

        // Nested object validation
        if (fieldSchema.properties && typeof value === 'object' && value !== null) {
            const nestedValidation = validateSchema(value, fieldSchema);
            nestedValidation.errors.forEach(e => {
                errors.push(`${field}.${e}`);
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
