import type { Locale } from '../types';

const en: Locale = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minLength: 'Must be at least {0} characters',
  maxLength: 'Must be no more than {0} characters',
  number: 'Must be a number',
  integer: 'Must be an integer',
  min: 'Must be at least {0}',
  max: 'Must be no more than {0}',
  pattern: 'Invalid format',
  sameAs: 'Must match {0}',
  files: 'Please select at least one file',
  minFiles: 'Please select at least {0} files',
  maxFiles: 'Please select at most {0} files',
  strongPassword:
    'Password must contain uppercase, lowercase, digit, and special character',
};

export default en;
