import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { spawn } from 'child_process';

const DEFAULT_HOST = process.env.SENTINEL_API_HOST || process.env.HOST || '0.0.0.0';
const DEFAULT_PORT = Number(process.env.SENTINEL_API_PORT || process.env.PORT || 8080);
const API_TOKEN = process.env.SENTINEL_API_TOKEN || '';
const ALLOW_NO_AUTH = String(process.env.SENTINEL_ALLOW_NO_AUTH || '').toLowerCase() === 'true';

const POLICY_PATH = process.env.SENTINEL_POLICY_PATH || path.resolve('config/policy.default.json');
const POLICY_SIG_PATH = process.env.SENTINEL_POLICY_SIG || path.resolve('config/policy.sig.json');
const POLICY_STATE_PATH = process.env.SENTINEL_POLICY_STATE || path.resolve('data/policy.state.json');
const KEYS_STORE_PATH = process.env.SENTINEL_KEYS_STORE || path.resolve('config/keys.json');
const INTEGRITY_MANIFEST_PATH = process.env.SENTINEL_INTEGRITY_MANIFEST || path.resolve('config/integrity.manifest.json');
const INTEGRITY_STRICT_DEFAULT = String(process.env.SENTINEL_INTEGRITY_STRICT || '').toLowerCase() === 'true';
const BIN_PATH = path.resolve('bin/lbe.js');
const MAX_BODY_BYTES = Number(process.env.SENTINEL_MAX_BODY_BYTES || 1024 * 1024);

function withCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function sendJson(res, statusCode, payload) {
    withCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload, null, 2));
}

function parseJsonOrNull(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function isAuthorized(req) {
    if (ALLOW_NO_AUTH) return true;
    if (!API_TOKEN) return false;

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return false;

    const providedToken = authHeader.slice('Bearer '.length).trim();
    const a = Buffer.from(providedToken, 'utf8');
    const b = Buffer.from(API_TOKEN, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];

        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error(`Request body too large. Limit is ${MAX_BODY_BYTES} bytes`));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8').trim();
                resolve(raw ? JSON.parse(raw) : {});
            } catch (error) {
                reject(new Error(`Invalid JSON body: ${error.message}`));
            }
        });

        req.on('error', (error) => {
            reject(error);
        });
    });
}

function runCli(command, args = []) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const child = spawn(process.execPath, [BIN_PATH, command, ...args], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });

        child.on('error', (error) => {
            reject(error);
        });

        child.on('close', (exitCode) => {
            resolve({
                command,
                args,
                exitCode: exitCode ?? 9,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                durationMs: Date.now() - startedAt
            });
        });
    });
}

function httpStatusFromExitCode(exitCode) {
    if (exitCode === 0) return 200;
    if ([2, 3, 4, 5, 6, 7].includes(exitCode)) return 422;
    if (exitCode === 8 || exitCode === 9) return 500;
    return 400;
}

function formatCliResponse(cliResult) {
    const stdoutJson = parseJsonOrNull(cliResult.stdout);
    const stderrJson = parseJsonOrNull(cliResult.stderr);

    return {
        ok: cliResult.exitCode === 0,
        exitCode: cliResult.exitCode,
        durationMs: cliResult.durationMs,
        result: stdoutJson || stderrJson || null,
        stdout: stdoutJson ? undefined : cliResult.stdout || undefined,
        stderr: stderrJson ? undefined : cliResult.stderr || undefined
    };
}

function writeTempProposalFile(proposal) {
    const tempPath = path.join(
        os.tmpdir(),
        `sentinel-proposal-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`
    );

    fs.writeFileSync(tempPath, JSON.stringify(proposal, null, 2), 'utf8');
    return tempPath;
}

async function executeProposalCommand(command, body) {
    if (!body || typeof body !== 'object' || typeof body.proposal !== 'object' || !body.proposal) {
        return {
            status: 400,
            payload: {
                ok: false,
                error: 'INVALID_REQUEST',
                message: 'Body must include { "proposal": { ... } }'
            }
        };
    }

    const tempProposalPath = writeTempProposalFile(body.proposal);
    try {
        const options = body.options || {};
        const integrityStrict = options.integrityStrict === true || INTEGRITY_STRICT_DEFAULT;
        const args = [
            '--in', tempProposalPath,
            '--config', options.policyPath || POLICY_PATH,
            '--policy-sig', options.policySigPath || POLICY_SIG_PATH,
            '--policy-state', options.policyStatePath || POLICY_STATE_PATH,
            '--keys-store', options.keysStorePath || KEYS_STORE_PATH,
            '--integrity-manifest', options.integrityManifestPath || INTEGRITY_MANIFEST_PATH
        ];

        if (integrityStrict) {
            args.push('--integrity-strict', 'true');
        }

        if (options.policyUnsignedOk === true) {
            args.push('--policy-unsigned-ok', 'true');
        }

        const cliResult = await runCli(command, args);
        return {
            status: httpStatusFromExitCode(cliResult.exitCode),
            payload: formatCliResponse(cliResult)
        };
    } finally {
        try {
            fs.unlinkSync(tempProposalPath);
        } catch {
            // Best-effort cleanup.
        }
    }
}

async function handleHealth() {
    const cliResult = await runCli('health', ['--json', 'true']);
    return {
        status: httpStatusFromExitCode(cliResult.exitCode),
        payload: formatCliResponse(cliResult)
    };
}

export function startSentinelApiServer({
    host = DEFAULT_HOST,
    port = DEFAULT_PORT
} = {}) {
    const server = http.createServer(async (req, res) => {
        if (req.method === 'OPTIONS') {
            withCorsHeaders(res);
            res.writeHead(204);
            res.end();
            return;
        }

        if (!isAuthorized(req)) {
            sendJson(res, 401, {
                ok: false,
                error: 'UNAUTHORIZED',
                message: ALLOW_NO_AUTH
                    ? 'Unauthorized request'
                    : 'Use header: Authorization: Bearer <SENTINEL_API_TOKEN>'
            });
            return;
        }

        try {
            if (req.method === 'GET' && req.url === '/v1/health') {
                const response = await handleHealth();
                sendJson(res, response.status, response.payload);
                return;
            }

            if (req.method === 'POST' && (req.url === '/v1/verify' || req.url === '/v1/dryrun' || req.url === '/v1/run')) {
                const body = await parseRequestBody(req);
                const command = req.url.replace('/v1/', '');
                const response = await executeProposalCommand(command, body);
                sendJson(res, response.status, response.payload);
                return;
            }

            if (req.method === 'GET' && req.url === '/') {
                sendJson(res, 200, {
                    ok: true,
                    service: 'letterblack-sentinel-api',
                    version: 'v1',
                    endpoints: ['/v1/health', '/v1/verify', '/v1/dryrun', '/v1/run']
                });
                return;
            }

            sendJson(res, 404, {
                ok: false,
                error: 'NOT_FOUND',
                message: 'Use GET /v1/health or POST /v1/{verify|dryrun|run}'
            });
        } catch (error) {
            sendJson(res, 500, {
                ok: false,
                error: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    server.listen(port, host, () => {
        const authMode = ALLOW_NO_AUTH ? 'DISABLED' : (API_TOKEN ? 'TOKEN' : 'MISSING_TOKEN');
        console.log(`[sentinel-api] listening on http://${host}:${port}`);
        console.log(`[sentinel-api] auth mode: ${authMode}`);
        console.log(`[sentinel-api] policy: ${POLICY_PATH}`);
        console.log(`[sentinel-api] keys store: ${KEYS_STORE_PATH}`);
    });

    server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE') {
            console.error(`[sentinel-api] port ${port} is already in use`);
            process.exitCode = 1;
            return;
        }
        console.error(`[sentinel-api] startup error: ${error.message}`);
        process.exitCode = 1;
    });

    return server;
}
