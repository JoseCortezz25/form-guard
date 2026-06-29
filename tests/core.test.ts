import { describe, it, expect, afterEach } from 'vitest';
import { FormGuard, required, email, minLength, maxLength, pattern, number, integer, min, max, sameAs, files, custom, strongPassword } from '../src/index';

function createForm(innerHTML: string): HTMLFormElement {
  document.body.innerHTML = innerHTML;
  return document.querySelector('form')!;
}

function cleanup() {
  document.body.innerHTML = '';
}

describe('FormGuard constructor', () => {
  afterEach(cleanup);

  it('creates an instance with a form selector', () => {
    createForm('<form id="test-form"></form>');
    const guard = new FormGuard('#test-form');
    expect(guard).toBeDefined();
    expect(guard).toBeInstanceOf(FormGuard);
  });

  it('creates an instance with an HTMLFormElement', () => {
    const form = createForm('<form id="test-form"></form>');
    const guard = new FormGuard(form);
    expect(guard).toBeInstanceOf(FormGuard);
  });

  it('throws when form selector does not match any element', () => {
    expect(() => new FormGuard('#nonexistent')).toThrow('FormGuard: form not found');
  });

  it('accepts global config', () => {
    createForm('<form id="test-form"></form>');
    const guard = new FormGuard('#test-form', {
      mode: 'onBlur',
      focusOnError: false,
      debug: true,
    });
    expect(guard).toBeDefined();
  });

  it('adds novalidate attribute to the form', () => {
    const form = createForm('<form id="test-form"></form>');
    new FormGuard(form);
    expect(form.getAttribute('novalidate')).toBe('');
  });
});

describe('Field registration', () => {
  afterEach(cleanup);

  it('adds a field with selector', () => {
    createForm('<form id="f"><input name="email" /></form>');
    const guard = new FormGuard('#f');
    const result = guard.addField('email', [required()]);
    expect(result).toBe(guard); // chainable
  });

  it('adds a field with CSS selector', () => {
    createForm('<form id="f"><input id="email" name="email" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('#email', [required()]);
  });

  it('does not throw for non-existent field when not in debug mode', () => {
    createForm('<form id="f"></form>');
    const guard = new FormGuard('#f', { debug: false });
    expect(() => guard.addField('#missing', [required()])).not.toThrow();
  });

  it('removes a field', () => {
    createForm('<form id="f"><input name="email" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    guard.removeField('email');
    const errors = guard.getFieldErrors('email');
    expect(errors).toEqual([]);
  });
});

describe('sync validation', () => {
  afterEach(cleanup);

  it('validates a required field with empty value', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('email')).toHaveLength(1);
    expect(guard.getFieldErrors('email')[0]!.code).toBe('required');
    expect(guard.getFieldErrors('email')[0]!.rule).toBe('required');
    expect(guard.getFieldErrors('email')[0]!.field).toBe('email');
  });

  it('validates a required field with value', async () => {
    createForm('<form id="f"><input name="email" value="test@test.com" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
    expect(guard.getFieldErrors('email')).toHaveLength(0);
  });

  it('validates an unchecked checkbox as invalid for required', async () => {
    createForm('<form id="f"><input name="terms" type="checkbox" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('terms', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('terms')[0]!.code).toBe('required');
  });

  it('validates a checked checkbox as valid for required', async () => {
    createForm('<form id="f"><input name="terms" type="checkbox" checked /></form>');
    const guard = new FormGuard('#f');
    guard.addField('terms', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('validates email format', async () => {
    createForm('<form id="f"><input name="email" value="not-an-email" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required(), email()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('email')[0]!.code).toBe('email');
  });

  it('passes a valid email', async () => {
    createForm('<form id="f"><input name="email" value="test@example.com" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required(), email()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('validates minimum length', async () => {
    createForm('<form id="f"><input name="pw" value="ab" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('pw', [minLength(8)]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('pw')[0]!.code).toBe('minLength');
  });

  it('validates maximum length', async () => {
    createForm('<form id="f"><input name="pw" value="abcdefghijklmnop" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('pw', [maxLength(10)]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('pw')[0]!.code).toBe('maxLength');
  });

  it('validates pattern', async () => {
    createForm('<form id="f"><input name="code" value="abc" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('code', [pattern(/^\d+$/)]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
  });

  it('validates number rule', async () => {
    createForm('<form id="f"><input name="age" value="abc" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('age', [number()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('age')[0]!.code).toBe('number');
  });

  it('validates integer rule', async () => {
    createForm('<form id="f"><input name="age" value="3.14" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('age', [integer()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('age')[0]!.code).toBe('integer');
  });

  it('validates min numeric value', async () => {
    createForm('<form id="f"><input name="age" value="5" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('age', [min(18)]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('age')[0]!.code).toBe('min');
  });

  it('validates max numeric value', async () => {
    createForm('<form id="f"><input name="age" value="200" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('age', [max(120)]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('age')[0]!.code).toBe('max');
  });

  it('stops at first failing rule by default', async () => {
    createForm('<form id="f"><input name="pw" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('pw', [required(), minLength(8)]);
    await guard.validate();
    expect(guard.getFieldErrors('pw')).toHaveLength(1);
    expect(guard.getFieldErrors('pw')[0]!.code).toBe('required');
  });

  it('collects all errors when collectAll is true', async () => {
    createForm('<form id="f"><input name="num" value="3.5" /></form>');
    const guard = new FormGuard('#f', { collectAll: true });
    guard.addField('num', [integer(), min(10)]);
    await guard.validate();
    expect(guard.getFieldErrors('num')).toHaveLength(2);
  });

  it('rules respect explicit minLength count', async () => {
    createForm('<form id="f"><input name="pw" value="short" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('pw', [minLength(8)]);
    await guard.validate();
    // "short" is 5 chars, less than 8
    expect(guard.getFieldErrors('pw')).toHaveLength(1);
    expect(guard.getFieldErrors('pw')[0]!.code).toBe('minLength');
  });

  it('passes minLength when value meets minimum', async () => {
    createForm('<form id="f"><input name="pw" value="longenough" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('pw', [minLength(8)]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });
});

describe('custom rules', () => {
  afterEach(cleanup);

  it('supports sync custom rules', async () => {
    createForm('<form id="f"><input name="username" value="admin" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('username', [
      custom((value) => {
        return value !== 'admin' || 'Username "admin" is reserved';
      }, 'reserved'),
    ]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('username')[0]!.code).toBe('reserved');
  });
});

describe('sameAs rule', () => {
  afterEach(cleanup);

  it('validates two fields match', async () => {
    createForm(`
      <form id="f">
        <input name="password" value="abc123" />
        <input name="confirm" value="abc124" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('confirm', [sameAs('password')]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('confirm')[0]!.code).toBe('sameAs');
  });

  it('passes when two fields match', async () => {
    createForm(`
      <form id="f">
        <input name="password" value="abc123" />
        <input name="confirm" value="abc123" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('confirm', [sameAs('password')]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });
});

describe('strongPassword rule', () => {
  afterEach(cleanup);

  it('rejects weak passwords', async () => {
    createForm('<form id="f"><input name="password" value="weak" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('password', [strongPassword()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
  });

  it('accepts strong passwords', async () => {
    createForm('<form id="f"><input name="password" value="Str0ng!Pass" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('password', [strongPassword()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('skips empty values', async () => {
    createForm('<form id="f"><input name="password" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('password', [strongPassword()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });
});

describe('file rules', () => {
  afterEach(cleanup);

  it('files rule fails with no files', async () => {
    createForm('<form id="f"><input name="docs" type="file" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('docs', [files()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
  });
});

describe('validate single field', () => {
  afterEach(cleanup);

  it('validates a specific field', async () => {
    createForm(`
      <form id="f">
        <input name="email" value="" />
        <input name="name" value="" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    guard.addField('name', [required()]);
    const emailValid = await guard.validateField('email');
    expect(emailValid).toBe(false);
    expect(guard.getFieldErrors('email')).toHaveLength(1);
    // name not validated yet
    expect(guard.getFieldErrors('name')).toHaveLength(0);
  });

  it('revalidates a specific field', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    await guard.validate();
    const field = document.querySelector<HTMLInputElement>('[name="email"]')!;
    field.value = 'test@test.com';
    const valid = await guard.revalidateField('email');
    expect(valid).toBe(true);
  });
});

describe('clear errors', () => {
  afterEach(cleanup);

  it('clears all errors', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    await guard.validate();
    expect(guard.getFieldErrors('email')).toHaveLength(1);
    guard.clearErrors();
    expect(guard.getFieldErrors('email')).toHaveLength(0);
  });
});

describe('destroy', () => {
  afterEach(cleanup);

  it('cleans up and prevents further operations', async () => {
    createForm('<form id="f"><input name="email" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    guard.destroy();
    // After destroy, operations should be no-ops
    const valid = await guard.validate();
    expect(valid).toBe(false);
  });
});

describe('refresh', () => {
  afterEach(cleanup);

  it('does not crash when called', () => {
    createForm('<form id="f"><input name="email" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    expect(() => guard.refresh()).not.toThrow();
  });
});

describe('select inputs', () => {
  afterEach(cleanup);

  it('validates a single select as required', async () => {
    createForm(`
      <form id="f">
        <select name="country">
          <option value="">Choose...</option>
          <option value="us">US</option>
          <option value="mx">Mexico</option>
        </select>
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('country', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('country')[0]!.code).toBe('required');
  });

  it('passes a single select with a value', async () => {
    createForm(`
      <form id="f">
        <select name="country">
          <option value="">Choose...</option>
          <option value="us" selected>US</option>
        </select>
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('country', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('validates <select multiple> with required — no selection', async () => {
    createForm(`
      <form id="f">
        <select name="tags" multiple>
          <option value="js">JavaScript</option>
          <option value="ts">TypeScript</option>
          <option value="css">CSS</option>
        </select>
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('tags', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('tags')[0]!.code).toBe('required');
  });

  it('passes <select multiple> with selections', async () => {
    createForm(`
      <form id="f">
        <select name="tags" multiple>
          <option value="js" selected>JavaScript</option>
          <option value="ts">TypeScript</option>
          <option value="css" selected>CSS</option>
        </select>
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addField('tags', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });
});
