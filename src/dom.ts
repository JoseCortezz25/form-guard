import type { ValidationError, FieldConfig, FormGuardConfig } from './types';

export function resolveErrorContainer(
  fieldConfig?: FieldConfig,
  globalConfig?: FormGuardConfig,
  element?: HTMLElement,
): HTMLElement | null {
  const container =
    fieldConfig?.errorContainer ??
    globalConfig?.errorContainer;

  if (!container) return null;
  if (container instanceof HTMLElement) return container;

  const selector = container as string;
  if (element?.closest) {
    const found = element.closest(selector) as HTMLElement | null;
    if (found) return found;
  }
  return document.querySelector(selector);
}

export function clearFieldDOM(
  element: HTMLElement,
  fieldConfig?: FieldConfig,
  globalConfig?: FormGuardConfig,
): void {
  const errorClass = fieldConfig?.errorClass ?? globalConfig?.errorClass ?? 'form-guard-error';
  const successClass = fieldConfig?.successClass ?? globalConfig?.successClass ?? 'form-guard-success';
  const pendingClass = globalConfig?.pendingClass ?? 'form-guard-pending';

  element.classList.remove(errorClass);
  element.classList.remove(successClass);
  element.classList.remove(pendingClass);
  element.removeAttribute('aria-invalid');
  element.removeAttribute('aria-describedby');

  const container = resolveErrorContainer(fieldConfig, globalConfig, element);
  if (container) {
    container.innerHTML = '';
    container.setAttribute('role', 'alert');
  }
}

export function renderFieldPending(
  element: HTMLElement,
  fieldConfig?: FieldConfig,
  globalConfig?: FormGuardConfig,
): void {
  const errorClass = fieldConfig?.errorClass ?? globalConfig?.errorClass ?? 'form-guard-error';
  const successClass = fieldConfig?.successClass ?? globalConfig?.successClass ?? 'form-guard-success';
  const pendingClass = globalConfig?.pendingClass ?? 'form-guard-pending';

  element.classList.remove(errorClass);
  element.classList.remove(successClass);
  element.classList.add(pendingClass);
  element.removeAttribute('aria-invalid');
  element.removeAttribute('aria-describedby');

  const container = resolveErrorContainer(fieldConfig, globalConfig, element);
  if (container) {
    container.innerHTML = '<span class="form-guard-message form-guard-pending-text">Checking...</span>';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
  }
}

export function renderFieldError(
  element: HTMLElement,
  error: ValidationError,
  fieldConfig?: FieldConfig,
  globalConfig?: FormGuardConfig,
): void {
  const errorClass = fieldConfig?.errorClass ?? globalConfig?.errorClass ?? 'form-guard-error';
  const successClass = fieldConfig?.successClass ?? globalConfig?.successClass ?? 'form-guard-success';
  const pendingClass = globalConfig?.pendingClass ?? 'form-guard-pending';

  element.classList.add(errorClass);
  element.classList.remove(successClass);
  element.classList.remove(pendingClass);
  element.setAttribute('aria-invalid', 'true');

  const container = resolveErrorContainer(fieldConfig, globalConfig, element);
  if (container) {
    const errorId = `form-guard-error-${error.field}`;
    container.innerHTML = `<span id="${errorId}" class="form-guard-message">${escapeHtml(error.message)}</span>`;
    container.setAttribute('role', 'alert');
    element.setAttribute('aria-describedby', errorId);
  }
}

export function renderFieldSuccess(
  element: HTMLElement,
  fieldConfig?: FieldConfig,
  globalConfig?: FormGuardConfig,
): void {
  const errorClass = fieldConfig?.errorClass ?? globalConfig?.errorClass ?? 'form-guard-error';
  const successClass = fieldConfig?.successClass ?? globalConfig?.successClass ?? 'form-guard-success';
  const pendingClass = globalConfig?.pendingClass ?? 'form-guard-pending';

  element.classList.remove(errorClass);
  element.classList.add(successClass);
  element.classList.remove(pendingClass);
  element.removeAttribute('aria-invalid');
  element.removeAttribute('aria-describedby');

  const container = resolveErrorContainer(fieldConfig, globalConfig, element);
  if (container) {
    container.innerHTML = '';
  }
}

export function focusFirstInvalid(
  fields: { element: HTMLElement; errors: ValidationError[] }[],
): void {
  for (const { element, errors } of fields) {
    if (errors.length > 0) {
      element.focus();
      return;
    }
  }
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
