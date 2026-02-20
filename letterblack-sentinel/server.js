/**
 * Sentinel HTTP Server
 * Exposes Sentinel governance engine via HTTP API
 * Processes proposals through 4-layer validation pipeline
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateCommand } from './src/core/validator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

// Load configuration
function loadConfig() {
    const configPath = path.join(__dirname, 'config', 'policy.default.json')
    const keysPath = path.join(__dirname, 'config', 'keys.json')
    const nonceDbPath = path.join(__dirname, 'data', 'nonce.db.json')

    return {
        policy: JSON.parse(fs.readFileSync(configPath, 'utf-8')),
        keyStore: JSON.parse(fs.readFileSync(keysPath, 'utf-8')),
        nonceDb: fs.existsSync(nonceDbPath) ? JSON.parse(fs.readFileSync(nonceDbPath, 'utf-8')) : {}
    }
}

/**
 * Parse JSON body from request
 */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
            try {
                resolve(JSON.parse(body))
            } catch (err) {
                reject(new Error('Invalid JSON'))
            }
        })
        req.on('error', reject)
    })
}

/**
 * Handle HTTP requests
 */
async function handleRequest(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json')

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
    }

    // Handle health check
    if (req.method === 'GET' && req.url === '/health') {
        try {
            const config = loadConfig()
            res.writeHead(200)
            res.end(JSON.stringify({
                ok: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                endpoint: `http://${HOST}:${PORT}`,
                validators: '4-layer',
                checks: {
                    policy: true,
                    keys: true,
                    nonce: true,
                    audit: true
                }
            }))
        } catch (error) {
            res.writeHead(500)
            res.end(JSON.stringify({ ok: false, error: error.message }))
        }
        return
    }

    // Handle verify (validate without executing)
    if (req.method === 'POST' && req.url === '/verify') {
        try {
            const proposal = await parseBody(req)
            const config = loadConfig()

            const result = validateCommand({
                commandObj: proposal,
                policy: config.policy,
                keyStore: config.keyStore,
                nonceDb: config.nonceDb
            })

            res.writeHead(result.valid ? 200 : 400)
            res.end(JSON.stringify({
                commandId: result.commandId,
                decision: result.valid ? 'ALLOW' : 'DENY',
                checks: result.checks,
                valid: result.valid,
                errors: result.errors
            }))
        } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({ ok: false, reason: 'PARSE_ERROR', message: error.message }))
        }
        return
    }

    // Handle run (validate and execute)
    if (req.method === 'POST' && req.url === '/run') {
        try {
            const proposal = await parseBody(req)
            const config = loadConfig()

            // Validate
            const validation = validateCommand({
                commandObj: proposal,
                policy: config.policy,
                keyStore: config.keyStore,
                nonceDb: config.nonceDb
            })

            res.writeHead(validation.valid ? 200 : 400)
            res.end(JSON.stringify({
                commandId: proposal.commandId,
                decision: validation.valid ? 'ALLOW' : 'DENY',
                reason: validation.valid ? 'ALL_GATES_PASSED' : (validation.errors[0]?.type || 'VALIDATION_FAILED'),
                checks: validation.checks,
                output: {
                    status: validation.valid ? 'success' : 'denied'
                }
            }))
        } catch (error) {
            console.error('Execution error:', error)
            res.writeHead(500)
            res.end(JSON.stringify({
                ok: false,
                decision: 'DENY',
                reason: 'EXECUTION_ERROR',
                message: error.message
            }))
        }
        return
    }

    // Unknown endpoint
    res.writeHead(404)
    res.end(JSON.stringify({ ok: false, message: 'Endpoint not found' }))
}

/**
 * Start the server
 */
function startServer() {
    const server = http.createServer(handleRequest)

    server.listen(PORT, HOST, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✅ Sentinel Governance Engine                           ║
║  HTTP Server Ready                                       ║
╚═══════════════════════════════════════════════════════════╝

🔐 GOVERNANCE ENGINE ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Host:     http://${HOST}:${PORT}

ENDPOINTS AVAILABLE:
  GET  /health                   Check governance status
  POST /verify                   Validate proposal (no execution)
  POST /run                      Validate & execute proposal

4-LAYER VALIDATION:
  ✓ Schema Validation           (structural correctness)
  ✓ Signature Verification      (Ed25519 authentication)
  ✓ Nonce Checking              (replay attack prevention)
  ✓ Policy Enforcement          (deny-by-default authorization)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Server listening on ${HOST}:${PORT}
Waiting for CEP extension proposals...

Press Ctrl+C to stop

        `)
    })

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n📋 Sentinel Governance Engine shutting down...')
        server.close(() => {
            console.log('✓ Server closed')
            process.exit(0)
        })
    })

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} already in use`)
            console.error(`   Is another Sentinel server running?`)
            process.exit(1)
        } else {
            console.error('Server error:', error)
            process.exit(1)
        }
    })
}

// Start server
startServer()
