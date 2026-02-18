# 07 — Testing Checklists (Post-Rollback + Pre-Release)

## A) Post-rollback 10–15 minute critical gate
### 1. Boot & idle
- Opens in AE without freeze
- No repeated logs in idle
- Tabs switch without blocking

### 2. Script Editor typography + alignment
- typing font == output font
- Prism aligned, cursor stable
- copy/paste round-trip clean

### 3. Run button intelligence
- ScriptUI → window opens
- Property code with no selection → blocked + solve
- Property code with selection → applies
- Plain script → runs once
- No “does nothing”

### 4. Gemini Vision / image path
- Screenshot → Gemini Vision → response references visual content
- No “no image data” parsing failures
- Missing image returns clear toast + solve

## B) Pre-release gate (must pass)
- Saved ≠ Verified enforced
- No duplicate notifications (mascot vs toast)
- OpenAI icon renders correctly
- Save dialogs show full path + reveal
- Ctrl+S scoped to Script Editor only
- 30+ message chat session stable
- CPU idle when idle
