// src/core/errors.js
// Custom error classes

export class ValidationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.details = details;
    }
}

export class PolicyError extends Error {
    constructor(message, reason) {
        super(message);
        this.name = 'PolicyError';
        this.reason = reason;
    }
}

export class SignatureError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SignatureError';
    }
}

export class ReplayError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReplayError';
    }
}

export class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigError';
    }
}
