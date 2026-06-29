import type { Rule } from './types';

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function required(message?: string): Rule {
  return {
    name: 'required',
    validate(value: unknown): string | boolean {
      if (typeof value === 'boolean') {
        return value === true || message || false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0 || message || false;
      }
      if (value instanceof FileList) {
        return value.length > 0 || message || false;
      }
      if (Array.isArray(value)) {
        return value.length > 0 || message || false;
      }
      return (value != null && value !== '') || message || false;
    },
  };
}

export function email(message?: string): Rule {
  return {
    name: 'email',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      return EMAIL_RE.test(value.trim()) || message || false;
    },
  };
}

export function minLength(min: number, message?: string): Rule {
  return {
    name: 'minLength',
    validate(value: unknown): string | boolean {
      const len =
        typeof value === 'string' ? value.trim().length : String(value ?? '').length;
      if (len === 0) return true;
      return len >= min || message || false;
    },
  };
}

export function maxLength(max: number, message?: string): Rule {
  return {
    name: 'maxLength',
    validate(value: unknown): string | boolean {
      const len =
        typeof value === 'string' ? value.trim().length : String(value ?? '').length;
      return len <= max || message || false;
    },
  };
}

export function number(message?: string): Rule {
  return {
    name: 'number',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      return !isNaN(Number(value)) || message || false;
    },
  };
}

export function integer(message?: string): Rule {
  return {
    name: 'integer',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      const n = Number(value);
      return (!isNaN(n) && Number.isInteger(n)) || message || false;
    },
  };
}

export function min(minVal: number, message?: string): Rule {
  return {
    name: 'min',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      const n = Number(value);
      if (isNaN(n)) return true;
      return n >= minVal || message || false;
    },
  };
}

export function max(maxVal: number, message?: string): Rule {
  return {
    name: 'max',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      const n = Number(value);
      if (isNaN(n)) return true;
      return n <= maxVal || message || false;
    },
  };
}

export function pattern(regexp: RegExp, message?: string): Rule {
  return {
    name: 'pattern',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      return regexp.test(value) || message || false;
    },
  };
}

export function sameAs(fieldName: string, message?: string): Rule {
  return {
    name: 'sameAs',
    validate(value: unknown, form: HTMLFormElement): string | boolean {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        `[name="${fieldName}"]`,
      );
      if (!el) return true;
      const val = typeof value === 'string' ? value : '';
      const other =
        el instanceof HTMLInputElement &&
        (el.type === 'checkbox' || el.type === 'radio')
          ? el.checked
          : el.value;
      return val === String(other) || message || false;
    },
  };
}

export function files(message?: string): Rule {
  return {
    name: 'files',
    validate(value: unknown): string | boolean {
      if (!(value instanceof FileList)) return true;
      return value.length > 0 || message || false;
    },
  };
}

export function minFiles(minCount: number, message?: string): Rule {
  return {
    name: 'minFiles',
    validate(value: unknown): string | boolean {
      if (!(value instanceof FileList)) return true;
      if (value.length === 0) return true;
      return value.length >= minCount || message || false;
    },
  };
}

export function maxFiles(maxCount: number, message?: string): Rule {
  return {
    name: 'maxFiles',
    validate(value: unknown): string | boolean {
      if (!(value instanceof FileList)) return true;
      return value.length <= maxCount || message || false;
    },
  };
}

export function custom(
  fn: (
    value: unknown,
    form: HTMLFormElement,
    signal?: AbortSignal,
  ) => string | boolean | Promise<string | boolean>,
  name?: string,
): Rule {
  return {
    name: name ?? 'custom',
    validate(value: unknown, form: HTMLFormElement, _fieldConfig?: unknown, signal?: AbortSignal) {
      return fn(value, form, signal);
    },
  };
}

export function asyncRule(
  fn: (
    value: unknown,
    form: HTMLFormElement,
    signal?: AbortSignal,
  ) => Promise<string | boolean>,
  options?: { name?: string },
): Rule {
  return {
    name: options?.name ?? 'async',
    validate(value: unknown, form: HTMLFormElement, _fieldConfig?: unknown, signal?: AbortSignal) {
      return fn(value, form, signal);
    },
  };
}

export function strongPassword(message?: string): Rule {
  const HAS_UPPER = /[A-Z]/;
  const HAS_LOWER = /[a-z]/;
  const HAS_DIGIT = /\d/;
  const HAS_SPECIAL = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/;

  return {
    name: 'strongPassword',
    validate(value: unknown): string | boolean {
      if (typeof value !== 'string' || value.trim() === '') return true;
      const ok =
        HAS_UPPER.test(value) &&
        HAS_LOWER.test(value) &&
        HAS_DIGIT.test(value) &&
        HAS_SPECIAL.test(value) &&
        value.length >= 8;
      return ok || message || false;
    },
  };
}
