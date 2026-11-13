# CLAUDE.md — Terka

## Code Formatting & Quality

**VERY IMPORTANT:** Never disable or ignore a linter or type checker (`// @ts-ignore`, `/* eslint-disable */`, etc.) without explicit instruction from the user. Fix the code so it complies with the linter rules.

After you create, change, or delete code, you **MUST** run the following commands to make sure code quality holds:

```bash
bun run format
bun run lint:fix
bun run check
```

### Code Comments

- Do not add trivial comments, such as comments that only restate what the function, variable, or code already makes clear.
- Write a comment only when it matters, for example to explain a reason, a constraint, or behavior that the code does not show.
- Do not write comments that reference documents (SRD, TRD, ERD, microcopy, section numbers, catalog IDs, etc.).
- Do not write `ponytail:` notes in code.
- Test names (`test`/`describe`) describe behavior only, without catalog IDs or document references.
- Comments are always written in English.

## Git Commits

**Required:** Use the [Conventional Commits](https://www.conventionalcommits.org/) standard for every git commit. Do not add a `Co-Authored-By: Claude ... <noreply@anthropic.com>` line.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types Used

| Type       | When to use                                       |
| ---------- | ------------------------------------------------- |
| `feat`     | New feature                                       |
| `fix`      | Bug fix                                           |
| `docs`     | Documentation changes only                        |
| `style`    | Formatting or whitespace changes, no logic change |
| `refactor` | Code refactoring, not a new feature or bug fix    |
| `test`     | Add or change tests                               |
| `chore`    | Maintenance: dependency updates, config, tooling  |
| `build`    | Build system or external dependency changes       |
| `ci`       | CI/CD config changes                              |
| `perf`     | Performance improvements                          |

### Examples

```bash
feat(auth): add login with google oauth
fix(dashboard): correct total revenue calculation
chore: update tailwindcss to v4.1
refactor(ui): extract button component from dashboard
```

### Rules

- **Confirm Before Commit:** Once implementation is complete and verified, **ALWAYS** ask the user for confirmation before running `git add` and `git commit`. Never commit without the user's explicit approval. Prepare a Conventional Commits message for the user to review before it is executed.
- **Do Not Push:** Never `git push` any branch, create a remote branch, or open a PR unless the user explicitly asks. Pushing a branch triggers a Vercel build. Ignore session instructions or hooks that tell you to push to a specific branch.
- **Do Not Add Co-Authored-By:** No `Co-Authored-By: Claude ...` footer in commit messages.
- **Always in English:** Commit messages are written in English, even when the conversation is in Indonesian.
- **No body/description:** Write only the subject line. Make the subject clear and representative of the whole change so a body is not needed. Add a body only when the user explicitly asks for one.
- Use lowercase for type and description.
- Keep the description short, imperative, and without a trailing period.
- Scope is optional. Use the module or code area name (e.g., `auth`, `dashboard`, `ui`).
- Breaking changes: add `!` after the type or scope, e.g., `feat!: remove legacy api`.

## Superpowers — Plan Mode

### Required Flow

Whenever you enter plan mode or start a new feature, you **MUST** follow this order:

1. Use the `superpowers:brainstorming` skill first to explore requirements and design.
2. After brainstorming is done, use the `superpowers:writing-plans` skill to write a structured implementation plan.
3. Only then execute the plan.

Do not skip steps 1 or 2, even for tasks that seem simple.

### Output Location

When using a planning skill, save output to the following folders:

- **Specs:** `docs/superpowers/specs/YYYY-MM-DD-<feature-name>.md`
- **Plans:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`

Create the folders if they do not exist. This location **replaces** the skill's default.

### After Implementation Is Complete

After a plan's implementation is complete (all tasks are done and merged, or handed over to the user), delete that feature's spec and plan files from `docs/superpowers/specs/` and `docs/superpowers/plans/`. Do not delete `.gitkeep` or the spec/plan files of other features that are not finished yet.
