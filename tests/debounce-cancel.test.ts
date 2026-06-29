import { describe, it, expect, afterEach, vi } from 'vitest';
import { FormGuard, required, asyncRule, custom } from '../src/index';

function createForm(innerHTML: string): HTMLFormElement {
  document.body.innerHTML = innerHTML;
  return document.querySelector('form')!;
}

function cleanup() {
  document.body.innerHTML = '';
}

describe('debounce', () => {
  afterEach(cleanup);

  it('debounces onChange validation', async () => {
    vi.useFakeTimers();
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f', {
      mode: 'onChange',
      debounceMs: 300,
    });
    guard.addField('email', [required()]);

    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(guard.isFieldPending('email')).toBe(true);

    // Same value, same debounce window — should NOT trigger validation yet
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(guard.isFieldPending('email')).toBe(true);

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(350);
    expect(guard.isFieldPending('email')).toBe(false);
    expect(guard.getFieldErrors('email')).toHaveLength(1);

    vi.useRealTimers();
  });

  it('debounce resets timer on each keystroke', async () => {
    vi.useFakeTimers();
    createForm('<form id="f"><input name="username" value="first" /></form>');
    const guard = new FormGuard('#f', {
      mode: 'onChange',
      debounceMs: 300,
    });
    const validateSpy = vi.fn(async () => true);
    guard.addField('username', [asyncRule(validateSpy)]);

    const el = document.querySelector<HTMLInputElement>('[name="username"]')!;

    // First keystroke
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(100);

    // Second keystroke resets timer
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(100);

    // Third keystroke resets timer
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(100);

    // At this point validation should NOT have run (only 100ms after last keystroke)
    expect(validateSpy).not.toHaveBeenCalled();

    // Advance past debounce window from last keystroke
    await vi.advanceTimersByTimeAsync(350);
    expect(validateSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('no debounce when debounceMs is 0', async () => {
    vi.useFakeTimers();
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f', {
      mode: 'onChange',
      debounceMs: 0,
    });
    guard.addField('email', [required()]);

    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    // Should validate immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(guard.getFieldErrors('email')).toHaveLength(1);

    vi.useRealTimers();
  });

  it('per-field debounceMs overrides global', async () => {
    vi.useFakeTimers();
    createForm('<form id="f"><input name="username" value="" /></form>');
    const guard = new FormGuard('#f', {
      mode: 'onChange',
      debounceMs: 1000, // global
    });
    guard.addField('username', [required()], {
      debounceMs: 200, // per-field override
    });

    const el = document.querySelector<HTMLInputElement>('[name="username"]')!;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(guard.getFieldErrors('username')).toHaveLength(1);
    expect(guard.isFieldPending('username')).toBe(false);

    vi.useRealTimers();
  });
});

describe('cancellation', () => {
  afterEach(cleanup);

  it('cancels previous async validation when new one starts', async () => {
    vi.useFakeTimers();
    let firstAborted = false;

    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f', { mode: 'onChange', debounceMs: 0 });

    const slowCheck = (signal?: AbortSignal) =>
      new Promise<string | boolean>((resolve) => {
        const timer = setTimeout(() => resolve('from-first'), 200);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          firstAborted = true;
        });
      });

    let callCount = 0;
    guard.addField('email', [
      required(),
      asyncRule(async (_value, _form, signal) => {
        callCount++;
        if (callCount === 1) {
          return slowCheck(signal);
        }
        return true;
      }),
    ]);

    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    el.value = 'test@test.com';

    // Trigger first validation
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(50);

    // Trigger second validation before first completes
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);

    // First should have been aborted
    expect(firstAborted).toBe(true);
    expect(guard.getFieldErrors('email')).toHaveLength(0);

    vi.useRealTimers();
  });

  it('clearErrors cancels pending validation', async () => {
    vi.useFakeTimers();
    let wasAborted = false;

    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');

    guard.addField('email', [
      required(),
      asyncRule(async (_value, _form, signal) => {
        return new Promise<string | boolean>((resolve) => {
          const timer = setTimeout(() => resolve(true), 500);
          signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            wasAborted = true;
          });
        });
      }),
    ]);

    // Start validation (which triggers the async rule)
    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    el.value = 'test@test.com';
    void guard.validate();
    await vi.advanceTimersByTimeAsync(50);

    // Clear before async completes
    guard.clearErrors();
    expect(wasAborted).toBe(true);

    vi.useRealTimers();
  });
});

describe('pending state', () => {
  afterEach(cleanup);

  it('tracks pending state per field', async () => {
    vi.useFakeTimers();
    createForm('<form id="f"><input name="username" value="" /></form>');
    const guard = new FormGuard('#f', { mode: 'onChange', debounceMs: 300 });

    guard.addField('username', [
      required(),
      asyncRule(async () => {
        await new Promise((r) => setTimeout(r, 200));
        return true;
      }),
    ]);

    const el = document.querySelector<HTMLInputElement>('[name="username"]')!;
    el.value = 'test';
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // During debounce window
    expect(guard.isFieldPending('username')).toBe(true);
    expect(guard.isPending()).toBe(true);

    await vi.advanceTimersByTimeAsync(350);
    // After debounce, validation started (async in progress)
    expect(guard.isFieldPending('username')).toBe(true);

    await vi.advanceTimersByTimeAsync(250);
    // After async completes
    expect(guard.isFieldPending('username')).toBe(false);
    expect(guard.isPending()).toBe(false);

    vi.useRealTimers();
  });

  it('isPending returns false when no fields are validating', () => {
    createForm('<form id="f"><input name="email" value="" /></form>');
    const guard = new FormGuard('#f');
    guard.addField('email', [required()]);
    expect(guard.isPending()).toBe(false);
  });

  it('adds pending CSS class during async validation', async () => {
    vi.useFakeTimers();
    createForm('<form id="f"><input name="username" value="test" /></form>');
    const guard = new FormGuard('#f', {
      mode: 'onChange',
      debounceMs: 0,
      pendingClass: 'my-pending',
    });

    guard.addField('username', [
      asyncRule(async () => {
        await new Promise((r) => setTimeout(r, 200));
        return true;
      }),
    ]);

    const el = document.querySelector<HTMLInputElement>('[name="username"]')!;
    el.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(10);
    expect(el.classList.contains('my-pending')).toBe(true);

    await vi.advanceTimersByTimeAsync(250);
    expect(el.classList.contains('my-pending')).toBe(false);

    vi.useRealTimers();
  });

  it('AbortSignal is passed to custom rule', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;

    createForm('<form id="f"><input name="email" value="test" /></form>');
    const guard = new FormGuard('#f', { mode: 'onChange', debounceMs: 0 });

    guard.addField('email', [
      custom((_value, _form, signal) => {
        receivedSignal = signal;
        return true;
      }, 'spy'),
    ]);

    const el = document.querySelector<HTMLInputElement>('[name="email"]')!;
    el.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(10);
    expect(receivedSignal).toBeInstanceOf(AbortSignal);

    vi.useRealTimers();
  });

  it('AbortSignal is passed to asyncRule', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;

    createForm('<form id="f"><input name="email" value="test" /></form>');
    const guard = new FormGuard('#f');

    guard.addField('email', [
      asyncRule(async (_value, _form, signal) => {
        receivedSignal = signal;
        return true;
      }),
    ]);

    await guard.validate();
    expect(receivedSignal).toBeInstanceOf(AbortSignal);

    vi.useRealTimers();
  });
});

describe('destroy cancels everything', () => {
  afterEach(cleanup);

  it('aborts pending async on destroy', async () => {
    vi.useFakeTimers();
    let wasAborted = false;

    createForm('<form id="f"><input name="email" value="test" /></form>');
    const guard = new FormGuard('#f');

    guard.addField('email', [
      asyncRule(async (_value, _form, signal) => {
        return new Promise<string | boolean>((resolve) => {
          const timer = setTimeout(() => resolve(true), 500);
          signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            wasAborted = true;
          });
        });
      }),
    ]);

    void guard.validate();
    await vi.advanceTimersByTimeAsync(50);
    guard.destroy();
    expect(wasAborted).toBe(true);

    vi.useRealTimers();
  });
});
