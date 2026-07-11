# DOM text reinterpreted as HTML

## Overview
A CodeQL alert reports that DOM text is reinterpreted as HTML in [coverage/sorter.js](coverage/sorter.js#L116). The current sorter logic appends markup by reading and rewriting existing cell content with innerHTML. This can cause text that should remain plain text to be parsed as HTML.

## Root Cause
The issue occurs in the coverage report UI script where sortable headers are initialized.

Relevant location:
- [coverage/sorter.js](coverage/sorter.js#L84)
- [coverage/sorter.js](coverage/sorter.js#L85)

Current behavior (simplified):
- Read existing header markup/text through innerHTML.
- Concatenate a sorter span string.
- Write back via innerHTML.

Because innerHTML reparses the full value, any meta-characters already present in header content are interpreted as HTML rather than preserved as literal text. CodeQL classifies this as a DOM text reinterpreted as HTML flow.

Additional context:
- The pattern appears only in the generated artifact under [coverage/sorter.js](coverage/sorter.js), not in first-party source under [src](src).
- This means direct edits in coverage files are fragile and may be overwritten on the next coverage generation.

## Requirements
1. Eliminate any innerHTML-based read-modify-write pattern for sortable header decoration in the coverage sorter flow.
2. Preserve existing visible header text exactly as text, without reparsing it as HTML.
3. Keep sort indicator UI behavior unchanged.
4. Implement the fix in a durable location (generator/template/process), not only in generated output.
5. Add a verification step that confirms the CodeQL warning is resolved.
6. Ensure future generated coverage assets continue to use safe DOM APIs.

## Implementation Steps
1. Confirm generation source for coverage assets.
- Identify which tool/version generates [coverage/sorter.js](coverage/sorter.js).
- Determine whether this repo commits generated coverage output intentionally or only for local diagnostics.

2. Choose remediation strategy.
- Preferred: update the template/source that emits sorter logic (or upgrade to a fixed upstream version if available).
- Fallback: add a post-generation patch step in tooling that rewrites unsafe innerHTML usage to safe DOM node operations.

3. Define safe DOM update approach.
- Replace string concatenation via innerHTML with node-based operations:
- Create the sorter span element with document.createElement.
- Set className to sorter.
- Append the node with appendChild/append.
- Do not reassign existing header content through innerHTML.

4. Apply change at the durable layer.
- If upstream template is editable in-project, update that source and regenerate coverage output.
- If not editable in-project, pin/upgrade generator dependency or add a deterministic patch script executed after coverage generation.

5. Regenerate and validate artifacts.
- Regenerate coverage assets so [coverage/sorter.js](coverage/sorter.js) reflects the safe implementation.
- Re-run static analysis/CodeQL query for this rule and confirm alert closure.

6. Add regression protection.
- Add a lightweight guard in CI or scripts that fails if unsafe pattern returns in generated artifact (for example, detect header innerHTML reassignment in sorter script).
- Document the reason in project docs so future upgrades preserve the fix.

7. Optional policy hardening.
- If generated coverage artifacts are not required in version control, stop committing [coverage](coverage) and exclude it from security scanning scope. This reduces repeated noise from generated third-party code while retaining strict checks on first-party source.
