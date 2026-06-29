# Form Guard — Product Requirements Document

## 1. Overview

Form Guard is an educational but production-minded form validation library inspired by JustValidate. It keeps the familiar instance-based API, while improving readability, extensibility, and developer experience.

The goal is not to create a framework-specific solution. Form Guard should work with plain HTML forms and vanilla TypeScript/JavaScript, while remaining easy to adapt for other environments.

## 2. Problem Statement

Existing form validation libraries often fall into one of two extremes:

- They are too low-level and require repetitive setup.
- They are too framework-specific or too abstract for simple HTML forms.

JustValidate solves part of this problem, but Form Guard should improve the learning experience and modernize the API without losing the simplicity of the original mental model.

## 3. Product Goals

1. Provide a simple instance-based API for validating forms.
2. Make the API educational and easy to read for developers learning validation concepts.
3. Support multiple rules per field through a clean, composable syntax.
4. Support custom validation, async validation, groups, localization, and runtime feedback.
5. Ship with strong examples, a technical README, and a test suite that documents behavior.
6. Deliver a polished developer experience with helpful errors and predictable defaults.

## 4. Target Users

- Developers building plain HTML forms.
- Developers learning validation patterns in TypeScript.
- Teams that want a lightweight validation library without framework lock-in.
- Developers who like the JustValidate mental model but want a cleaner, more educational version.

## 5. Product Principles

- Keep the API familiar and instance-based.
- Prefer readable names over clever abstractions.
- Optimize for teaching external behavior, not implementation details.
- Avoid framework lock-in.
- Make validation rules composable and discoverable.
- Make async validation first-class, not an afterthought.

## 6. Scope

### In Scope

- Instance-based form validator class: `FormGuard`
- Field registration with multiple rules per field
- Group validation for checkbox/radio groups
- Sync and async rules
- Custom rules
- Revalidation APIs
- Validation lifecycle hooks
- Localization support
- Error messages, success messages, and field-level configuration
- Technical documentation, examples, and tests

### Out of Scope

- Full UI framework adapters in v1
- Server-side validation engine
- Form state management beyond validation concerns
- Analytics dashboards
- Visual form builder

## 7. Proposed API Shape

### Constructor

```ts
const guard = new FormGuard('#signup-form');
```

Optional global config should remain instance-based and close to the mental model of JustValidate.

### Core Methods

- `addField(fieldSelector, rules, config?)`
- `removeField(fieldSelector)`
- `addGroup(groupSelector, rules, config?)`
- `removeGroup(groupSelector)`
- `validate(forceRevalidation?)`
- `validateField(fieldSelector)`
- `validateGroup(groupSelector)`
- `revalidate()`
- `revalidateField(fieldSelector)`
- `revalidateGroup(groupSelector)`
- `clearErrors()`
- `refresh()`
- `destroy()`
- `setLocale(locale)`
- `onSuccess(callback)`
- `onFail(callback)`
- `onValidate(callback)`

### Rule Style

Rules should be expressed as composable helpers that return rule objects.

Examples:

```ts
guard.addField('#email', [
  required(),
  email(),
]);

guard.addField('#password', [
  required('Password is required'),
  minLength(8, 'Must be at least 8 characters'),
  strongPassword(),
]);
```

## 8. Rule Requirements

The initial rule set should cover the common cases from JustValidate plus improved naming clarity.

### Required rules

- `required()`
- `email()`
- `minLength(n)`
- `maxLength(n)`
- `number()`
- `integer()`
- `min(n)`
- `max(n)`
- `pattern(regexp)`
- `sameAs(fieldName)`
- `files()`
- `minFiles(n)`
- `maxFiles(n)`
- `custom(fn)`
- `asyncRule(fn, options?)`

### Rule behavior

- Rules must execute in declared order.
- Validation should stop at the first failing rule for a field unless configured otherwise.
- Async rules must expose a pending state.
- Messages should support either static strings or message factories.
- Rule names and failures must be easy to read in errors and docs.

## 9. Configuration Requirements

### Global config goals

Form Guard should allow a small, understandable global config for:

- validation mode (`onSubmit`, `onBlur`, `onChange`)
- localization
- focus behavior
- automatic form locking/unlocking during validation if needed
- error and success styling hooks
- debug mode
- learning mode / verbose developer feedback

### Field config goals

Field-level config should allow:

- custom messages
- custom labels
- per-field containers for errors
- field-specific styles/classes
- per-field async pending messaging

## 10. Error Model Requirements

Errors should be structured, not just plain strings.

Recommended shape:

```ts
{
  code: 'required',
  message: 'Email is required',
  field: 'email',
  rule: 'required',
  value: '',
  meta: {}
}
```

The library should still support simple message rendering, but internal and callback-level error data must be richer.

## 11. Developer Experience Requirements

Form Guard should feel better to use than a direct copy of JustValidate by adding:

- clearer rule names
- clearer method names where it improves readability
- consistent return types for chaining
- helpful warnings in development
- readable error output
- examples that teach by showing real scenarios
- a README that explains not only the API, but also the design choices

## 12. Accessibility Requirements

Validation output must support accessible form UX:

- `aria-invalid` on invalid fields
- `aria-describedby` linking field and message
- focus management for first invalid field
- screen-reader-friendly error messaging
- predictable keyboard navigation

## 13. Documentation Requirements

The repository must include a technical README that covers:

- what Form Guard is
- why it exists
- installation
- quick start
- API reference
- rules reference
- configuration reference
- lifecycle hooks
- async validation
- group validation
- localization
- accessibility notes
- testing notes
- examples

### README tone

- technical
- precise
- educational
- no marketing fluff
- no vague promises

## 14. Examples Requirements

Provide examples that show real usage:

- basic signup form
- password confirmation
- async username availability check
- checkbox/radio group validation
- localization example
- custom rule example
- error rendering example

Examples should be runnable and easy to copy.

## 15. Testing Requirements

The test suite must prove observable behavior, not internals.

### Required coverage

- constructor and initialization
- adding/removing fields
- multiple rules per field
- required/email/length/pattern/numeric rules
- async validation states and results
- group validation
- callbacks (`onSuccess`, `onFail`, `onValidate`)
- localization behavior
- clear/reset/destroy flows
- error rendering and state transitions
- accessibility-related DOM attributes when relevant

### Test quality bar

- tests should describe behavior in user terms
- avoid testing private implementation details
- include edge cases and failure cases
- prefer stable fixtures and realistic forms

## 16. Success Criteria

Form Guard is successful if:

- a developer can understand the library from the README and examples alone
- the API remains simple enough for plain HTML projects
- multiple rules per field are easy to compose
- async validation works predictably
- tests cover the main user-visible behaviors
- the project feels like a real reusable library, not a tutorial snippet

## 17. Suggested v1 Delivery Milestone

### v1 must include

- FormGuard class
- core field and group APIs
- rule helpers
- synchronous and async validation
- hooks
- locale support
- examples
- tests
- README

### v1 should not include

- framework adapters
- visual designer
- server-side validation transport
- analytics/reporting features

## 18. Open Questions

- Should validation stop at the first failing rule per field, or should it collect all failures by default?
- Should error rendering be DOM-first, headless-first, or support both equally in v1?
- Should async rules support cancellation and debouncing in v1 or v1.1?
- Should the library expose a headless validation mode from day one?
