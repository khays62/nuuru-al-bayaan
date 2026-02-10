export default {
  common: {
    ok: 'حسنًا',
    notFound: 'غير موجود',
    serverError: 'خطأ في الخادم',
    serverErrorCaps: 'خطأ في الخادم',
    accessDenied: 'تم رفض الوصول',
    unauthorized: 'غير مصرح',
    notAuthorized: 'غير مخوّل',
    userNotFound: 'المستخدم غير موجود',
    invalidJsonBody: 'نص JSON غير صالح',
    corsOriginNotAllowed: 'CORS: المصدر غير مسموح',
  },

  rateLimit: {
    slowDown: 'طلبات كثيرة جدًا. الرجاء التمهّل.',
    tryAgainIn: 'طلبات كثيرة جدًا. حاول مرة أخرى بعد {{seconds}} ثانية.',
    tryAgainLater: 'طلبات كثيرة جدًا. حاول لاحقًا.',
  },

  auth: {
    noTokenProvided: 'لم يتم توفير رمز الدخول',
    jwtSecretMissing: 'مصادقة الخادم غير مُهيأة (JWT_SECRET مفقود)',
  },

  permissions: {
    userNotAuthenticated: 'المستخدم غير مُسجّل الدخول',
    noPermissionActionModule: 'ليس لديك صلاحية {{action}} {{module}}',
    missingRequiredPermissionWithExpected: 'الصلاحية المطلوبة مفقودة: {{expected}}',
    missingRequiredPermission: 'الصلاحية المطلوبة مفقودة',
    noPermissionsForModule: 'لا توجد صلاحيات للوحدة: {{module}}',
    noPermissionAccessModule: 'ليس لديك صلاحية للوصول إلى {{module}}',
  },

  csrf: {
    invalid: 'رمز CSRF مفقود أو غير صالح',
  },

  teacherScope: {
    missingTeacherRef: 'حساب المعلم يفتقد teacherRef',
    invalidTeacherId: 'معرّف المعلم غير صالح',
    notAllowedOtherTeacher: 'غير مسموح بالوصول إلى معلم آخر',
    gradeSectionIdRequired: 'مطلوب gradeSectionId',
    subjectIdRequired: 'مطلوب subjectId',
    notAssignedToClass: 'غير مكلّف بهذا الصف',
  },
};
