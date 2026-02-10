export default {
  common: {
    ok: 'OK',
    notFound: 'Not found',
    serverError: 'Server error',
    serverErrorCaps: 'Server Error',
    accessDenied: 'Access denied',
    unauthorized: 'Unauthorized',
    notAuthorized: 'Not authorized',
    userNotFound: 'User not found',
    invalidJsonBody: 'Invalid JSON body',
    corsOriginNotAllowed: 'CORS: Origin not allowed',
  },

  rateLimit: {
    slowDown: 'Too many requests. Please slow down.',
    tryAgainIn: 'Too many requests. Try again in {{seconds}}s.',
    tryAgainLater: 'Too many requests. Try again later.',
  },

  auth: {
    noTokenProvided: 'No token provided',
    jwtSecretMissing: 'Server auth is not configured (JWT_SECRET missing)',
  },

  permissions: {
    userNotAuthenticated: 'User not authenticated',
    noPermissionActionModule: 'You do not have permission to {{action}} {{module}}',
    missingRequiredPermissionWithExpected: 'Missing required permission: {{expected}}',
    missingRequiredPermission: 'Missing required permission',
    noPermissionsForModule: 'No permissions found for module: {{module}}',
    noPermissionAccessModule: 'You do not have permission to access {{module}}',
  },

  csrf: {
    invalid: 'CSRF token missing or invalid',
  },

  teacherScope: {
    missingTeacherRef: 'Teacher account is missing teacherRef',
    invalidTeacherId: 'Invalid teacher id',
    notAllowedOtherTeacher: 'Not allowed to access another teacher',
    gradeSectionIdRequired: 'gradeSectionId required',
    subjectIdRequired: 'subjectId required',
    notAssignedToClass: 'Not assigned to this class',
  },
};
