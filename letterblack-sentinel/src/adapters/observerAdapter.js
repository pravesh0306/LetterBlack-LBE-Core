// src/adapters/observerAdapter.js
// Observer adapter: Non-mutating, audit-only observations
// AI can report irregularities without executing mutations

export async function observerAdapter(cmd, policy, requester) {
    const startTime = Date.now();

    try {
        // Validate that this is an observe.* command (check proposal ID, not commandId)
        // proposal.id should match allowCommands in policy (e.g., 'OBSERVE_IRREGULARITY')
        const proposalId = cmd.id || '';

        if (!proposalId.toUpperCase().startsWith('OBSERVE')) {
            return {
                adapter: 'observer',
                commandId: cmd.commandId,
                status: 'error',
                error: `Observer adapter only handles OBSERVE_* commands, got '${proposalId}'`,
                exitCode: 1
            };
        }

        // Extract observation from payload
        const { source, context, issueType, description, severity, metadata } = cmd.payload || {};

        if (!issueType || !description) {
            return {
                adapter: 'observer',
                commandId: cmd.commandId,
                status: 'error',
                error: 'Observer payload must include issueType and description',
                exitCode: 1
            };
        }

        // Validate severity is reasonable
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (severity && !validSeverities.includes(severity)) {
            return {
                adapter: 'observer',
                commandId: cmd.commandId,
                status: 'error',
                error: `Invalid severity '${severity}'. Must be one of: ${validSeverities.join(', ')}`,
                exitCode: 1
            };
        }

        // Create observation record (non-mutating, read-only)
        const observation = {
            adapter: 'observer',
            commandId: cmd.commandId,
            status: 'recorded',
            timestamp: new Date().toISOString(),
            requesterId: cmd.requesterId,
            observation: {
                source: source || 'unknown',
                context: context || 'unknown',
                issueType,
                description,
                severity: severity || 'info',
                metadata: metadata || {}
            },
            duration_ms: Date.now() - startTime,
            exitCode: 0
        };

        // This adapter does NOT mutate any state.
        // It only returns an observation for the audit log.
        // The Controller's auditLog will handle persistence.

        return observation;
    } catch (err) {
        return {
            adapter: 'observer',
            commandId: cmd.commandId,
            status: 'error',
            error: `Observer execution failed: ${err.message}`,
            exitCode: 9
        };
    }
}
