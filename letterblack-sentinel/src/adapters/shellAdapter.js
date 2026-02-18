// src/adapters/shellAdapter.js
// Safe shell command execution adapter with strict allowlisting

import { execSync } from 'child_process';
import path from 'path';

export async function shellAdapter(cmd, policy, requester) {
    const payload = cmd.payload;
    const timeout = 30000; // 30 second timeout
    const maxOutputSize = 1024 * 1024; // 1MB

    // Validate adapter match
    if (payload.adapter !== 'shell') {
        return {
            adapter: 'shell',
            commandId: cmd.commandId,
            status: 'error',
            error: 'Adapter mismatch',
            exitCode: 1
        };
    }

    // Validate command and cwd against policy
    const allowedCmds = requester?.exec?.allowCmds || [];
    const deniedCmds = requester?.exec?.denyCmds || [];

    if (deniedCmds.includes(payload.cmd)) {
        return {
            adapter: 'shell',
            commandId: cmd.commandId,
            status: 'blocked',
            error: `Command '${payload.cmd}' is denied`,
            exitCode: 2
        };
    }

    if (allowedCmds.length > 0 && !allowedCmds.includes(payload.cmd)) {
        return {
            adapter: 'shell',
            commandId: cmd.commandId,
            status: 'blocked',
            error: `Command '${payload.cmd}' not in allowlist`,
            exitCode: 2
        };
    }

    // Validate cwd
    const roots = requester?.filesystem?.roots || [];
    const cwdAllow = roots.some(r => {
        const resolvedRoot = path.resolve(r);
        const norm = path.resolve(payload.cwd);
        return norm === resolvedRoot || norm.startsWith(resolvedRoot + path.sep);
    });

    if (!cwdAllow) {
        return {
            adapter: 'shell',
            commandId: cmd.commandId,
            status: 'blocked',
            error: `CWD '${payload.cwd}' not authorized`,
            exitCode: 2
        };
    }

    // Execute with timeout
    try {
        const args = (payload.args || []).join(' ');
        const fullCmd = `${payload.cmd} ${args}`.trim();

        const output = execSync(fullCmd, {
            cwd: payload.cwd,
            timeout,
            encoding: 'utf8',
            maxBuffer: maxOutputSize,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        return {
            adapter: 'shell',
            commandId: cmd.commandId,
            command: payload.cmd,
            status: 'completed',
            output: output.substring(0, maxOutputSize),
            exitCode: 0,
            timestamp: new Date().toISOString()
        };
    } catch (err) {
        return {
            adapter: 'shell',
            commandId: cmd.commandId,
            command: payload.cmd,
            status: 'error',
            error: err.message,
            exitCode: err.status || 1,
            timestamp: new Date().toISOString()
        };
    }
}
