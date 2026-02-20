// src/adapters/index.js
// Adapter registry and dispatcher

import { noopAdapter } from './noopAdapter.js';
import { shellAdapter } from './shellAdapter.js';
import { observerAdapter } from './observerAdapter.js';
import cepTimelineVisionAdapter from './cepTimelineVisionAdapter.js';

const ADAPTERS = {
    noop: noopAdapter,
    shell: shellAdapter,
    observer: observerAdapter,
    cepTimelineVision: cepTimelineVisionAdapter
};

export function getAdapter(name) {
    return ADAPTERS[name];
}

export async function executeAdapter(adapterName, cmd, policy, requester) {
    const adapter = getAdapter(adapterName);

    if (!adapter) {
        return {
            adapter: adapterName,
            commandId: cmd.commandId,
            status: 'error',
            error: `Adapter '${adapterName}' not found`,
            exitCode: 1
        };
    }

    try {
        return await adapter(cmd, policy, requester);
    } catch (err) {
        return {
            adapter: adapterName,
            commandId: cmd.commandId,
            status: 'error',
            error: `Adapter execution failed: ${err.message}`,
            exitCode: 9
        };
    }
}

export const AVAILABLE_ADAPTERS = Object.keys(ADAPTERS);
