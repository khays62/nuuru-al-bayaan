const arStatic = {
  // Generic
  'OK': 'حسنًا',
  'Bad Request': 'طلب غير صالح',
  'Bad request': 'طلب غير صالح',
  'Not found': 'غير موجود',
  'Server error': 'خطأ في الخادم',
  'Server Error': 'خطأ في الخادم',
  'Access denied': 'تم رفض الوصول',
  'Forbidden': 'ممنوع',
  'Unauthorized': 'غير مصرح',
  'Not authorized': 'غير مخوّل',
  'User not found': 'المستخدم غير موجود',
  'Invalid JSON body': 'نص JSON غير صالح',
  'CORS: Origin not allowed': 'CORS: المصدر غير مسموح',
  'Validation error': 'خطأ في التحقق',
  'Invalid value': 'قيمة غير صالحة',

  // Auth / login
  'Invalid credentials': 'بيانات اعتماد غير صحيحة',
  'Unknown username / student ID': 'اسم المستخدم / رقم الطالب غير معروف',
  'Username / Student ID and password required': 'اسم المستخدم / رقم الطالب وكلمة المرور مطلوبة',
  'Username / Student ID is too long': 'اسم المستخدم / رقم الطالب طويل جدًا',
  'Password is too long': 'كلمة المرور طويلة جدًا',
  'username or studentId is required': 'اسم المستخدم أو رقم الطالب مطلوب',
  'Password required': 'كلمة المرور مطلوبة',
  'Too many login attempts. Try again later.': 'محاولات تسجيل دخول كثيرة جدًا. حاول لاحقًا.',
  'Too many requests. Please slow down.': 'طلبات كثيرة جدًا. الرجاء التمهّل.',
  'Too many requests. Try again later.': 'طلبات كثيرة جدًا. حاول لاحقًا.',
  'Unknown username. Too many attempts; login is blocked.': 'اسم مستخدم غير معروف. محاولات كثيرة جدًا؛ تم حظر تسجيل الدخول.',
  'Too many attempts. Account is locked for 24 hours. Contact an administrator.': 'محاولات كثيرة جدًا. تم قفل الحساب لمدة 24 ساعة. تواصل مع المسؤول.',
  'Wrong password': 'كلمة المرور غير صحيحة',
  'Login successful': 'تم تسجيل الدخول بنجاح',
  'Login lockout reset successfully': 'تمت إعادة ضبط قفل تسجيل الدخول بنجاح',
  'Logged out successfully': 'تم تسجيل الخروج بنجاح',
  'Use student change-password endpoint': 'استخدم مسار تغيير كلمة مرور الطالب',
  'newPassword must be at least 6 characters': 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل',
  'newPassword is too long': 'كلمة المرور الجديدة طويلة جدًا',
  'currentPassword required': 'currentPassword مطلوب',
  'Invalid current password': 'كلمة المرور الحالية غير صحيحة',
  'No token provided': 'لم يتم توفير رمز الدخول',
  'Server auth is not configured (JWT_SECRET missing)': 'مصادقة الخادم غير مُهيأة (JWT_SECRET مفقود)',

  // Permissions
  'User not authenticated': 'المستخدم غير مُسجّل الدخول',

  // CSRF
  'CSRF token missing or invalid': 'رمز CSRF مفقود أو غير صالح',

  // Teacher scope
  'Teacher account is missing teacherRef': 'حساب المعلم يفتقد teacherRef',
  'Invalid teacher id': 'معرّف المعلم غير صالح',
  'Not allowed to access another teacher': 'غير مسموح بالوصول إلى معلم آخر',
  'gradeSectionId required': 'مطلوب gradeSectionId',
  'subjectId required': 'مطلوب subjectId',
  'Not assigned to this class': 'غير مكلّف بهذا الصف',
  'Not assigned to this class/subject': 'غير مكلّف بهذا الصف/المادة',

  // Common ids/fields
  'Invalid ids': 'معرّفات غير صالحة',
  'Invalid id': 'معرّف غير صالح',
  'Invalid ID': 'معرّف غير صالح',
  'Invalid ID.': 'معرّف غير صالح.',
  'Invalid subject id': 'معرّف المادة غير صالح',
  'Invalid studentId': 'معرّف الطالب غير صالح',
  'Invalid student id': 'معرّف الطالب غير صالح',
  'Invalid enrollmentId': 'معرّف التسجيل غير صالح',
  'Invalid gradeSectionId': 'معرّف الشعبة غير صالح',
  'Invalid academicYearId': 'معرّف السنة الدراسية غير صالح',
  'Invalid cohortId': 'معرّف الدفعة غير صالح',

  // Attendance
  'Missing required fields': 'حقول مطلوبة مفقودة',
  'Invalid periodCode': 'رمز الحصة غير صالح',
  'periodCode required': 'مطلوب periodCode',
  'periodCode required for lesson mode': 'periodCode مطلوب لوضع الحصة',
  'Invalid periodCode for lesson mode': 'periodCode غير صالح لوضع الحصة',
  'Invalid mode (use daily or lesson)': 'وضع غير صالح (استخدم daily أو lesson)',
  'Max range is 1 month (31 days).': 'أقصى مدى شهر واحد (31 يومًا).',
  'Duplicate attendance record detected. Please retry.': 'تم اكتشاف سجل حضور مكرر. الرجاء إعادة المحاولة.',
  'GradeSection not found': 'الشعبة غير موجودة',
  'Student is not in this section for the selected roster scope.': 'الطالب ليس في هذه الشعبة ضمن نطاق القائمة المحدد.',
  'gradeSectionId required': 'مطلوب gradeSectionId',
  'studentId required': 'مطلوب studentId',

  // Students / teachers / users
  'Teacher not found': 'المعلم غير موجود',
  'Student not found': 'الطالب غير موجود',
  'Section not found.': 'الشعبة غير موجودة.',
  'TeacherId required for login': 'TeacherId مطلوب لتسجيل الدخول',
  'Teacher login already exists (username/email conflict)': 'حساب دخول المعلم موجود بالفعل (تعارض اسم المستخدم/البريد)',
  'Teacher login username already exists': 'اسم مستخدم دخول المعلم موجود بالفعل',
  'Teacher login email already exists': 'بريد دخول المعلم موجود بالفعل',
  'Teacher login user not found': 'مستخدم تسجيل دخول المعلم غير موجود',
  'Could not create teacher login': 'تعذر إنشاء تسجيل دخول للمعلم',
  'Subject not found': 'المادة غير موجودة',
  'Subject removed': 'تم حذف المادة',
  'Subject code already exists': 'رمز المادة موجود بالفعل',
  'Duplicate subject code': 'رمز مادة مكرر',
  'Please provide subject name and at least one grade.': 'يرجى إدخال اسم المادة واختيار صف واحد على الأقل.',
  'Some subjects not found': 'بعض المواد غير موجودة',
  'Section already exists for this Grade/Shift/Section': 'هذه الشعبة موجودة بالفعل لهذا الصف/الدوام/الشعبة',
  'grade and shift are required': 'الصف والدوام مطلوبان',
  'Invalid grade': 'صف غير صالح',
  'Invalid shift': 'دوام غير صالح',
  'Error fetching grades': 'خطأ في جلب الصفوف',
  'Grade name already exists': 'اسم الصف موجود بالفعل',
  'Grade order already exists': 'ترتيب الصف موجود بالفعل',
  'Duplicate grade': 'صف مكرر',
  'Grade not found': 'الصف غير موجود',
  'Grade is in use and cannot be deleted': 'الصف مستخدم ولا يمكن حذفه',
  'Error fetching shifts': 'خطأ في جلب الدوامات',
  'Shift name already exists': 'اسم الدوام موجود بالفعل',
  'Duplicate shift': 'دوام مكرر',
  'Shift not found': 'الدوام غير موجود',
  'Shift is in use and cannot be deleted': 'الدوام مستخدم ولا يمكن حذفه',
  'Error fetching academic years': 'خطأ في جلب السنوات الدراسية',
  'Academic year already exists': 'السنة الدراسية موجودة بالفعل',
  'Duplicate academic year': 'سنة دراسية مكررة',
  'Academic year not found': 'السنة الدراسية غير موجودة',
  'Academic year is in use and cannot be deleted': 'السنة الدراسية مستخدمة ولا يمكن حذفها',
  'Grade deleted': 'تم حذف الصف',
  'Shift deleted': 'تم حذف الدوام',
  'Academic year deleted': 'تم حذف السنة الدراسية',
  'User updated successfully': 'تم تحديث المستخدم بنجاح',
  'User deleted': 'تم حذف المستخدم',
  'You cannot delete your own account': 'لا يمكنك حذف حسابك',
  'Cannot delete the last admin': 'لا يمكن حذف آخر مسؤول',
  'You cannot change your own status': 'لا يمكنك تغيير حالتك',
  'Cannot deactivate the last admin': 'لا يمكن تعطيل آخر مسؤول',
  'Failed to fetch user': 'فشل جلب المستخدم',
  'Invalid role': 'دور غير صالح',
  'Invalid role filter': 'تصفية الدور غير صالحة',
  'Invalid status filter': 'تصفية الحالة غير صالحة',
  'You do not have permission to access subjects': 'ليس لديك صلاحية للوصول إلى المواد',
  'Cannot remove a grade because existing classes use this subject': 'لا يمكن إزالة صف لأن هناك فصولًا تستخدم هذه المادة',
  'Subject is assigned to existing classes; cannot delete': 'المادة مرتبطة بفصول موجودة؛ لا يمكن حذفها',

  // Students
  'Please fill in all required fields (including academicYearId).': 'يرجى تعبئة جميع الحقول المطلوبة (بما في ذلك academicYearId).',
  'Cannot change status of a closed enrollment': 'لا يمكن تغيير حالة تسجيل مُغلق',

  // Announcements
  'Only the posting teacher can edit this announcement': 'فقط المعلم الذي نشر الإعلان يمكنه تعديل هذا الإعلان',
  'Only the posting teacher can delete this announcement': 'فقط المعلم الذي نشر الإعلان يمكنه حذف هذا الإعلان',

  // GradeSection
  'Cannot modify grade or shift after students have been enrolled in this section.': 'لا يمكن تعديل الصف أو الدوام بعد تسجيل الطلاب في هذه الشعبة.',
  'Cannot remove subjects that already have recorded scores in this class.': 'لا يمكن إزالة المواد التي لديها درجات مسجلة بالفعل في هذا الصف.',
  'Cannot delete section while active students are enrolled': 'لا يمكن حذف الشعبة بينما يوجد طلاب نشطون مسجلون',

  // Cohorts
  'Cohort name already exists': 'اسم الدفعة موجود بالفعل',
  'Cannot change name; cohort already has enrollments.': 'لا يمكن تغيير الاسم؛ الدفعة لديها تسجيلات بالفعل.',
  'Cannot change academic year; cohort already has enrollments.': 'لا يمكن تغيير السنة الدراسية؛ الدفعة لديها تسجيلات بالفعل.',
  'Cohort is in use by enrollments; cannot delete': 'الدفعة مستخدمة في تسجيلات؛ لا يمكن حذفها',
  'academicYear is required and must be a valid id': 'academicYear مطلوب ويجب أن يكون معرّفًا صالحًا',
  'Invalid grade or shift id': 'معرّف الصف أو الدوام غير صالح',
  'Provide gradeSectionId or grade+shift+section': 'قدّم gradeSectionId أو grade+shift+section',
  'No updates provided.': 'لم يتم تقديم أي تحديثات.',
  'Invalid status.': 'حالة غير صالحة.',
  'Already deactivated': 'مُعطّل بالفعل',
  'Already active': 'نشط بالفعل',
  'Student deactivated': 'تم تعطيل الطالب',
  'Student reactivated': 'تم إعادة تفعيل الطالب',
  'Password updated': 'تم تحديث كلمة المرور',
  'currentPassword is required': 'currentPassword مطلوب',
  'Current password is incorrect': 'كلمة المرور الحالية غير صحيحة',
  'newPassword is required': 'newPassword مطلوب',
  'New password must be at least 6 characters': 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل',
  'Student login account is missing. Contact admin to re-run migration.': 'حساب دخول الطالب مفقود. تواصل مع المسؤول لإعادة تشغيل الترحيل.',
  'Password reset to default. Student must change it after login.': 'تمت إعادة تعيين كلمة المرور للوضع الافتراضي. يجب على الطالب تغييرها بعد تسجيل الدخول.',
  'Password reset to default and lock cleared.': 'تمت إعادة تعيين كلمة المرور للوضع الافتراضي وإزالة القفل.',
  'Invalid ids': 'معرّفات غير صالحة',
  'Ids must be different': 'يجب أن تكون المعرّفات مختلفة',
  'Invalid dayOfWeek': 'dayOfWeek غير صالح',
  'Invalid time range': 'نطاق وقت غير صالح',
  'Invalid time range (start ≥ end)': 'نطاق وقت غير صالح (البداية ≥ النهاية)',
  'days required': 'days مطلوبة',
  'Room already booked at this time.': 'الغرفة محجوزة بالفعل في هذا الوقت.',
  'Teacher has another class in this period.': 'لدى المعلم حصة أخرى في هذه الفترة.',
  'Period already occupied for this class.': 'هذه الفترة مشغولة بالفعل لهذا الصف.',
  'No teacher assigned to this subject in this class.': 'لا يوجد معلم مكلّف بهذه المادة في هذا الصف.',
  'Assignment not found': 'التكليف غير موجود',
  'This teacher already has this assignment.': 'هذا المعلم لديه هذا التكليف بالفعل.',
  'Subject already assigned to another teacher.': 'المادة مكلّفة لمعلم آخر بالفعل.',
  'Cannot delete: teacher has assignments.': 'لا يمكن الحذف: لدى المعلم تكليفات.',
  'Cannot remove assignment: timetable exists for this class/subject. Remove timetable entries first.': 'لا يمكن إزالة التكليف: يوجد جدول لهذا الصف/المادة. احذف إدخالات الجدول أولًا.',
  'ay and gs are required': 'ay و gs مطلوبان',
  'Invalid ids': 'معرّفات غير صالحة',
  'Invalid target Academic Year (provide valid ObjectId or yearName).': 'سنة دراسية هدف غير صالحة (قدّم ObjectId صالح أو yearName).',
  'Invalid Academic Year naming (YYYY-YYYY). Cannot compare ordering.': 'تسمية سنة دراسية غير صالحة (YYYY-YYYY). لا يمكن مقارنة الترتيب.',
  'Enrollment not found': 'التسجيل غير موجود',
  'Target section not found': 'الشعبة الهدف غير موجودة',
  'Target section is full. Cannot transfer.': 'الشعبة الهدف ممتلئة. لا يمكن النقل.',
  'Only Active students can be transferred': 'فقط الطلاب النشطون يمكن نقلهم',
  'Only active enrollments can be transferred': 'فقط التسجيلات النشطة يمكن نقلها',
  'Returned to previous Academic Year.': 'تمت الإعادة إلى السنة الدراسية السابقة.',
  'Student already has an enrollment in the target Academic Year.': 'لدى الطالب تسجيل بالفعل في السنة الدراسية الهدف.',
  'Enrollment transferred': 'تم نقل التسجيل',
  'No changes: already in this section': 'لا تغييرات: موجود بالفعل في هذه الشعبة',
  'Enrollment transferred to future Academic Year (scores not migrated).': 'تم نقل التسجيل إلى سنة دراسية لاحقة (لم يتم ترحيل الدرجات).',
  'Return not possible: no previous enrollment in the target AY.': 'لا يمكن الإرجاع: لا يوجد تسجيل سابق في السنة الهدف.',
  'Return requires the original Grade/Shift/Section for that AY.': 'الإرجاع يتطلب الصف/الدوام/الشعبة الأصلية لتلك السنة.',

  // Exams
  'Template not found': 'القالب غير موجود',
  'Base template not found': 'القالب الأساسي غير موجود',
  'templateVersion is required': 'templateVersion مطلوب',
  'templateTotal must be > 0': 'يجب أن يكون templateTotal أكبر من 0',
  'This template already has saved scores and is locked. Total cannot be edited.': 'هذا القالب يحتوي على درجات محفوظة وهو مقفول. لا يمكن تعديل المجموع.',
  'Cannot add a new column to this template because it already has saved scores. Please create a new template instead.': 'لا يمكن إضافة عمود جديد لهذا القالب لأنه يحتوي على درجات محفوظة. الرجاء إنشاء قالب جديد بدلًا من ذلك.',
  'Cannot delete the last column of a template. Delete the template instead.': 'لا يمكن حذف آخر عمود في القالب. احذف القالب بدلًا من ذلك.',
  'Cannot delete this column because it already has saved scores.': 'لا يمكن حذف هذا العمود لأنه يحتوي على درجات محفوظة بالفعل.',
  'Cannot delete the default (active) template. Set another template as default first.': 'لا يمكن حذف القالب الافتراضي (النشط). عيّن قالبًا آخر كافتراضي أولًا.',
  'Cannot delete the last remaining template.': 'لا يمكن حذف آخر قالب متبقٍ.',
  'Cannot delete this template because it already has saved scores.': 'لا يمكن حذف هذا القالب لأنه يحتوي على درجات محفوظة بالفعل.',
  'Cannot lower maxScore below existing saved scores for this component': 'لا يمكن خفض maxScore إلى أقل من الدرجات المحفوظة لهذا المكوّن',
  'Order must be unique within this template': 'يجب أن يكون الترتيب فريدًا ضمن هذا القالب',
  'Duplicate exam type in template version': 'نوع امتحان مكرر ضمن نسخة القالب',
  'Active template updated': 'تم تحديث القالب النشط',
  'This student already has scores saved under another exam template version for this subject. Please switch to that version.': 'لدى هذا الطالب درجات محفوظة مسبقًا تحت نسخة قالب امتحان أخرى لهذه المادة. الرجاء التبديل إلى تلك النسخة.',
  'Student has no enrollment for this section/year': 'لا يوجد تسجيل لهذا الطالب في هذه الشعبة/السنة',
  'Saved': 'تم الحفظ',
  'Duplicate score combination': 'تركيبة درجات مكررة',

  // Transfer log reasons (shown in UI)
  'Transfer': 'نقل',
  'Revert': 'إرجاع',
  'Promotion': 'ترقية',
  'Graduation': 'تخرج',
  'order must be a positive integer': 'يجب أن يكون الترتيب عددًا صحيحًا موجبًا',
  'No students selected': 'لم يتم اختيار طلاب',
  'Student codes not found': 'أكواد الطلاب غير موجودة',
  'Grade order missing': 'ترتيب الصف مفقود',
  'Mid-year promotion already done': 'تمت ترقية منتصف العام بالفعل',
  'Mid-year promotion already done for some students.': 'تمت ترقية منتصف العام لبعض الطلاب بالفعل.',
  'Grade order is not configured. Please set an integer `order` for each Grade (1..N).': 'ترتيب الصفوف غير مُعدّ. الرجاء تعيين عدد صحيح `order` لكل صف (1..N).',

  // Security / notifications
  'API is running...': 'واجهة API تعمل...',
  'Unlock via notifications is not supported for Admin accounts.': 'فتح القفل عبر الإشعارات غير مدعوم لحسابات المسؤول.',
  'Unlock is only available for staff accounts. Use reset password for teachers/students.': 'فتح القفل متاح فقط لحسابات الموظفين. استخدم إعادة تعيين كلمة المرور للمعلمين/الطلاب.',
  'Account unlocked': 'تم فتح قفل الحساب',
  'Admin accounts do not support reset-to-default. Use Update Password instead.': 'حسابات المسؤول لا تدعم إعادة التعيين للوضع الافتراضي. استخدم تحديث كلمة المرور بدلًا من ذلك.',
  'Staff accounts do not support reset-to-default. Use Update Password instead.': 'حسابات الموظفين لا تدعم إعادة التعيين للوضع الافتراضي. استخدم تحديث كلمة المرور بدلًا من ذلك.',
};

const soStatic = {
  // Generic
  'OK': 'OK',
  'Bad Request': 'Codsi khaldan',
  'Bad request': 'Codsi khaldan',
  'Not found': 'Lama helin',
  'Server error': 'Khalad server',
  'Server Error': 'Khalad Server',
  'Access denied': 'Access waa la diiday',
  'Forbidden': 'Waa mamnuuc',
  'Unauthorized': 'Lama oggola (Unauthorized)',
  'Not authorized': 'Lama oggola (Not authorized)',
  'User not found': 'Isticmaale lama helin',
  'Invalid JSON body': 'JSON body aan sax ahayn',
  'CORS: Origin not allowed': 'CORS: Origin lama oggola',
  'Validation error': 'Khalad hubin (validation)',
  'Invalid value': 'Qiime aan sax ahayn',

  // Auth / login
  'Invalid credentials': 'Xog gelin khaldan',
  'Unknown username / student ID': 'Username / Student ID lama yaqaan',
  'Username / Student ID and password required': 'Username / Student ID iyo password waa khasab',
  'Username / Student ID is too long': 'Username / Student ID aad buu u dheer yahay',
  'Password is too long': 'Password aad buu u dheer yahay',
  'username or studentId is required': 'username ama studentId waa khasab',
  'Password required': 'Password waa khasab',
  'Too many login attempts. Try again later.': 'Isku dayo login aad u badan. Mar kale isku day goor dambe.',
  'Too many requests. Please slow down.': 'Codsiyo badan ayaa jira. Fadlan yaree.',
  'Too many requests. Try again later.': 'Codsiyo badan. Mar kale isku day goor dambe.',
  'Unknown username. Too many attempts; login is blocked.': 'Username aan la aqoon. Isku dayo badan awgood login waa la xannibay.',
  'Too many attempts. Account is locked for 24 hours. Contact an administrator.': 'Isku dayo badan. Account-ka waa la xiray 24 saac. La xiriir admin.',
  'Wrong password': 'Password khaldan',
  'Login successful': 'Login si guul leh',
  'Login lockout reset successfully': 'Login lockout si guul leh ayaa loo reset gareeyay',
  'Logged out successfully': 'Logout si guul leh',
  'Use student change-password endpoint': 'Isticmaal endpoint-ka student change-password',
  'newPassword must be at least 6 characters': 'newPassword ugu yaraan 6 xaraf ha noqoto',
  'newPassword is too long': 'newPassword aad buu u dheer yahay',
  'currentPassword required': 'currentPassword waa khasab',
  'Invalid current password': 'currentPassword waa khaldan',
  'No token provided': 'Token lama bixin',
  'Server auth is not configured (JWT_SECRET missing)': 'Auth-ka server-ka lama dejin (JWT_SECRET maqan)',

  // Permissions
  'User not authenticated': 'User-ku ma gelin (authenticated) ma aha',

  // CSRF
  'CSRF token missing or invalid': 'CSRF token wuu maqan yahay ama ma saxna',

  // Teacher scope
  'Teacher account is missing teacherRef': 'Akoonka macallinka teacherRef wuu ka maqan yahay',
  'Invalid teacher id': 'ID macallin aan sax ahayn',
  'Not allowed to access another teacher': 'Lama oggola inaad gasho macallin kale',
  'gradeSectionId required': 'gradeSectionId waa khasab',
  'subjectId required': 'subjectId waa khasab',
  'Not assigned to this class': 'Laguma xilsaarin fasalkan',
  'Not assigned to this class/subject': 'Laguma xilsaarin fasalkan/subject-kan',

  // Common ids/fields
  'Invalid ids': 'IDs aan sax ahayn',
  'Invalid id': 'ID aan sax ahayn',
  'Invalid ID': 'ID aan sax ahayn',
  'Invalid subject id': 'Subject ID aan sax ahayn',
  'Invalid studentId': 'studentId aan sax ahayn',
  'Invalid student id': 'ID arday aan sax ahayn',
  'Invalid enrollmentId': 'enrollmentId aan sax ahayn',
  'Invalid gradeSectionId': 'gradeSectionId aan sax ahayn',
  'Invalid academicYearId': 'academicYearId aan sax ahayn',
  'Invalid cohortId': 'cohortId aan sax ahayn',

  // Attendance
  'Missing required fields': 'Xog muhiim ah ayaa maqan',
  'Invalid periodCode': 'periodCode aan sax ahayn',
  'periodCode required': 'periodCode waa khasab',
  'periodCode required for lesson mode': 'periodCode waa khasab (lesson mode)',
  'Invalid periodCode for lesson mode': 'periodCode aan sax ahayn (lesson mode)',
  'Invalid mode (use daily or lesson)': 'mode aan sax ahayn (isticmaal daily ama lesson)',
  'Max range is 1 month (31 days).': 'Inta ugu badan waa 1 bil (31 maalmood).',
  'Duplicate attendance record detected. Please retry.': 'Attendance laba jeer ah ayaa la helay. Fadlan mar kale isku day.',
  'GradeSection not found': 'GradeSection lama helin',
  'Student is not in this section for the selected roster scope.': 'Ardaygu kuma jiro section-kan (roster scope-kan).',
  'gradeSectionId required': 'gradeSectionId waa khasab',
  'studentId required': 'studentId waa khasab',

  // Students / teachers / users
  'Teacher not found': 'Macallin lama helin',
  'Student not found': 'Arday lama helin',
  'Section not found.': 'Section lama helin.',
  'TeacherId required for login': 'TeacherId waa khasab (login)',
  'Teacher login already exists (username/email conflict)': 'Login-ka macallinka wuu jiraa (isku dhacyo username/email)',
  'Teacher login username already exists': 'Username login macallin wuu jiraa',
  'Teacher login email already exists': 'Email login macallin wuu jiraa',
  'Teacher login user not found': 'User-ka login macallin lama helin',
  'Could not create teacher login': 'Lama abuuri karin login macallin',
  'Subject not found': 'Subject lama helin',
  'Subject removed': 'Subject waa la tirtiray',
  'Subject code already exists': 'Subject code wuu jiraa',
  'Duplicate subject code': 'Subject code waa duplicate',
  'Please provide subject name and at least one grade.': 'Fadlan geli subject name iyo ugu yaraan hal grade.',
  'Some subjects not found': 'Qaar ka mid ah subjects lama helin',
  'Section already exists for this Grade/Shift/Section': 'Section-kan hore ayuu u jiraa (Grade/Shift/Section)',
  'grade and shift are required': 'grade iyo shift waa khasab',
  'Invalid grade': 'grade aan sax ahayn',
  'Invalid shift': 'shift aan sax ahayn',
  'Error fetching grades': 'Khalad ku yimid soo qaadista grades',
  'Grade name already exists': 'Magaca grade-ka hore ayuu u jiraa',
  'Grade order already exists': 'Order-ka grade-ka hore ayuu u jiraa',
  'Duplicate grade': 'Grade duplicate ah',
  'Grade not found': 'Grade lama helin',
  'Grade is in use and cannot be deleted': 'Grade-kan waa la isticmaalaa; lama tirtiri karo',
  'Error fetching shifts': 'Khalad ku yimid soo qaadista shifts',
  'Shift name already exists': 'Magaca shift-ka hore ayuu u jiraa',
  'Duplicate shift': 'Shift duplicate ah',
  'Shift not found': 'Shift lama helin',
  'Shift is in use and cannot be deleted': 'Shift-kan waa la isticmaalaa; lama tirtiri karo',
  'Error fetching academic years': 'Khalad ku yimid soo qaadista academic years',
  'Academic year already exists': 'Academic year hore ayuu u jiraa',
  'Duplicate academic year': 'Academic year duplicate ah',
  'Academic year not found': 'Academic year lama helin',
  'Academic year is in use and cannot be deleted': 'Academic year-kan waa la isticmaalaa; lama tirtiri karo',
  'Grade deleted': 'Grade waa la tirtiray',
  'Shift deleted': 'Shift waa la tirtiray',
  'Academic year deleted': 'Academic year waa la tirtiray',
  'User updated successfully': 'User si guul leh ayaa loo cusboonaysiiyay',
  'User deleted': 'User waa la tirtiray',
  'You cannot delete your own account': 'Ma tirtiri kartid account-kaaga',
  'Cannot delete the last admin': 'Lama tirtiri karo admin-kii ugu dambeeyay',
  'You cannot change your own status': 'Ma beddeli kartid status-kaaga',
  'Cannot deactivate the last admin': 'Lama damin karo admin-kii ugu dambeeyay',
  'Failed to fetch user': 'User-kii lama soo qaadi karin',
  'Invalid role': 'role aan sax ahayn',
  'Invalid role filter': 'role filter aan sax ahayn',
  'Invalid status filter': 'status filter aan sax ahayn',
  'You do not have permission to access subjects': 'Ma lihid oggolaansho aad ku gasho subjects',
  'Cannot remove a grade because existing classes use this subject': 'Lama saari karo grade sababtoo ah fasallo jira ayaa isticmaalaya subject-kan',
  'Subject is assigned to existing classes; cannot delete': 'Subject-kan fasallo jira ayaa isticmaala; lama tirtiri karo',

  // Students
  'Please fill in all required fields (including academicYearId).': 'Fadlan buuxi dhammaan fields-ka muhiimka ah (oo ay ku jirto academicYearId).',
  'Cannot change status of a closed enrollment': 'Lama beddeli karo status-ka enrollment xiran',

  // Announcements
  'Only the posting teacher can edit this announcement': 'Kaliya macallinka qoray announcement-kan ayaa edit-gareyn kara',
  'Only the posting teacher can delete this announcement': 'Kaliya macallinka qoray announcement-kan ayaa delete-gareyn kara',

  // GradeSection
  'Cannot modify grade or shift after students have been enrolled in this section.': 'Lama beddeli karo grade ama shift kadib marka ardayda lagu enroll gareeyo section-kan.',
  'Cannot remove subjects that already have recorded scores in this class.': 'Lama saari karo subjects horey loogu qoray scores fasalkan.',
  'Cannot delete section while active students are enrolled': 'Lama tirtiri karo section-ka inta arday active ah ku enroll yihiin',

  // Cohorts
  'Cohort name already exists': 'Cohort name hore ayuu u jiraa',
  'Cannot change name; cohort already has enrollments.': 'Lama beddeli karo name-ka: cohort-ku enrollments ayuu hore u leeyahay.',
  'Cannot change academic year; cohort already has enrollments.': 'Lama beddeli karo academic year-ka: cohort-ku enrollments ayuu hore u leeyahay.',
  'Cohort is in use by enrollments; cannot delete': 'Cohort-kan enrollments ayaa isticmaala; lama tirtiri karo',
  'academicYear is required and must be a valid id': 'academicYear waa khasab waana inuu noqdaa ID sax ah',
  'Invalid grade or shift id': 'ID grade ama shift aan sax ahayn',
  'Provide gradeSectionId or grade+shift+section': 'Keen gradeSectionId ama grade+shift+section',
  'No updates provided.': 'Wax update ah lama bixin.',
  'Invalid status.': 'status aan sax ahayn.',
  'Already deactivated': 'Hore ayaa loo damiyay',
  'Already active': 'Hore ayuu u active ahaa',
  'Student deactivated': 'Ardayga waa la damiyay',
  'Student reactivated': 'Ardayga waa la soo celiyay (reactivated)',
  'Password updated': 'Password waa la cusboonaysiiyay',
  'currentPassword is required': 'currentPassword waa khasab',
  'Current password is incorrect': 'Password-ka hadda waa khaldan',
  'newPassword is required': 'newPassword waa khasab',
  'New password must be at least 6 characters': 'newPassword ugu yaraan 6 xaraf ha noqoto',
  'Student login account is missing. Contact admin to re-run migration.': 'Account-ka login ardayga wuu maqan yahay. La xiriir admin si migration dib loogu sameeyo.',
  'Password reset to default. Student must change it after login.': 'Password default ayaa loo celiyay. Ardaygu waa inuu beddelaa marka uu login galo.',
  'Password reset to default and lock cleared.': 'Password default ayaa loo celiyay, lock-na waa la furay.',
  'Ids must be different': 'IDs waa inay kala duwan yihiin',
  'Invalid dayOfWeek': 'dayOfWeek aan sax ahayn',
  'Invalid time range': 'Time range aan sax ahayn',
  'Invalid time range (start ≥ end)': 'Time range aan sax ahayn (start ≥ end)',
  'days required': 'days waa khasab',
  'Room already booked at this time.': 'Qolka waqtigan waa la sii qabsaday.',
  'Teacher has another class in this period.': 'Macallinku wuxuu leeyahay fasal kale period-kan.',
  'Period already occupied for this class.': 'Period-kan fasalkan hore ayuu ugu jiraa.',
  'No teacher assigned to this subject in this class.': 'Macallin looma xil saarin subject-kan fasalkan.',
  'Assignment not found': 'Assignment lama helin',
  'This teacher already has this assignment.': 'Macallinkan assignment-kan hore ayuu u hayaa.',
  'Subject already assigned to another teacher.': 'Subject-kan macallin kale ayaa hore loogu xilsaaray.',
  'Cannot delete: teacher has assignments.': 'Lama tirtiri karo: macallinku assignments ayuu leeyahay.',
  'Cannot remove assignment: timetable exists for this class/subject. Remove timetable entries first.': 'Lama saari karo assignment: timetable ayaa jira (class/subject). Marka hore timetable-ka ka saar.',
  'ay and gs are required': 'ay iyo gs waa khasab',
  'Invalid target Academic Year (provide valid ObjectId or yearName).': 'Target Academic Year aan sax ahayn (keen ObjectId ama yearName sax ah).',
  'Invalid Academic Year naming (YYYY-YYYY). Cannot compare ordering.': 'Magaca Academic Year-ka ma saxna (YYYY-YYYY). Lama isbarbardhigi karo ordering.',
  'Enrollment not found': 'Enrollment lama helin',
  'Target section not found': 'Section-ka target lama helin',
  'Target section is full. Cannot transfer.': 'Section-ka target waa buuxaa. Lama transfer-gareyn karo.',
  'Only Active students can be transferred': 'Kaliya ardayda Active ayaa la transfer-gareyn karaa',
  'Only active enrollments can be transferred': 'Kaliya enrollments Active ayaa la transfer-gareyn karaa',
  'Returned to previous Academic Year.': 'Waxaa loo celiyay Academic Year-kii hore.',
  'Student already has an enrollment in the target Academic Year.': 'Ardaygu wuxuu hore u leeyahay enrollment Academic Year-ka target.',
  'Enrollment transferred': 'Enrollment waa la transfer-gareeyay',
  'No changes: already in this section': 'Isbeddel ma jiro: hore ayuu section-kan ugu jiray',
  'Enrollment transferred to future Academic Year (scores not migrated).': 'Enrollment future Academic Year ayaa loo wareejiyay (scores lama rarinin).',
  'Return not possible: no previous enrollment in the target AY.': 'Return suurtagal ma aha: enrollment hore target AY kuma jiro.',
  'Return requires the original Grade/Shift/Section for that AY.': 'Return wuxuu u baahan yahay Grade/Shift/Section-kii asalka ahaa AY-gaas.',

  // Exams
  'Template not found': 'Template lama helin',
  'Base template not found': 'Base template lama helin',
  'templateVersion is required': 'templateVersion waa khasab',
  'templateTotal must be > 0': 'templateTotal waa inuu ka weyn yahay 0',
  'This template already has saved scores and is locked. Total cannot be edited.': 'Template-kan wuxuu leeyahay scores la keydiyay waana xiran yahay. Total lama edit-gareyn karo.',
  'Cannot add a new column to this template because it already has saved scores. Please create a new template instead.': 'Lama dari karo column cusub template-kan sababtoo ah scores hore ayaa u keydsan. Samee template cusub beddelkeeda.',
  'Cannot delete the last column of a template. Delete the template instead.': 'Lama tirtiri karo column-kii ugu dambeeyay ee template. Tirtir template-ka beddelkeeda.',
  'Cannot delete this column because it already has saved scores.': 'Lama tirtiri karo column-kan sababtoo ah scores ayaa hore u keydsan.',
  'Cannot delete the default (active) template. Set another template as default first.': 'Lama tirtiri karo template-ka default (active). Marka hore dhig template kale default.',
  'Cannot delete the last remaining template.': 'Lama tirtiri karo template-kii ugu dambeeyay.',
  'Cannot delete this template because it already has saved scores.': 'Lama tirtiri karo template-kan sababtoo ah scores ayaa hore u keydsan.',
  'Cannot lower maxScore below existing saved scores for this component': 'Lama dhimi karo maxScore ka hooseeya scores-ka hore u keydsan component-kan',
  'Order must be unique within this template': 'Order-ku waa inuu noqdaa unique gudaha template-kan',
  'Duplicate exam type in template version': 'Exam type duplicate ah ayaa ku jira template version-kan',
  'Active template updated': 'Active template waa la cusboonaysiiyay',
  'This student already has scores saved under another exam template version for this subject. Please switch to that version.': 'Ardaygan wuxuu hore u leeyahay scores ku kaydsan template version kale subject-kan. Fadlan u wareeg version-kaas.',
  'Student has no enrollment for this section/year': 'Ardaygu enrollment kuma laha section/year-kan',
  'Saved': 'Waa la keydiyay',
  'Duplicate score combination': 'Score combination duplicate ah',

  // Transfer log reasons (shown in UI)
  'Transfer': 'Wareejin',
  'Revert': 'Dib u celin',
  'Promotion': 'Dallacsiin',
  'Graduation': 'Qalinjab',
  'order must be a positive integer': 'order waa inuu noqdaa integer togan',
  'No students selected': 'Arday lama xulan',
  'Student codes not found': 'Student codes lama helin',
  'Grade order missing': 'Grade order wuu maqan yahay',
  'Mid-year promotion already done': 'Mid-year promotion hore ayaa loo sameeyay',
  'Mid-year promotion already done for some students.': 'Qaar ka mid ah ardayda mid-year promotion hore ayaa loo sameeyay.',
  'Grade order is not configured. Please set an integer `order` for each Grade (1..N).': 'Grade order lama dejin. Fadlan u deji integer `order` grade kasta (1..N).',

  // Security / notifications
  'API is running...': 'API-ga wuu shaqaynayaa...',
  'Unlock via notifications is not supported for Admin accounts.': 'Unlock-ka notifications-ka laguma taageero admin accounts.',
  'Unlock is only available for staff accounts. Use reset password for teachers/students.': 'Unlock waxaa loo heli karaa staff accounts oo keliya. U isticmaal reset password teachers/students.',
  'Account unlocked': 'Account-ka waa la furay',
  'Admin accounts do not support reset-to-default. Use Update Password instead.': 'Admin accounts ma taageeraan reset-to-default. Isticmaal Update Password beddelkeeda.',
  'Staff accounts do not support reset-to-default. Use Update Password instead.': 'Staff accounts ma taageeraan reset-to-default. Isticmaal Update Password beddelkeeda.',
};

function applyPatterns(locale, msg) {
  const s = String(msg || '');

  // Generic: "X is required" / "X are required" / "X required"
  const r1 = s.match(/^(.+)\s+is required\.?$/);
  if (r1) {
    const field = r1[1];
    if (locale === 'ar') return `${field} مطلوب`;
    if (locale === 'so') return `${field} waa khasab`;
  }
  const r2 = s.match(/^(.+)\s+are required\.?$/);
  if (r2) {
    const fields = r2[1];
    if (locale === 'ar') return `مطلوب: ${fields}`;
    if (locale === 'so') return `${fields} waa khasab`;
  }
  const r3 = s.match(/^(.+)\s+required\.?$/);
  if (r3) {
    const field = r3[1];
    if (locale === 'ar') return `${field} مطلوب`;
    if (locale === 'so') return `${field} waa khasab`;
  }

  // Generic: "Invalid X" / "Invalid X." (avoid overriding explicit maps by preferring maps first in translateMessage)
  const inv1 = s.match(/^Invalid\s+(.+?)\.?$/);
  if (inv1) {
    const what = inv1[1];
    if (locale === 'ar') return `${what} غير صالح`;
    if (locale === 'so') return `${what} aan sax ahayn`;
  }

  // Generic: "X not found" / "X not found."
  const nf1 = s.match(/^(.+?)\s+not found\.?$/);
  if (nf1) {
    const what = nf1[1];
    if (locale === 'ar') return `لم يتم العثور على ${what}`;
    if (locale === 'so') return `${what} lama helin`;
  }

  // Generic: "X already exists"
  const ex0 = s.match(/^(.+?)\s+already exists\.?$/);
  if (ex0) {
    const what = ex0[1];
    if (locale === 'ar') return `${what} موجود بالفعل`;
    if (locale === 'so') return `${what} hore ayuu u jiraa`;
  }

  // Generic: "X cannot be empty"
  const e1 = s.match(/^(.+?)\s+cannot be empty\.?$/);
  if (e1) {
    const what = e1[1];
    if (locale === 'ar') return `لا يمكن أن يكون ${what} فارغًا`;
    if (locale === 'so') return `${what} ma noqon karo madhan`;
  }

  // Cohorts: Maximum cohorts (N) already created for this Academic Year.
  const c1 = s.match(/^Maximum cohorts \((\d+)\) already created for this Academic Year\.?$/);
  if (c1) {
    const n = c1[1];
    if (locale === 'ar') return `تم إنشاء الحد الأقصى من الدفعات (${n}) لهذه السنة الدراسية.`;
    if (locale === 'so') return `Cohorts-ka ugu badan (${n}) ayaa hore loogu abuuray Academic Year-kan.`;
  }

  // Auth: "Student is inactive" / "User is inactive"
  const ia1 = s.match(/^(Student|User) is inactive$/);
  if (ia1) {
    const who = ia1[1];
    if (locale === 'ar') return who === 'Student' ? 'الطالب غير نشط' : 'المستخدم غير نشط';
    if (locale === 'so') return who === 'Student' ? 'Ardaygu ma aha active' : 'User-ku ma aha active';
  }

  // Zod default: "Invalid input: expected string, received undefined"
  // and validate middleware prefix: "password: Invalid input: ..."
  const z1 = s.match(/^([^:]+):\s*Invalid input: expected (.+), received (.+)$/);
  if (z1) {
    const field = z1[1];
    const expected = z1[2];
    const received = z1[3];
    if (locale === 'ar') return `${field}: إدخال غير صالح: المتوقع ${expected}، تم استلام ${received}`;
    if (locale === 'so') return `${field}: Gelin aan sax ahayn: waxaa la rabay ${expected}, waxaa la helay ${received}`;
  }
  const z2 = s.match(/^Invalid input: expected (.+), received (.+)$/);
  if (z2) {
    const expected = z2[1];
    const received = z2[2];
    if (locale === 'ar') return `إدخال غير صالح: المتوقع ${expected}، تم استلام ${received}`;
    if (locale === 'so') return `Gelin aan sax ahayn: waxaa la rabay ${expected}, waxaa la helay ${received}`;
  }

  // Duplicate <fields>
  const d1 = s.match(/^Duplicate\s+(.+)$/);
  if (d1) {
    const what = d1[1];
    if (locale === 'ar') return `مكرر: ${what}`;
    if (locale === 'so') return `Duplicate: ${what}`;
  }

  // Student code not found: X
  const sc1 = s.match(/^Student code not found:\s*(.+)$/);
  if (sc1) {
    const code = sc1[1];
    if (locale === 'ar') return `لم يتم العثور على كود الطالب: ${code}`;
    if (locale === 'so') return `Koodhka ardayga lama helin: ${code}`;
  }

  // Too many requests. Try again in 10s.
  const m1 = s.match(/^Too many requests\. Try again in (\d+)s\.$/);
  if (m1) {
    const seconds = m1[1];
    if (locale === 'ar') return `طلبات كثيرة جدًا. حاول مرة أخرى بعد ${seconds} ثانية.`;
    if (locale === 'so') return `Codsiyo badan. Mar kale isku day ${seconds}s kadib.`;
  }

  // Permission strings with interpolation
  const m2 = s.match(/^You do not have permission to (.+) (.+)$/);
  if (m2) {
    const action = m2[1];
    const module = m2[2];
    if (locale === 'ar') return `ليس لديك صلاحية ${action} ${module}`;
    if (locale === 'so') return `Ma lihid oggolaansho aad ku ${action} ${module}`;
  }

  const m3 = s.match(/^Missing required permission: (.+)$/);
  if (m3) {
    const expected = m3[1];
    if (locale === 'ar') return `الصلاحية المطلوبة مفقودة: ${expected}`;
    if (locale === 'so') return `Oggolaanshaha loo baahan yahay wuu maqan yahay: ${expected}`;
  }

  const m4 = s.match(/^No permissions found for module: (.+)$/);
  if (m4) {
    const module = m4[1];
    if (locale === 'ar') return `لا توجد صلاحيات للوحدة: ${module}`;
    if (locale === 'so') return `Oggolaansho module-kan looma helin: ${module}`;
  }

  const m5 = s.match(/^You do not have permission to access (.+)$/);
  if (m5) {
    const module = m5[1];
    if (locale === 'ar') return `ليس لديك صلاحية للوصول إلى ${module}`;
    if (locale === 'so') return `Ma lihid oggolaansho aad ku gasho ${module}`;
  }

  // Invalid status: X
  const m6 = s.match(/^Invalid status: (.*)$/);
  if (m6) {
    const status = m6[1];
    if (locale === 'ar') return `حالة غير صالحة: ${status}`;
    if (locale === 'so') return `Xaalad aan sax ahayn: ${status}`;
  }

  // Exams: Total cannot be less than sum of max scores (X)
  const ex1 = s.match(/^Total cannot be less than sum of max scores \((.+)\)$/);
  if (ex1) {
    const sum = ex1[1];
    if (locale === 'ar') return `لا يمكن أن يكون المجموع أقل من مجموع الدرجات القصوى (${sum})`;
    if (locale === 'so') return `Total-ku kama yaraan karo wadarta max scores (${sum})`;
  }

  // Exams: Cannot activate: sum of max scores (A) must equal template total (B)
  const ex2 = s.match(/^Cannot activate: sum of max scores \((.+)\) must equal template total \((.+)\)$/);
  if (ex2) {
    const sum = ex2[1];
    const total = ex2[2];
    if (locale === 'ar') return `لا يمكن التفعيل: مجموع الدرجات القصوى (${sum}) يجب أن يساوي مجموع القالب (${total})`;
    if (locale === 'so') return `Lama activate-gareyn karo: wadarta max scores (${sum}) waa inay la mid noqotaa template total (${total})`;
  }

  // Exams: scoreObtained must be between 0 and X
  const ex3 = s.match(/^scoreObtained must be between 0 and (\d+)$/);
  if (ex3) {
    const limit = ex3[1];
    if (locale === 'ar') return `يجب أن تكون الدرجة المحصّلة بين 0 و ${limit}`;
    if (locale === 'so') return `scoreObtained waa inuu u dhexeeyaa 0 iyo ${limit}`;
  }

  // Dates
  if (s === 'Invalid date (use YYYY-MM-DD)') {
    if (locale === 'ar') return 'تاريخ غير صالح (استخدم YYYY-MM-DD)';
    if (locale === 'so') return 'Taariikh aan sax ahayn (isticmaal YYYY-MM-DD)';
  }
  if (s === 'Invalid from (use YYYY-MM-DD)') {
    if (locale === 'ar') return 'Taariikh from aan sax ahayn (isticmaal YYYY-MM-DD)';
    if (locale === 'so') return 'From aan sax ahayn (isticmaal YYYY-MM-DD)';
  }
  if (s === 'Invalid to (use YYYY-MM-DD)') {
    if (locale === 'ar') return 'Taariikh to aan sax ahayn (isticmaal YYYY-MM-DD)';
    if (locale === 'so') return 'To aan sax ahayn (isticmaal YYYY-MM-DD)';
  }

  return null;
}

export function translateMessage(locale, message) {
  const loc = locale === 'ar' || locale === 'so' ? locale : 'en';
  if (loc === 'en') return message;

  const s = String(message ?? '');
  const map = loc === 'ar' ? arStatic : soStatic;

  if (Object.prototype.hasOwnProperty.call(map, s)) return map[s];

  const pat = applyPatterns(loc, s);
  if (pat) return pat;

  const trimmed = s.trim();
  if (trimmed && trimmed !== s) {
    if (Object.prototype.hasOwnProperty.call(map, trimmed)) return map[trimmed];

    const pat2 = applyPatterns(loc, trimmed);
    if (pat2) return pat2;
  }

  return message;
}
