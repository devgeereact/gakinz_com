# GEE OS Adoption

- Project: GAkinz, `gakinz.com`
- Minimum GEE OS version: 0.5.0
- Adoption stage: Active shared contract
- Default mode: Existing application
- Lifecycle: Maintenance
- Risk: Production

## Purpose

Give Claude Code, Codex and compatible agents one shared route while keeping GAkinz product facts, production boundaries and verification rules inside this repository.

## Entry points

| Agent or concern | Source |
|---|---|
| Shared authority | `AGENTS.md` |
| Claude mapping | `CLAUDE.md` |
| Codex mapping | `CODEX.md` |
| Project route and risk | `.agent/PROJECT.yml` |
| Current task | `.agent/CURRENT-TASK.md` |
| MCP authority | `.agent/MCP-PROFILE.yml` |
| Shared constitution and loop | `~/.agents/gee-os` |

## Project sources of truth

The detailed map is in `AGENTS.md` and `.agent/PROJECT.yml`. Product scope lives in `docs/PRODUCT-SPEC.md`. Routes, API boundaries, permissions and deployment facts must be checked against the named code and operations documents before they are treated as current.

## Documentation profile

The repository follows the GEE OS "Standard application" profile, with these recorded
differences (D-044):

| Profile file | Here | Reason |
|---|---|---|
| Root `KNOWN-ISSUES.md` | `docs/KNOWN-ISSUES.md` | Kept with the other flat docs; every reference already points there |
| `CHANGELOG.md` | N/A | Commit history, `docs/STATUS.md` and `docs/DECISIONS.md` already record change; a fourth record would drift |
| `docs/UX-SPEC.md` | N/A | Journeys and screen requirements are in `docs/PRODUCT-SPEC.md`; screen patterns in `docs/DESIGN-SYSTEM.md` section 10.6 |
| `docs/ACCESSIBILITY.md` | N/A | Requirements in `docs/DESIGN-SYSTEM.md` section 10.7; evidence in `qa/ACCESSIBILITY-AUDIT.md` |
| `docs/NOTIFICATIONS-SPEC.md` | N/A | One notification route, specified in `docs/PRODUCT-SPEC.md` section 6.2 |
| `qa/FUNCTIONAL-AUDIT.md`, `qa/REGRESSION-AUDIT.md` | `qa/TEST-PLAN.md` | One test record: suites, gaps and the J01 to J12 acceptance scenarios |
| `qa/LAUNCH-CHECKLIST.md` | `qa/RELEASE-CHECKLIST.md` | Same purpose; launch gates in `docs/OPERATIONS.md` section 9 |
| Not in the profile | `docs/OPERATIONS.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/GEE-OS.md`, `docs/CONTENT-AND-GROWTH.md`, `docs/DESIGN-REFERENCE-MASTERCARD.md`, `CODEX.md`, `server/README.md` | Operations, current state, decisions, this route, the content policy, a preserved third-party design source, the Codex entry point, and the server folder's own guide |

## Boundaries

- No production deploy, database change, DNS change, payment, email send or other live mutation without explicit authority in the current request.
- MCP and skill availability does not grant permission.
- Development calls the live API, so test writes require the same care as production writes.
- Record decisions, unresolved problems and manual deployment steps in their existing canonical documents.
- Report PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED with evidence.

## Maintenance

Update this file only when the GEE route changes. Update project facts in their canonical documents rather than duplicating them here, as `AGENTS.md`, "Keeping documents current", sets out; `npm run docs:check` checks links and the server-to-document rule in CI.
