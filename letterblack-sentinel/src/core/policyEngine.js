// src/core/policyEngine.js
// Deny-by-default policy evaluation engine

import path from 'path';

function isUnderRoot(p, roots) {
    if (!roots || roots.length === 0) return false;

    const norm = path.resolve(p);
    return roots.some(r => {
        const resolvedRoot = path.resolve(r);
        return norm === resolvedRoot || norm.startsWith(resolvedRoot + path.sep);
    });
}

function matchPattern(str, pattern) {
    // Simple glob pattern matching for deny patterns
    // Supports ** and * wildcards
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
}

export function evaluatePolicy(policy, cmd) {
    // Default deny
    if (!policy || policy.default === 'DENY' && !policy.requesters) {
        return block('POLICY_NOT_CONFIGURED', 'No policy configured');
    }

    const requester = policy.requesters?.[cmd.requesterId];
    if (!requester) {
        return block('REQUESTER_NOT_ALLOWED', `Requester '${cmd.requesterId}' not in policy`);
    }

    // Check command is allowed
    if (!requester.allowCommands?.includes(cmd.id)) {
        return block('COMMAND_NOT_ALLOWED', `Command '${cmd.id}' not allowed for requester`);
    }

    // Check adapter is allowed
    if (!requester.allowAdapters?.includes(cmd.payload?.adapter)) {
        return block('ADAPTER_NOT_ALLOWED', `Adapter '${cmd.payload?.adapter}' not allowed`);
    }

    // Filesystem root enforcement
    if (cmd.payload?.cwd) {
        const roots = requester.filesystem?.roots || [];
        if (roots.length === 0) {
            return block('NO_FILESYSTEM_ROOTS_DEFINED', 'No filesystem roots defined for requester');
        }
        if (!isUnderRoot(cmd.payload.cwd, roots)) {
            return block('CWD_OUTSIDE_ALLOWED_ROOT', `Path '${cmd.payload.cwd}' not under allowed roots`);
        }

        // Check deny patterns
        const denyPatterns = requester.filesystem?.denyPatterns || [];
        for (const pattern of denyPatterns) {
            if (matchPattern(cmd.payload.cwd, pattern)) {
                return block('PATH_DENIED_BY_PATTERN', `Path '${cmd.payload.cwd}' matches deny pattern: ${pattern}`);
            }
        }
    }

    // Shell command enforcement
    if (cmd.id === 'RUN_SHELL') {
        const allow = requester.exec?.allowCmds || [];
        const deny = requester.exec?.denyCmds || [];
        const c = cmd.payload?.cmd;

        if (deny.includes(c)) {
            return block('SHELL_CMD_DENIED', `Shell command '${c}' is explicitly denied`);
        }

        if (allow.length > 0 && !allow.includes(c)) {
            return block('SHELL_CMD_NOT_ALLOWLISTED', `Shell command '${c}' not in allowlist`);
        }
    }

    return {
        allowed: true,
        reason: null,
        message: 'Policy check passed'
    };
}

function block(code, message) {
    return {
        allowed: false,
        reason: code,
        message: message
    };
}

export function riskLevel(cmd) {
    // Simple risk scoring
    if (cmd.payload?.cmd === 'rm') return 'CRITICAL';
    if (['delete', 'destroy', 'remove'].some(w => cmd.id.toLowerCase().includes(w))) return 'HIGH';
    if (['write', 'create', 'update'].some(w => cmd.id.toLowerCase().includes(w))) return 'MEDIUM';
    return 'LOW';
}
