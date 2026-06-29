import { describe, it, expect, afterEach } from 'vitest';
import { FormGuard, required, email, en } from '../src/index';

function createForm(innerHTML: string): HTMLFormElement {
  document.body.innerHTML = innerHTML;
  return document.querySelector('form')!;
}

function cleanup() {
  document.body.innerHTML = '';
}

const esLocale = {
  required: 'Este campo es obligatorio',
  email: 'Ingrese un email válido',
};

describe('locale support', () => {
  afterEach(cleanup);

  it('uses default English locale messages', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    await guard.validate();
    expect(guard.getFieldErrors('email')[0]!.message).toBe('This field is required');
  });

  it('uses locale passed in constructor', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f', { locale: esLocale });
    guard.addField('email', [required()]);
    await guard.validate();
    expect(guard.getFieldErrors('email')[0]!.message).toContain('Este campo es obligatorio');
  });

  it('switches locale at runtime', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    guard.setLocale(esLocale);
    await guard.validate();
    expect(guard.getFieldErrors('email')[0]!.message).toBe('Este campo es obligatorio');
  });

  it('exports built-in English locale', () => {
    expect(en).toBeDefined();
    expect(en.required).toBeTruthy();
    expect(en.email).toBeTruthy();
  });
});

describe('DOM rendering', () => {
  afterEach(cleanup);

  it('sets aria-invalid on invalid fields', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    await guard.validate();
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('removes aria-invalid when field becomes valid', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    await guard.validate();
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    el.value = 'test@test.com';
    await guard.revalidateField('email');
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('adds error CSS class on invalid fields', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    await guard.validate();
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    expect(el.classList.contains('form-guard-error')).toBe(true);
  });

  it('adds success CSS class on valid fields', async () => {
    createForm('<form id="f"><input name="email" value="test@test.com" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required(), email()]);
    await guard.validate();
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    expect(el.classList.contains('form-guard-success')).toBe(true);
  });

  it('renders errors in error container when configured', async () => {
    createForm(`
      <form id="f">
        <input name="email" value="" />
        <div class="errors"></div>
      </form>
    `);
    const guard = new FormGuard('#f', { errorContainer: '.errors' });
    guard.addField('email', [required()]);
    await guard.validate();
    const container = document.querySelector('.errors')!;
    expect(container.innerHTML).toContain('form-guard-message');
  });

  it('sets aria-describedby linking field to error message', async () => {
    createForm(`
      <form id="f">
        <input name="email" value="" />
        <div class="errors"></div>
      </form>
    `);
    const guard = new FormGuard('#f', { errorContainer: '.errors' });
    guard.addField('email', [required()]);
    await guard.validate();
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    expect(el.getAttribute('aria-describedby')).toContain('form-guard-error-email');
  });

  it('uses role="alert" on error container', async () => {
    createForm(`
      <form id="f">
        <input name="email" value="" />
        <div class="errors"></div>
      </form>
    `);
    const guard = new FormGuard('#f', { errorContainer: '.errors' });
    guard.addField('email', [required()]);
    await guard.validate();
    const container = document.querySelector('.errors')!;
    expect(container.getAttribute('role')).toBe('alert');
  });

  it('clears DOM state on clearErrors', async () => {
    createForm(`
      <form id="f">
        <input name="email" value="" />
        <div class="errors"></div>
      </form>
    `);
    const guard = new FormGuard('#f', { errorContainer: '.errors' });
    guard.addField('email', [required()]);
    await guard.validate();
    guard.clearErrors();
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    expect(el.classList.contains('form-guard-error')).toBe(false);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });
});

describe('field config messages', () => {
  afterEach(cleanup);

  it('uses field-level custom messages', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()], {
      messages: { required: 'Email cannot be empty!' },
    });
    await guard.validate();
    expect(guard.getFieldErrors('email')[0]!.message).toBe('Email cannot be empty!');
  });

  it('field label is not prepended to error messages', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()], { label: 'Email Address' });
    await guard.validate();
    // Label is for display purposes, message uses locale text
    expect(guard.getFieldErrors('email')[0]!.message).toBe('This field is required');
  });

  it('falls back to field name when no label', async () => {
    createForm('<form id="f"><input name="user_email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('user_email', [required()]);
    await guard.validate();
    expect(guard.getFieldErrors('user_email')[0]!.field).toBe('user_email');
  });
});
