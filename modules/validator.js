/**
 * Custom Module: Server-Side Validation Engine
 * Course: Web Technology (2304362L) | Practical No. 4
 * Author: Ayush (PRN: 2304362)
 */

const VALID_DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering'
];

const VALID_YEARS = [
  'F.Y. B.Tech (First Year)',
  'S.Y. B.Tech (Second Year)',
  'T.Y. B.Tech (Third Year)',
  'Final Year B.Tech'
];

/**
 * Sanitizes input string against malicious HTML / script injections
 */
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates a single registration payload on the server
 * @param {Object} data - The raw request body
 * @returns {Object} { isValid: boolean, errors: Object, sanitizedData: Object }
 */
function validateRegistration(data) {
  const errors = {};
  const sanitized = {};

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: { payload: 'Invalid or missing JSON payload in request body.' },
      sanitizedData: null
    };
  }

  // 1. Full Name Validation
  const rawName = (data.fullName || '').trim();
  if (!rawName) {
    errors.fullName = 'Full Name is required.';
  } else if (!/^[A-Za-z\s]{3,50}$/.test(rawName)) {
    errors.fullName = 'Full Name must contain only alphabets and spaces (3 to 50 characters).';
  } else {
    sanitized.fullName = sanitize(rawName);
  }

  // 2. PRN / Roll Number Validation
  const rawPRN = (data.prn || '').trim();
  if (!rawPRN) {
    errors.prn = 'PRN / Roll Number is required.';
  } else if (!/^[A-Za-z0-9]{7,10}$/.test(rawPRN)) {
    errors.prn = 'PRN must be 7 to 10 alphanumeric characters (e.g. 2304362).';
  } else {
    sanitized.prn = sanitize(rawPRN).toUpperCase();
  }

  // 3. Email Validation (RFC 5322 Standard)
  const rawEmail = (data.email || '').trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(rawEmail)) {
    errors.email = 'Please provide a valid email format (e.g. student@mitaoe.ac.in).';
  } else {
    sanitized.email = sanitize(rawEmail);
  }

  // 4. Contact Phone Validation (10-digit Indian format)
  const rawPhone = (data.phone || '').trim();
  if (!rawPhone) {
    errors.phone = 'Mobile phone number is required.';
  } else if (!/^[6-9]\d{9}$/.test(rawPhone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
  } else {
    sanitized.phone = sanitize(rawPhone);
  }

  // 5. Department Validation (Enum constraint)
  const rawDept = (data.department || '').trim();
  if (!rawDept) {
    errors.department = 'Academic department selection is required.';
  } else if (!VALID_DEPARTMENTS.includes(rawDept)) {
    errors.department = `Invalid department. Allowed values: ${VALID_DEPARTMENTS.join(', ')}`;
  } else {
    sanitized.department = rawDept;
  }

  // 6. Year of Study Validation (Enum constraint)
  const rawYear = (data.academicYear || '').trim();
  if (!rawYear) {
    errors.academicYear = 'Academic year of study is required.';
  } else if (!VALID_YEARS.includes(rawYear)) {
    errors.academicYear = `Invalid academic year selection.`;
  } else {
    sanitized.academicYear = rawYear;
  }

  // 7. CGPA Score Validation (Numeric range: 0.00 to 10.00)
  const rawCGPA = parseFloat(data.cgpa);
  if (data.cgpa === undefined || data.cgpa === null || data.cgpa === '') {
    errors.cgpa = 'CGPA score is required.';
  } else if (isNaN(rawCGPA) || rawCGPA < 0.0 || rawCGPA > 10.0) {
    errors.cgpa = 'CGPA must be a valid numeric value between 0.00 and 10.00.';
  } else {
    sanitized.cgpa = parseFloat(rawCGPA.toFixed(2));
  }

  // 8. Technical Skills Array Validation
  let skills = [];
  if (Array.isArray(data.skills)) {
    skills = data.skills.map((s) => sanitize(String(s).trim())).filter(Boolean);
  } else if (typeof data.skills === 'string' && data.skills.trim()) {
    skills = data.skills.split(',').map((s) => sanitize(s.trim())).filter(Boolean);
  }

  if (skills.length === 0) {
    errors.skills = 'Select or enter at least one technical skill.';
  } else {
    sanitized.skills = skills;
  }

  // 9. Terms Acceptance Checkbox
  if (!data.agreeTerms) {
    errors.agreeTerms = 'You must accept the academic integrity policy.';
  } else {
    sanitized.agreeTerms = true;
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitizedData: isValid ? sanitized : null
  };
}

module.exports = {
  validateRegistration,
  sanitize,
  VALID_DEPARTMENTS,
  VALID_YEARS
};
