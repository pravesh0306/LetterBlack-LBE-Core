/**
 * LetterBlack Sentinel - Public API Server
 * Exposes verification/execution without revealing core logic
 * 
 * Endpoints:
 *   GET  /health  - Health check
 *   POST /verify  - Validate proposal (no execution)
 *   POST /dryrun  - Simulate execution
 *   POST /run     - Execute (requires API key)
 */

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Core imports (private - never exposed)
import { validateCommand } from './src/core/validator.js';
import { executeAdapter } from './src/adapters/index.js';
import { appendAudit } from './src/core/auditLog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const VERSION = '0.2.0';

// Allowed CORS origins
// Configure via ALLOWED_ORIGINS env var (comma-separated) or defaults below
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      'null'  // CEP panels send 'null' origin
    ];

// Config paths
const CONFIG = {
  keysStorePath: join(__dirname, 'config/keys.json'),
  policyPath: join(__dirname, 'config/policy.default.json'),
  policySigPath: join(__dirname, 'config/policy.sig.json'),
  noncePath: join(__dirname, 'data/nonce.db.json'),
  policyStatePath: join(__dirname, 'data/policy.state.json'),
  rateLimitPath: join(__dirname, 'data/rate-limit.db.json'),
  auditPath: join(__dirname, 'data/audit.log.jsonl')
};

// Max body size (1MB default, configurable)
const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || '1048576', 10);

// API keys for /run endpoint (load from env or keys.json)
const API_KEYS = process.env.API_KEYS
  ? new Set(process.env.API_KEYS.split(',').map(s => s.trim()))
  : new Set();

// Simple JSON body parser with size limit
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk;
    });
    
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// CORS headers with origin allowlist
function setCors(req, res) {
  const origin = req.headers.origin || 'null';
  const isDev = process.env.NODE_ENV === 'development';
  
  // In production, strictly enforce origin allowlist
  if (ALLOWED_ORIGINS.includes(origin) || isDev) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Block unknown origins in production (return no CORS header = browser blocks)
    console.warn(`[CORS] Blocked origin: ${origin}`);
    // Don't set Access-Control-Allow-Origin — request will fail CORS
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Validate API key for protected endpoints
function validateApiKey(apiKey) {
  if (!apiKey) return false;
  
  // If API_KEYS env is set, check against it
  if (API_KEYS.size > 0) {
    return API_KEYS.has(apiKey);
  }
  
  // Fallback: require key to be at least 32 chars (basic sanity)
  // In production, always set API_KEYS env var!
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] API_KEYS not configured! All /run requests will fail.');
    return false;
  }
  
  // Dev mode: accept any non-empty key with warning
  console.warn('[SECURITY] API_KEYS not set, accepting any key (dev mode only)');
  return apiKey.length >= 16;
}

// Response helpers
function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function error(res, message, status = 400) {
  json(res, { error: message, status: 'failed' }, status);
}

// Routes
const routes = {
  // Health check
  'GET /health': async (req, res) => {
    json(res, { 
      status: 'ok', 
      service: 'letterblack-sentinel',
      version: VERSION,
      timestamp: new Date().toISOString()
    });
  },

  // Verify a proposal (validate only, no execution)
  'POST /verify': async (req, res) => {
    try {
      const proposal = await parseBody(req);
      
      const result = await validateCommand({
        cmd: proposal,
        keysStorePath: CONFIG.keysStorePath,
        policyPath: CONFIG.policyPath,
        policySigPath: CONFIG.policySigPath,
        noncePath: CONFIG.noncePath,
        policyStatePath: CONFIG.policyStatePath,
        rateLimitPath: CONFIG.rateLimitPath,
        consumeNonce: false,
        checkRateLimit: false
      });
      
      json(res, {
        status: result.valid ? 'valid' : 'invalid',
        commandId: proposal.commandId,
        checks: result.checks || {},
        risk: proposal.risk,
        ...(result.error && { reason: result.error })
      });
    } catch (e) {
      console.error('[/verify] Error:', e.message);
      error(res, 'Validation failed', 500);
    }
  },

  // Dry run (validate + simulate)
  'POST /dryrun': async (req, res) => {
    try {
      const proposal = await parseBody(req);
      
      const validation = await validateCommand({
        cmd: proposal,
        keysStorePath: CONFIG.keysStorePath,
        policyPath: CONFIG.policyPath,
        policySigPath: CONFIG.policySigPath,
        noncePath: CONFIG.noncePath,
        policyStatePath: CONFIG.policyStatePath,
        rateLimitPath: CONFIG.rateLimitPath,
        consumeNonce: false,
        checkRateLimit: false
      });

      if (!validation.valid) {
        return json(res, {
          status: 'rejected',
          reason: validation.error,
          checks: validation.checks || {}
        }, 403);
      }

      // Simulate with noop
      json(res, {
        status: 'simulated',
        commandId: proposal.commandId,
        adapter: 'noop',
        output: `[DRYRUN] Would execute: ${proposal.id}`,
        checks: validation.checks || {}
      });
    } catch (e) {
      console.error('[/dryrun] Error:', e.message);
      error(res, 'Dry run failed', 500);
    }
  },

  // Execute (validate + run) - requires API key
  'POST /run': async (req, res) => {
    try {
      const apiKey = req.headers['authorization']?.replace('Bearer ', '');
      if (!validateApiKey(apiKey)) {
        return error(res, 'Invalid or missing API key', 401);
      }
      
      const proposal = await parseBody(req);
      
      const validation = await validateCommand({
        cmd: proposal,
        keysStorePath: CONFIG.keysStorePath,
        policyPath: CONFIG.policyPath,
        policySigPath: CONFIG.policySigPath,
        noncePath: CONFIG.noncePath,
        policyStatePath: CONFIG.policyStatePath,
        rateLimitPath: CONFIG.rateLimitPath,
        consumeNonce: true,
        checkRateLimit: true
      });

      if (!validation.valid) {
        try {
          await appendAudit(CONFIG.auditPath, {
            type: 'REJECTED',
            commandId: proposal.commandId,
            reason: validation.error,
            timestamp: Date.now()
          });
        } catch (auditErr) {
          console.error('Audit write failed:', auditErr.message);
        }
        
        return json(res, {
          status: 'rejected',
          reason: validation.error,
          checks: validation.checks || {}
        }, 403);
      }

      // Execute via adapter
      const execResult = await executeAdapter(
        proposal.payload.adapter,
        proposal,
        validation.policy,
        proposal.requesterId
      );
      
      try {
        await appendAudit(CONFIG.auditPath, {
          type: 'EXECUTED',
          commandId: proposal.commandId,
          adapter: proposal.payload.adapter,
          result: execResult.status,
          timestamp: Date.now()
        });
      } catch (auditErr) {
        console.error('Audit write failed:', auditErr.message);
      }

      json(res, {
        status: 'executed',
        commandId: proposal.commandId,
        adapter: proposal.payload.adapter,
        result: execResult
      });
    } catch (e) {
      console.error('[/run] Error:', e.message);
      error(res, 'Execution failed', 500);
    }
  }
};

// Server
const server = http.createServer(async (req, res) => {
  setCors(req, res);
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  const handler = routes[routeKey];

  if (handler) {
    try {
      await handler(req, res);
    } catch (e) {
      console.error('Route error:', e);
      error(res, 'Internal server error', 500);
    }
  } else {
    error(res, 'Not found', 404);
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  LetterBlack Sentinel API Server v${VERSION}              ║
║  ─────────────────────────────────────────────────    ║
║  Status:    RUNNING                                   ║
║  Port:      ${String(PORT).padEnd(4)}                                    ║
║  Endpoints:                                           ║
║    GET  /health  - Health check                       ║
║    POST /verify  - Validate proposal                  ║
║    POST /dryrun  - Simulate execution                 ║
║    POST /run     - Execute (requires API key)         ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default server;
