import { describe, it, expect, afterEach } from 'vitest';
import { FormGuard, required } from '../src/index';

function createForm(innerHTML: string): HTMLFormElement {
  document.body.innerHTML = innerHTML;
  return document.querySelector('form')!;
}

function cleanup() {
  document.body.innerHTML = '';
}

describe('group validation', () => {
  afterEach(cleanup);

  it('validates a checkbox group', async () => {
    createForm(`
      <form id="f">
        <input type="checkbox" name="colors" value="red" />
        <input type="checkbox" name="colors" value="blue" />
        <input type="checkbox" name="colors" value="green" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addGroup('colors', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
    expect(guard.getGroupErrors('colors')).toHaveLength(1);
    expect(guard.getGroupErrors('colors')[0]!.code).toBe('required');
  });

  it('passes when a checkbox group has checked items', async () => {
    createForm(`
      <form id="f">
        <input type="checkbox" name="colors" value="red" checked />
        <input type="checkbox" name="colors" value="blue" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addGroup('colors', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('validates a radio group', async () => {
    createForm(`
      <form id="f">
        <input type="radio" name="size" value="s" />
        <input type="radio" name="size" value="m" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addGroup('size', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(false);
  });

  it('passes when a radio is selected', async () => {
    createForm(`
      <form id="f">
        <input type="radio" name="size" value="s" checked />
        <input type="radio" name="size" value="m" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addGroup('size', [required()]);
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('removes a group', async () => {
    createForm(`
      <form id="f">
        <input type="checkbox" name="colors" value="red" />
      </form>
    `);
    const guard = new FormGuard('#f');
    guard.addGroup('colors', [required()]);
    guard.removeGroup('colors');
    const valid = await guard.validate();
    expect(valid).toBe(true);
  });

  it('does not crash with empty group selector', () => {
    createForm('<form id="f"></form>');
    const guard = new FormGuard('#f');
    expect(() => guard.addGroup('#nonexistent', [required()])).not.toThrow();
  });
});
