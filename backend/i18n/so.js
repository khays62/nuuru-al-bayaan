export default {
  common: {
    ok: 'OK',
    notFound: 'Lama helin',
    serverError: 'Khalad server',
    serverErrorCaps: 'Khalad Server',
    accessDenied: 'Access waa la diiday',
    unauthorized: 'Lama oggola (Unauthorized)',
    notAuthorized: 'Lama oggola (Not authorized)',
    userNotFound: 'Isticmaale lama helin',
    invalidJsonBody: 'JSON body aan sax ahayn',
    corsOriginNotAllowed: 'CORS: Origin lama oggola',
  },

  rateLimit: {
    slowDown: 'Codsiyo badan ayaa jira. Fadlan yaree.',
    tryAgainIn: 'Codsiyo badan. Mar kale isku day {{seconds}}s kadib.',
    tryAgainLater: 'Codsiyo badan. Mar kale isku day goor dambe.',
  },

  auth: {
    noTokenProvided: 'Token lama bixin',
    jwtSecretMissing: 'Auth-ka server-ka lama dejin (JWT_SECRET maqan)',
  },

  permissions: {
    userNotAuthenticated: 'User-ku ma gelin (authenticated) ma aha',
    noPermissionActionModule: 'Ma lihid oggolaansho aad ku {{action}} {{module}}',
    missingRequiredPermissionWithExpected: 'Oggolaanshaha loo baahan yahay wuu maqan yahay: {{expected}}',
    missingRequiredPermission: 'Oggolaanshaha loo baahan yahay wuu maqan yahay',
    noPermissionsForModule: 'Oggolaansho module-kan looma helin: {{module}}',
    noPermissionAccessModule: 'Ma lihid oggolaansho aad ku gasho {{module}}',
  },

  csrf: {
    invalid: 'CSRF token wuu maqan yahay ama ma saxna',
  },

  teacherScope: {
    missingTeacherRef: 'Akoonka macallinka teacherRef wuu ka maqan yahay',
    invalidTeacherId: 'ID macallin aan sax ahayn',
    notAllowedOtherTeacher: 'Lama oggola inaad gasho macallin kale',
    gradeSectionIdRequired: 'gradeSectionId waa khasab',
    subjectIdRequired: 'subjectId waa khasab',
    notAssignedToClass: 'Laguma xilsaarin fasalkan',
  },

  ai: {
    disabledByPolicy: 'Chat-ka AI waa la damiyay (policy)',
    disabledForRole: 'Chat-ka AI lama oggola akoonkaaga',
    dailyLimitExceeded: 'Xadka maalintii ee AI waa la gaaray. Isku day berri.',
    quotaExceeded: 'Quota AI waa la dhaafay. Fadlan mar kale isku day goor dambe.',
    retryIn: 'Mar kale isku day',
    busy: 'AI-ga wuu mashquulsan yahay. Isku day wax yar kadib.',
    missingApiKey: 'AI-ga server-ka lama dejin',
  },
};
