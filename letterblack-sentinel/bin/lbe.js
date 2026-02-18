#!/usr/bin/env node

// bin/lbe.js
// LetterBlack Sentinel CLI entrypoint

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs, printHelp } from '../src/cli/parseArgs.js';
import { initCommand } from '../src/cli/commands/init.js';
import { verifyCommand } from '../src/cli/commands/verify.js';
import { dryrunCommand } from '../src/cli/commands/dryrun.js';
import { runCommand } from '../src/cli/commands/run.js';
import { auditVerifyCommand } from '../src/cli/commands/auditVerify.js';
import { integrityCheckCommand, integrityGenerateCommand } from '../src/cli/commands/integrityCheck.js';
import { performIntegrityCheck } from '../src/core/integrity.js';
import { policySignCommand } from '../src/cli/commands/policySign.js';
import { healthCommand } from '../src/cli/commands/health.js';

function toBoolean(value, defaultValue = false) {
    if (value === undefined) return defaultValue;
    if (value === true || value === false) return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    return defaultValue;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

async function main() {
    const { command, opts } = parseArgs(process.argv.slice(2));

    // Handle version flag
    if (opts.version) {
        console.log(`LetterBlack Sentinel v${packageJson.version}`);
        process.exit(0);
    }

    // Handle help flag or no command
    if (opts.help || !command) {
        printHelp();
        process.exit(0);
    }

    try {
        // Parse --pub-key-file if provided
        if (opts['pub-key-file']) {
            try {
                opts['pub-key'] = fs.readFileSync(path.resolve(opts['pub-key-file']), 'utf-8').trim();
            } catch (error) {
                console.error(`Error reading public key file: ${error.message}`);
                process.exit(1);
            }
        }

        // Route to command handler
        if (['verify', 'dryrun', 'run'].includes(command)) {
            const integrityStrict = toBoolean(opts['integrity-strict'], false);
            const integrityManifestPath = path.resolve(opts['integrity-manifest'] || 'config/integrity.manifest.json');
            const integrityResult = await performIntegrityCheck({
                strict: integrityStrict,
                manifestPath: integrityManifestPath
            });
            if (!integrityResult.valid) {
                console.error(JSON.stringify({
                    status: 'error',
                    error: integrityResult.reason || 'INTEGRITY_CHECK_FAILED',
                    message: integrityResult.message
                }, null, 2));
                process.exit(8);
            }
        }

        switch (command) {
            case 'init':
                initCommand(opts);
                break;

            case 'verify':
                await verifyCommand(opts);
                break;

            case 'dryrun':
                await dryrunCommand(opts);
                break;

            case 'run':
                await runCommand(opts);
                break;

            case 'audit-verify':
                await auditVerifyCommand(opts);
                break;

            case 'integrity-check':
                await integrityCheckCommand(opts);
                break;

            case 'integrity-generate':
                await integrityGenerateCommand(opts);
                break;

            case 'policy-sign':
                await policySignCommand(opts);
                break;

            case 'health':
                await healthCommand(opts);
                break;

            default:
                console.error(`Unknown command: ${command}`);
                printHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error(JSON.stringify({
            status: 'error',
            error: 'INTERNAL_ERROR',
            message: error.message,
            stack: process.env.DEBUG ? error.stack : undefined
        }));
        process.exit(9);
    }
}

main().catch((error) => {
    console.error(JSON.stringify({
        status: 'error',
        error: 'FATAL_ERROR',
        message: error.message
    }));
    process.exit(9);
});
