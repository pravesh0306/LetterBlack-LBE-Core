/**
 * cepExtensionExample.jsx
 * 
 * Example: Adobe CEP Extension Integration with Sentinel Validation
 * 
 * This shows how to use EITHER Option A (CLI) or Option B (Inline)
 * inside your CEP extension to gate AI-generated code execution
 * 
 * SETUP:
 *   1. Copy cepValidatorInline.js OR cepValidatorCLI.js into your CEP
 *   2. Update paths below
 *   3. Replace example LLM calls with your actual AI integration
 *   4. Update showStatus() to use your UI framework (Preact, React, etc)
 */

// ============================================
// CONFIG: CHOOSE OPTION A OR B
// ============================================

const USE_CLI_VALIDATION = false; // Set to true for Option A, false for Option B

// Paths (update for your system)
const SENTINEL_BIN = 'C:\\path\\to\\sentinel\\bin\\lbe.js';
const POLICY_PATH = 'C:\\path\\to\\policy.default.json';

// ============================================
// IMPORTS (based on your choice)
// ============================================

let validator;

if (USE_CLI_VALIDATION) {
    // Option A: CLI-based validation
    const { validateViaCliSync, createProposal: createProposalCli } = 
        require('./cepValidatorCLI.js');
    validator = {
        validate: (proposal) => validateViaCliSync(proposal, SENTINEL_BIN, POLICY_PATH),
        createProposal: createProposalCli
    };
} else {
    // Option B: Inline validator
    const { validateProposal, createProposal: createProposalInline, DEFAULT_CEP_POLICY } = 
        require('./cepValidatorInline.js');
    validator = {
        validate: (proposal) => validateProposal(proposal, DEFAULT_CEP_POLICY),
        createProposal: createProposalInline
    };
}

// ============================================
// MAIN: AI WORKFLOW WITH VALIDATION GATE
// ============================================

/**
 * Step 1: User triggers AI suggestion (e.g., "Generate expression")
 */
async function onAISuggestButtonClicked() {
    try {
        showStatus('🤖 Calling AI...', 'info');
        
        // Get user context from After Effects
        const context = getAEContext();
        
        // Call your LLM API
        const aiGeneratedCode = await callLLMAPI({
            prompt: `Generate a single-line JavaScript expression for ${context.selectedLayerName}`,
            context: context
        });
        
        // Now validate before executing
        await validateAndExecuteAI(aiGeneratedCode);
        
    } catch (err) {
        showStatus(`❌ Error: ${err.message}`, 'error');
    }
}

/**
 * Step 2: Validate proposal, then execute if allowed
 */
async function validateAndExecuteAI(aiGeneratedCode) {
    try {
        showStatus('🔒 Validating with Sentinel...', 'info');
        
        // Create proposal from AI code
        const proposal = validator.createProposal(aiGeneratedCode);
        
        // Validate (this is the gate)
        const decision = validator.validate(proposal);
        
        console.log('Validation result:', decision);
        
        // Gate: Only execute if allowed
        if (decision.decision === 'ALLOW') {
            showStatus('✅ Validation passed, executing...', 'success');
            executeAEScript(aiGeneratedCode);
            showStatus('✅ Code executed successfully', 'success');
            
        } else {
            showStatus(
                `❌ Execution blocked: ${decision.message}`,
                'error'
            );
        }
        
    } catch (err) {
        showStatus(`❌ Validation error: ${err.message}`, 'error');
    }
}

// ============================================
// HELPERS
// ============================================

/**
 * Execute the validated code inside After Effects
 */
function executeAEScript(jsCode) {
    const ae = new ExternalObject('lib:\\AdobeXMPScript');
    const comp = app.project.activeItem;
    
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error('No active composition');
    }
    
    // Wrap code in try-catch for safety
    const wrapped = `
        try {
            ${jsCode}
        } catch(e) {
            alert('Script error: ' + e.message);
        }
    `;
    
    app.beginUndoGroup('AI Generated Script');
    eval(wrapped);
    app.endUndoGroup();
}

/**
 * Get context from After Effects (simplified example)
 */
function getAEContext() {
    const comp = app.project.activeItem;
    const layer = comp && comp.selectedLayers.length > 0 
        ? comp.selectedLayers[0] 
        : null;
    
    return {
        compName: comp ? comp.name : 'No Comp',
        selectedLayerName: layer ? layer.name : 'No Layer',
        selectedLayerIndex: layer ? layer.index : -1,
        hasSelection: layer !== null
    };
}

/**
 * Mock LLM API call (replace with your actual integration)
 * For now, return safe example code
 */
async function callLLMAPI(params) {
    // In production, this would call Gemini, ChatGPT, etc.
    // For testing, return hardcoded example
    
    return `this.position[0] = ${Math.random() * 500 + 100};`;
}

/**
 * Show status message (update this for your UI framework)
 */
function showStatus(message, type = 'info') {
    const colors = {
        info: '#0099FF',
        success: '#00CC00',
        error: '#FF3333',
        warning: '#FFAA00'
    };
    
    const color = colors[type] || colors.info;
    
    // Option 1: Alert (simple, but blocking)
    // alert(message);
    
    // Option 2: Console (for debugging)
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Option 3: Update UI panel (your implementation)
    // document.querySelector('#status').textContent = message;
    // document.querySelector('#status').style.color = color;
}

// ============================================
// EVENT BINDINGS (example for your panel)
// ============================================

// When CEP panel loads, bind buttons
function setupUI() {
    const suggestBtn = document.getElementById('ai-suggest-btn');
    const validationToggle = document.getElementById('validation-mode');
    
    if (suggestBtn) {
        suggestBtn.addEventListener('click', onAISuggestButtonClicked);
    }
    
    if (validationToggle) {
        validationToggle.addEventListener('change', (e) => {
            console.log('Validation mode:', e.target.checked ? 'CLI' : 'Inline');
        });
    }
}

// Auto-setup when panel loads
window.addEventListener('load', setupUI);

// ============================================
// EXPORT FOR TESTING
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateAndExecuteAI,
        executeAEScript,
        getAEContext,
        showStatus
    };
}
