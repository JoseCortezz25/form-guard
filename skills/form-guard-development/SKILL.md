---
name: form-guard-development
description: Teaches how to work safely in the Form Guard repo, including docs, tests, examples, and skill updates. Use when implementing features, changing the API, writing tests, adding examples, or updating project docs.
---

# Form Guard Development

Use this skill when you are making changes in the Form Guard repository.

## Source of truth

- `docs/PRD.md` defines product scope, API shape, and required behavior.
- The README should match the shipped implementation.
- Examples should demonstrate the final public API, not an old draft.
- Tests must prove observable behavior.

## Working style

- Keep changes small and verifiable.
- Prefer a vertical slice over broad partial rewrites.
- Preserve the instance-based mental model.
- Keep naming consistent across source, tests, docs, and examples.
- Prefer relative paths in all repo-local references.

## Recommended workflow

1. Read `docs/PRD.md`.
2. Inspect the smallest set of source files needed for the change.
3. Implement the public behavior first.
4. Add or update tests that prove the behavior.
5. Update examples if the public API changed.
6. Update the README last so it reflects the final API.
7. Rerun the relevant test slice.

## Test strategy

- Test what a user can observe: validation results, callbacks, DOM state, accessibility attributes, pending states, and error rendering.
- Avoid tests that only assert private internals.
- Add regression coverage for bugs or tricky edge cases.
- Keep examples aligned with test coverage where possible.

## Documentation expectations

The README should cover:
- installation
- quick start
- API reference
- rules reference
- configuration
- hooks
- async validation
- group validation
- accessibility notes
- testing notes
- examples

## Skill maintenance

- If a skill becomes stale, patch it instead of creating a competing skill.
- If a new convention is discovered, add it here only if it will still matter later.
- Keep skills concise and practical; long prose belongs in docs, not in SKILL.md.

## Gotchas

- Do not copy JustValidate internals.
- Do not introduce framework adapters in v1 unless the PRD explicitly requires them.
- Do not let examples drift away from the API.
- Do not change the mental model without updating the PRD first.
