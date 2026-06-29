# Form Guard

A production-minded form validation library for plain HTML forms. Framework-agnostic, TypeScript-first.

Instance-based API, composable rules, clean error handling — with structured errors, first-class async support, debounce + cancellation, and accessible DOM output.

## Why Form Guard

Most form validation libraries fall into two extremes: too low-level (requiring repetitive boilerplate) or too framework-coupled (useless for plain HTML projects). Form Guard keeps the simple, familiar instance-based approach while adding:

- **Structured errors** — every error has a `code`, `rule`, `field`, `value`, and `message`
- **Composable rules** — combine built-in rules with custom sync and async logic
- **First-class async** — async rules participate naturally in the validation pipeline
- **Accessible by default** — `aria-invalid`, `aria-describedby`, `role="alert"`, and focus management
- **Localization** — switch locales at runtime or provide your own messages
- **Group validation** — validate checkbox/radio groups with the same rule API
- **Debouncing & cancellation** — built-in debounce for onChange/blur modes, AbortController cancellation for stale async requests

## Installation

```bash
npm install form-guard
```

```html
<script type="module">
  import { FormGuard, required, email, minLength } from 'form-guard';
</script>
```

## Quick Start

```html
<form id="signup">
  <input name="email" type="email" />
  <div id="email-errors"></div>
  <button type="submit">Sign up</button>
</form>
```

```ts
import { FormGuard, required, email } from 'form-guard';

const guard = new FormGuard('#signup');

guard.addField('email', [
  required(),
  email(),
], {
  errorContainer: document.getElementById('email-errors'),
});

guard.onSuccess(() => {
  alert('Form is valid!');
});
```

## API Reference

### Constructor

```ts
new FormGuard(form, config?)
```

- **form**: CSS selector string (`'#my-form'`) or `HTMLFormElement`
- **config**: Optional global configuration (see [Configuration](#configuration))

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addField(selector, rules, config?)` | `this` | Register a field for validation |
| `removeField(selector)` | `this` | Remove a field from validation |
| `addGroup(selector, rules, config?)` | `this` | Register a checkbox/radio group |
| `removeGroup(selector)` | `this` | Remove a group from validation |
| `validate(force?)` | `Promise<boolean>` | Validate all registered fields and groups |
| `validateField(selector)` | `Promise<boolean>` | Validate a single field |
| `validateGroup(selector)` | `Promise<boolean>` | Validate a single group |
| `revalidate()` | `Promise<boolean>` | Reset all validated flags and re-validate |
| `revalidateField(selector)` | `Promise<boolean>` | Re-validate a specific field |
| `revalidateGroup(selector)` | `Promise<boolean>` | Re-validate a specific group |
| `clearErrors()` | `this` | Clear all errors and DOM state |
| `refresh()` | `this` | Re-scan the DOM for added/removed elements |
| `destroy()` | `void` | Remove all listeners and clean up |
| `setLocale(locale)` | `this` | Merge locale messages at runtime |
| `onSuccess(callback)` | `this` | Register a success hook |
| `onFail(callback)` | `this` | Register a failure hook |
| `onValidate(callback)` | `this` | Register a hook that fires on every validation |
| `getErrors()` | `ValidationError[]` | Get all current errors |
| `getFieldErrors(selector)` | `ValidationError[]` | Get errors for a specific field |
| `getGroupErrors(selector)` | `ValidationError[]` | Get errors for a specific group |
| `isFieldPending(selector)` | `boolean` | Whether a field has async validation in progress |
| `isPending()` | `boolean` | Whether any field has async validation in progress |

## Rules

Every rule helper returns a `Rule` object. Rules execute in declared order. Validation stops at the first failing rule by default; set `collectAll: true` in global config to collect all failures.

### Built-in Rules

| Rule | Usage | Description |
|------|-------|-------------|
| `required(msg?)` | `required('Name is required')` | Field must have a non-empty value |
| `email(msg?)` | `email()` | Value must match email format (skipped if empty) |
| `minLength(n, msg?)` | `minLength(8)` | String must be at least `n` characters (skipped if empty) |
| `maxLength(n, msg?)` | `maxLength(200)` | String must be at most `n` characters |
| `number(msg?)` | `number()` | Value must be a valid number (skipped if empty) |
| `integer(msg?)` | `integer()` | Value must be an integer (skipped if empty) |
| `min(n, msg?)` | `min(18)` | Number must be >= `n` (skipped if empty or NaN) |
| `max(n, msg?)` | `max(120)` | Number must be <= `n` (skipped if empty or NaN) |
| `pattern(regexp, msg?)` | `pattern(/^[A-Z]+$/)` | Value must match regex (skipped if empty) |
| `sameAs(fieldName, msg?)` | `sameAs('password')` | Value must match another field's value |
| `files(msg?)` | `files()` | File input must have at least one file |
| `minFiles(n, msg?)` | `minFiles(2)` | File input must have at least `n` files |
| `maxFiles(n, msg?)` | `maxFiles(5)` | File input must have at most `n` files |
| `strongPassword(msg?)` | `strongPassword()` | Must have uppercase, lowercase, digit, special char, and 8+ length |
| `custom(fn, name?)` | `custom(v => v > 0 \|\| 'Must be positive')` | Custom sync validation function |
| `asyncRule(fn, opts?)` | `asyncRule(checkUsername, { name: 'username' })` | Custom async validation function |

### Custom Rules

```ts
guard.addField('#age', [
  required(),
  custom((value, form) => {
    const n = Number(value);
    if (isNaN(n)) return 'Must be a number';
    if (n < 0) return 'Age cannot be negative';
    if (n > 150) return 'Age seems unrealistic';
    return true;
  }, 'valid-age'),
]);
```

### Async Rules

Async rules run after sync rules pass. They receive the same `(value, form)` signature.

```ts
guard.addField('#username', [
  required(),
  minLength(3),
  asyncRule(async (value) => {
    const res = await fetch(`/api/check-username?q=${value}`);
    const data = await res.json();
    return data.available || 'Username is taken';
  }, { name: 'username-available' }),
]);
```

## Configuration

### Global Config

Passed as the second argument to the constructor:

```ts
const guard = new FormGuard('#form', {
  mode: 'onSubmit',      // 'onSubmit' | 'onBlur' | 'onChange'
  locale: {},             // Custom locale messages
  focusOnError: true,     // Focus first invalid field
  lockForm: false,        // Lock form during async validation
  errorClass: 'form-guard-error',     // CSS class for invalid fields
  successClass: 'form-guard-success', // CSS class for valid fields
  pendingClass: 'form-guard-pending', // CSS class during async validation
  debug: false,           // Enable debug warnings
  verbose: false,         // Verbose debug output
  errorContainer: '.errors',  // Default error container selector
  collectAll: false,      // Collect all errors per field instead of stopping at first
  debounceMs: 0,          // Debounce delay in ms for onChange/onBlur modes
});
```

### Validation Modes

- **`onSubmit`** (default): Validates when the form is submitted. Prevents submission on failure.
- **`onBlur`**: Validates each field when it loses focus.
- **`onChange`**: Validates each field as the user types/changes it.

### Field Config

Passed as the third argument to `addField`:

```ts
guard.addField('#email', [required(), email()], {
  name: 'email',                    // Alternative field identifier
  label: 'Email Address',           // Human-readable label
  errorContainer: el,               // HTMLElement or CSS selector for error messages
  successClass: 'my-success',       // Override global success class
  errorClass: 'my-error',           // Override global error class
  debounceMs: 500,                  // Per-field debounce override
  messages: {                       // Per-field rule messages
    required: 'Email cannot be empty',
    email: 'Enter a valid email',
  },
});
```

## Error Model

Every validation error is a structured object, not a plain string:

```ts
interface ValidationError {
  code: string;                     // Rule code: 'required', 'email', etc.
  message: string;                  // Human-readable error message
  field: string;                    // Field name or selector
  rule: string;                     // Rule that triggered the error
  value: unknown;                   // The value that failed
  meta: Record<string, unknown>;    // Additional metadata (reserved for future use)
}
```

Access errors through hooks or the `getErrors()` method:

```ts
guard.onFail((errors) => {
  errors.forEach(e => {
    console.log(`${e.field}: ${e.message} [${e.rule}]`);
  });
});
```

## Lifecycle Hooks

Hooks are chainable and support multiple callbacks:

```ts
guard
  .onValidate(({ valid, errors, fields, groups }) => {
    console.log('Validated:', valid, errors.length, 'errors');
  })
  .onSuccess(() => {
    console.log('All checks passed');
  })
  .onFail((errors) => {
    console.log(errors.length, 'validation errors');
  });
```

- **`onValidate`**: Fires after every validation, regardless of result. Receives the full validation result.
- **`onSuccess`**: Fires when all fields and groups pass validation.
- **`onFail`**: Fires when any field or group fails validation. Receives the array of all errors.

## Group Validation

Validate checkbox/radio groups as a single unit:

```ts
guard.addGroup('colors', [required('Select at least one color')], {
  errorContainer: document.getElementById('colors-errors'),
});
```

Group validation treats all elements with the same `name` attribute as a single logical field:
- **Checkbox groups**: At least one must be checked
- **Radio groups**: Exactly one must be selected

## Debouncing & Cancellation

Async validation (e.g., checking username availability) benefits from debouncing: waiting until the user stops typing before firing an API call, and cancelling stale requests when a new keystroke arrives.

### Configuration

```ts
const guard = new FormGuard('#form', {
  mode: 'onChange',
  debounceMs: 300,     // Wait 300ms after last keystroke before validating
});

// Per-field override
guard.addField('#username', [...rules], {
  debounceMs: 500,     // This field uses 500ms instead
});
```

When `debounceMs` is `0` (default), validation fires immediately on each event.

### Pending state

While async validation is in progress, the field gets a `form-guard-pending` CSS class (configurable via `pendingClass`). Check pending state programmatically:

```ts
guard.isFieldPending('username');  // true while async validation runs
guard.isPending();                  // true if any field is validating
```

### AbortController cancellation

Every async validation run creates a new `AbortController`. If a new validation starts before the previous one finishes (e.g., user keeps typing), the previous controller is aborted. Async rules receive the `AbortSignal` as the third argument:

```ts
guard.addField('#username', [
  asyncRule(async (value, form, signal) => {
    const res = await fetch(`/api/check?q=${value}`, { signal });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    return data.available || 'Username is taken';
  }),
]);
```

- **Debounce** prevents firing on every keystroke
- **AbortController** cancels stale requests that haven't resolved yet
- **Combined**, they prevent race conditions and wasted API calls

## Localization

Form Guard ships with English (`en`) built-in. Switch or extend locales at any time:

```ts
import { FormGuard, en } from 'form-guard';

const es = {
  required: 'Este campo es obligatorio',
  email: 'Ingrese un email válido',
  minLength: 'Debe tener al menos {0} caracteres',
};

const guard = new FormGuard('#form', { locale: es });

// Switch later
guard.setLocale({
  required: 'Ce champ est obligatoire',
  email: 'Veuillez entrer un email valide',
});
```

Per-field messages take precedence over locale messages.

## Accessibility

Form Guard sets DOM attributes for accessible error handling:

- **`aria-invalid="true"`** on fields with errors
- **`aria-describedby`** linking the field to its error message element
- **`role="alert"`** on error containers for screen reader announcements
- **Focus management**: When `focusOnError` is `true` (default), the first invalid field receives focus after validation

### CSS Classes

- **`.form-guard-error`**: Added to fields with validation errors
- **`.form-guard-success`**: Added to fields that pass validation
- **`.form-guard-message`**: Error message span inside the error container

Customize these via global or per-field config.

## Examples

The `examples/` directory contains runnable HTML files:

| Example | Demonstrates |
|---------|-------------|
| `signup.html` | Full signup form with multiple rules, password confirmation, checkbox |
| `async-username.html` | Async validation simulating a username availability API |
| `group-validation.html` | Radio and checkbox group validation |
| `custom-rules.html` | Custom sync validation rules |
| `localization.html` | Runtime locale switching (English, Spanish, French) |

To run an example:

```bash
npm run dev
```

Then open one of these in your browser:
- `http://localhost:5173/examples/signup.html`
- `http://localhost:5173/examples/async-username.html`
- `http://localhost:5173/examples/group-validation.html`
- `http://localhost:5173/examples/custom-rules.html`
- `http://localhost:5173/examples/localization.html`

Vite's dev server compiles TypeScript on the fly — no build step needed.

## Testing

The test suite uses Vitest with jsdom. Tests cover observable behavior, not internals.

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

### Coverage areas

- Constructor and initialization
- Field registration, removal, and validation
- All built-in rules (required, email, length, pattern, numeric, file, password, sameAs)
- Custom sync and async rules
- Group validation (checkbox, radio)
- Lifecycle hooks (onSuccess, onFail, onValidate)
- Locale support (default, constructor, runtime switching)
- DOM rendering (error/success classes, aria attributes, error containers)
- Clear/reset/destroy lifecycle
- collectAll mode

## Design Decisions

### Stop-at-first vs. collect-all

By default, validation stops at the first failing rule per field. This avoids overwhelming users with multiple messages for a single field. Set `collectAll: true` in global config to collect all failures — useful for inline validation displays that show every rule violation at once.

### Error message precedence

1. Rule's inline message (`required('Custom message')`)
2. Field-level `messages` config
3. Locale message
4. Rule name fallback

### No framework adapters in v1

Form Guard targets plain HTML forms directly. Framework wrappers (React, Vue, Angular) are out of scope for v1 but the headless `getErrors()` API and hook callbacks make integration straightforward.

## License

MIT
