# Agentic SDLC Pipeline — Book the Watch (Node.js/Express + React)

> **CLAUDE.md is the orchestrator.** There is no separate orchestrator agent.
> Claude reads this file automatically on every turn and drives the full pipeline.

---

## Auto-Start Rule

**When the user's message includes any of the following, begin Phase 1 immediately — no confirmation needed:**
- A `.txt`/`.md` requirements file path (e.g. `requirement.txt`)
- A `.docx` file path
- An inline project brief or User Story

For `.docx` files, extract text first (macOS/zsh environment):
```bash
python3 -c "
import docx
d = docx.Document('requirement.docx')
for p in d.paragraphs:
    print(p.text)
"
```
If `python-docx` is missing: `python3 -m pip install python-docx`

After each phase completes, print `✓ Phase [N] — [Name] complete → sdlc-artifacts/[artifact]` and proceed to the next phase automatically.

---

## Resume Logic

If `sdlc-artifacts/` already has files, skip completed phases and start from the first incomplete one.

| Phase | Done when |
|-------|-----------|
| 1 | `sdlc-artifacts/requirements.md` exists and non-empty |
| 2 | `sdlc-artifacts/architecture.md` exists and non-empty |
| 3 | `sdlc-artifacts/design-review.md` exists and contains "VERDICT:" |
| 4 | `sdlc-artifacts/impl-plan.md` exists and non-empty |
| 5 | `sdlc-artifacts/implementation-log.md` exists AND all P0/P1 tasks in `impl-plan.md` are marked Done |
| 6 | `sdlc-artifacts/review.md` exists and contains "VERDICT: APPROVED" |
| 7 | `sdlc-artifacts/test-report.md` exists and contains "TESTS PASSED" |
| 8 | `README.md` and `docs/api.md` exist |
| 9 | `.github/workflows/ci.yml` exists |
| 10 | `PR_DESCRIPTION.md` exists |

---

## Pipeline — 10 Phases in Sequence

### Phase 1 — Requirements Analysis
Spawn the specialized `requirements-analyst` subagent (defined in `.claude/agents/requirements-analyst.md`) to produce `sdlc-artifacts/requirements.md`.
> `requirement.txt` in this project is already a finished requirements document, not a raw story — the subagent should gap-check it and only ask questions on genuinely missing dimensions, per its rules.

### Phase 2 — Architecture Design
Spawn the `solution-architect` subagent (`.claude/agents/solution-architect.md`) to produce `sdlc-artifacts/architecture.md`.
> The subagent must check `../claude-capston/` for a reusable reference implementation before proposing components from scratch, per its Reuse Check.

### Phase 3 — Design Review
Spawn the `design-reviewer` subagent (`.claude/agents/design-reviewer.md`) to produce `sdlc-artifacts/design-review.md`.
- `VERDICT: APPROVED FOR IMPLEMENTATION` → proceed to Phase 4
- `VERDICT: ARCHITECTURE MUST BE UPDATED` → instruct the `solution-architect` subagent to fix `architecture.md` inline, update the verdict, then proceed.

### Phase 4 — Implementation Planning
Spawn the `sprint-planner` subagent (`.claude/agents/sprint-planner.md`) to analyze `requirements.md` and `architecture.md` and produce `sdlc-artifacts/impl-plan.md`.
- Ensure the plan structures tasks in strict dependency order (P0 features first) and defines clear, testable Acceptance Criteria for each item.

### Phase 5 — Implementation
Spawn the specialized `developer` subagent (`.claude/agents/developer.md`) to implement the tasks.
- Instruct the subagent to implement all tasks from `sdlc-artifacts/impl-plan.md` in strict dependency order (P0 first).
- All backend code goes to `backend/src/`, all frontend code to `frontend/src/`, following the coding conventions below.
- The developer must check `../claude-capston/backend/` and `../claude-capston/frontend/` for reusable code per its Reuse Rule, and write/append each completed task to `sdlc-artifacts/implementation-log.md`.

### Phase 6 — Code Review
Spawn the `code-reviewer` subagent (`.claude/agents/code-reviewer.md`) to analyze the changes made in `backend/`/`frontend/` and produce `sdlc-artifacts/review.md`.
- **Review Loop & Branching Logic:**
  - `VERDICT: APPROVED` → proceed immediately to Phase 7.
  - `VERDICT: CHANGES REQUIRED` → spawn the `developer` subagent to fix every identified `[BLOCKER]` inline. Once fixed, re-spawn `code-reviewer` to verify the fixes and update the verdict to `APPROVED` before proceeding.

### Phase 7 — Verify
Spawn the `test-engineer` subagent (`.claude/agents/test-engineer.md`) to establish and run the testing suite.
- The subagent must write/complete Jest tests in `backend/` and Vitest tests in `frontend/`, and execute them in the terminal.
- **Testing Loop & Retry Logic:**
  - **All Tests Pass:** Produce `sdlc-artifacts/test-report.md` containing the string `TESTS PASSED` and proceed to Phase 8.
  - **Tests Fail:** Spawn the `developer` subagent to fix the bugs inline, then re-spawn `test-engineer` to re-run. Loop this process for a **maximum of 3 attempts**. If tests still fail after 3 attempts, write `TESTS FAILED` to `sdlc-artifacts/test-report.md` and stop the pipeline to request human intervention.

### Phase 8 — Documentation
Spawn the `technical-writer` subagent (`.claude/agents/technical-writer.md`) to produce `README.md` and `docs/api.md` from the finished, tested implementation.

### Phase 9 — CI Pipeline
Spawn the `devops-engineer` subagent (`.claude/agents/devops-engineer.md`) to produce `.github/workflows/ci.yml`.

### Phase 10 — Pull Request
Spawn the `pr-manager` subagent (`.claude/agents/pr-manager.md`) to assemble `PR_DESCRIPTION.md`.
- **Pre-flight Check:** the subagent must read `sdlc-artifacts/review.md` (must contain `VERDICT: APPROVED`) and `sdlc-artifacts/test-report.md` (must contain `TESTS PASSED`) before proceeding.
- **No-Git Rule:** the subagent must never run `git commit`, `git push`, or any git/MCP action — this pipeline has no VCS integration, only a markdown output for the user to paste into a real PR manually.

---

## Final Report

After all phases complete:
```
╔══════════════════════════════════════════════════════╗
║          SDLC Pipeline Complete — 10/10 Phases        ║
╠══════════════════════════════════════════════════════╣
║ ✓ Phase 1  — Requirements     requirements.md         ║
║ ✓ Phase 2  — Architecture     architecture.md         ║
║ ✓ Phase 3  — Design Review    design-review.md        ║
║ ✓ Phase 4  — Impl Planning    impl-plan.md            ║
║ ✓ Phase 5  — Implementation   backend/, frontend/     ║
║ ✓ Phase 6  — Code Review      review.md               ║
║ ✓ Phase 7  — Verify           test-report.md          ║
║ ✓ Phase 8  — Documentation    README.md, docs/api.md  ║
║ ✓ Phase 9  — CI Pipeline      .github/workflows/ci.yml║
║ ✓ Phase 10 — PR               PR_DESCRIPTION.md       ║
╚══════════════════════════════════════════════════════╝
```

---

## Coding Conventions
- Node.js 20+, Express (CommonJS), React (functional components + hooks)
- Jest (backend), Vitest + React Testing Library (frontend)
- Input validation as Express middleware — never inline in route handlers
- No `console.log` in code marked Done
- All routes must validate input server-side and pass errors to `next(err)` — never return raw stack traces
- Secrets only via `process.env`, never hardcoded

## No-Git Policy (CRITICAL)
**NEVER** run `git commit` or `git push` via Bash, and never use any git/MCP action to
create a real branch, commit, or PR. This pipeline has no VCS integration — Phase 10
produces `PR_DESCRIPTION.md` only.

The `PreToolUse` hook (`pre-bash.py`) blocks any Bash command containing `git commit` or
`git push` (exit code 2), and `settings.json`'s `permissions.deny` backs it up.

---

## Skills (Optional Shortcuts)

| Skill | Command | Purpose |
|-------|---------|---------|
| `/sdlc-kickoff` | `/sdlc-kickoff requirement.txt` | Run the full 10-phase pipeline from a requirements input |
| `/sdlc-status` | `/sdlc-status` | Show which phases are complete / pending |
| `/sdlc-next` | `/sdlc-next` | Auto-detect and invoke the next incomplete phase |

---

## Rules Scope

| File | Scope |
|------|-------|
| `CLAUDE.md` (this file) | Whole project — pipeline orchestration |
| `.claude/rules/<agent>.md` | Full instructions for each SDLC role |

---

## Project Structure
```
claude-capston-demo/
├── CLAUDE.md                       ← orchestrator + project-wide rules
├── requirement.txt                 ← Phase 1 input
├── README.md                       ← Phase 8
├── .github/workflows/ci.yml        ← Phase 9
├── PR_DESCRIPTION.md               ← Phase 10
├── sdlc-artifacts/                 ← one .md artifact per SDLC phase
├── backend/                        ← Phase 5 output
├── frontend/                       ← Phase 5 output
├── docs/
│   └── api.md                      ← Phase 8
└── .claude/
    ├── settings.json               ← hooks + deny rules
    ├── agents/                     ← 10 agent role definitions (frontmatter only)
    ├── rules/                      ← 10 agent rules files (full role instructions)
    ├── commands/ + skills/         ← 3 slash command shortcuts
    └── hooks/                      ← pre-bash, post-write, stop
```
