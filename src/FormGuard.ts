import type {
  FormGuardInstance,
  FormGuardConfig,
  Rule,
  FieldConfig,
  GroupConfig,
  FieldState,
  GroupState,
  ValidationError,
  Locale,
  SuccessCallback,
  FailCallback,
  ValidateCallback,
} from './types';
import { en } from './locales';
import {
  clearFieldDOM,
  renderFieldError,
  renderFieldSuccess,
  renderFieldPending,
  focusFirstInvalid,
} from './dom';

function resolveElement(
  selector: string,
  form: HTMLFormElement,
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  if (selector.startsWith('#') || selector.startsWith('.') || selector.includes('[')) {
    return form.querySelector(selector);
  }
  return form.querySelector(`[name="${selector}"]`);
}

function resolveElements(
  selector: string,
  form: HTMLFormElement,
): (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[] {
  if (selector.startsWith('#') || selector.startsWith('.') || selector.includes('[')) {
    return Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector),
    );
  }
  return Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${selector}"]`,
    ),
  );
}

function getFieldValue(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): unknown {
  if (el instanceof HTMLInputElement && el.type === 'file') {
    return (el as HTMLInputElement).files;
  }
  if (
    el instanceof HTMLInputElement &&
    (el.type === 'checkbox' || el.type === 'radio')
  ) {
    return el.checked;
  }
  if (el instanceof HTMLSelectElement && el.multiple) {
    const selected = Array.from(el.selectedOptions).map((opt) => opt.value);
    return selected;
  }
  return el.value;
}

function getGroupValue(
  elements: (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[],
): unknown {
  const checkedValues: string[] = [];
  for (const el of elements) {
    if (
      el instanceof HTMLInputElement &&
      (el.type === 'checkbox' || el.type === 'radio')
    ) {
      if (el.checked) {
        checkedValues.push(el.value);
      }
    }
  }
  if (elements.length > 0) {
    const first = elements[0]!;
    if (
      first instanceof HTMLInputElement &&
      first.type === 'radio'
    ) {
      return checkedValues.length > 0 ? checkedValues[0] : '';
    }
  }
  return checkedValues;
}

function getFieldLabel(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  fieldConfig?: FieldConfig,
): string {
  if (fieldConfig?.label) return fieldConfig.label;
  if (el.labels && el.labels.length > 0) return el.labels[0]!.textContent?.trim() ?? el.name;
  return el.name || 'field';
}

function makeError(
  code: string,
  message: string,
  field: string,
  rule: string,
  value: unknown,
): ValidationError {
  return { code, message, field, rule, value, meta: {} };
}

export class FormGuard implements FormGuardInstance {
  private form: HTMLFormElement;
  private config: FormGuardConfig;
  private fields = new Map<string, FieldState>();
  private groups = new Map<string, GroupState>();
  private locale: Locale;
  private successCallbacks: SuccessCallback[] = [];
  private failCallbacks: FailCallback[] = [];
  private validateCallbacks: ValidateCallback[] = [];
  private boundSubmit: ((e: Event) => void) | null = null;
  private boundBlur: ((e: Event) => void) | null = null;
  private boundChange: ((e: Event) => void) | null = null;
  private destroyed = false;

  constructor(form: string | HTMLFormElement, config?: FormGuardConfig) {
    this.config = {
      mode: 'onSubmit',
      focusOnError: true,
      lockForm: false,
      collectAll: false,
      debounceMs: 0,
      ...config,
    };
    this.locale = { ...en, ...config?.locale };

    if (typeof form === 'string') {
      const el = document.querySelector<HTMLFormElement>(form);
      if (!el) {
        throw new Error(`FormGuard: form not found for selector "${form}"`);
      }
      this.form = el;
    } else {
      this.form = form;
    }

    this.bindEvents();
  }

  addField(
    fieldSelector: string,
    rules: Rule[],
    config?: FieldConfig,
  ): FormGuardInstance {
    if (this.destroyed) return this;
    const key = fieldSelector;
    const el = resolveElement(fieldSelector, this.form);
    if (!el) {
      if (this.config.debug) {
        console.warn(`FormGuard: field "${fieldSelector}" not found`);
      }
      return this;
    }

    this.fields.set(key, {
      field: el,
      rules: [...rules],
      config: config ?? {},
      errors: [],
      validated: false,
      pending: false,
      abortController: null,
      debounceTimer: null,
    });

    if (this.config.mode === 'onBlur') {
      el.addEventListener('blur', this.handleBlur(key));
    }
    if (this.config.mode === 'onChange') {
      const eventType =
        el instanceof HTMLInputElement &&
        (el.type === 'checkbox' || el.type === 'radio')
          ? 'change'
          : 'input';
      el.addEventListener(eventType, this.handleChange(key));
    }

    return this;
  }

  removeField(fieldSelector: string): FormGuardInstance {
    const state = this.fields.get(fieldSelector);
    if (state) {
      this.cancelFieldValidation(state);
      clearFieldDOM(state.field, state.config, this.config);
      state.field.removeEventListener('blur', this.handleBlur(fieldSelector));
      state.field.removeEventListener('input', this.handleChange(fieldSelector));
      state.field.removeEventListener('change', this.handleChange(fieldSelector));
    }
    this.fields.delete(fieldSelector);
    return this;
  }

  addGroup(
    groupSelector: string,
    rules: Rule[],
    config?: GroupConfig,
  ): FormGuardInstance {
    if (this.destroyed) return this;
    const elements = resolveElements(groupSelector, this.form);
    if (elements.length === 0) {
      if (this.config.debug) {
        console.warn(`FormGuard: no elements found for group "${groupSelector}"`);
      }
      return this;
    }

    this.groups.set(groupSelector, {
      elements,
      rules: [...rules],
      config: config ?? {},
      errors: [],
      validated: false,
      pending: false,
      abortController: null,
      debounceTimer: null,
    });

    if (this.config.mode === 'onBlur' || this.config.mode === 'onChange') {
      for (const el of elements) {
        el.addEventListener('blur', this.handleGroupEvent(groupSelector));
        const eventType =
          el instanceof HTMLInputElement &&
          (el.type === 'checkbox' || el.type === 'radio')
            ? 'change'
            : 'input';
        el.addEventListener(eventType, this.handleGroupEvent(groupSelector));
      }
    }

    return this;
  }

  removeGroup(groupSelector: string): FormGuardInstance {
    const state = this.groups.get(groupSelector);
    if (state) {
      this.cancelFieldValidation(state);
      for (const el of state.elements) {
        el.removeEventListener('blur', this.handleGroupEvent(groupSelector));
        el.removeEventListener('input', this.handleGroupEvent(groupSelector));
        el.removeEventListener('change', this.handleGroupEvent(groupSelector));
      }
    }
    this.groups.delete(groupSelector);
    return this;
  }

  async validate(forceRevalidation = false): Promise<boolean> {
    if (this.destroyed) return false;

    for (const [, state] of this.fields) {
      if (!forceRevalidation && state.validated) continue;
      await this.validateFieldState(state);
    }

    for (const [, state] of this.groups) {
      if (!forceRevalidation && state.validated) continue;
      await this.validateGroupState(state);
    }

    const allErrors = this.getAllErrors();
    const valid = allErrors.length === 0;

    this.fireHooks(valid, allErrors);

    if (!valid && this.config.focusOnError) {
      const fieldEntries: { element: HTMLElement; errors: ValidationError[] }[] = [];
      for (const [, state] of this.fields) {
        if (state.errors.length > 0) {
          fieldEntries.push({ element: state.field, errors: state.errors });
        }
      }
      focusFirstInvalid(fieldEntries);
    }

    return valid;
  }

  async validateField(fieldSelector: string): Promise<boolean> {
    const state = this.fields.get(fieldSelector);
    if (!state) return true;
    await this.validateFieldState(state);
    return state.errors.length === 0;
  }

  async validateGroup(groupSelector: string): Promise<boolean> {
    const state = this.groups.get(groupSelector);
    if (!state) return true;
    await this.validateGroupState(state);
    return state.errors.length === 0;
  }

  async revalidate(): Promise<boolean> {
    for (const [, state] of this.fields) {
      state.validated = false;
    }
    for (const [, state] of this.groups) {
      state.validated = false;
    }
    return this.validate(true);
  }

  async revalidateField(fieldSelector: string): Promise<boolean> {
    const state = this.fields.get(fieldSelector);
    if (!state) return true;
    state.validated = false;
    await this.validateFieldState(state);
    return state.errors.length === 0;
  }

  async revalidateGroup(groupSelector: string): Promise<boolean> {
    const state = this.groups.get(groupSelector);
    if (!state) return true;
    state.validated = false;
    await this.validateGroupState(state);
    return state.errors.length === 0;
  }

  clearErrors(): FormGuardInstance {
    for (const [, state] of this.fields) {
      this.cancelFieldValidation(state);
      state.errors = [];
      state.validated = false;
      state.pending = false;
      clearFieldDOM(state.field, state.config, this.config);
    }
    for (const [, state] of this.groups) {
      this.cancelFieldValidation(state);
      state.errors = [];
      state.validated = false;
      state.pending = false;
    }
    return this;
  }

  refresh(): FormGuardInstance {
    const fieldEntries = [...this.fields.entries()];
    for (const [key, state] of fieldEntries) {
      const el = resolveElement(key, this.form);
      if (el) {
        state.field = el;
      } else {
        this.fields.delete(key);
      }
    }

    const groupEntries = [...this.groups.entries()];
    for (const [key, state] of groupEntries) {
      const elements = resolveElements(key, this.form);
      if (elements.length > 0) {
        state.elements = elements;
      } else {
        this.groups.delete(key);
      }
    }

    return this;
  }

  destroy(): void {
    this.unbindEvents();
    for (const [key, state] of this.fields) {
      this.cancelFieldValidation(state);
      clearFieldDOM(state.field, state.config, this.config);
      state.field.removeEventListener('blur', this.handleBlur(key));
      state.field.removeEventListener('input', this.handleChange(key));
      state.field.removeEventListener('change', this.handleChange(key));
    }
    for (const [key, state] of this.groups) {
      this.cancelFieldValidation(state);
      for (const el of state.elements) {
        el.removeEventListener('blur', this.handleGroupEvent(key));
        el.removeEventListener('input', this.handleGroupEvent(key));
        el.removeEventListener('change', this.handleGroupEvent(key));
      }
    }
    this.fields.clear();
    this.groups.clear();
    this.successCallbacks.length = 0;
    this.failCallbacks.length = 0;
    this.validateCallbacks.length = 0;
    this.destroyed = true;
  }

  setLocale(locale: Locale): FormGuardInstance {
    this.locale = { ...this.locale, ...locale };
    return this;
  }

  onSuccess(callback: SuccessCallback): FormGuardInstance {
    this.successCallbacks.push(callback);
    return this;
  }

  onFail(callback: FailCallback): FormGuardInstance {
    this.failCallbacks.push(callback);
    return this;
  }

  onValidate(callback: ValidateCallback): FormGuardInstance {
    this.validateCallbacks.push(callback);
    return this;
  }

  getErrors(): ValidationError[] {
    return this.getAllErrors();
  }

  getFieldErrors(fieldSelector: string): ValidationError[] {
    return this.fields.get(fieldSelector)?.errors ?? [];
  }

  getGroupErrors(groupSelector: string): ValidationError[] {
    return this.groups.get(groupSelector)?.errors ?? [];
  }

  isFieldPending(fieldSelector: string): boolean {
    return this.fields.get(fieldSelector)?.pending ?? false;
  }

  isPending(): boolean {
    for (const [, state] of this.fields) {
      if (state.pending) return true;
    }
    for (const [, state] of this.groups) {
      if (state.pending) return true;
    }
    return false;
  }

  private async validateFieldState(state: FieldState): Promise<void> {
    // Cancel any previous async validation for this field
    this.cancelFieldValidation(state);

    const controller = new AbortController();
    state.abortController = controller;
    state.pending = true;
    state.errors = [];
    renderFieldPending(state.field, state.config, this.config);

    const value = getFieldValue(state.field);
    const label = getFieldLabel(state.field, state.config);

    try {
      for (const rule of state.rules) {
        if (controller.signal.aborted) break;

        try {
          const result = rule.validate(value, this.form, state.config, controller.signal);
          const outcome = result instanceof Promise ? await result : result;

          if (controller.signal.aborted) break;

          if (outcome === true || outcome === undefined) {
            continue;
          }

          let message: string;
          if (typeof outcome === 'string') {
            message = outcome;
          } else if (typeof outcome === 'object' && outcome !== null && 'message' in outcome) {
            message = String((outcome as ValidationError).message);
          } else {
            message = this.getMessage(rule.name, state.config, label);
          }

          state.errors.push(
            makeError(rule.name, message, state.field.name || label, rule.name, value),
          );

          if (!this.config.collectAll) break;
        } catch (err) {
          if (controller.signal.aborted) break;
          if (this.config.debug) {
            console.error(`FormGuard: rule "${rule.name}" threw:`, err);
          }
          state.errors.push(
            makeError(
              rule.name,
              this.getMessage(rule.name, state.config, label),
              state.field.name || label,
              rule.name,
              value,
            ),
          );
          if (!this.config.collectAll) break;
        }
      }
    } finally {
      // Only apply results if this controller hasn't been superseded
      if (state.abortController === controller) {
        state.pending = false;
        state.validated = true;
        state.abortController = null;

        if (!controller.signal.aborted) {
          if (state.errors.length > 0) {
            renderFieldError(state.field, state.errors[0]!, state.config, this.config);
          } else {
            renderFieldSuccess(state.field, state.config, this.config);
          }
        }
      }
    }
  }

  private async validateGroupState(state: GroupState): Promise<void> {
    this.cancelFieldValidation(state);

    const controller = new AbortController();
    state.abortController = controller;
    state.pending = true;
    state.errors = [];

    const value = getGroupValue(state.elements);
    const label = state.config.label ?? state.config.name ?? 'group';

    try {
      for (const rule of state.rules) {
        if (controller.signal.aborted) break;

        try {
          const result = rule.validate(value, this.form, state.config, controller.signal);
          const outcome = result instanceof Promise ? await result : result;

          if (controller.signal.aborted) break;

          if (outcome === true || outcome === undefined) {
            continue;
          }

          let message: string;
          if (typeof outcome === 'string') {
            message = outcome;
          } else {
            message = this.getMessage(rule.name, state.config, label);
          }

          state.errors.push(
            makeError(rule.name, message, label, rule.name, value),
          );

          if (!this.config.collectAll) break;
        } catch (err) {
          if (controller.signal.aborted) break;
          if (this.config.debug) {
            console.error(`FormGuard: rule "${rule.name}" threw:`, err);
          }
          state.errors.push(
            makeError(rule.name, this.getMessage(rule.name, state.config, label), label, rule.name, value),
          );
          if (!this.config.collectAll) break;
        }
      }
    } finally {
      if (state.abortController === controller) {
        state.pending = false;
        state.validated = true;
        state.abortController = null;
      }
    }
  }

  private cancelFieldValidation(state: FieldState | GroupState): void {
    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = null;
    }
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
      state.pending = false;
    }
  }

  private getMessage(
    ruleName: string,
    config?: FieldConfig | GroupConfig,
    _label?: string,
  ): string {
    const fieldMsg = config?.messages?.[ruleName];
    if (fieldMsg) return fieldMsg;
    return this.locale[ruleName] ?? ruleName;
  }

  private getAllErrors(): ValidationError[] {
    const all: ValidationError[] = [];
    for (const [, state] of this.fields) {
      all.push(...state.errors);
    }
    for (const [, state] of this.groups) {
      all.push(...state.errors);
    }
    return all;
  }

  private fireHooks(valid: boolean, errors: ValidationError[]): void {
    const fieldsErr: Record<string, ValidationError[]> = {};
    for (const [key, state] of this.fields) {
      if (state.errors.length > 0) {
        fieldsErr[key] = [...state.errors];
      }
    }
    const groupsErr: Record<string, ValidationError[]> = {};
    for (const [key, state] of this.groups) {
      if (state.errors.length > 0) {
        groupsErr[key] = [...state.errors];
      }
    }

    const result = { valid, errors, fields: fieldsErr, groups: groupsErr };

    for (const cb of this.validateCallbacks) {
      cb(result);
    }

    if (valid) {
      for (const cb of this.successCallbacks) {
        cb();
      }
    } else {
      for (const cb of this.failCallbacks) {
        cb(errors);
      }
    }
  }

  private handleSubmit = async (e: Event): Promise<void> => {
    if (this.config.mode !== 'onSubmit') return;
    e.preventDefault();
    const valid = await this.validate();
    if (valid) {
      this.form.submit();
    }
  };

  private handleBlur(key: string) {
    return () => {
      const state = this.fields.get(key);
      if (state) {
        this.debounceValidate(() => this.validateFieldState(state), state);
      }
    };
  }

  private handleChange(key: string) {
    return () => {
      const state = this.fields.get(key);
      if (state) {
        state.validated = false;
        this.debounceValidate(() => this.validateFieldState(state), state);
      }
    };
  }

  private handleGroupEvent(key: string) {
    return () => {
      const state = this.groups.get(key);
      if (state) {
        state.validated = false;
        this.debounceValidate(() => this.validateGroupState(state), state);
      }
    };
  }

  private debounceValidate(
    fn: () => Promise<void>,
    state: FieldState | GroupState,
  ): void {
    const debounceMs =
      'config' in state && 'debounceMs' in state.config
        ? (state.config as FieldConfig).debounceMs ?? this.config.debounceMs ?? 0
        : this.config.debounceMs ?? 0;

    if (debounceMs && debounceMs > 0) {
      if (state.debounceTimer !== null) {
        clearTimeout(state.debounceTimer);
      }
      state.pending = true;
      if (state instanceof Object && 'field' in state) {
        renderFieldPending((state as FieldState).field, (state as FieldState).config, this.config);
      }
      state.debounceTimer = setTimeout(() => {
        state.debounceTimer = null;
        void fn();
      }, debounceMs);
    } else {
      void fn();
    }
  }

  private bindEvents(): void {
    if (this.config.mode === 'onSubmit') {
      this.boundSubmit = this.handleSubmit.bind(this);
      this.form.addEventListener('submit', this.boundSubmit);
      this.form.setAttribute('novalidate', '');
    }
  }

  private unbindEvents(): void {
    if (this.boundSubmit) {
      this.form.removeEventListener('submit', this.boundSubmit);
      this.boundSubmit = null;
    }
    if (this.boundBlur) {
      this.form.removeEventListener('blur', this.boundBlur);
      this.boundBlur = null;
    }
    if (this.boundChange) {
      this.form.removeEventListener('input', this.boundChange);
      this.boundChange = null;
    }
    this.form.removeAttribute('novalidate');
  }
}
