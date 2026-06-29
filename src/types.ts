export interface ValidationError {
  code: string;
  message: string;
  field: string;
  rule: string;
  value: unknown;
  meta: Record<string, unknown>;
}

export type ValidationResult =
  | boolean
  | string
  | ValidationError
  | Promise<boolean | string | ValidationError>;

export type RuleValidator = (
  value: unknown,
  form: HTMLFormElement,
  fieldConfig?: FieldConfig,
  signal?: AbortSignal,
) => ValidationResult;

export interface Rule {
  name: string;
  validate: RuleValidator;
  priority?: number;
}

export interface FieldConfig {
  name?: string;
  label?: string;
  errorContainer?: HTMLElement | string;
  successClass?: string;
  errorClass?: string;
  messages?: Record<string, string>;
  debounceMs?: number;
}

export interface GroupConfig {
  name?: string;
  label?: string;
  errorContainer?: HTMLElement | string;
  successClass?: string;
  errorClass?: string;
  messages?: Record<string, string>;
}

export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface Locale {
  [key: string]: string;
}

export interface FormGuardConfig {
  mode?: ValidationMode;
  locale?: Locale;
  focusOnError?: boolean;
  lockForm?: boolean;
  errorClass?: string;
  successClass?: string;
  pendingClass?: string;
  debug?: boolean;
  verbose?: boolean;
  errorContainer?: HTMLElement | string;
  collectAll?: boolean;
  debounceMs?: number;
}

export interface FieldState {
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  rules: Rule[];
  config: FieldConfig;
  errors: ValidationError[];
  validated: boolean;
  pending: boolean;
  abortController: AbortController | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

export interface GroupState {
  elements: (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
  rules: Rule[];
  config: GroupConfig;
  errors: ValidationError[];
  validated: boolean;
  pending: boolean;
  abortController: AbortController | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

export type SuccessCallback = () => void;
export type FailCallback = (errors: ValidationError[]) => void;
export type ValidateCallback = (result: {
  valid: boolean;
  errors: ValidationError[];
  fields: Record<string, ValidationError[]>;
  groups: Record<string, ValidationError[]>;
}) => void;

export interface FormGuardInstance {
  addField(
    fieldSelector: string,
    rules: Rule[],
    config?: FieldConfig,
  ): FormGuardInstance;
  removeField(fieldSelector: string): FormGuardInstance;
  addGroup(
    groupSelector: string,
    rules: Rule[],
    config?: GroupConfig,
  ): FormGuardInstance;
  removeGroup(groupSelector: string): FormGuardInstance;
  validate(forceRevalidation?: boolean): Promise<boolean>;
  validateField(fieldSelector: string): Promise<boolean>;
  validateGroup(groupSelector: string): Promise<boolean>;
  revalidate(): Promise<boolean>;
  revalidateField(fieldSelector: string): Promise<boolean>;
  revalidateGroup(groupSelector: string): Promise<boolean>;
  clearErrors(): FormGuardInstance;
  refresh(): FormGuardInstance;
  destroy(): void;
  setLocale(locale: Locale): FormGuardInstance;
  onSuccess(callback: SuccessCallback): FormGuardInstance;
  onFail(callback: FailCallback): FormGuardInstance;
  onValidate(callback: ValidateCallback): FormGuardInstance;
  getErrors(): ValidationError[];
  getFieldErrors(fieldSelector: string): ValidationError[];
  getGroupErrors(groupSelector: string): ValidationError[];
  isFieldPending(fieldSelector: string): boolean;
  isPending(): boolean;
}
