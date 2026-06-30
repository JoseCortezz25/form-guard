---
name: form-guard-usage
description: Explains how the Form Guard app/library behaves from a consumer’s point of view: forms, rules, validation flow, errors, hooks, and examples. Use when you need to understand how the project works in real usage, not how it was implemented.
---

# Form Guard Usage

Use this skill when you need to explain how Form Guard behaves in a real form.
This is a **usage skill**, not an implementation guide.

## What Form Guard does

- Attaches to a real HTML form.
- Validates fields and checkbox/radio groups.
- Shows structured errors in the UI.
- Supports sync and async rules.
- Tracks pending async checks.
- Updates accessibility attributes.
- Exposes hooks for success, failure, and validation events.

## Mental model

- Form Guard is **instance-based**: create one validator per form.
- Keep the API familiar and readable.
- Prefer the PRD and README over guessing from implementation details.
- Treat `addField(fieldSelector, rules, config?)` as the core primitive.

## How the flow works

1. Create a Form Guard instance for the form.
2. Register fields or groups with a rule array.
3. Validation runs on submit, blur, or change depending on config.
4. If something fails, the field gets marked invalid and the message is shown.
5. If focus behavior is enabled, the first invalid field receives focus.
6. If everything passes, the form can submit and the success hook runs.

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

## Common user-facing flows

### Signup form

```ts
guard.addField('email', [required(), email()]);
guard.addField('username', [required(), minLength(3)]);
guard.addField('password', [required(), minLength(8)]);
guard.addField('confirmPassword', [required(), sameAs('password')]);
```

### Async username check

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

### Checkbox/radio group

```ts
guard.addGroup('terms', [required('You must accept the terms')]);
```

## Hooks

- `onSuccess(...)` runs when validation passes.
- `onFail(...)` runs when validation fails.
- `onValidate(...)` runs after any validation pass.

Use hooks for user-visible side effects, not for core business logic.

## Accessibility expectations

- Invalid fields should expose `aria-invalid`.
- Error text should be reachable via `aria-describedby`.
- First invalid field should receive focus when configured.
- Error messages should be readable by assistive tech.

## Gotchas

- Do not rewrite the API into a factory-based style.
- Do not invent features that are not in the PRD.
- Do not describe internal implementation details unless they affect real usage.
- If behavior is unclear, check `docs/PRD.md` first.

## When explaining usage to another agent

Always mention:
1. the public API surface
2. the rule array model
3. async and group validation
4. the user-visible behavior
5. the relevant docs or examples
