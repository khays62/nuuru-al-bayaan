// Centralized initial/default password policy for accounts.
// Use one env var for both teachers and students.

export function getDefaultInitialPassword() {
  const pwd = process.env.DEFAULT_INITIAL_PASSWORD
    || process.env.DEFAULT_TEACHER_PASSWORD
    || process.env.DEFAULT_STUDENT_PASSWORD;

  if (pwd && String(pwd).trim() !== '') return String(pwd);

  throw new Error('Missing DEFAULT_INITIAL_PASSWORD (or DEFAULT_TEACHER_PASSWORD / DEFAULT_STUDENT_PASSWORD)');
}
