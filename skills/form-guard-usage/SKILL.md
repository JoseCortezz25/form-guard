---
name: form-guard-usage
description: Teaches how to use Form Guard’s public API, rules, and validation patterns. Use when working with Form Guard examples, API usage, validation behavior, async rules, groups, locale, accessibility, or when explaining correct library usage to another agent.
---

# Form Guard Usage

Use this skill when you need to understand or explain how Form Guard works from the outside.

## Mental model

- Form Guard is **instance-based**: create one validator per form.
- Keep the API familiar and readable.
- Prefer the PRD and README over guessing from implementation details.
- Treat `addField(selector, rules, config?)` as the core primitive.

## Quick start

```ts
import { FormGuard, required, email, minLength } from 'form-guard';

const guard = new FormGuard('#signup-form');

guard.addField('email', [required(), email()]);
guard.addField('password', [required(), minLength(8)]);
```

## Rules of thumb

- Put **multiple rules in an array** for a single field.
- Keep rule order intentional; rules run in declared order.
- Use `custom(...)` for synchronous domain checks.
- Use `asyncRule(...)` for server-backed checks such as availability or uniqueness.
- Use `sameAs(...)` for confirmation fields.
- Use `addGroup(...)` for checkbox/radio groups.

## Common workflows

### Validate a signup form

```ts
guard.addField('email', [required(), email()]);
guard.addField('username', [required(), minLength(3)]);
guard.addField('password', [required(), minLength(8)]);
guard.addField('confirmPassword', [required(), sameAs('password')]);
```

### Async availability check

```ts
guard.addField('username', [
  required(),
  minLength(3),
  asyncRule(async (value) => {
    const res = await fetch(`/api/users/check?username=${encodeURIComponent(value)}`);
    const data = await res.json();
    return data.available || 'That username is already taken';
  }),
]);
```

### Group validation

```ts
guard.addGroup('terms', [required('You must accept the terms')]);
```

## Hooks

- `onSuccess(...)` runs when validation passes.
- `onFail(...)` runs when validation fails.
- `onValidate(...)` runs after any validation pass.

Use hooks for side effects, not for business logic.

## Accessibility expectations

- Invalid fields should expose `aria-invalid`.
- Error text should be reachable via `aria-describedby`.
- First invalid field should receive focus when configured.
- Error messages should be readable by assistive tech.

## Gotchas

- Do not rewrite the API into a factory-based style.
- Do not invent features that are not in the PRD.
- Do not treat internal implementation details as public behavior unless the PRD or README says so.
- If behavior is unclear, check `docs/PRD.md` first.

## When explaining usage to another agent

Always mention:
1. the public API surface
2. the rule array model
3. async and group validation
4. the expected user-visible behavior
5. the relevant docs or examples
