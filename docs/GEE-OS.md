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

The detailed map is in `AGENTS.md` and `.agent/PROJECT.yml`. Product scope lives in `GAkinzOS.html` and `docs/PRODUCT-SPEC.md`. Routes, API boundaries, permissions and deployment facts must be checked against the named code and operations documents before they are treated as current.

## Boundaries

- No production deploy, database change, DNS change, payment, email send or other live mutation without explicit authority in the current request.
- MCP and skill availability does not grant permission.
- Development calls the live API, so test writes require the same care as production writes.
- Record decisions, unresolved problems and manual deployment steps in their existing canonical documents.
- Report PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED with evidence.

## Maintenance

Update this file only when the GEE route changes. Update project facts in their canonical documents rather than duplicating them here.
