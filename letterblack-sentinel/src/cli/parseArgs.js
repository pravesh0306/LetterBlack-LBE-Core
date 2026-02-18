// src/cli/parseArgs.js
// Command-line argument parser

export function parseArgs(argv) {
    // argv should already have node and script removed
    if (argv.length === 0) {
        return { command: 'help', opts: {} };
    }

    const command = argv[0];
    const opts = {};

    for (let i = 1; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].substring(2);
            // Handle --key=value format
            if (key.includes('=')) {
                const [k, v] = key.split('=');
                opts[k] = v;
            } else {
                const nextArg = argv[i + 1];
                if (!nextArg || nextArg.startsWith('-')) {
                    opts[key] = true;
                } else {
                    opts[key] = nextArg;
                    i++;
                }
            }
        } else if (argv[i].startsWith('-')) {
            const key = argv[i].substring(1);
            const nextArg = argv[i + 1];
            if (!nextArg || nextArg.startsWith('-')) {
                opts[key] = true;
            } else {
                opts[key] = nextArg;
                i++;
            }
        }
    }

    return { command, opts };
}

export function printHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║          LetterBlack Sentinel — CLI Governance            ║
║     Contract-Driven AI Execution Pipeline v0.1.0          ║
╚═══════════════════════════════════════════════════════════╝

USAGE:
  lbe [command] [options]

COMMANDS:
  init      Initialize LetterBlack Sentinel environment
  verify    Verify a proposal (validate, don't execute)
  dryrun    Validate and simulate execution (no changes)
  run       Validate and execute a proposal
  policy-sign  Sign policy and write policy signature envelope
  health    Run deployment/runtime health checks
  integrity-check  Verify controller integrity manifest
  integrity-generate  Generate controller integrity manifest
  audit-verify  Verify audit log hash-chain integrity
  help      Show this help message

OPTIONS:
  --in              Input file (JSON proposal)
  --config          Policy config file (default: ./config/policy.default.json)
  --policy          Alias for --config
  --policy-sig      Policy signature file (default: ./config/policy.sig.json)
  --policy-state    Policy monotonic state file (default: ./data/policy.state.json)
  --policy-unsigned-ok  Allow unsigned policy (dev-only; default: false)
  --policy-key-id   Signer keyId for policy-sign (default: policy-signer-v1-2026Q1)
  --secret-key-file Secret key for policy-sign (default: ./keys/secret.key)
  --data-dir        Data directory for health checks (default: ./data)
  --nonce-db        Nonce DB path for health checks
  --rate-db         Rate-limit DB path for health checks
  --keys-store      Trusted keys store (default: ./config/keys.json)
  --pub-key         Public key for verification (Ed25519 base64)
  --pub-key-file    Legacy single-key file path (fallback mode)
  --integrity-strict  Fail verify/dryrun/run if integrity check fails
  --integrity-manifest Integrity manifest path (default: ./config/integrity.manifest.json)
  --manifest        Manifest path override for integrity-check
  --out             Output path for integrity-generate
  --audit           Audit log file (default: ./data/audit.log.jsonl)
  --json            JSON output (default: true)
  --fail-fast       Stop at first audit integrity error (default: true)
  --max             Max audit entries to process (optional)
  --version         Show version
  --help            Show this help message

EXAMPLES:
  lbe init
  lbe verify --in proposal.json --keys-store ./config/keys.json
  lbe dryrun --in proposal.json --keys-store ./config/keys.json
  lbe run --in proposal.json --keys-store ./config/keys.json
  lbe policy-sign --config ./config/policy.default.json --policy-sig ./config/policy.sig.json
  lbe health --json true
  lbe integrity-generate --out ./config/integrity.manifest.json
  lbe integrity-check --integrity-strict --manifest ./config/integrity.manifest.json
  lbe audit-verify --audit ./data/audit.log.jsonl
  lbe verify --in proposal.json --pub-key-file ./keys/public.key

For more info, visit: https://github.com/Letterblack0306/letterblack-sentinel
`);
}
