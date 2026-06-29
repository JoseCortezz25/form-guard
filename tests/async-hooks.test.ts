import { describe, it, expect, afterEach, vi } from 'vitest';
import { FormGuard, required, email, asyncRule } from '../src/index';

function createForm(innerHTML: string): HTMLFormElement {
  document.body.innerHTML = innerHTML;
  return document.querySelector('form')!;
}

function cleanup() {
  document.body.innerHTML = '';
}

describe('async validation', () => {
  afterEach(cleanup);

  it('resolves async rule that passes', async () => {
    createForm('<form id="f"><input name="username" value="available" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('username', [
      required(),
      asyncRule(async (value) => {
        await new Promise((r) => setTimeout(r, 10));
        return value === 'available';
      }),
    ]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('resolves async rule that fails', async () => {
    createForm('<form id="f"><input name="username" value="taken" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('username', [
      required(),
      asyncRule(async (value) => {
        await new Promise((r) => setTimeout(r, 10));
        return value !== 'taken' || 'Username is already taken';
      }, { name: 'username-check' }),
    ]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getFieldErrors('username')[0]!.code).toBe('username-check');
    expect(guard.getFieldErrors('username')[0]!.message).toBe('Username is already taken');
  });

  it('runs sync rules before async rules', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    const asyncSpy = vi.fn(async () => true);
    guard.addField('email', [
      required(),
      asyncRule(asyncSpy, { name: 'async-spy' }),
    ]);
    await guard.validate();
    // sync rule (required) should fail first, async should not run
    expect(asyncSpy).not.toHaveBeenCalled();
    expect(guard.getFieldErrors('email')[0]!.code).toBe('required');
  });

  it('runs async rule after sync passes', async () => {
    createForm('<form id="f"><input name="email" value="test@test.com" /></form>');
    const guard = new FormGuard('#f');
    const asyncSpy = vi.fn(async () => 'Rejected by server');
    guard.addField('email', [
      required(),
      email(),
      asyncRule(asyncSpy, { name: 'server-check' }),
    ]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(asyncSpy).toHaveBeenCalled();
    expect(guard.getFieldErrors('email')[0]!.code).toBe('server-check');
  });
});

describe('hooks', () => {
  afterEach(cleanup);

  it('calls onValidate callback', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    const onValidate = vi.fn();
    guard.onValidate(onValidate);
    await guard.validate();
    expect(onValidate).toHaveBeenCalledTimes(1);
    const call = onValidate.mock.calls[0]![0]!;
    expect(call.valid).toBe(false);
    expect(call.errors).toHaveLength(1);
    expect(call.fields['email']).toHaveLength(1);
  });

  it('calls onSuccess when all fields pass', async () => {
    createForm('<form id="f"><input name="email" value="test@test.com" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required(), email()]);
    const onSuccess = vi.fn();
    const onFail = vi.fn();
    guard.onSuccess(onSuccess);
    guard.onFail(onFail);
    await guard.validate();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });

  it('calls onFail when any field fails', async () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    const onSuccess = vi.fn();
    const onFail = vi.fn();
    guard.onSuccess(onSuccess);
    guard.onFail(onFail);
    await guard.validate();
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: 'required' }),
      ]),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('supports multiple callbacks of the same type', async () => {
    createForm('<form id="f"><input name="email" value="test@test.com" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required(), email()]);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    guard.onSuccess(cb1);
    guard.onSuccess(cb2);
    await guard.validate();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});
