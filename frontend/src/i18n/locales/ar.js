export default {
  common: {
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    somali: 'Soomaali',

    loading: 'جارٍ التحميل…',
    pleaseWait: 'يرجى الانتظار…',

    errors: {
      somethingWentWrong: 'حدث خطأ ما.',
      failedToCreate: 'فشل الإنشاء',
      failedToUpdate: 'فشل التحديث',
      failedToDelete: 'فشل الحذف',
      failedToLoad: 'فشل التحميل',
      networkOrServerError: 'خطأ في الشبكة أو الخادم',
      copyFailed: 'فشل النسخ',
    },

    labels: {
      errors: 'الأخطاء',
    },

    emptyStates: {
      noData: 'لا توجد بيانات',
      noDataFound: 'لم يتم العثور على بيانات',
      tryDifferentSearch: 'جرّب بحثاً مختلفاً.',
      notEnoughDataForChart: 'لا توجد بيانات كافية للمخطط.',
    },

    select: {
      placeholder: 'اختر…',
      noOptions: 'لا توجد خيارات.',
      noOptionsFound: 'لم يتم العثور على خيارات.',
      searchPlaceholder: 'اكتب للبحث…',
      typeToSearchMore: 'اكتب للبحث عن المزيد…',
    },

    aria: {
      tabs: 'علامات التبويب',
      filterSuggestedStudents: 'تصفية الطلاب المقترحين',
    },

    filters: {
      sections: {
        personal: 'البيانات الشخصية',
        contact: 'التواصل',
        address: 'العنوان',
        employment: 'الوظيفة',
        professional: 'المؤهلات',
        notes: 'ملاحظات',
      },
      title: 'الفلاتر',
      gender: 'الجنس',
      genderOptions: {
        male: 'ذكر',
        female: 'أنثى',
      },
      dob: 'تاريخ الميلاد',
      nationality: 'الجنسية',
      resetTitle: 'إعادة ضبط الفلاتر',
      employeeId: 'رقم الموظف',
      employeeIdAuto: 'يُولّد تلقائياً',
      academicYear: 'السنة الدراسية',
      academicYearShort: 'سنة',
      level: 'المستوى',
      phone: 'الهاتف',
      primaryPhone: 'الهاتف الأساسي',
      secondaryPhone: 'هاتف ثانوي',
      legacyAddress: 'العنوان (اختياري)',
      hireDate: 'تاريخ التعيين',
      employmentType: 'نوع التوظيف',
      employmentTypeOptions: {
        fullTime: 'دوام كامل',
        partTime: 'دوام جزئي',
        contract: 'عقد',
      },
      shift: 'الدوام',
      section: 'الشعبة',
      subject: 'المادة',
      cohort: 'الدفعة',

      specialization: 'التخصص',
      qualification: 'المؤهل',
      yearsOfExperience: 'سنوات الخبرة',
      notesPlaceholder: 'ملاحظات اختيارية عن المعلم…',

      validations: {
        fullNameFourNames: 'يجب أن يتكون الاسم الكامل من 4 أسماء.',
        genderRequired: 'الجنس مطلوب.',
        dobRequired: 'تاريخ الميلاد مطلوب.',
        nationalityRequired: 'الجنسية مطلوبة.',
        emailRequired: 'البريد الإلكتروني مطلوب.',
        phoneRequired: 'الهاتف الأساسي مطلوب.',
        phoneInvalid: 'الهاتف الأساسي غير صالح (رقم صومالي).',
        phone2Invalid: 'الهاتف الثانوي غير صالح (رقم صومالي).',
      },

      photo: {
        label: 'الصورة (اختياري)',
        alt: 'صورة المعلم',
        hint: 'JPEG/PNG/WEBP • الحد الأقصى 2MB',
        invalidType: 'نوع الصورة غير مسموح. المسموح: JPEG, PNG, WEBP.',
        tooLarge: 'حجم الصورة كبير جداً (الحد 2MB).',
        selected: 'تم اختيار: {{name}}',
        clear: 'إزالة',
      },
      status: 'الحالة',

      dashboard: {
        header: {
          title: 'لوحة التحكم المالية',
          subtitle: 'نظرة عامة على الإيرادات والمصروفات وحالة الرسوم.',
        },
        cards: {
          totalRevenue: 'إجمالي الإيرادات',
          totalExpenses: 'إجمالي المصروفات',
          netIncome: 'صافي الدخل',
          pendingFees: 'الرسوم المعلّقة',
        },
        cardsSubtext: {
          collectedFeesThisYear: 'الرسوم المحصّلة هذا العام',
          operationalCosts: 'تكاليف التشغيل',
          revenueMinusExpenses: 'الإيرادات - المصروفات',
          unpaidInvoices: 'فواتير غير مدفوعة',
        },
        charts: {
          incomeVsExpenses: {
            title: 'الدخل مقابل المصروفات',
            subtitle: 'الاتجاه الشهري لآخر 6 أشهر',
          },
          feeCollectionStatus: {
            title: 'حالة تحصيل الرسوم',
            subtitle: 'توزيع الفواتير المدفوعة وغير المدفوعة',
          },
          expensesByCategory: {
            title: 'المصروفات حسب الفئة',
            subtitle: 'أعلى فئات المصروفات (الفترة الحالية)',
          },
        },
        legends: {
          income: 'الدخل',
          expenses: 'المصروفات',
        },
        feeStatus: {
          paid: 'مدفوع',
          partial: 'جزئي',
          unpaid: 'غير مدفوع',
          cancelled: 'ملغى',
        },
        recent: {
          title: 'أحدث المعاملات',
          subtitle: 'آخر مدفوعات الرسوم والنشاط',
          empty: 'لا توجد معاملات حديثة.',
          columns: {
            student: 'الطالب',
            amount: 'المبلغ',
            method: 'الطريقة',
            date: 'التاريخ',
            status: 'الحالة',
          },
          status: {
            completed: 'مكتمل',
          },
        },
        errors: {
          loadFailedTitle: 'فشل تحميل لوحة التحكم',
          loadFailedDesc: 'يرجى تحديث الصفحة أو المحاولة مرة أخرى بعد قليل.',
        },
      },
      any: 'أي',
    },

    searchPlaceholders: {
      academicYears: 'ابحث عن السنوات الدراسية…',
      employees: 'ابحث عن الموظفين…',
      shifts: 'ابحث عن الدوامات…',
      sections: 'ابحث عن الشعب…',
      cohorts: 'ابحث عن الدفعات…',
      subjects: 'ابحث عن المواد…',
    },

    export: {
      subtitle: 'الإجمالي: {{count}} • تم الإنشاء: {{date}}',
      csv: 'CSV',
      pdf: 'PDF',
      excel: 'Excel',
      pdfTitle: 'تصدير PDF',
      excelTitle: 'تصدير Excel',
      csvTitle: 'تصدير CSV',
      pdfFailed: 'فشل تصدير PDF',
      excelFailed: 'فشل تصدير Excel',
    },

    onlyWithStatus: 'فقط {{status}}',
    allIncludeClosed: 'الكل (بما في ذلك المغلقة)',
    selectDays: 'اختر الأيام',

    none: 'لا شيء',

    table: {
      order: 'الترتيب',
      created: 'تم الإنشاء',
      updated: 'تم التحديث',
      actions: 'الإجراءات',
    },

    columns: 'الأعمدة',
    chooseColumns: 'اختر الأعمدة',

    sortBy: 'ترتيب حسب',

    previous: 'السابق',
    next: 'التالي',
    rows: 'الصفوف',
    all: 'الكل',

    page: 'صفحة',
    of: 'من',
    showing: 'عرض',
    total: 'الإجمالي',

    logout: 'تسجيل الخروج',
    openMenu: 'فتح القائمة',
    expandSidebar: 'توسيع الشريط الجانبي',
    collapseSidebar: 'طي الشريط الجانبي',

    search: 'بحث…',
    close: 'إغلاق',

    from: 'من',
    to: 'إلى',

    range: {
      title: 'النطاق',
      today: 'اليوم',
      last7: 'آخر 7',
      buckets: {
        day: 'يوم',
        week: 'أسبوع',
        month: 'شهر',
        year: 'سنة',
      },
      previousBalanceTab: {
        placeholders: {
          search: 'ابحث برقم الطالب أو الاسم أو الهاتف…',
          searchShort: 'ابحث…',
          grade: 'الصف',
          shift: 'الدوام',
          section: 'الشعبة',
        },
        filters: {
          showAll: 'عرض الكل',
          showPrev: 'عرض الرصيد السابق',
        },
        actions: {
          save: 'حفظ',
          add: 'إضافة',
          reset: 'إعادة ضبط',
          resetTitle: 'إعادة ضبط الفلاتر',
        },
        toasts: {
          fetchFailed: 'فشل جلب بيانات أرصدة الطلاب',
          noPreviousBalanceCategory: 'أنشئ نوع مبلغ باسم "Previous Balance" أولاً',
          saving: 'جارٍ حفظ الأرصدة السابقة...',
          saved: 'تم حفظ الأرصدة السابقة',
          saveFailed: 'فشل حفظ الأرصدة السابقة',
        },
        validation: {
          enterAtLeastOne: 'أدخل قيمة رصيد واحدة على الأقل',
          validAmountGreaterThanZero: 'أدخل مبالغ صالحة (> 0)',
        },
        loading: {
          fullNameRequired: 'الاسم الكامل للطالب مطلوب',
          fullNameFourNames: 'يجب أن يحتوي الاسم الكامل على 4 أسماء (4 كلمات)',
          openingArchives: 'جارٍ فتح الأرشيف…',
        },
        empty: {
          title: 'لا توجد سجلات لهذا الاختيار.',
        },
      },
      amountTypeTab: {
          motherNameFourNames: 'يجب أن يحتوي اسم الأم على 4 أسماء (4 كلمات)',
        title: 'إعداد نوع المبلغ',
          guardianNameRequired: 'اسم ولي الأمر/الوصي مطلوب',
          guardianNameFourNames: 'يجب أن يحتوي اسم ولي الأمر/الوصي على 4 أسماء (4 كلمات)',
        subtitle: 'مصفوفة تعريف الرسوم العامة',
        actions: {
          defineNew: 'تعريف نوع مبلغ جديد',
          custom: 'مخصص',
          useList: 'استخدم القائمة',
        },
        form: {
          label: {
            feeLabel: 'وسم الرسوم',
            defaultMultiplier: 'المضاعف الافتراضي ($)',
          phoneInvalidHint: 'يجب أن يكون الهاتف صومالياً: 9 أرقام ويبدأ بـ 61/62/68 أو 7x (يدعم +252 أو 252 أو بادئة 0).',
            status: 'الحالة',
            transactionCategory: 'فئة المعاملة',
          },
        },
        modal: {
          create: 'إضافة نوع مبلغ',
          edit: 'تعديل نوع المبلغ',
        },
        placeholders: {
          feeLabel: 'مثال: رسوم شهرية',
          defaultAmount: '0.00',
          enterFeeType: 'أدخل نوع الرسوم',
        },
        validation: {
          nameRequired: 'الاسم مطلوب',
          feeTypeRequired: 'نوع الرسوم مطلوب',
        },
        confirms: {
          delete: 'هل تريد حذف نوع المبلغ هذا نهائياً؟ إذا تم استخدامه من قبل، فسيتم حظر الحذف — اجعله غير مفعل بدلاً من ذلك.',
        },
        toasts: {
          loadFailed: 'فشل تحميل إعدادات المبالغ',
          created: 'تم تعريف هيكل المبالغ',
          updated: 'تمت مزامنة الإعدادات',
          deleted: 'تم حذف نوع المبلغ',
          deleteFailed: 'فشل الحذف',
          operationFailed: 'فشل الإجراء',
          noAddPermission: 'ليست لديك صلاحية لإضافة أنواع المبالغ',
          noEditPermission: 'ليست لديك صلاحية لتعديل أنواع المبالغ',
          noDeletePermission: 'ليست لديك صلاحية لحذف أنواع المبالغ',
        },
        table: {
          emptyTitle: 'لا توجد إعدادات.',
          columns: {
            name: 'معرف الرسوم',
            defaultAmount: 'المبلغ الافتراضي',
            feeType: 'النوع',
            status: 'الحالة',
            actions: 'إجراءات',
          },
          loading: {
            initializing: 'جارٍ تهيئة مصدر البيانات…',
          },
        },
        defaults: {
          standard: 'Standard',
        },
      },

      selected: 'مختار',
    },

    selected: 'محدد',

    moreCount: '(+{{count}} أخرى)',

    studentFallback: 'طالب',

    retry: 'إعادة المحاولة',
    saving: 'جارٍ الحفظ…',
    summary: 'ملخص',
    empty: 'فارغ',
    room: 'غرفة',
    sectionPrefix: 'شعبة',

    days: {
      short: {
        sat: 'سبت',
        sun: 'أحد',
        mon: 'اثن',
        tue: 'ثلا',
        wed: 'أرب',
        thu: 'خمي',
        fri: 'جمع',
      },
      long: {
        saturday: 'السبت',
        sunday: 'الأحد',
        monday: 'الاثنين',
        tuesday: 'الثلاثاء',
        wednesday: 'الأربعاء',
        thursday: 'الخميس',
        friday: 'الجمعة',
      },
    },

    time: {
      am: 'ص',
      pm: 'م',
    },

    working: 'جارٍ العمل…',
    updating: 'جارٍ التحديث…',
    user: 'مستخدم',

    generatedBy: 'تم إنشاؤه بواسطة نور البيان',

    status: {
      active: 'نشط',
      inactive: 'غير نشط',
      ok: 'موافق',
    },

    actions: {
      add: 'إضافة',
      create: 'إنشاء',
      save: 'حفظ',
      update: 'تحديث',
      edit: 'تعديل',
      view: 'عرض',
      cancel: 'إلغاء',
      clear: 'مسح',
      reset: 'إعادة ضبط',
      print: 'طباعة',
      preview: 'معاينة',
      copy: 'نسخ',
      copied: 'تم النسخ',
      archive: 'أرشفة',
      selectAll: 'تحديد الكل',
      transfer: 'تحويل',
      promote: 'ترقية',
      activate: 'تفعيل',
      deactivate: 'تعطيل',
      reactivate: 'إعادة التفعيل',
      unlock: 'فك القفل',
      remove: 'إزالة',
      delete: 'حذف',
      assignments: 'التكليفات',
      resetPassword: 'إعادة تعيين كلمة المرور',
    },

    pagination: {
      pageSummary: 'صفحة {{page}} من {{pages}} — الإجمالي {{total}}',
    },

    audit: {
      viewDetails: 'عرض التفاصيل',
      detailsTitle: 'تفاصيل السجل',
      unknownDevice: 'جهاز غير معروف',
      localhost: 'المضيف المحلي',
      fields: 'الحقول',
      mobile: 'جوال',
      unknownOs: 'نظام غير معروف',
      unknownBrowser: 'متصفح غير معروف',
      history: {
        emptyTitle: 'لا يوجد سجل تدقيق.',
        emptyDescription: 'لا توجد إجراءات مسجلة حتى الآن.',
      },
      labels: {
        action: 'الإجراء',
        description: 'الوصف',
        ip: 'IP',
        device: 'الجهاز',
        time: 'الوقت',
        raw: 'خام',
      },
    },

    securityBell: {
      notificationsTitle: 'إشعارات الأمان',
      alertsTitle: 'تنبيهات الأمان',
      noLockedAccounts: 'لا توجد حسابات مقفلة حالياً.',
      unknownUser: 'غير معروف: {{username}}',
      userRoleFallback: 'مستخدم',
      inactiveTag: 'غير نشط',
      until: 'حتى {{date}}',
      attemptsLockCount: 'عدد محاولات القفل: {{count}}',
      titles: {
        resetToDefaultAndUnlock: 'إعادة تعيين كلمة المرور للوضع الافتراضي + فتح القفل',
        unlockAccount: 'فتح الحساب (مسح قفل تسجيل الدخول)',
        markActive: 'تعيين الحساب نشطاً',
        markInactive: 'تعيين الحساب غير نشط',
        clearNotification: 'مسح الإشعار',
      },
      states: {
        resetting: 'جارٍ إعادة التعيين…',
        unlocking: 'جارٍ فتح القفل…',
        activating: 'جارٍ التفعيل…',
        inactivating: 'جارٍ التعطيل…',
        clearing: 'جارٍ المسح…',
      },
      confirms: {
        markInactive: 'تعيين هذا الحساب كغير نشط؟ سيتم تسجيل خروجهم خلال ثوانٍ.',
        markActive: 'تعيين هذا الحساب كنشط؟',
      },
      toasts: {
        studentPasswordResetDefault: 'تمت إعادة تعيين كلمة مرور الطالب إلى الافتراضي',
        teacherPasswordResetDefault: 'تمت إعادة تعيين كلمة مرور المعلم إلى الافتراضي',
        passwordResetDefault: 'تمت إعادة تعيين كلمة المرور إلى الافتراضي',
        accountUnlocked: 'تم فتح قفل الحساب',
        accountMarkedInactive: 'تم تعيين الحساب غير نشط',
        accountMarkedActive: 'تم تعيين الحساب نشطاً',
      },
      errors: {
        resetFailed: 'فشل إعادة التعيين',
        unlockFailed: 'فشل فتح القفل',
        inactiveFailed: 'فشل التعطيل',
        activateFailed: 'فشل التفعيل',
        clearFailed: 'فشل المسح',
      },
    },
  },

  auth: {
    login: {
      badge: 'مرحباً',
      logoAlt: 'نور البيان',
      title: 'تسجيل الدخول',
      subtitle: 'أدخل اسم المستخدم وكلمة المرور لتسجيل الدخول.',
      fields: {
        usernameOrStudentId: 'اسم المستخدم / رقم الطالب',
        password: 'كلمة المرور',
      },
      layout: {
        switchLabel: 'تبديل التخطيط',
      },
      welcome: {
        title: 'مرحباً يا صديقي!',
        body: 'استخدم حسابك للوصول إلى جميع ميزات النظام.',
        cta: 'تبديل',
      },
      actions: {
        signIn: 'دخول',
        signingIn: 'جارٍ تسجيل الدخول…',
        lockedContactAdmin: 'مقفول (اتصل بالإدارة)',
        tryAgainIn: 'حاول مرة أخرى خلال {{time}}',
      },
      errors: {
        invalidCredentials: 'بيانات الدخول غير صحيحة.',
        tooManyAttemptsTryAgainIn: 'محاولات كثيرة. حاول مرة أخرى خلال {{time}}.',
        accountLocked24hContactAdmin: 'تم قفل الحساب لمدة 24 ساعة. يرجى التواصل مع الإدارة.',
        unknownUsernameBlocked: 'اسم مستخدم غير معروف. محاولات كثيرة؛ تم حظر تسجيل الدخول.',
        unknownUsernameOrStudentId: 'اسم المستخدم / رقم الطالب غير معروف.',
        unknownUsernameOrStudentIdWithAttempts: 'اسم المستخدم / رقم الطالب غير معروف. المحاولات المتبقية: {{count}}.{{hint}}',
        wrongPassword: 'كلمة المرور غير صحيحة.',
        wrongPasswordWithAttempts: 'كلمة المرور غير صحيحة. المحاولات المتبقية: {{count}}.{{hint}}',
        invalidCredentialsWithAttempts: '{{message}} المحاولات المتبقية: {{count}}.{{hint}}',
        lastAttemptBeforeLock: ' المحاولة الأخيرة قبل القفل.',
        lastAttemptBeforeBlock: ' المحاولة الأخيرة قبل الحظر.',
      },
    },
    forcePasswordChange: {
      title: 'تغيير كلمة المرور',
      body: {
        studentDefault: 'يستخدم حسابك كلمة المرور الافتراضية. لأسباب أمنية، يرجى تعيين كلمة مرور جديدة.',
        userRequired: 'يجب على حسابك تعيين كلمة مرور جديدة قبل المتابعة.',
      },
      fields: {
        newPassword: 'كلمة مرور جديدة',
        confirmPassword: 'تأكيد كلمة المرور',
      },
      placeholders: {
        newPassword: 'أدخل كلمة مرور جديدة',
        confirmPassword: 'أعد إدخال كلمة المرور الجديدة',
      },
      actions: {
        notNow: 'ليس الآن',
        save: 'حفظ',
      },
      states: {
        saving: 'جارٍ الحفظ…',
      },
      tooltips: {
        showPassword: 'إظهار كلمة المرور',
      },
      toasts: {
        fillBoth: 'يرجى ملء كلا الحقلين.',
        minLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.',
        mismatch: 'كلمتا المرور غير متطابقتين.',
        updated: 'تم تحديث كلمة المرور بنجاح',
      },
      errors: {
        failed: 'فشل تغيير كلمة المرور.',
      },
    },
  },

  audit: {
    actions: {
      account: {
        permissionsUpdated: 'الحساب • تم تحديث الصلاحيات',
      },
    },
  },

  attendance: {
    status: {
      notMarked: 'غير مسجل',
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      excused: 'بعذر',
      sick: 'مريض',
      medical: 'طبي',
      medicalAppointment: 'موعد طبي',
      family: 'عائلي',
      familyEmergency: 'طوارئ عائلية',
      other: 'أخرى',
    },

    marking: {
      table: {
        columns: {
          studentId: 'رقم الطالب',
          fullName: 'الاسم الكامل',
          marked: 'تم التسجيل',
          updated: 'تم التحديث',
          status: 'الحالة',
        },
        loading: 'جارٍ تحميل الطلاب…',
        empty: 'لم يتم العثور على طلاب',
      },

      moreStatusesAria: 'حالات إضافية',
      reasonPlaceholder: 'السبب (بحد أقصى {{max}} كلمات)',

      actions: {
        saveAttendance: 'حفظ الحضور',
      },

      footer: {
        summary: 'حاضر: {{present}} • غائب: {{absent}} • متأخر: {{late}} • بعذر: {{excused}}',
        notSavedYet: 'لم يتم الحفظ بعد',
        saved: 'تم الحفظ ({{mode}}) لتاريخ {{date}}',
      },

      modes: {
        allDay: 'طوال اليوم',
        perLesson: 'لكل حصة',
      },

      tabs: {
        students: {
          activeNow: 'الطلاب: النشطون الآن',
          onSelectedDate: 'الطلاب: في التاريخ المحدد',
        },
        mode: {
          perLesson: 'الوضع: لكل حصة',
          allDay: 'الوضع: طوال اليوم',
        },
        date: {
          today: 'التاريخ: اليوم',
          yesterday: 'التاريخ: أمس',
          custom: 'التاريخ: مخصص',
        },
      },

      labels: {
        date: 'التاريخ',
        day: 'اليوم',
        thisDay: 'هذا اليوم',
      },

      filters: {
        period: 'الحصة',
      },
      searchPlaceholders: {
        periods: 'ابحث عن الحصص…',
      },

      periodOptions: {
        noSubject: 'بدون مادة',
        savedPeriodLabel: 'محفوظ',
      },

      hints: {
        teacherLesson: 'اختر الشعبة + المادة + الحصة لتسجيل الحضور.',
        adminLesson: 'اختر المستوى + الدوام + الشعبة + المادة + الحصة لتسجيل الحضور.',
        daily: 'اختر المستوى + الدوام + الشعبة لتسجيل حضور اليوم كاملًا.',
      },

      toasts: {
        noActiveStudentsInClass: 'لا يوجد طلاب نشطون في هذا الصف.',
        saved: 'تم حفظ الحضور.',
        inactiveStudentsSwitchedToAsOf: 'تضم القائمة طلاباً غير نشطين. تم التبديل إلى “في التاريخ المحدد”.',
        allStudentsActiveUseCurrent: 'كل الطلاب نشطون. يمكنك استخدام “النشطون الآن”.',
      },

      errors: {
        selectLessonFilters: 'يرجى اختيار الشعبة والمادة والحصة والتاريخ.',
        selectDailyFilters: 'يرجى اختيار المستوى والدوام والشعبة والتاريخ.',
        noPermissionEdit: 'ليست لديك صلاحية لتعديل الحضور.',
        inactiveStudentsNewNotAllowed: 'لا يمكن تسجيل حضور جديد بينما تضم القائمة طلاباً غير نشطين.',
        dailyAlreadyExistsNoLesson: 'يوجد حضور يومي لهذا التاريخ. تم حظر حضور الحصص.',
        noActiveStudents: 'لم يتم العثور على طلاب نشطين.',
        alreadySavedNoChanges: 'تم الحفظ مسبقاً. لا توجد تغييرات للحفظ.',
        noPeriodsForSubjectToday: 'لا توجد حصص لهذه المادة اليوم.',
        noLessonsInTimetable: 'لا توجد حصص في الجدول لهذه الشعبة.',
        noPeriodsScheduledForDay: 'لا توجد حصص مجدولة لـ {{day}}.',
        noSectionsForSelectedLevelShift: 'لا توجد شعب للمستوى/الدوام المحدد.',
        conflictTeacher: 'يمكنك تعديل سجلات حضورك فقط.',
        conflictHasLessonSwitchToPerLesson: 'يوجد حضور حصص لهذا التاريخ. بدّل إلى وضع لكل حصة.',
        conflictHasDailySwitchToAllDay: 'يوجد حضور طوال اليوم لهذا التاريخ. بدّل إلى وضع طوال اليوم.',
        saveFailed: 'فشل حفظ الحضور.',
        dailySavedReadOnlyTeacher: 'تم حفظ الحضور لهذا التاريخ وهو للقراءة فقط للمعلمين.',
        cannotSaveNow: 'لا يمكن الحفظ الآن.',
      },
    },

    reports: {
      title: 'تقرير الحضور',

      columns: {
        date: 'التاريخ',
        studentId: 'رقم الطالب',
        fullName: 'الاسم الكامل',
      },

      labels: {
        range: 'النطاق',
        rosterCount: 'عدد الطلاب',
        student: 'الطالب',
        studentId: 'المعرف',
        markedBy: 'سجّل',
        updatedBy: 'حدّث',
        subject: 'المادة',
        teacher: 'المعلم',
        periodWithCode: 'الحصة: {{code}}',
        remarks: 'ملاحظات',
      },

      summaryCell: {
        counts: 'ح:{{present}} غ:{{absent}} ت:{{late}} ع:{{excused}}',
      },

      empty: {
        noAttendanceInRange: 'لا يوجد حضور في هذا النطاق.',
        noRecordsInRange: 'لم يتم العثور على سجلات حضور في هذا النطاق.',
      },

      tabs: {
        report: {
          summary: 'التقرير: ملخص',
          details: 'التقرير: تفاصيل',
        },
        range: {
          today: 'النطاق: اليوم',
          last7: 'النطاق: آخر 7 أيام',
          custom: 'النطاق: مخصص',
        },
      },

      filters: {
        subjectSelectSectionFirst: 'المادة (اختر الشعبة أولاً)',
        subjectLoadingPeriods: 'المادة (جارٍ تحميل الحصص…)',
        subjectRequired: 'المادة (مطلوبة)',
      },

      hints: {
        selectFilters: 'اختر المستوى والدوام والشعبة لعرض التقارير.',
      },

      toasts: {
        maxRangeClamped: 'الحد الأقصى للنطاق شهر واحد. تم ضبط تاريخ النهاية.',
      },

      errors: {
        selectFilters: {
          teacher: 'يرجى اختيار الشعبة والمادة ونطاق التاريخ',
          admin: 'يرجى اختيار المستوى والدوام والشعبة ونطاق التاريخ',
        },
        noPeriodsForSubject: 'لم يتم العثور على حصص للجدول لهذه المادة.',
        loadFailed: 'فشل تحميل التقرير',
        photo: {
          alt: 'صورة الطالب',
        },
        detailsLoadFailed: 'فشل تحميل التفاصيل',
      },

      actions: {
        viewStudent: 'عرض الطالب',
        viewStudentAria: 'عرض {{name}}',
      },

        contacts: {
          title: 'جهات الاتصال',
          subtitle: 'أرقام الهاتف والبريد الإلكتروني',
        },
        residence: {
          title: 'السكن',
          subtitle: 'تفاصيل مكان الإقامة',
        },
        transfer: {
          title: 'التحويل (القبول)',
          subtitle: 'بيانات التحويل التي تم جمعها عند التسجيل',
        },
        idDocument: {
          title: 'وثيقة الهوية',
          subtitle: 'تفاصيل الهوية (اختياري)',
        },
        medical: {
          title: 'طبي',
          subtitle: 'ملاحظات طبية مهمة (اختياري)',
        },
        notes: {
          title: 'ملاحظات',
          subtitle: 'ملاحظات إضافية عن هذا الطالب',
        },
      studentModal: {
        title: 'الطالب',
        titleWithName: 'الطالب • {{name}} ({{id}})',
        noStudentSelected: 'لم يتم اختيار طالب.',
      },

      export: {
        subtitleWithRoster: 'النطاق: {{from}} إلى {{to}} • العدد: {{rosterCount}}',
        subtitleRangeOnly: 'النطاق: {{from}} إلى {{to}}',
          photoUploaded: 'تم رفع الصورة',
        sheet: {
          summary: 'ملخص',
          details: 'تفاصيل',
        },
      },
    },
  },
          photoUploadFailed: 'فشل رفع الصورة',

  timetable: {
    grid: {
      noDaysSelected: 'لم يتم تحديد أيام.',
      noPeriods: 'لا توجد حصص',
      break: 'استراحة',
      breakLocked: 'استراحة (مقفلة)',
      dragToMove: 'اسحب للنقل',
    },

    page: {
      loadingSlots: 'جارٍ تحميل الحصص…',

      table: {
        day: 'اليوم',
      },

      filters: {
        subject: 'المادة',
        days: 'الأيام',
      },

      actions: {
        downloadCsv: 'تنزيل CSV',
        addSlot: 'إضافة حصة',
        addSlotsDays: 'إضافة حصص (أيام)',
        swap: 'تبديل',
        move: 'نقل',
      },

      states: {
        adding: 'جارٍ الإضافة…',
      },

      swapModal: {
        title: 'اختر الإجراء',
      },

      print: {
        selectSection: 'اختر الشعبة',
      },

      confirms: {
        deleteSlot: 'حذف هذه الحصة؟',
      },

      toasts: {
        slotMoved: 'تم نقل الحصة',
        slotsSwapped: 'تم تبديل الحصص',
        slotCreated: 'تم إنشاء الحصة',
        slotsCreated: 'تم إنشاء الحصص',
        deleted: 'تم الحذف',
      },

      errors: {
        teacherViewOnly: 'يمكن للمعلمين عرض الجدول فقط',
        noEditPermission: 'ليس لديك صلاحية لتعديل الجدول',
        noAddPermission: 'ليس لديك صلاحية لإضافة حصص للجدول',
        noDeletePermission: 'ليس لديك صلاحية لحذف حصص الجدول',
        noPrintPermission: 'ليس لديك صلاحية لطباعة الجدول',
        noDownloadPermission: 'ليس لديك صلاحية لتنزيل الجدول',

        fillRequiredFields: 'املأ الحقول المطلوبة',
        selectExactlyOneDayForAddSlot: 'اختر يوماً واحداً فقط لإضافة حصة',

        breakCannotBeMoved: 'لا يمكن نقل الاستراحة',
        cannotDropOnBreak: 'لا يمكن الإفلات على استراحة',
        breakCannotBeSwapped: 'لا يمكن تبديل الاستراحة',
        moveNotAllowedOnOccupiedCell: 'لا يمكن النقل إلى خانة مشغولة.',

        loadFailed: 'فشل تحميل الجدول',
        loadTodayFailed: 'فشل تحميل جدول اليوم',

        moveFailed: 'فشل النقل',
        swapFailed: 'فشل التبديل',
        createFailed: 'فشل الإنشاء',
        createBulkFailed: 'فشل الإنشاء بالجملة',
        deleteFailed: 'فشل الحذف',

        selectSection: 'اختر شعبة',
        noSlotsToExport: 'لا توجد حصص للتصدير',

        someDaysFailed: 'فشل بعض الأيام: {{details}}{{moreSuffix}}',
        moreSuffix: ' (+{{count}} أكثر)',
      },

      empty: {
        setValidTimeRange: 'حدد نطاق وقت صالح لعرض الحصص.',
      },

      conflicts: {
        classConflict: 'تعارض شعبة',
        teacherConflict: 'تعارض معلم',
        roomConflict: 'تعارض غرفة',
        invalidDay: 'يوم غير صالح',
        conflict: 'تعارض',
      },

      export: {
        filename: 'timetable.csv',
        headers: {
          day: 'اليوم',
          start: 'البداية',
          end: 'النهاية',
          type: 'النوع',
          subject: 'المادة',
          teacher: 'المعلم',
          room: 'الغرفة',
        },
        type: {
          break: 'استراحة',
          class: 'حصة',
        },
      },
    },
  },

  nav: {
    dashboard: 'لوحة التحكم',
    finance: 'المالية',
    financeDashboard: 'لوحة التحكم',
    financeAccounts: 'الحسابات',
    financeStudentFinance: 'مالية الطلاب',
    financePayroll: 'الرواتب',
    financeExpenses: 'المصاريف',
    myClasses: 'صفوفي',
    profile: 'الملف الشخصي',

    people: 'المستخدمون',
    students: 'الطلاب',
    teachers: 'المعلمون',
    userManagement: 'إدارة المستخدمين',

    academics: 'الأكاديميات',
      selectAll: 'تحديد الكل',
    classes: 'الصفوف',
    subjects: 'المواد',
    cohorts: 'المجموعات',
    promotions: 'الترقيات',
    transfers: 'التحويلات',
    setup: 'الإعدادات',
    grades: 'الدرجات',
    shifts: 'الورديات',
    academicYears: 'السنوات الدراسية',

    exams: 'الامتحانات',
    examScores: 'درجات الامتحان',
    examSettings: 'إعدادات الامتحان',
    results: 'النتائج',
    transcripts: 'السجلات',

    operations: 'العمليات',
    attendance: 'الحضور',
    attendanceReports: 'تقارير الحضور',
    timetable: 'الجدول',

    transcript: 'السجل',
    library: 'المكتبة',
    enrollments: 'التسجيلات',

    announcements: 'الإعلانات',
  },

  modules: {
    students: 'الطلاب',
    teachers: 'المعلمون',
    transfers: 'التحويلات',
    security: 'إشعارات الجرس',
    timetable: 'الجدول',
    attendance: 'الحضور',
    attendanceReports: 'تقارير الحضور',
    announcements: 'الإعلانات',
    cohorts: 'المجموعات',
    promotions: 'الترقيات',
    transcript: 'السجل',
    subjects: 'المواد',
    grades: 'الدرجات',
    exams: 'الامتحانات',
    results: 'النتائج',

    financeDashboard: 'لوحة التحكم المالية',
    financeAccounts: 'الحسابات المالية',
    financeAccountsInstitution: 'حسابات المؤسسة',
    financeAccountsOverview: 'نظرة عامة على الأرصدة والمشاريع',
    financeAccountsLedger: 'سجل الأستاذ العام',
    financeStudent: 'مالية الطلاب',
    financeStudentReceipt: 'الإيصالات',
    financeStudentPreviousBalance: 'الرصيد السابق',
    financeStudentAmountType: 'نوع المبلغ',
    financeStudentFeeType: 'نوع الرسوم',
    financeStudentReceiptModal: 'نافذة الإيصال',
    financeStudentPreviousBalanceModal: 'نافذة الرصيد السابق',
    financePayroll: 'الرواتب',
    financePayrollEmployeeInfo: 'معلومات الموظف (الرواتب)',
    financeExpenses: 'المصروفات',
    financeExpensesLedger: 'سجل المصروفات',
    financeExpensesCategories: 'فئات المصروفات',
    financeConfig: 'إعدادات المصروفات',
    financeFoundation: 'إعدادات المالية',
    financeAppointments: 'المواعيد',
    financeAudit: 'التدقيق',
    financeMaintenance: 'الصيانة',
    financePrint: 'طباعة المالية',
  },

  perms: {
    full: 'صلاحية كاملة (تحديد الكل)',
    view: 'عرض',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    resetPassword: 'إعادة تعيين كلمة المرور',
    transfer: 'تحويل',
    deactivate: 'تعطيل',
    reactivate: 'إعادة التفعيل',
    download: 'تنزيل',
    assign: 'التكليفات',
    unlock: 'فك القفل',
    resetLockout: 'إعادة ضبط الحظر',
    activate: 'تفعيل',
    print: 'طباعة',
    preview: 'معاينة',
    promote: 'ترقية',
    input: 'إدخال',
    income: 'تحصيل',
    save: 'حفظ',
    revert: 'تراجع',
    run: 'تشغيل',
  },

  setup: {
    table: {
      emptyTitle: 'لا توجد {{title}}',
      emptyDescription: 'أنشئ أول {{title}} للبدء.',
      emptyAction: 'إضافة {{title}}',
    },
    grades: {
      form: {
        validation: {
          gradeNameRequired: 'اسم الصف مطلوب',
          orderInvalid: 'يجب أن يكون الترتيب عدداً صحيحاً (1..N)',
        },
        labels: {
          gradeName: 'اسم الصف',
        },
        placeholders: {
          gradeName: 'مثال: Level 1 / Fasalka 1',
          order: '1',
        },
        hints: {
          order: 'يُستخدم في الترقيات (غير مرتبط باللغة). الصف النهائي هو الأعلى ترتيباً.',
        },
      },
      columns: {
        grade: 'الصف',
      },
      searchPlaceholder: 'ابحث عن الصفوف…',
      loading: 'جارٍ تحميل الصفوف…',
      emptyTitle: 'لم يتم العثور على صفوف',
      emptyCreateFirst: 'أنشئ أول صف لك.',
      sheetName: 'الصفوف',
      actions: {
        add: 'إضافة صف',
      },
      modal: {
        addTitle: 'إضافة صف',
        editTitle: 'تعديل الصف',
      },
      rowActions: {
        editTitle: 'تعديل الصف',
        deleteTitle: 'حذف الصف',
      },
      confirms: {
        delete: 'هل تريد حذف هذا الصف؟ هذا مسموح فقط إذا لم يكن قيد الاستخدام.',
      },
      toasts: {
        created: 'تم إنشاء الصف',
        updated: 'تم تحديث الصف',
        deleted: 'تم حذف الصف',
      },
      errors: {
        cannotDeleteInUse: 'لا يمكن الحذف: الصف قيد الاستخدام{{suffix}}',
      },
      refs: {
        gradeSections: 'أقسام الصف',
        enrollments: 'التسجيلات',
        subjects: 'المواد',
      },
    },

    shifts: {
      form: {
        validation: {
          shiftNameRequired: 'اسم الدوام مطلوب',
        },
        labels: {
          shiftName: 'اسم الدوام',
        },
        placeholders: {
          shiftName: 'مثلاً: صباحي / مسائي',
        },
      },
      columns: {
        shift: 'الدوام',
      },
      searchPlaceholder: 'ابحث عن الدوامات…',
      loading: 'جارٍ تحميل الدوامات…',
      emptyTitle: 'لم يتم العثور على دوام',
      emptyCreateFirst: 'أنشئ أول دوام لك.',
      sheetName: 'الدوامات',
      actions: {
        add: 'إضافة دوام',
      },
      modal: {
        addTitle: 'إضافة دوام',
        editTitle: 'تعديل الدوام',
      },
      rowActions: {
        editTitle: 'تعديل الدوام',
        deleteTitle: 'حذف الدوام',
      },
      confirms: {
        delete: 'هل تريد حذف هذا الدوام؟ هذا مسموح فقط إذا لم يكن قيد الاستخدام.',
      },
      toasts: {
        created: 'تم إنشاء الدوام',
        updated: 'تم تحديث الدوام',
        deleted: 'تم حذف الدوام',
      },
      errors: {
        cannotDeleteInUse: 'لا يمكن الحذف: الدوام قيد الاستخدام{{suffix}}',
      },
      refs: {
        gradeSections: 'أقسام الصف',
        enrollments: 'التسجيلات',
      },
    },

    academicYears: {
      form: {
        validation: {
          yearNameRequired: 'اسم السنة الدراسية مطلوب',
        },
        labels: {
          yearName: 'السنة الدراسية',
        },
        hints: {
          yearName: 'مثال: 2025/2026 (قد يتم إنشاؤها تلقائياً عند ترقية نهاية العام إذا كانت مفقودة)',
        },
        placeholders: {
          yearName: '2025/2026',
        },
      },
      columns: {
        academicYear: 'السنة الدراسية',
      },
      searchPlaceholder: 'ابحث عن السنوات الدراسية…',
      loading: 'جارٍ تحميل السنوات الدراسية…',
      emptyTitle: 'لم يتم العثور على سنوات دراسية',
      emptyCreateFirst: 'أنشئ أول سنة دراسية لك.',
      sheetName: 'السنوات الدراسية',
      actions: {
        add: 'إضافة سنة دراسية',
      },
      modal: {
        addTitle: 'إضافة سنة دراسية',
        editTitle: 'تعديل السنة الدراسية',
      },
      rowActions: {
        editTitle: 'تعديل السنة الدراسية',
        deleteTitle: 'حذف السنة الدراسية',
      },
      confirms: {
        delete: 'هل تريد حذف هذه السنة الدراسية؟ هذا مسموح فقط إذا لم تكن قيد الاستخدام.',
      },
      toasts: {
        created: 'تم إنشاء السنة الدراسية',
        updated: 'تم تحديث السنة الدراسية',
        deleted: 'تم حذف السنة الدراسية',
      },
      errors: {
        cannotDeleteInUse: 'لا يمكن الحذف: السنة الدراسية قيد الاستخدام{{suffix}}',
      },
      refs: {
        enrollments: 'التسجيلات',
        exams: 'الامتحانات',
        lessonPlans: 'خطط الدروس',
        cohorts: 'المجموعات',
        teachers: 'المعلمون',
      },
    },
  },

  gradeSections: {
    searchPlaceholder: 'ابحث عن الصف أو الشعبة…',
    actions: {
      add: 'إضافة شعبة صف',
    },
    modal: {
      addTitle: 'إضافة شعبة صف',
      editTitle: 'تعديل شعبة الصف',
    },
    permissions: {
      noAdd: 'ليست لديك صلاحية لإضافة شُعب الصفوف',
      noEdit: 'ليست لديك صلاحية لتعديل شُعب الصفوف',
      noViewPrint: 'ليست لديك صلاحية لعرض/طباعة شُعب الصفوف',
      noDelete: 'ليست لديك صلاحية لحذف شُعب الصفوف',
    },
    confirms: {
      delete: 'هل أنت متأكد أنك تريد حذف هذه الشعبة؟',
    },
    toasts: {
      deleted: 'تم الحذف بنجاح',
    },
    columns: {
      subjects: 'المواد',
      capacity: 'السعة',
    },
    export: {
      title: 'شُعب الصفوف',
      sheetName: 'شُعب الصفوف',
    },
    table: {
      loading: 'جارٍ التحميل…',
      emptyTitle: 'لا توجد شُعب صفوف',
      emptyDescription: 'جرّب تعديل الفلاتر أو أنشئ واحدة جديدة.',
    },
    rowActions: {
      viewStudentsTitle: 'عرض الطلاب',
    },
    select: {
      noClassesForShift: 'لم يتم العثور على شُعب للدوام المحدد.',
    },
    roster: {
      loading: 'جارٍ تحميل الطلاب…',
      emptyTitle: 'لا يوجد طلاب في هذه الشعبة',
      emptyDescription: 'لم يتم العثور على طلاب نشطين لهذه الشعبة.',
      columns: {
        studentId: 'رقم الطالب',
        fullName: 'الاسم الكامل',
        gender: 'الجنس',
      },
      export: {
        title: 'قائمة الطلاب',
        sheetName: 'الكشف',
      },
      toasts: {
        noActiveStudents: 'لم يتم العثور على طلاب نشطين لهذه شعبة الصف.',
      },
      errors: {
        timeout: 'انتهت مهلة تحميل الطلاب. الرجاء المحاولة مرة أخرى.',
      },
    },
    form: {
      labels: {
        subjects: 'المواد',
        capacity: 'السعة',
      },
      placeholders: {
        section: 'مثال: 1، 2، A، B',
      },
      subjects: {
        refreshTitle: 'تحديث المواد لهذا الصف',
        noneForGrade: 'لا توجد مواد لهذا الصف.',
        hasScores: 'له درجات',
        help: 'حدد المواد لإضافتها. المواد التي لديها درجات لا يمكن إزالتها.',
      },
      errors: {
        requiredFields: 'يرجى تعبئة جميع الحقول المطلوبة',
        updateBlocked: 'تم منع التحديث: {{error}}. ({{blocked}})',
        cannotRemoveWithScores: 'لا يمكن إزالة مواد لديها درجات: {{items}}',
        operationFailed: 'فشلت العملية',
      },
      toasts: {
        subjectsCleared: 'تم مسح المواد السابقة (تغيير الصف)',
        removedSubjectsTitle: 'المواد المُزالة:',
        updated: 'تم التحديث',
        created: 'تم الإنشاء',
      },
      states: {
        resyncing: 'جارٍ إعادة المزامنة…',
        updating: 'جارٍ التحديث…',
      },
      changeGradeConfirm: {
        title: 'تغيير الصف؟',
        body: 'إذا غيّرت الصف سيتم مسح جميع المواد المحددة مسبقاً. هل أنت متأكد؟',
        confirm: 'نعم، غيّر',
      },
    },
  },

  subjects: {
    searchPlaceholder: 'ابحث عن المواد بالاسم أو الرمز…',
    permissions: {
      noAdd: 'ليست لديك صلاحية لإضافة المواد',
      noEdit: 'ليست لديك صلاحية لتعديل المواد',
      noDelete: 'ليست لديك صلاحية لحذف المواد',
      noExport: 'ليست لديك صلاحية لتصدير/طباعة المواد',
    },
    confirms: {
      delete: 'هل أنت متأكد أنك تريد حذف هذه المادة؟',
    },
    errors: {
      failedToLoadGrades: 'فشل تحميل الصفوف',
      subjectCodeExists: 'رمز المادة موجود بالفعل. الرجاء اختيار رمز آخر.',
      cannotDeleteInUse: 'لا يمكن الحذف: هذه المادة مستخدمة في {{count}} صف/صفوف.',
    },
    toasts: {
      created: 'تم إنشاء المادة',
      updated: 'تم تحديث المادة',
      deleted: 'تم حذف المادة',
    },
    actions: {
      addNew: 'إضافة مادة جديدة',
      addSubject: 'إضافة مادة',
      saveSubject: 'حفظ المادة',
      updateSubject: 'تحديث المادة',
    },
    modal: {
      addTitle: 'إضافة مادة جديدة',
      editTitle: 'تعديل المادة',
    },
    form: {
      labels: {
        subjectName: 'اسم المادة',
        subjectCode: 'رمز المادة',
        associatedGrades: 'الصفوف المرتبطة',
      },
      hints: {
        selectGrades: 'اختر صفاً واحداً أو أكثر.',
      },
    },
    table: {
      loading: 'جارٍ تحميل المواد…',
      emptyTitle: 'لم يتم العثور على مواد',
      emptyDescription: 'جرّب تعديل البحث أو أضف مادة جديدة.',
      columns: {
        subjectName: 'اسم المادة',
        subjectCode: 'رمز المادة',
        grades: 'الصفوف المرتبطة',
      },
      actionTitles: {
        edit: 'تعديل المادة',
        delete: 'حذف المادة',
      },
    },
  },

  cohorts: {
    searchPlaceholder: 'ابحث عن الدفعات…',
    filters: {
      startAy: 'سنة البداية',
    },
    permissions: {
      noExport: 'ليست لديك صلاحية لتصدير/طباعة الدفعات',
    },
    confirms: {
      delete: 'هل تريد حذف هذه الدفعة؟ هذا مسموح فقط إذا لم تكن قيد الاستخدام.',
    },
    toasts: {
      created: 'تم إنشاء الدفعة',
      updated: 'تم تحديث الدفعة',
      deleted: 'تم حذف الدفعة',
      archived: 'تمت الأرشفة',
      activated: 'تم التفعيل',
    },
    actions: {
      add: 'إضافة دفعة',
    },
    modal: {
      addTitle: 'إضافة دفعة',
      editTitle: 'تعديل الدفعة',
    },
    status: {
      archived: 'مؤرشف',
    },
    form: {
      labels: {
        name: 'الاسم',
        startAcademicYear: 'سنة البداية',
      },
      placeholders: {
        name: 'مثلاً: الدفعة الأولى',
        selectAcademicYear: 'اختر السنة الدراسية',
      },
    },
    table: {
      emptyTitle: 'لم يتم العثور على دفعات',
      emptyDescription: 'جرّب تعديل الفلاتر أو أنشئ دفعة جديدة.',
      columns: {
        name: 'الاسم',
        startAy: 'السنة (البداية)',
      },
    },
  },

  promotions: {
    permissions: {
      noPreview: 'ليست لديك صلاحية: معاينة الترقيات',
      noPromote: 'ليست لديك صلاحية: تنفيذ الترقيات',
    },
    errors: {
      selectFiltersFirst: 'اختر السنة والصف والدوام والشعبة والدفعة أولاً',
      selectAtLeastOneStudent: 'اختر طالباً واحداً على الأقل للمعاينة',
      previewFailed: 'فشلت المعاينة',
      noScoresAllShort: 'جميع الطلاب المحددين لا يملكون درجات امتحانات.',
      runPreviewFirst: 'قم بتشغيل المعاينة أولاً',
      promotionFailed: 'فشلت الترقية',
      noScoresAllLong: 'جميع الطلاب المحددين لا يملكون درجات امتحانات. الرجاء إضافة/استيراد الدرجات أولاً، ثم حاول الترقية مرة أخرى.',
    },
    toasts: {
      completedBase: 'اكتملت الترقية.',
      promotedCount: 'تمت الترقية: {{count}}.',
      notEligibleCount: 'غير مؤهل (المتوسط < 60): {{count}}.',
      graduatedCount: 'تخرّج: {{count}}.',
      failedCount: 'راسب: {{count}}.',
    },
    roster: {
      title: 'الطلاب',
      loading: 'جارٍ تحميل الطلاب…',
      emptyTitleNeedsFilters: 'اختر الفلاتر لتحميل الطلاب',
      emptyTitleNone: 'لم يتم العثور على طلاب',
      emptyDescriptionNeedsFilters: 'اختر السنة والصف والدوام والشعبة والدفعة.',
      columns: {
        student: 'الطالب',
        current: 'الحالي',
      },
    },
    preview: {
      empty: 'شغّل المعاينة لرؤية الأهداف واحتياجات الإنشاء التلقائي وحالات التخرج',
      columns: {
        student: 'الطالب',
        from: 'من',
        to: 'إلى',
        avg: 'المتوسط',
        failed: 'راسب',
      },
      summary: {
        total: 'الإجمالي',
        promotable: 'قابل للترقية',
        graduates: 'الخريجون',
        missingTargets: 'أهداف مفقودة',
        capacityIssues: 'مشاكل السعة',
      },
      status: {
        graduate: 'تخرّج',
        notEligible: 'غير مؤهل (المتوسط < 60)',
        missingGs: 'قسم مفقود (سيُنشأ تلقائياً عند الترقية)',
      },
    },
    timing: {
      label: 'التوقيت',
      placeholder: 'التوقيت',
      midYear: 'منتصف العام',
      yearEnd: 'نهاية العام',
    },
  },

  transfers: {
    searchPlaceholder: 'ابحث بالاسم أو الرقم',
    permissions: {
      noTransfer: 'ليست لديك صلاحية لتحويل الطلاب',
      noReturn: 'ليست لديك صلاحية لإرجاع التحويلات',
    },
    errors: {
      failedToOpen: 'فشل فتح التحويل',
      selectAllFields: 'يرجى اختيار السنة والصف والدوام والشعبة',
      failedToTransferWithStatus: 'فشل التحويل (الحالة {{status}})',
      failedToReturnWithStatus: 'فشل الإرجاع (الحالة {{status}})',
    },
    toasts: {
      noChanges: 'لا تغييرات: موجود بالفعل في هذه الشعبة',
      transferred: 'تم تحويل التسجيل',
      returned: 'تم الإرجاع إلى السابق',
    },
    labels: {
      previousSection: 'الشعبة السابقة',
      studentFallback: 'طالب',
      from: 'من',
    },
    actions: {
      transferSectionTitle: 'تحويل الشعبة',
      opening: 'جارٍ الفتح…',
      returnTitle: 'إرجاع',
      return: 'إرجاع',
      transferring: 'جارٍ التحويل…',
      confirmTransfer: 'تأكيد التحويل',
    },
    recent: {
      title: 'التحويلات الأخيرة (الجلسة)',
      note: 'تُحفظ التحويلات الأخيرة فقط خلال جلسة هذه الصفحة.',
    },
    logs: {
      title: 'كل التحويلات',
      searchPlaceholder: 'ابحث بالاسم أو الرقم...',
      loading: 'جارٍ تحميل التحويلات...',
      emptyTitle: 'لم يتم العثور على تحويلات',
      emptyDescription: 'ستظهر التحويلات هنا عند تسجيلها.',
      columns: {
        date: 'التاريخ',
        student: 'الطالب',
        from: 'من',
        to: 'إلى',
        type: 'النوع',
        reason: 'السبب',
      },
      type: {
        revert: 'إرجاع',
        transfer: 'تحويل',
      },
    },
    candidates: {
      loading: 'جارٍ تحميل المرشحين...',
      emptyTitleNone: 'لم يتم العثور على مرشحين',
      emptyTitleNeedsFilters: 'اختر الفلاتر للبدء',
      emptyDescriptionNone: 'جرّب تعديل الفلاتر أو كلمة البحث.',
      emptyDescriptionNeedsFilters: 'اختر السنة الدراسية أو الصف أو الدوام لتحميل المرشحين.',
      columns: {
        studentId: 'رقم الطالب',
        fullName: 'الاسم الكامل',
      },
    },
    modal: {
      title: 'تحويل الشعبة',
      titleWithName: 'تحويل الشعبة: {{name}}',
      loadingEnrollment: 'جارٍ تحميل التسجيل الحالي…',
      placeholders: {
        selectAcademicYear: '-- اختر السنة الدراسية --',
        selectGrade: '-- اختر الصف --',
        selectShift: '-- اختر الدوام --',
      },
      notes: {
        forwardRules: 'التحويل للأمام مسموح لأي سنة مستقبلية. الإرجاع يجب أن يطابق الشعبة السابقة.',
        noScoresMigrate: 'لا تنتقل الدرجات بين السنوات الدراسية.',
      },
    },
  },

  students: {
    common: {
      studentFallback: 'طالب',
    },

    dashboard: {
      title: 'لوحة تحكم الطالب',
      loadingStudent: 'جارٍ تحميل بيانات الطالب…',
      moreTabs: 'المزيد من التبويبات',
    },

    transferTimeline: {
      empty: 'لا توجد تحويلات.',
      transferred: 'تم التحويل',
      returned: 'تمت الإعادة',
    },

    attendance: {
      status: {
        notMarked: 'غير محدد',
        present: 'حاضر',
        absent: 'غائب',
        late: 'متأخر',
        excused: 'بعذر',
        other: 'أخرى',
      },
    },

    attendanceTab: {
      subtitle: 'حضورك اليومي، مُجمّع حسب التاريخ.',
      loading: 'جارٍ تحميل الحضور…',
      empty: 'لا توجد سجلات حضور بعد.',
      allDay: 'طوال اليوم',
      allDaySubtitle: 'لا يوجد تطابق في الجدول لهذه التاريخ.',
      lessonFallback: 'حصة',
      loadFailed: 'فشل تحميل الحضور',
    },

    enrollmentsTab: {
      loading: 'جارٍ تحميل التسجيلات…',
      loadFailed: 'فشل تحميل التسجيلات',
      emptyTitle: 'لا يوجد سجل للتسجيل',
      emptyDescription: 'لا توجد سجلات تسجيل لهذا الطالب بعد.',
      columns: {
        joined: 'انضم',
        left: 'غادر',
        sequence: 'تسلسل',
      },
    },

    libraryTab: {
      subtitle: 'ملفات PDF، ملاحظات، أوراق امتحانات وروابط.',
      loadFailed: 'فشل تحميل المكتبة',
      uploadFailed: 'فشل الرفع',
      confirmDelete: 'حذف هذا المورد؟',
      emptyTitle: 'لا توجد موارد بعد',
      empty: 'لا توجد موارد مكتبة متاحة حالياً.',
      kinds: {
        pdf: 'PDF',
        docs: 'مستندات',
        doc: 'DOC',
        docx: 'DOCX',
        link: 'رابط',
      },
      columns: {
        title: 'العنوان',
        type: 'النوع',
        category: 'الفئة',
        added: 'أضيف',
        open: 'فتح',
      },
      actions: {
        add: 'إضافة مورد',
        open: 'فتح',
        download: 'تحميل',
      },
      modal: {
        title: 'إضافة مورد للمكتبة',
      },
      form: {
        title: 'العنوان',
        titlePlaceholder: 'مثال: ملاحظات الرياضيات - الوحدة 1',
        category: 'الفئة (اختياري)',
        categoryPlaceholder: 'ملاحظات / أوراق سابقة / رابط',
        type: 'نوع المورد',
        file: 'ملف',
        pdfHint: 'المدعوم: PDF، DOC، DOCX.',
        link: 'رابط URL',
        description: 'الوصف (اختياري)',
        descriptionPlaceholder: 'وصف قصير...',
      },
    },

    timetableTab: {
      subtitle: 'الجدول الأسبوعي للتسجيل الحالي.',
      loading: 'جارٍ تحميل الجدول…',
      loadFailed: 'فشل تحميل الجدول',
      noActiveClass: 'لا توجد حصة حالياً.',
      todayLabel: 'اليوم:',
      todaySubtitle: 'جدولك لليوم.',
      noClassesToday: 'لا توجد حصص اليوم.',
      empty: 'لا توجد بيانات للجدول.',
      teachersAndSubjects: 'المعلمون والمواد',
      noTeachers: 'لا يوجد معلمون',
      table: {
        day: 'اليوم',
        noPeriods: 'لا توجد حصص',
        teacher: 'المعلم',
        subjects: 'المواد',
      },
    },

    transcriptTab: {
      subtitle: 'نتائج الامتحانات وملخص الأداء العام.',
      enrollmentsLoadFailed: 'فشل تحميل التسجيلات',
      noEnrollments: 'لم يتم العثور على تسجيلات.',
      overallSummary: 'الملخص العام',
      rankTooltip: 'الترتيب العام عبر جميع المراحل والسنوات.',
      labels: {
        overall: 'الإجمالي',
        average: 'المتوسط',
        rank: 'الترتيب',
      },
      loadingTranscript: 'جارٍ تحميل السجل…',
      noExams: 'لم يتم العثور على امتحانات.',
      examFallback: 'امتحان',
      moreLevelsTooltip: 'مراحل أكثر',
      levelFallback: 'مرحلة',
      table: {
        subject: 'المادة',
        total: 'المجموع',
      },
    },

    transfersTab: {
      loadFailed: 'فشل تحميل التحويلات',
      emptyTitle: 'لا توجد تحويلات',
      emptyDescription: 'لا توجد سجلات تحويل لهذا الطالب بعد.',
    },

    profileTab: {
      loadFailed: 'فشل تحميل الملف الشخصي',
      photo: {
        alt: 'صورة الطالب',
      },
      personal: {
        title: 'شخصي',
        subtitle: 'بيانات الطالب',
      },
      academic: {
        title: 'أكاديمي',
        subtitle: 'معلومات آخر تسجيل',
      },
      contacts: {
        title: 'جهات الاتصال',
        subtitle: 'أرقام الهاتف والبريد الإلكتروني',
      },
      residence: {
        title: 'السكن',
        subtitle: 'تفاصيل مكان الإقامة',
      },
      transfer: {
        title: 'التحويل (القبول)',
        subtitle: 'بيانات التحويل التي تم جمعها عند التسجيل',
      },
      idDocument: {
        title: 'وثيقة الهوية',
        subtitle: 'تفاصيل الهوية (اختياري)',
      },
      medical: {
        title: 'طبي',
        subtitle: 'ملاحظات طبية مهمة (اختياري)',
      },
      notes: {
        title: 'ملاحظات',
        subtitle: 'ملاحظات إضافية عن هذا الطالب',
      },
      password: {
        title: 'تغيير كلمة المرور',
        subtitle: 'تحديث كلمة المرور الخاصة بك',
        current: 'كلمة المرور الحالية',
        new: 'كلمة المرور الجديدة',
        confirm: 'تأكيد كلمة المرور',
        fieldsRequired: 'يرجى تعبئة جميع الحقول المطلوبة.',
        minLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.',
        noMatch: 'كلمتا المرور غير متطابقتين.',
        changedSuccess: 'تم تغيير كلمة المرور بنجاح.',
        changeFailed: 'فشل تغيير كلمة المرور.',
        defaultPasswordPlaceholder: 'كلمة المرور الافتراضية',
        defaultPasswordNote: 'حسابك يستخدم كلمة المرور الافتراضية. يرجى تغييرها الآن.',
        showPasswordTitle: 'إظهار كلمة المرور',
        showCurrentAria: 'إظهار كلمة المرور الحالية',
        showNewAria: 'إظهار كلمة المرور الجديدة',
        showConfirmAria: 'إظهار تأكيد كلمة المرور',
      },
    },

    selfDashboard: {
      welcome: 'مرحباً، {{name}}',
      chooseBelow: 'اختر خياراً أدناه',
      todayScheduleTitle: 'جدول اليوم',
      cards: {
        transcriptDesc: 'عرض الامتحانات والأداء',
        attendanceDesc: 'عرض سجلات الحضور',
        timetableDesc: 'عرض جدولك الأسبوعي',
        libraryDesc: 'تصفح محتوى المكتبة',
        profileDesc: 'عرض ملفك الشخصي',
      },
      attendance: {
        overview: 'نظرة عامة على الحضور المسجل',
      },
      timetable: {
        classesPerDay: 'عدد الحصص لكل يوم',
      },
      transcript: {
        subtitle: 'نظرة عامة على أدائك',
        avgByLevel: 'المتوسط حسب المرحلة',
        notEnoughData: 'لا توجد بيانات كافية بعد.',
        levelsDistribution: 'توزيع المراحل',
        levelsDistributionNote: 'التوزيع عبر المراحل للفترة المحددة.',
      },
    },

    searchPlaceholder: 'ابحث بالاسم أو الرقم…',
    addNew: 'إضافة طالب جديد',
    add: 'إضافة طالب',
    editTitle: 'تعديل الطالب',
    addTitle: 'إضافة طالب جديد',
    loadingFullDetails: 'جارٍ تحميل التفاصيل الكاملة…',
    resetFilters: 'إعادة ضبط الفلاتر',
    cohortOptional: 'المجموعة (اختياري)',

    enrollmentStatus: {
      open: 'مفتوح',
      active: 'نشط',
      inactive: 'غير نشط',
      promoted: 'مُرقّى',
      graduated: 'متخرج',
      transferred: 'محول',
      withdrawn: 'منسحب',
      all: 'الكل',
    },

    filters: {
      photo: {
        label: 'صورة الطالب (اختياري)',
        hint: 'JPG أو PNG أو WEBP حتى 2MB',
        clear: 'مسح',
        selected: 'تم اختيار: {{name}}',
        invalidType: 'نوع الصورة غير صالح. يُسمح فقط بـ JPG أو PNG أو WEBP.',
        tooLarge: 'حجم الصورة كبير جدًا. الحد الأقصى 2MB.',
      },
      academicYear: 'السنة الدراسية',
      grade: 'الصف',
      shift: 'الوردية',
      section: 'الشعبة',
      status: 'الحالة',
      all: 'الكل',
      active: 'نشط',
      inactive: 'غير نشط',
      searchAcademicYears: 'ابحث عن السنوات الدراسية…',
      searchSections: 'اكتب للبحث عن الشعب…',
    },

    table: {
      loading: 'جارٍ تحميل الطلاب…',
      emptyTitle: 'لم يتم العثور على طلاب',
      emptyDescription: 'حاول تعديل الفلاتر أو إضافة طالب جديد.',
      emptyAction: 'إضافة طالب',
      columns: {
        studentId: 'رقم الطالب',
        fullName: 'الاسم الكامل',
        gender: 'الجنس',
        grade: 'الصف',
        section: 'الشعبة',
        academicYear: 'السنة الدراسية',
        shift: 'الوردية',
        status: 'الحالة',
        contact: 'رقم التواصل',
        actions: 'الإجراءات',
      },
      actionTitles: {
        viewProfile: 'عرض الملف',
        editStudent: 'تعديل الطالب',
        deactivateStudent: 'تعطيل الطالب',
        reactivateStudent: 'إعادة تفعيل الطالب',
        resetPasswordDefault: 'إعادة تعيين كلمة المرور إلى الافتراضية (يمسح قفل/تبريد 24 ساعة)',
      },
      actions: {
        resetPassword: 'إعادة تعيين كلمة المرور',
        view: 'عرض',
        edit: 'تعديل',
        deactivate: 'تعطيل',
        reactivate: 'إعادة التفعيل',
      },
      confirms: {
        resetPassword: 'هل تريد إعادة تعيين كلمة مرور هذا الطالب إلى الافتراضية ومسح قفل/تبريد 24 ساعة؟',
        deactivate: 'هل أنت متأكد أنك تريد تعطيل هذا الطالب؟',
      },
      toasts: {
        updated: 'تم تحديث الطالب',
        created: 'تم إنشاء الطالب',
        createdWithName: 'تم حفظ الطالب: {{name}}',
        deactivated: 'تم تعطيل الطالب',
        reactivated: 'تم إعادة تفعيل الطالب',
        passwordReset: 'تمت إعادة تعيين كلمة المرور إلى الافتراضية. يجب على الطالب تغييرها بعد تسجيل الدخول.',
      },
      errors: {
        conflictUpdate: 'تعارض عند تحديث الطالب',
        conflictCreate: 'تعارض عند إنشاء الطالب',
        resetFailed: 'فشل إعادة تعيين كلمة المرور',
        updateFailed: 'فشل التحديث',
        createFailed: 'حدث خطأ أثناء إنشاء الطالب',
        createFailedWithName: 'فشل حفظ الطالب: {{name}}',
        network: 'خطأ في الشبكة',
        loadDetailsFailed: 'فشل تحميل تفاصيل الطالب الكاملة',
        loadDetailsError: 'حدث خطأ أثناء تحميل تفاصيل الطالب',
      },
      permissions: {
        noAdd: 'ليس لديك صلاحية لإضافة الطلاب',
        noEdit: 'ليس لديك صلاحية لتعديل الطلاب',
        noExport: 'ليس لديك صلاحية للتصدير/الطباعة للطلاب',
      },
    },

    export: {
      filename: 'students.pdf',
      sheetName: 'الطلاب',
      sectionPrefix: 'شعبة',
      labels: {
        academicYear: 'السنة الدراسية',
        grade: 'الصف',
        shift: 'الوردية',
        section: 'الشعبة',
        status: 'الحالة',
        cohort: 'المجموعة',
      },
      selected: 'محدد',
    },

    form: {
      sections: {
        personal: 'البيانات الشخصية',
        academic: 'إدارة أكاديمية',
        academicEditNote: 'يتم إدارة التسجيل الأكاديمي من لوحة معلومات الطالب.',
        contacts: 'التواصل',
        residence: 'السكن',
        transfer: 'التحويل',
        medical: 'الطبّي',
        idDocument: 'وثيقة الهوية',
        notes: 'ملاحظات',
      },
      fullName: 'الاسم الكامل',
      motherName: 'اسم الأم',
      gender: 'الجنس',
      male: 'ذكر',
      female: 'أنثى',
      dob: 'تاريخ الميلاد',
      birthPlace: 'مكان الميلاد',
      guardianName: 'اسم ولي الأمر/الوصي',
      guardianRelationship: 'صلة ولي الأمر',
      relationships: {
        father: 'الأب',
        mother: 'الأم',
        guardian: 'الوصي',
        other: 'أخرى',
      },
      contactNumber: 'رقم التواصل',
      contactNumberPlaceholder: 'مثال: +252 61XXXXXXX أو 061XXXXXXX',
      guardianPhone1: 'هاتف ولي الأمر (أساسي)',
      guardianPhone1Placeholder: 'مثال: +252 61XXXXXXX أو 061XXXXXXX',
      guardianPhone2: 'هاتف ولي الأمر (ثانوي)',
      guardianPhone2Placeholder: 'اختياري',
      guardianEmail: 'بريد ولي الأمر',
      guardianEmailPlaceholder: 'اختياري',
      studentPhone: 'هاتف الطالب',
      studentPhonePlaceholder: 'اختياري',
      studentEmail: 'بريد الطالب',
      studentEmailPlaceholder: 'اختياري',
      admissionDate: 'تاريخ القبول',
      address: 'العنوان',
      transfer: {
        isTransfer: 'طالب محوّل',
        previousSchoolName: 'اسم المدرسة السابقة',
        previousSchoolNamePlaceholder: 'مطلوب عند تفعيل التحويل',
        transferReason: 'سبب التحويل',
        transferReasonPlaceholder: 'اختياري',
      },
      notes: 'ملاحظات',
      notesPlaceholder: 'ملاحظات اختيارية…',
      medical: {
        allergies: 'الحساسية',
        allergiesPlaceholder: 'اختياري',
        medicalConditions: 'الحالات الطبية',
        medicalConditionsPlaceholder: 'اختياري',
        disabilityFlags: 'علامات الإعاقة',
        disabilityFlagsPlaceholder: 'مفصولة بفواصل (اختياري)',
        bloodGroup: 'فصيلة الدم',
        bloodGroupNone: 'لا يوجد',
      },
      idDocument: {
        idType: 'نوع الهوية',
        idTypeNone: 'لا يوجد',
        idNumber: 'رقم الهوية',
        idNumberPlaceholder: 'اختياري',
        issuedBy: 'الجهة المصدِرة',
        issuedByPlaceholder: 'اختياري',
        expiresAt: 'تاريخ الانتهاء',
        types: {
          nationalId: 'هوية وطنية',
          passport: 'جواز سفر',
          birthCertificate: 'شهادة ميلاد',
          other: 'أخرى',
        },
      },
      academicYear: 'السنة الدراسية',
      cohort: 'المجموعة',
      grade: 'الصف',
      shift: 'الوردية',
      enrollSection: 'التسجيل في الشعبة',
      selectAcademicYear: '-- اختر السنة الدراسية --',
      selectCohort: '-- اختر المجموعة --',
      selectGrade: '-- اختر الصف --',
      selectShift: '-- اختر الوردية --',
      selectSection: '-- اختر الشعبة --',
      loadingSections: 'جارٍ تحميل الشعب…',
      cancel: 'إلغاء',
      saveStudent: 'حفظ الطالب',
      updateStudent: 'تحديث الطالب',
      saving: 'جارٍ الحفظ…',
      updating: 'جارٍ التحديث…',
      validations: {
        fullNameRequired: 'الاسم الكامل للطالب مطلوب',
        fullNameFourNames: 'يجب أن يحتوي الاسم الكامل على 4 أسماء (4 كلمات)',
        academicYearRequired: 'السنة الدراسية مطلوبة',
        cohortRequired: 'المجموعة مطلوبة',
        gradeRequired: 'الصف مطلوب',
        shiftRequired: 'الوردية مطلوبة',
        sectionRequired: 'الشعبة مطلوبة',
        dobRequired: 'تاريخ الميلاد مطلوب',
        motherNameRequired: 'اسم الأم مطلوب',
        motherNameFourNames: 'يجب أن يحتوي اسم الأم على 4 أسماء (4 كلمات)',
        birthPlaceRequired: 'مكان الميلاد مطلوب',
        guardianNameRequired: 'اسم ولي الأمر/الوصي مطلوب',
        guardianNameFourNames: 'يجب أن يحتوي اسم ولي الأمر/الوصي على 4 أسماء (4 كلمات)',
        guardianRelationshipRequired: 'صلة ولي الأمر مطلوبة',
        neighborhoodRequired: 'الحي مطلوب',
        regionRequired: 'المنطقة/الإقليم مطلوب',
        districtRequired: 'المديرية/المقاطعة مطلوبة',
        contactRequired: 'رقم التواصل مطلوب',
        contactInvalid: 'رقم هاتف صومالي غير صالح',
        guardianPhone1Required: 'هاتف ولي الأمر مطلوب',
        guardianPhone1Invalid: 'رقم هاتف صومالي غير صالح',
        guardianPhone2Invalid: 'رقم هاتف ولي الأمر (ثانوي) غير صالح',
        studentPhoneInvalid: 'رقم هاتف الطالب غير صالح',
        phoneInvalidHint: 'يجب أن يكون الهاتف صومالياً: 9 أرقام ويبدأ بـ 61/62/68 أو 7x (يدعم +252 أو 252 أو بادئة 0).',
        phoneTooLong: 'رقم الهاتف طويل جداً. يجب أن يكون 9 أرقام (الرقم الوطني).',
        phoneTooShort: 'رقم الهاتف قصير جداً. يجب أن يكون 9 أرقام (الرقم الوطني).',
        previousSchoolNameRequired: 'اسم المدرسة السابقة مطلوب للطلاب المحولين',
      },
      info: {
        noSections: 'لم يتم العثور على شعب. عدّل الفلاتر.',
      },
    },

    address: {
      nationality: {
        label: 'الجنسية',
        somali: 'صومالي',
        notSomali: 'غير صومالي',
      },
      region: {
        label: 'الإقليم',
        placeholder: 'اختر الإقليم',
      },
      district: {
        label: 'المديرية',
        placeholder: 'اختر المديرية',
      },
      neighborhood: {
        label: 'الحي',
        placeholder: 'مثال: الحي / المنطقة',
      },
    },
  },

  teachers: {
    searchPlaceholder: 'ابحث عن المعلمين…',
    addNew: 'إضافة معلم جديد',
    addTitle: 'إضافة معلم',
    editTitle: 'تعديل المعلم',
    resetFilters: 'إعادة ضبط الفلاتر',

    profile: {
      backToTeachers: 'العودة إلى المعلمين',
      role: 'الدور',
      loading: 'جارٍ تحميل ملف المعلم…',
      loadFailed: 'فشل تحميل ملف المعلم',
      audit: {
        title: 'سجل التدقيق',
        subtitle: 'آخر الإجراءات المسجلة لهذا الحساب',
        loadFailed: 'فشل تحميل سجل التدقيق',
        emptyTitle: 'لا يوجد سجل تدقيق.',
        emptyDescription: 'لم يتم تسجيل أي إجراءات بعد.',
      },
    },

    dashboard: {
      home: {
        welcome: 'مرحباً',
        welcomeWithName: 'مرحباً، {{name}}',
        summaryLine: 'اختر ما تريد القيام به أدناه.',
        cards: {
          myClasses: {
            title: 'صفوفي',
            description: 'عرض الصفوف المكلّف بها والقوائم النشطة',
          },
          timetable: {
            title: 'الجدول',
            description: 'عرض جدولك وجداول الصفوف',
          },
          attendance: {
            title: 'الحضور',
            description: 'تسجيل ومراجعة حضور صفوفك',
          },
          attendanceReports: {
            title: 'تقارير الحضور',
            description: 'تقارير ملخصة حسب المدى الزمني',
          },
          exam: {
            title: 'الامتحان',
            description: 'إدخال الدرجات ومراجعة النتائج',
          },
          profile: {
            title: 'الملف الشخصي',
            description: 'تفاصيل الحساب وتغيير كلمة المرور',
          },
          announcements: {
            title: 'الإعلانات',
            description: 'إعلانات المدرسة والتحديثات',
          },
        },
      },

      common: {
        filters: 'الفلاتر',
        sectionPrefix: 'ش',
        section: 'الشعبة',
        subject: 'المادة',
        selectSection: 'اختر الشعبة',
        selectSubject: 'اختر المادة',
        selectSectionFirst: 'اختر الشعبة أولاً',
        downloadFailed: 'فشل التنزيل. حاول مرة أخرى.',
        liveTeacherScoped: 'بيانات مباشرة (خاصة بالمعلم)',
        downloadPng: 'PNG',
        downloadPdf: 'PDF',
        teachersOnly: 'هذه البطاقة متاحة للمعلمين فقط.',
        noTeacherRef: 'لا يوجد teacherRef في حسابك.',
        kpis: 'مؤشرات الأداء',
      },

      profile: {
        title: 'ملفي',
        subtitle: 'معلومات الحساب السريعة',
        teacherFallback: 'معلم',
        roleFallback: 'معلم',
        fields: {
          username: 'اسم المستخدم',
          teacherRef: 'مرجع المعلم',
          email: 'البريد الإلكتروني',
          phone: 'الهاتف',
        },
        stats: {
          classes: 'الصفوف',
          subjects: 'المواد',
          today: 'اليوم',
          week: 'الأسبوع',
        },
        tip: 'نصيحة: إذا كانت حقول الملف ناقصة، اطلب من الإدارة تحديث سجل المعلم.',
      },

      classes: {
        sectionPrefix: 'ش',
        classFallback: 'صف',
        countFailed: 'فشل',
        rosterLoadFailed: 'فشل تحميل القائمة',
        title: 'صفوفي',
        subtitle: 'عرض الطلاب النشطين للصفوف المكلّف بها.',
        loading: 'جارٍ تحميل الصفوف…',
        loadFailed: 'فشل تحميل الصفوف',
        empty: 'لا توجد صفوف مكلّف بها.',
        checkingStudents: 'جارٍ التحقق من الطلاب…',
        studentsUnavailable: 'الطلاب غير متاحين',
        activeStudentsCount: '{{count}} طلاب نشطون',
        noActiveStudents: 'لا يوجد طلاب نشطون',
        tapToViewStudents: 'اضغط لعرض الطلاب',
        studentsCardTitle: 'الطلاب',
        viewStudents: 'عرض الطلاب',
        activeRoster: 'قائمة نشطة',
        loadingRoster: 'جارٍ تحميل القائمة…',
        noActiveStudentsFound: 'لم يتم العثور على طلاب نشطين.',
        rosterTable: {
          studentId: 'معرف الطالب',
          fullName: 'الاسم الكامل',
          gender: 'الجنس',
        },
      },

      timetable: {
        sectionPrefix: 'ش',
        fetchingToday: 'جارٍ جلب جدول اليوم…',
        missingTeacherRef: 'حساب المعلم يفتقد teacherRef.',
        noClassesToday: 'لا توجد حصص مجدولة لليوم.',
        classFallback: 'صف',
        todayTitle: 'جدول اليوم',
        assignedClassesTitle: 'صفوفي المكلّف بها',
        sectionFallback: 'الشعبة',
        table: {
          day: 'اليوم',
        },
        loadingSlots: 'جارٍ تحميل الحصص…',
        selectClass: 'اختر صفاً لعرض الجدول.',
        noSlotsForClass: 'لم يتم العثور على حصص في الجدول لهذا الصف.',
      },

      attendance: {
        title: 'الحضور',
        assignmentsLoadFailed: 'فشل تحميل تكليفات المعلم.',
        reportLoadFailed: 'فشل تحميل تقرير الحضور.',
        status: {
          present: 'حاضر',
          absent: 'غائب',
          late: 'متأخر',
          excused: 'بعذر',
          sick: 'مريض',
          medical: 'طبي',
          family: 'عائلي',
          other: 'أخرى',
        },
        views: {
          statusTrend: 'اتجاه الحالة',
          byPeriods: 'حسب الحصص',
          performance: 'الأداء',
        },
        maxRange: 'أقصى مدة: 31 يوماً',
        range: {
          title: 'المدى',
          today: 'اليوم',
          last7: 'آخر 7',
          custom: 'مخصص',
        },
        dates: 'التواريخ',
        loadingTimetablePeriods: 'جارٍ تحميل فترات الجدول…',
        noPeriodsForSubject: 'لا توجد فترات في الجدول لهذه المادة.',
        kpis: {
          allDayPct: 'نسبة اليوم الكامل%',
          perPeriodPct: 'نسبة لكل حصة%',
          roster: 'القائمة',
          attendancePct: 'نسبة الحضور',
        },
        loading: 'جارٍ تحميل الحضور…',
        selectFilters: 'اختر الشعبة + المادة + المدى الزمني لعرض المخططات.',
        noData: 'لا توجد بيانات حضور للفلاتر المحددة.',
        performance: {
          title: 'أداء الحضور',
          subtitle: 'تفصيل النسب (يفضل اليوم الكامل لكل تاريخ)',
          markedDays: 'أيام مُسجّلة',
          markedDaysNote: 'صف واحد لكل تاريخ (يوم وإلا حصة)',
          rosterNote: 'من بيانات التقرير',
          statusPercentages: 'نِسب الحالات',
          totalRecords: 'إجمالي السجلات: {{count}}',
        },
        statusTrend: {
          title: 'اتجاه حالات الحضور',
          subtitle: 'اليوم الكامل (DAY) و لكل حصة (LESSON)',
          dailyTrend: 'الاتجاه اليومي',
          dailyTrendNote: 'سطر لكل تاريخ (يفضل اليوم الكامل)',
          noTrendRows: 'لم يتم العثور على صفوف للاتجاه.',
          noTimetablePeriodsNote: 'ملاحظة: لم يتم العثور على فترات جدول لهذه المادة؛ قد تكون صفوف الحصص مفقودة.',
        },
        badges: {
          allDay: 'طوال اليوم',
          period: 'حصة',
        },
        byPeriod: {
          title: 'الحضور حسب الحصة',
          subtitle: 'إجمالي الحضور',
          empty: 'لم يتم العثور على حصص دراسية في هذا المدى.',
        },
        source: 'المصدر: ملخص تقارير الحضور (خاص بالمعلم)',
      },

      results: {
        title: 'النتائج',
        assignmentsLoadFailed: 'فشل تحميل تكليفات المعلم.',
        summaryLoadFailed: 'فشل تحميل الملخص',
        performanceLoadFailed: 'فشل تحميل الأداء.',
        examFallback: 'امتحان',
        examType: 'نوع الامتحان',
        views: {
          distribution: 'التوزيع',
          topStudents: 'أفضل الطلاب',
          performance: 'الأداء',
        },
        modesNote: 'أوضاع المعلم: مادة / نوع الامتحان',
        filters: {
          academicYear: 'السنة الدراسية',
          selectYear: 'اختر السنة',
          mode: 'الوضع',
          selectYearFirst: 'اختر السنة أولاً',
          selectExamType: 'اختر نوع الامتحان',
        },
        kpis: {
          classAvg: 'متوسط الصف',
          passPct: 'نسبة النجاح',
          topBottom: 'الأعلى/الأدنى',
        },
        loadingPerformance: 'جارٍ تحميل الأداء…',
        loading: 'جارٍ تحميل النتائج…',
        selectFilters: 'اختر السنة الدراسية + الشعبة + (المادة/نوع الامتحان) لعرض المخططات.',
        noPerformanceData: 'لا توجد بيانات أداء للفلاتر المحددة.',
        noMarks: 'لا توجد درجات امتحان للفلاتر المحددة.',
        performance: {
          title: 'أداء نوع الامتحان',
          subjectMode: 'مادة',
          overallMode: 'إجمالي',
          template: 'نموذج',
          help: 'الأعمدة العمودية = أنواع الامتحان • المحور الأيسر = النسبة (المتوسط / الدرجة القصوى)',
          avg: 'متوسط',
          tip: 'نصيحة: غيّر الوضع إلى "مادة" لرؤية أداء مادة واحدة؛ وإلا يستخدم "إجمالي".',
        },
        distribution: {
          title: 'توزيع الدرجات',
          subtitle: 'عدد الطلاب لكل نطاق',
          kpiIdea: 'فكرة KPI:',
        },
        top: {
          title: 'أفضل الطلاب',
          subtitle: 'حسب المتوسط',
          studentFallback: 'طالب',
        },
        studentFallback: 'طالب',
        source: 'المصدر: ملخص الامتحانات (خاص بالمعلم)',
        modesFooter: 'الأوضاع:',
      },
    },

    filters: {
      status: 'الحالة',
      all: 'الكل',
      active: 'نشط',
      inactive: 'غير نشط',
    },

    sort: {
      name: 'الاسم',
      id: 'المعرف',
      created: 'تاريخ الإنشاء',
    },

    table: {
      loading: 'جارٍ تحميل المعلمين…',
      emptyTitle: 'لا يوجد معلمون.',
      emptyDescription: 'حاول تعديل البحث أو إضافة معلم جديد.',
      columns: {
        name: 'الاسم',
        teacherId: 'معرف المعلم',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        salary: 'الراتب',
        createdAt: 'تم الإنشاء',
        status: 'الحالة',
        actions: 'الإجراءات',
      },
      actions: {
        view: 'عرض',
        edit: 'تعديل',
        assignments: 'التكليفات',
        resetPassword: 'إعادة تعيين كلمة المرور',
        deactivate: 'تعطيل',
        reactivate: 'إعادة التفعيل',
      },
      actionTitles: {
        viewProfile: 'عرض ملف المعلم وسجل التدقيق',
        editTeacher: 'تعديل المعلم',
        deactivateTeacher: 'تعطيل المعلم',
        reactivateTeacher: 'إعادة تفعيل المعلم',
        resetPasswordDefault: 'إعادة تعيين كلمة المرور إلى الافتراضية (يمسح قفل/تبريد 24 ساعة)',
      },
      confirms: {
        toggle: '{{verb}} هذا المعلم؟',
        resetPassword: 'هل تريد إعادة تعيين كلمة مرور هذا المعلم إلى الافتراضية ومسح قفل/تبريد 24 ساعة؟',
      },
      toasts: {
        created: 'تم إنشاء المعلم',
        createdWithName: 'تم حفظ المعلم: {{name}}',
        updated: 'تم تحديث المعلم',
        deactivated: 'تم تعطيل المعلم',
        reactivated: 'تم إعادة تفعيل المعلم',
        passwordReset: 'تمت إعادة تعيين كلمة المرور إلى الافتراضية. يجب على المعلم تغييرها بعد تسجيل الدخول.',
        photoUploaded: 'تم رفع الصورة',
      },
      errors: {
        saveFailed: 'فشل الحفظ',
        updateFailed: 'فشل التحديث',
        resetFailed: 'فشل إعادة التعيين',
        loadFailed: 'فشل تحميل المعلمين',
        photoUploadFailed: 'فشل رفع الصورة',
      },
      permissions: {
        noAdd: 'ليس لديك صلاحية لإضافة المعلمين',
        noEdit: 'ليس لديك صلاحية لتعديل المعلمين',
        noAssign: 'ليس لديك صلاحية لتعيين المعلمين',
        noDeactivate: 'ليس لديك صلاحية لتعطيل المعلمين',
        noReactivate: 'ليس لديك صلاحية لإعادة تفعيل المعلمين',
        noResetPw: 'ليس لديك صلاحية لإعادة تعيين كلمات المرور',
        noExport: 'ليس لديك صلاحية للتصدير/الطباعة للمعلمين',
      },
    },

    export: {
      filename: 'teachers.pdf',
      sheetName: 'المعلمون',
      labels: {
        search: 'بحث',
        status: 'الحالة',
      },
    },

    form: {
      sections: {
        personal: 'شخصي',
        contact: 'تواصل',
        address: 'العنوان',
        employment: 'الوظيفة',
        professional: 'مهني',
        notes: 'ملاحظات',
      },
      fullName: 'الاسم الكامل',
      gender: 'الجنس',
      genderOptions: {
        male: 'ذكر',
        female: 'أنثى',
      },
      dob: 'تاريخ الميلاد',
      nationality: 'الجنسية',
      nationalityDetail: 'الجنسية (تفاصيل)',
      nationalityDetailPlaceholder: 'مثال: كينيا',
      teacherId: 'اسم المستخدم',
      employeeId: 'رقم الموظف',
      employeeIdAuto: 'يُنشأ تلقائياً',
      teacherIdPlaceholder: 'مثال: ID01',
      teacherIdHelp: 'يمكن للمعلم تسجيل الدخول باستخدام اسم المستخدم هذا أو البريد الإلكتروني.',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      primaryPhone: 'الهاتف الأساسي',
      secondaryPhone: 'الهاتف الثانوي',
      primaryPhonePlaceholder: 'مثال: +252 61XXXXXXX أو 61XXXXXXX أو 077XXXXXXX',
      secondaryPhonePlaceholder: 'اختياري',
      legacyAddress: 'العنوان (اختياري)',
      hireDate: 'تاريخ التعيين',
      employmentType: 'نوع التوظيف',
      employmentTypeOptions: {
        fullTime: 'دوام كامل',
        partTime: 'دوام جزئي',
        contract: 'عقد',
      },
      salary: 'الراتب',
      status: 'الحالة',
      active: 'نشط',
      inactive: 'غير نشط',

      specialization: 'التخصص',
      qualification: 'المؤهل',
      qualificationOptions: {
        certificate: 'شهادة',
        diploma: 'دبلوم',
        bachelor: 'بكالوريوس',
        master: 'ماجستير',
        phd: 'دكتوراه',
        other: 'أخرى',
      },
      qualificationOtherLabel: 'المؤهل (أخرى)',
      qualificationOtherPlaceholder: 'اكتب المؤهل…',
      yearsOfExperience: 'سنوات الخبرة',
      notesPlaceholder: 'ملاحظات اختيارية عن هذا المعلم…',

      validations: {
        fullNameFourNames: 'يجب أن يتكون الاسم الكامل من 4 أسماء بالضبط.',
        genderRequired: 'الجنس مطلوب.',
        dobRequired: 'تاريخ الميلاد مطلوب.',
        nationalityRequired: 'الجنسية مطلوبة.',
        emailRequired: 'البريد الإلكتروني مطلوب.',
        emailInvalid: 'البريد الإلكتروني غير صالح.',
        phoneRequired: 'الهاتف الأساسي مطلوب.',
        phoneInvalid: 'الهاتف الأساسي غير صالح (رقم صومالي).',
        phoneTooShort: 'رقم الهاتف قصير جداً. يجب أن يكون 9 أرقام (الرقم الوطني).',
        phoneTooLong: 'رقم الهاتف طويل جداً.',
        phoneInvalidHint: 'يجب أن يكون الهاتف صومالياً: 9 أرقام ويبدأ بـ 61/62/68 أو 7x (يدعم +252 أو 252 أو بادئة 0).',
        phone2Invalid: 'الهاتف الثانوي غير صالح (رقم صومالي).',
        qualificationOtherRequired: 'يرجى كتابة المؤهل.',
      },

      photo: {
        label: 'الصورة (اختياري)',
        alt: 'صورة المعلم',
        hint: 'JPEG/PNG/WEBP • بحد أقصى 2MB',
        invalidType: 'نوع الصورة غير صالح. المسموح: JPEG, PNG, WEBP.',
        tooLarge: 'حجم الصورة كبير جداً (الحد الأقصى 2MB).',
        selected: 'تم اختيار: {{name}}',
        clear: 'إزالة',
      },
      cancel: 'إلغاء',
      save: 'حفظ',
      update: 'تحديث',
      saving: 'جارٍ الحفظ…',
      updating: 'جارٍ التحديث…',
    },

    assignments: {
      title: 'التكليفات • {{name}}',
      loading: 'جارٍ تحميل التكليفات…',
      errorLoadAssignments: 'فشل تحميل التكليفات',
      errorLoadSectionsSubjects: 'فشل تحميل الشعب/المواد',
      errorLoadData: 'فشل تحميل البيانات',
      selectLevel: 'اختر المستوى…',
      selectShift: 'اختر الوردية…',
      selectSection: 'اختر الشعبة…',
      selectSubject: 'اختر المادة…',
      add: 'إضافة تكليف',
      added: 'تمت إضافة التكليف',
      addFailed: 'فشل إضافة التكليف',
      removeFailed: 'فشل إزالة التكليف',
      confirmRemove: 'إزالة هذا التكليف؟',
      none: 'لا توجد تكليفات.',
      columns: {
        level: 'المستوى',
        shift: 'الوردية',
        section: 'الشعبة',
        subject: 'المادة',
      },
      remove: 'إزالة',
    },
  },

  users: {
    searchPlaceholder: 'ابحث بالاسم أو اسم المستخدم…',
    addUser: 'إضافة مستخدم',
    editTitle: 'تعديل المستخدم',
    createTitle: 'إنشاء مستخدم',
    resetFilters: 'إعادة ضبط',

    filters: {
      role: 'الدور',
      status: 'الحالة',
      allRoles: 'كل الأدوار',
      allStatus: 'كل الحالات',
      admin: 'مدير',
      staff: 'موظف',
      active: 'نشط',
      inactive: 'غير نشط',
    },

    table: {
      loading: 'جارٍ تحميل المستخدمين…',
      emptyTitle: 'لم يتم العثور على مستخدمين',
      emptyDescription: 'حاول تعديل الفلاتر أو إضافة مستخدم جديد.',
      columns: {
        fullName: 'الاسم الكامل',
        username: 'اسم المستخدم',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        salary: 'الراتب',
        role: 'الدور',
        status: 'الحالة',
        actions: 'الإجراءات',
      },
      actions: {
        view: 'عرض',
        edit: 'تعديل',
        deactivate: 'تعطيل',
        activate: 'تفعيل',
        unlock: 'فك القفل',
      },
      actionTitles: {
        view: 'عرض المستخدم',
        edit: 'تعديل المستخدم',
        deactivate: 'تعطيل المستخدم',
        activate: 'تفعيل المستخدم',
        unlock: 'فك قفل تسجيل الدخول (مسح الحظر)',
      },
    },

    export: {
      filename: 'users.pdf',
      sheetName: 'المستخدمون',
      labels: {
        search: 'بحث',
        role: 'الدور',
        status: 'الحالة',
      },
    },

    form: {
      sections: {
        personal: 'البيانات الشخصية',
        contact: 'معلومات الاتصال',
        address: 'العنوان',
        photo: 'الصورة (اختياري)',
        permissions: 'الصلاحيات',
      },
      fields: {
        fullName: 'الاسم الكامل',
        username: 'اسم المستخدم',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        salary: 'الراتب',
        photo: 'الصورة',
        staffCode: 'رمز الموظف',
        unit: 'القسم',
        jobTitle: 'المسمى الوظيفي',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور',
      },
      photoHint: 'JPG/PNG/WEBP، بحد أقصى 2MB',
      primaryPhone: 'الهاتف الأساسي',
      secondaryPhone: 'الهاتف الثانوي',
      primaryPhonePlaceholder: 'مثال: +252 61XXXXXXX، 61',
      secondaryPhonePlaceholder: 'اختياري',
      nationalityDetail: 'الجنسية (تفاصيل)',
      nationalityDetailPlaceholder: 'أدخل الجنسية',
      newPasswordOptional: 'كلمة مرور جديدة (اختياري)',
      loadingDetails: 'جارٍ تحميل تفاصيل المستخدم…',
      passwordsNoMatch: 'كلمتا المرور غير متطابقتين',
      role: 'الدور',
      staff: 'موظف',
      admin: 'مدير',
      selectModuleGroup: 'اختر مجموعة الوحدات',
      chooseModuleGroup: '-- اختر مجموعة --',
      selectModule: 'اختر الوحدة',
      chooseModule: '-- اختر وحدة --',
      permissionsFor: 'الصلاحيات لـ {{module}}',
      save: 'حفظ',
      update: 'تحديث',
      saving: 'جارٍ الحفظ...',
      updating: 'جارٍ التحديث...',
      validations: {
        passwordRequiredNew: 'كلمة المرور مطلوبة للمستخدمين الجدد',
        passwordMin: 'يجب ألا تقل كلمة المرور عن 6 أحرف',
        passwordTooShort: 'يجب ألا تقل كلمة المرور عن 6 أحرف',
        emailInvalid: 'عنوان البريد الإلكتروني غير صالح',
        fullNameFourNames: 'يجب أن يحتوي الاسم الكامل على 4 أسماء على الأقل',
        usernameLength: 'يجب أن يكون اسم المستخدم من 4 إلى 6 أحرف',
        usernameExists: 'اسم المستخدم موجود بالفعل',
        phoneInvalid: 'أدخل رقم هاتف صالح',
        phone2Invalid: 'أدخل رقم الهاتف الثانوي بشكل صحيح',
        phoneTooShort: 'رقم الهاتف قصير جدًا',
        phoneTooLong: 'رقم الهاتف طويل جدًا',
        phoneInvalidHint: 'أرقام الصومال غالبًا تبدأ بـ 61/62/68 أو 7x',
        nationalityRequired: 'الجنسية مطلوبة عندما يكون غير صومالي',
      },
    },

    staff: {
      units: {
        finance: 'المالية',
        users: 'المستخدمون',
        academics: 'الأكاديميات',
        exams: 'الامتحانات',
        operations: 'العمليات',
        announcements: 'الإعلانات',
        security: 'الأمان',
        other: 'أخرى',
        multiple: 'متعدد',
      },
    },

    profile: {
      failedLoad: 'فشل تحميل الملف',
      loadingDetails: 'جارٍ تحميل تفاصيل المستخدم…',
      couldNotLoad: 'تعذر تحميل ملف المستخدم.',
      backToUsers: 'العودة إلى المستخدمين',
      rolePrefix: 'الدور: {{role}}',
      auditSubtitle: 'أحدث الإجراءات المسجلة لهذا الحساب',
      tip: 'نصيحة: إذا كانت بعض الحقول ناقصة، اطلب من المسؤول تحديث بيانات هذا المستخدم.',
      roleFallback: 'موظف',
      sections: {
        staff: 'بيانات الموظف',
        staffSubtitle: 'تفاصيل العمل والصلاحيات',
        staffSubtitleDetails: 'تفاصيل العمل',
        permissionsSubtitle: 'مجموعات الوحدات والوحدات والصلاحيات الممنوحة',
      },
      labels: {
        fullName: 'الاسم الكامل',
        username: 'اسم المستخدم',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        role: 'الدور',
        status: 'الحالة',
        createdAt: 'تاريخ الإنشاء',
        updatedAt: 'آخر تحديث',
        lastLogin: 'آخر تسجيل دخول',
      },
      never: 'أبدًا',
      auditHistory: 'سجل التدقيق',
      auditLoadFailed: 'فشل تحميل سجل التدقيق',
      auditEmptyTitle: 'لا يوجد سجل تدقيق.',
      auditEmptyDescription: 'لا توجد إجراءات مسجلة لهذا المستخدم بعد.',
    },

    toasts: {
      created: 'تم إنشاء المستخدم بنجاح',
      updated: 'تم تحديث المستخدم بنجاح',
      saveFailed: 'فشل حفظ المستخدم',
      statusUpdated: 'تم تحديث الحالة',
      statusUpdateFailed: 'فشل تحديث الحالة',
      lockoutReset: 'تمت إعادة ضبط حظر تسجيل الدخول بنجاح',
      lockoutResetFailed: 'فشل إعادة ضبط الحظر',
      updatedElsewhere: 'تم تحديث هذا المستخدم في تبويب آخر. أغلق/أعد الفتح للمزامنة.',
      loadDetailsFailed: 'فشل تحميل تفاصيل المستخدم',
      uniqueExists: 'اسم المستخدم أو البريد الإلكتروني أو الهاتف موجود بالفعل',
      phoneDigitsOnly: 'يجب أن يحتوي الهاتف على أرقام فقط',
      phoneMaxDigits: 'لا يمكن أن يتجاوز رقم الهاتف 9 أرقام',
    },

    confirms: {
      toggleStatus: '{{verb}} هذا المستخدم؟',
      resetLockout: 'إعادة ضبط حظر تسجيل الدخول لهذا المستخدم؟',
    },
  },

  exams: {
    settings: {
      actions: {
        saveTotal: 'حفظ الإجمالي',
        cloneToNewTemplate: 'نسخ إلى قالب جديد',
        setAsDefault: 'تعيين كافتراضي',
        deleteTemplate: 'حذف القالب',
      },
      states: {
        loadingTemplate: 'جارٍ تحميل القالب…',
        refreshing: 'جارٍ التحديث…',
      },
      hints: {
        selectTemplateToEdit: 'اختر قالباً للتعديل.',
        mustMatchToActivate: '(يجب أن يتطابق للتفعيل)',
        templateLockedHelp: 'هذا القالب يحتوي على درجات محفوظة وهو مقفل. لا يمكنك تعديل الإجمالي أو الأعمدة. يمكنك حذف الأعمدة التي لا تحتوي على درجات، أو استخدام “نسخ إلى قالب جديد”.',
      },
      labels: {
        declaredTotal: 'الإجمالي المعلن',
        templateWithVersion: 'القالب',
        defaultBadge: 'افتراضي',
        defaultSuffix: ' (افتراضي)',
        sumMax: 'مجموع الحد الأقصى',
        total: 'الإجمالي',
        hasScores: 'يحتوي على درجات',
      },
      placeholders: {
        template: 'القالب',
        newColumnName: 'اسم عمود جديد',
        max: 'الحد الأقصى',
      },
      table: {
        emptyTitle: 'لا توجد مكوّنات.',
        emptyDescription: 'أضف مكوّناً إلى هذا القالب.',
        columns: {
          name: 'الاسم',
          maxScore: 'الدرجة القصوى',
        },
      },
      confirms: {
        deleteColumn: 'حذف هذا العمود؟ لا يمكن التراجع عن ذلك.',
        deleteTemplateVersion: 'حذف القالب v{{version}}؟ لا يمكن التراجع عن ذلك.',
      },
      toasts: {
        clonedToVersion: 'تم النسخ إلى v{{version}}',
        defaultTemplateUpdated: 'تم تحديث القالب الافتراضي',
        deleted: 'تم الحذف',
        deletedTemplateVersion: 'تم حذف القالب v{{version}}',
      },
      errors: {
        loadTemplateVersionsFailed: 'فشل تحميل إصدارات القالب',
        loadTemplateFailed: 'فشل تحميل القالب',
        noPermissionEditTemplates: 'ليس لديك صلاحية لتعديل قوالب الامتحانات',
        templateLockedTotal: 'هذا القالب يحتوي على درجات وهو مقفل. لا يمكن تعديل الإجمالي.',
        templateLockedColumns: 'هذا القالب يحتوي على درجات وهو مقفل. لا يمكن تعديل الأعمدة.',
        totalMustBeGt0: 'يجب أن يكون الإجمالي أكبر من 0',
        saveTotalFailed: 'فشل حفظ الإجمالي',
        cloneFailed: 'فشل النسخ',
        activateFailed: 'فشل التفعيل',
        nameRequired: 'الاسم مطلوب',
        maxScoreMustBeGt0: 'يجب أن تكون الدرجة القصوى أكبر من 0',
        orderMustBeGt0: 'يجب أن يكون الترتيب أكبر من 0',
        sumMaxCannotExceedTotal: 'لا يمكن أن يتجاوز مجموع الدرجات القصوى الإجمالي المعلن',
        maxScoreExceedsTotal: 'الدرجة القصوى تتجاوز الإجمالي المعلن',
        orderMustBeUnique: 'يجب أن يكون الترتيب فريداً',
        saveFailed: 'فشل الحفظ',
        addFailed: 'فشل الإضافة',
        deleteFailed: 'فشل الحذف',
        deleteTemplateFailed: 'فشل حذف القالب',
        templateHasScoresCloneToAdd: 'هذا القالب يحتوي على درجات. انسخ قالباً جديداً لإضافة الأعمدة.',
        cannotDeleteColumnHasScores: 'لا يمكن الحذف: هذا العمود يحتوي على درجات محفوظة',
        cannotDeleteDefaultTemplate: 'لا يمكن حذف القالب الافتراضي (النشط)',
        cannotDeleteTemplateHasScores: 'لا يمكن الحذف: هذا القالب يحتوي على درجات محفوظة',
      },
    },

    management: {
      timeline: {
        title: 'الخط الزمني للدفعة',
        noData: 'لم يتم العثور على بيانات الخط الزمني لهذه الدفعة.',
        itemFallback: 'عنصر في الخط الزمني',
      },

      searchPlaceholders: {
        templates: 'ابحث عن القوالب…',
      },

      emptyStates: {
        selectFilters: 'اختر السنة الدراسية والصف والدوام والشعبة.',
        chooseSubject: 'اختر مادة لتحميل الشبكة.',
        loadingGrid: 'جارٍ تحميل الشبكة…',
        noStudents: 'لا يوجد طلاب أو بيانات لهذا الاختيار.',
      },

      locked: {
        teacherHelp: 'بعض الطلاب مقفلون لأن لديهم درجات محفوظة بالفعل ضمن قالب آخر.',
        adminHelp: 'بعض الطلاب مقفلون لأن لديهم درجات ضمن قالب آخر. استخدم قائمة القالب أعلاه للتبديل إلى الإصدار الموضح في رسالة الخطأ.',
        title: 'مقفل',
        titleWithVersions: 'مقفل ({{versions}})',
      },

      table: {
        student: 'الطالب',
        totalWithMax: 'الإجمالي ({{totalMax}})',
      },

      cell: {
        maxTitle: 'الحد الأقصى: {{max}}',
        saveFailed: 'فشل الحفظ',
        saved: 'تم الحفظ',
      },

      actions: {
        saveAllTitle: 'حفظ جميع الإدخالات المعلّقة',
      },

      import: {
        title: 'استيراد درجات الامتحان (Excel)',
        help: 'استخدم القالب الذي تم تنزيله. املأ الدرجات ثم ارفعه هنا.',
        labels: {
          mode: 'الوضع',
          file: 'ملف Excel',
        },
        actions: {
          downloadTemplate: 'تنزيل القالب',
          importExcel: 'استيراد Excel',
          validate: 'تحقق',
          import: 'استيراد',
        },
        modes: {
          merge: 'دمج (الخلايا المعبأة فقط)',
          skip: 'تخطي الدرجات الموجودة',
          overwrite: 'استبدال (الفراغ يحذف)',
        },
        toasts: {
          validated: 'تم التحقق بنجاح.',
          imported: 'تم الاستيراد بنجاح.',
        },
        summary: 'الطلاب: {{students}}، الأعمدة: {{columns}}، الإضافات/التحديث: {{upserts}}، الحذف: {{deletes}}',
        errors: {
          pickFile: 'يرجى اختيار ملف Excel.',
          validateFirst: 'يرجى التحقق من الملف أولاً.',
          mismatch: 'القالب لا يطابق الفلاتر الحالية.',
          selectFiltersFirst: 'يرجى اختيار الفلاتر وتحميل الشبكة أولاً.',
          noWorksheetFound: 'لم يتم العثور على ورقة عمل داخل ملف Excel.',
          missingStudentMongoIdCol: 'القالب يفتقد العمود المخفي لمعرّف الطالب (Mongo ID).',
          missingStudentIdCol: 'القالب يفتقد عمود معرّف الطالب.',
          missingStudentNameCol: 'القالب يفتقد عمود اسم الطالب.',
          noExamColumns: 'القالب لا يحتوي على أعمدة امتحان.',
        },

        serverMessages: {
          validated: 'تم التحقق',
          imported: 'تم الاستيراد',
        },

        serverErrors: {
          badRequest: 'طلب الاستيراد غير صالح.',
          invalidMode: 'وضع الاستيراد غير صالح.',
          missingRows: 'لم يتم العثور على صفوف للاستيراد.',
          validationFailed: 'فشل التحقق من الاستيراد.',
          invalidStudentId: 'معرّف الطالب غير صالح.',
          duplicateStudentRow: 'صف طالب مكرر.',
          studentNotInFilter: 'الطالب غير موجود ضمن فلاتر الصف/الحالة المحددة.',
          studentLocked: 'الطالب مقفل (توجد درجات ضمن قالب آخر).',
          studentNameMismatch: 'اسم الطالب غير مطابق.',
          studentCodeMismatch: 'رمز/معرّف الطالب غير مطابق.',
          unknownExamColumn: 'عمود امتحان غير معروف.',
          scoreNotNumber: 'يجب أن تكون الدرجة رقماً >= 0.',
          scoreTooHigh: 'يجب أن تكون الدرجة بين 0 و {{max}}.',
          missingStudents: 'ينقص {{count}} صفاً للطلاب من القالب.',
          extraStudents: 'القالب يحتوي على {{count}} صفاً غير متوقع للطلاب.',
          serverError: 'خطأ في الخادم.',
        },
      },

      toasts: {
        savedScoresSuccessfully: 'تم حفظ الدرجات بنجاح',
        updatedScoresSuccessfully: 'تم تحديث الدرجات بنجاح',
      },

      errors: {
        loadSectionSubjectsFailed: 'فشل تحميل مواد الشعبة',
        noPermissionInputScores: 'ليس لديك صلاحية لإدخال درجات الامتحان',
        anotherTemplate: 'قالب آخر',
        lockedStudent: 'هذا الطالب لديه درجات محفوظة بالفعل ضمن {{version}}. انتقل إلى ذلك القالب للتعديل.',
        saveFailed: 'فشل الحفظ',
        fixInvalidEntries: 'أصلح {{count}} إدخالات غير صالحة قبل الحفظ.',
        loadGridFailed: 'فشل تحميل الشبكة',
        lockedCount: 'لدى {{count}} طالب(ة) درجات محفوظة ضمن قالب آخر (مقفل).',
      },

      serverErrors: {
        missingIds: 'يجب توفير studentId و examId و subjectId.',
        invalidScore: 'يجب أن تكون الدرجة رقماً صالحاً >= 0.',
        examNotFound: 'لم يتم العثور على الامتحان.',
        teacherMissingRef: 'حساب المعلم يفتقد teacherRef.',
        notAssigned: 'غير مكلّف بهذا الصف/المادة.',
        lockedOtherTemplate: 'لدى هذا الطالب درجات محفوظة ضمن إصدار قالب آخر لهذه المادة. انتقل إلى ذلك الإصدار. ({{versions}})',
        scoreTooHigh: 'يجب أن تكون الدرجة بين 0 و {{max}}.',
        noEnrollment: 'لا يوجد قيد للطالب لهذه الشعبة/السنة.',
        duplicate: 'تركيبة درجة مكررة.',
        serverError: 'خطأ في الخادم.',
      },
    },
  },

  results: {
    page: {
      errors: {
        loadSubjectsFailed: 'فشل تحميل المواد',
        loadSummaryFailed: 'فشل تحميل الملخص',
        noPermissionPrint: 'ليست لديك صلاحية لطباعة النتائج',
      },

      toasts: {
        noMarksForSelection: 'لم يتم العثور على درجات للصف والفلاتر المحددة.',
      },

      export: {
        enrollment: 'القيد',
        sheetName: 'النتائج',
        title: 'النتائج والترتيب',
      },

      filters: {
        mode: 'الوضع',
        examType: 'نوع الامتحان',
        nLabel: 'العدد',
      },

      searchPlaceholders: {
        examTypes: 'ابحث عن أنواع الامتحان…',
      },

      timeline: {
        title: 'الخط الزمني للفوج:',
      },

      emptyStates: {
        selectFilters: 'اختر السنة الدراسية والصف والدوام والشعبة لعرض النتائج.',
        chooseSubject: 'اختر مادة لعرض النتائج.',
        chooseExamType: 'اختر نوع امتحان لعرض النتائج.',
        noResults: 'لا توجد نتائج للفلاتر المحددة.',
      },

      modes: {
        subject: 'مادة',
        overall: 'إجمالي',
        examType: 'نوع الامتحان',
        top: 'أعلى N',
        bottom: 'أدنى N',
        trend: 'الاتجاه (النصفي مقابل النهائي)',
        difficulty: 'صعوبة المادة',
      },

      table: {
        rank: 'الترتيب',
        student: 'الطالب',
        totalWithMax: 'المجموع ({{max}})',
        average: 'المعدل',
        midTerm: 'نصفي',
        final: 'نهائي',
        delta: 'الفرق',
        classAvgDelta: 'متوسط الفرق للصف',
        avg: 'المعدل',
        students: 'الطلاب',
        classAvgSubjects: 'متوسط الصف (مواد)',
        classAverage: 'متوسط الصف',
      },
    },
  },

  transcript: {
    page: {
      errors: {
        loadLookupsFailed: 'فشل تحميل القوائم',
        noPermissionPrint: 'ليست لديك صلاحية لطباعة كشف الدرجات',
      },

      toasts: {
        gradeNoTranscript: 'لا يوجد كشف درجات للصف {{grade}}.',
        nothingToExportYet: 'لا يوجد ما يمكن تصديره بعد. قم بتحميل كشف الدرجات أولاً.',
      },

      export: {
        sheetName: 'كشف الدرجات',
      },

      states: {
        loadingLastTranscript: 'جارٍ تحميل آخر كشف درجات…',
        loadingTranscriptsLevels: 'جارٍ تحميل كشوف الدرجات (المستويات)…',
        loadingFullTranscript: 'جارٍ تحميل كشف الدرجات الكامل…',
      },

      timeline: {
        title: 'الخط الزمني للفوج',
        noData: 'لا توجد بيانات للخط الزمني.',
        itemFallback: 'عنصر في الخط الزمني',
      },

      studentPicker: {
        searchLabel: 'بحث عن طالب',
        openClassListTitle: 'فتح قائمة الصف',
        selectFromClass: 'اختيار من الصف',
        filterListPlaceholder: 'تصفية القائمة…',
        noStudentsFound: 'لم يتم العثور على طلاب.',
        selectStudentAria: 'اختيار {{name}}',
        removeStudentAria: 'إزالة {{name}}',
      },

      modes: {
        full: 'كامل',
        latest: 'الأحدث',
        levels: 'المستويات',
      },

      levels: {
        levelsButton: 'المستويات',
        selectTitle: 'اختر المستويات',
        noGrades: 'لا توجد صفوف.',
      },

      labels: {
        studentId: 'رقم الطالب',
      },

      emptyStates: {
        noTranscriptData: 'لا توجد بيانات كشف درجات للوضع/الفلاتر المحددة.',
        noTranscriptRows: 'لا توجد صفوف في كشف الدرجات',
        selectGrades: 'اختر صفًا واحدًا أو أكثر لعرض كشوف الدرجات.',
      },

      table: {
        total: 'المجموع',
        overall: 'الإجمالي',
      },
    },
  },

  announcements: {
    page: {
      title: 'الإعلانات',
      loading: 'جارٍ تحميل الإعلانات…',
      empty: 'لا توجد إعلانات بعد.',
      confirmDelete: 'هل أنت متأكد أنك تريد حذف هذا الإعلان؟',
      actions: {
        post: 'نشر',
      },
      status: {
        posting: 'جارٍ النشر…',
        updating: 'جارٍ التحديث…',
        deleting: 'جارٍ الحذف…',
      },
      form: {
        titlePlaceholder: 'عنوان الإعلان…',
        bodyPlaceholder: 'اكتب تفاصيل الإعلان…',
        editTitlePlaceholder: 'تعديل العنوان',
      },
      meta: {
        postedBy: 'نشره {{author}} ({{role}}) بتاريخ {{date}}',
        updatedBy: 'حدّثه {{updatedBy}}{{roleSuffix}}{{dateSuffix}}',
        onPrefix: 'بتاريخ',
      },
      toasts: {
        fillTitleAndBody: 'يرجى تعبئة العنوان والمحتوى',
        posted: 'تم نشر الإعلان بنجاح!',
        updated: 'تم تحديث الإعلان!',
        deleted: 'تم حذف الإعلان!',
      },
    },
  },

  dashboard: {
    cards: {
      scoreActivity: {
        title: 'نشاط الدرجات',
        subtitle: 'تعديلات إدخال الدرجات (علامات تبويب)',
        stats: {
          touched: 'تم تعديلها',
          created: 'تم إنشاؤها',
          updated: 'تم تحديثها',
        },
        noteDefinition: '“{{label}}” = الدرجات التي حدث آخر تعديل لها ضمن هذا النطاق.',
      },

      announcementsMix: {
        title: 'مزيج الإعلانات',
        subtitle: 'تم الإنشاء مقابل التحديث (علامات تبويب)',
        labels: {
          allCreated: 'الكل (تم الإنشاء)',
        },
        legend: {
          created: 'تم الإنشاء',
          updated: 'تم التحديث',
        },
        roles: {
          all: 'الكل',
          students: 'الطلاب',
          teachers: 'المعلمون',
          staff: 'الموظفون',
          admin: 'المدير',
          unknown: 'غير معروف',
        },
        empty: 'لا توجد إعلانات في هذا النطاق.',
      },

      attendance: {
        subtitle: 'نظرة عامة للإدارة/الموظفين (جميع الشعب)',
        kpis: {
          presentPct: 'نسبة الحضور%',
          days: 'الأيام',
        },
        labels: {
          allDay: 'طوال اليوم',
          perPeriod: 'حسب الحصص',
        },
        notes: {
          oneRowPerDate: 'صف واحد لكل تاريخ (يفضل طوال اليوم عند توفره)',
          pickAnyRange: 'اختر أي نطاق تاريخ.',
          showsRecords: 'يعرض سجلات الحضور ضمن النطاق المحدد.',
        },
        export: {
          title: 'تصدير لوحة الحضور',
        },
        errors: {
          loadFailed: 'فشل تحميل ملخص الحضور.',
        },
        performance: {
          subtitle: 'تفصيل النسب',
          totalRecordsTitle: 'إجمالي السجلات',
          totalRecordsNote: 'مجموع جميع الحالات',
        },
        byPeriod: {
          subtitle: 'مجمّع ضمن النطاق المحدد',
          noLessonData: 'لم يتم العثور على بيانات حسب الحصة ضمن هذا النطاق.',
          periodsTitle: 'الحصص',
          excludesAllDay: 'يستثني طوال اليوم',
        },
        statusTrend: {
          subtitle: 'لكل يوم (جميع الشعب)',
          hoverNote: 'مرّر المؤشر فوق الأجزاء لعرض الأعداد',
        },
        footer: {
          source: 'المصدر: ملخص لوحة التحكم (الإدارة/الموظفين)',
          kpisLine: 'المؤشرات: نسبة الحضور% • الأيام',
        },
      },

      results: {
        subtitle: 'نظرة عامة للإدارة/الموظفين (الشعبة المحددة)',
        export: {
          title: 'تصدير لوحة النتائج',
        },
        onlyAdminStaff: 'هذه البطاقة متاحة للإدارة/الموظفين فقط.',
        selectFilters: 'اختر السنة الدراسية + الشعبة لعرض الرسوم. (المادة/نوع الامتحان اختياريان.)',
        footer: {
          source: 'المصدر: ملخص الامتحانات (نطاق الإدارة/الموظفين)',
        },
        modes: {
          allSubjects: 'كل المواد',
          subject: 'مادة',
          examType: 'نوع الامتحان',
        },
        labels: {
          subjectsInClass: 'المواد في هذه الشعبة',
          showing: 'عرض',
          subject: 'المادة',
        },
        placeholders: {
          subjectOptional: 'المادة (اختياري)',
          selectSectionFirst: 'اختر الشعبة أولاً',
          selectYearFirst: 'اختر السنة أولاً',
        },
        notes: {
          modeTip: 'نصيحة: بدّل',
          modeTipTail: 'لتصفية مادة واحدة، أو اترك',
        },
        errors: {
          loadClassSubjectsFailed: 'فشل تحميل مواد الشعبة.',
        },
        distribution: {
          kpiLine: 'مؤشر KPI: متوسط الشعبة • نسبة النجاح • أعلى 10',
        },
      },
    },

    page: {
      welcome: 'مرحباً',
      welcomeUser: 'مرحباً، {{name}}',
      academicYearLabel: 'السنة الدراسية: {{year}}',
      subtitle: 'نظرة عامة على لوحة التحكم',
      errors: {
        loadFailed: 'فشل تحميل بيانات لوحة التحكم.',
      },
      modules: {
        students: 'الطلاب',
        teachers: 'المعلمون',
        staff: 'الموظفون',
        classes: 'الشعب',
        subjects: 'المواد',
        cohorts: 'الدفعات',
        transfers: 'التحويلات',
        announcements: 'الإعلانات',
        activeCount: 'نشط: {{count}}',
        classesSubtitle: 'شعب الصفوف',
        subjectsSubtitle: 'كل المواد',
        cohortsSubtitle: 'كل الدفعات',
        inSelectedRange: 'ضمن النطاق المحدد',
      },
      newStudents: {
        title: 'طلاب جدد',
        subtitle: 'اتجاه التسجيل لأول مرة',
        yAxisLabel: 'عدد الطلاب',
      },
    },
  },

  finance: {
    page: {
      title: 'إدارة المالية',
      subtitle: 'إدارة الحسابات والرسوم والرواتب والمصروفات.',
      tabs: {
        dashboard: 'لوحة التحكم',
        accounts: 'الحسابات',
        studentFinance: 'مالية الطلاب',
        payroll: 'الرواتب',
        expenses: 'المصروفات',
      },
    },

    viewer: {
      subtitle: 'الرسوم الشهرية، المدفوعات، والرصيد المتبقي',
      loadFailed: 'فشل تحميل سجل المالية',
      empty: 'لا يوجد سجل مالي بعد.',
      stats: {
        totalBilled: 'إجمالي المفوتر',
        totalPaid: 'إجمالي المدفوع',
        totalDiscount: 'إجمالي الخصم',
        outstanding: 'الرصيد المتبقي',
      },
    },

    dashboard: {
      header: {
        title: 'لوحة التحكم المالية',
        subtitle: 'نظرة عامة على الإيرادات والمصروفات وحالة الرسوم.',
      },
      cards: {
        totalRevenue: 'إجمالي الإيرادات',
        totalExpenses: 'إجمالي المصروفات',
        netIncome: 'صافي الدخل',
        pendingFees: 'الرسوم المعلّقة',
      },
      cardsSubtext: {
        collectedFeesThisYear: 'الرسوم المحصّلة هذا العام',
        operationalCosts: 'تكاليف التشغيل',
        revenueMinusExpenses: 'الإيرادات - المصروفات',
        unpaidInvoices: 'فواتير غير مدفوعة',
      },
      charts: {
        incomeVsExpenses: {
          title: 'الدخل مقابل المصروفات',
          subtitle: 'الاتجاه الشهري لآخر 6 أشهر',
        },
        feeCollectionStatus: {
          title: 'حالة تحصيل الرسوم',
          subtitle: 'توزيع الفواتير المدفوعة وغير المدفوعة',
        },
        expensesByCategory: {
          title: 'المصروفات حسب الفئة',
          subtitle: 'أعلى فئات المصروفات (الفترة الحالية)',
        },
      },
      legends: {
        income: 'الدخل',
        expenses: 'المصروفات',
      },
      feeStatus: {
        paid: 'مدفوع',
        partial: 'جزئي',
        unpaid: 'غير مدفوع',
        cancelled: 'ملغى',
      },
      recent: {
        title: 'أحدث المعاملات',
        subtitle: 'آخر مدفوعات الرسوم والنشاط',
        empty: 'لا توجد معاملات حديثة.',
        columns: {
          student: 'الطالب',
          amount: 'المبلغ',
          method: 'الطريقة',
          date: 'التاريخ',
          status: 'الحالة',
        },
        status: {
          completed: 'مكتمل',
        },
      },
      errors: {
        loadFailedTitle: 'فشل تحميل لوحة التحكم',
        loadFailedDesc: 'يرجى تحديث الصفحة أو المحاولة مرة أخرى بعد قليل.',
      },
    },
    accounts: {
      tabs: {
        institutionAccounts: 'حسابات المؤسسة',
        balanceOverview: 'نظرة عامة ومشاريع',
        ledgerHistory: 'سجل الأستاذ العام',
      },

      sections: {
        institutionAccounts: 'حسابات المؤسسة',
        actions: 'إجراءات',
        institutionAccountsSubtitle: 'إدارة السيولة بالوقت الحقيقي',
      },

      cards: {
        availableUsd: 'المتاح (USD)',
        refPrefix: 'مرجع',
      },

      fields: {
        fromSource: 'من المصدر',
        toDestination: 'إلى الوجهة',
        transferAmountUsd: 'مبلغ التحويل (USD)',
        accountName: 'اسم الحساب',
        type: 'النوع',
        branch: 'الفرع',
        institution: 'المؤسسة',
        accountNumber: 'رقم الحساب',
        openingBalance: 'الرصيد الافتتاحي',
        depositTo: 'الإيداع إلى',
        incomeName: 'وصف الدخل / الاسم',
        refNumber: 'مرجع #',
        date: 'التاريخ',
        totalReceivedAmount: 'إجمالي المبلغ المستلم',
        status: 'الحالة',
      },

      placeholders: {
        amount: '0.00',
        accountNameExample: 'مثال: صندوق المصروفات',
        institutionExample: 'مثال: بنك سلام',
        incomeNameExample: 'مثال: تبرع من XYZ',
        notAvailable: 'غير متوفر',
      },

      options: {
        accountType: {
          bank: 'بنك',
          cash: 'نقد',
          mobileMoney: 'أموال الهاتف',
        },
      },

      overview: {
        kicker: 'ملخص مالي',
        title: 'إجمالي السيولة',
        currency: 'USD',
        verifiedFrom: 'تم التحقق من {{count}} حساباً مرتبطاً',
      },

      ledger: {
        title: 'سجل الأستاذ العام',
        subtitle: 'سجل تدقيق معاملات غير قابل للتغيير',
        realtime: 'تتبع بالوقت الحقيقي',
        loading: 'جارٍ تحميل السجل…',
        loadFailed: 'فشل تحميل السجل',
        emptyTitle: 'لا توجد سجلات في دفتر الأستاذ.',
        columns: {
          date: 'التاريخ / التدقيق',
          domain: 'النطاق',
          operation: 'نوع العملية',
          user: 'المستخدم المصرح',
          context: 'سياق النظام',
        },
        export: {
          systemUser: 'النظام',
          columns: {
            date: 'التاريخ',
            domain: 'النطاق',
            operation: 'العملية',
            user: 'المستخدم',
            context: 'السياق',
          },
        },
      },

      actions: {
        income: 'دخل',
        newAccount: 'حساب جديد',
        createAccount: 'إنشاء حساب',
        recordIncome: 'تسجيل الدخل',
        executeFunds: 'تنفيذ التحويل',
        saveChanges: 'حفظ التغييرات',
      },

      modals: {
        transferTitle: 'تحويل بين الحسابات',
        createTitle: 'تسجيل حساب جديد',
        incomeTitle: 'تسجيل دخل عام',
        editTitle: 'تعديل الحساب',
      },

      transfer: {
        sourcePlaceholder: 'حساب المصدر…',
        targetPlaceholder: 'حساب الوجهة…',
      },

      income: {
        depositToPlaceholder: 'اختر حساباً…',
      },

      confirms: {
        delete: 'هل تريد حذف هذا الحساب؟ لا يمكن التراجع عن ذلك.',
      },

      toasts: {
        incomeRecorded: 'تم تسجيل الدخل بنجاح',
        incomeFailed: 'فشل التسجيل',
        transferSuccess: 'تم تحويل الأموال بنجاح',
        transferFailed: 'فشل التحويل',
        deleteBlockedBalance: 'لا يمكن حذف حساب برصيد غير صفري',
      },

      apiErrors: {
        FIN_ACCOUNT_NAME_REQUIRED: 'اسم الحساب مطلوب',
        FIN_ACCOUNT_TYPE_REQUIRED: 'نوع الحساب مطلوب',
        FIN_ACCOUNT_INSTITUTION_REQUIRED: 'المؤسسة / البنك مطلوب',
        FIN_ACCOUNT_NUMBER_REQUIRED: 'رقم الحساب مطلوب',

        FIN_ACCOUNT_NOT_FOUND: 'لم يتم العثور على الحساب',
        FIN_INVALID_ACCOUNT_ID: 'معرّف الحساب غير صالح',

        FIN_ACCOUNT_DELETE_BALANCE_NOT_ZERO: 'لا يمكن حذف حساب برصيد غير صفري',
        FIN_AMOUNT_MUST_BE_POSITIVE: 'يجب أن يكون المبلغ رقماً موجباً',

        FIN_SOURCE_ACCOUNT_INACTIVE: 'حساب المصدر غير نشط',
        FIN_DEST_ACCOUNT_INACTIVE: 'حساب الوجهة غير نشط',
        FIN_INSUFFICIENT_FUNDS: 'لا توجد أموال كافية',
        FIN_ACCOUNT_INACTIVE: 'الحساب غير نشط',

        FIN_ACCOUNT_DUPLICATE: 'يوجد حساب مماثل مسجل مسبقاً',
        FIN_VALIDATION_ERROR: 'البيانات المدخلة غير صحيحة',
        FIN_INTERNAL_ERROR: 'حدث خطأ في الخادم',
      },
    },

    expenses: {
      tabs: {
        ledger: 'سجل المصروفات',
        categories: 'فئات المصروفات',
      },

      modals: {
        createTitle: 'تسجيل مصروف جديد',
        editTitle: 'تعديل المصروف',
      },

      fields: {
        title: 'عنوان المصروف',
        amountUsd: 'المبلغ (USD)',
        date: 'التاريخ',
        category: 'الفئة',
        payingAccount: 'الحساب الدافع',
        description: 'الوصف',
      },

      placeholders: {
        title: 'مثال: فاتورة الكهرباء',
        amount: '0.00',
        category: 'اختر فئة…',
        account: 'اختر حساباً…',
        description: 'تفاصيل إضافية…',
      },

      actions: {
        newExpense: 'تسجيل مصروف جديد',
        recordExpense: 'تسجيل المصروف',
        createCategory: 'إنشاء فئة',
      },

      columns: {
        date: 'التاريخ',
        category: 'الفئة',
        title: 'العنوان',
        description: 'الوصف',
        amount: 'المبلغ',
        auditor: 'المدقق',
      },

      export: {
        title: 'المصروفات',
        month: 'الشهر: {{month}}',
      },

      ledger: {
        title: 'سجل المصروفات',
        kpiSpend: 'الإنفاق خلال الفترة',
        kpiRecords: 'سجلات التدقيق المعتمدة',
        monthAria: 'اختر الشهر',
        loading: 'جارٍ تحميل المصروفات…',
        emptyTitle: 'لا توجد سجلات مصروفات.',
      },

      categories: {
        title: 'فئات المصروفات',
        count: '{{count}} فئة',
        newPlaceholder: 'اسم فئة جديدة',
        budgetPlaceholder: 'الميزانية (اختياري)',
        loading: 'جارٍ تحميل الفئات…',
        empty: 'لا توجد فئات بعد',
        monthTag: 'الشهر: {{month}}',
        typeExpense: 'النوع: مصروف',
        spent: 'المصروف',
        records: '{{count}} سجل',
        budget: 'الميزانية',
        noBudget: '—',
        overBudget: 'تجاوز الميزانية',
        remaining: 'المتبقي: ${{value}}',
        editTitle: 'تعديل الفئة',
        fields: {
          name: 'الاسم',
          budget: 'الميزانية',
        },
        renameLockedHint: 'هذه الفئة لديها مصروفات مسجلة بالفعل. تغيير الاسم غير مسموح.',
      },

      budgetInfo: {
        title: 'معلومات الميزانية',
        month: 'الشهر: {{month}}',
        budget: 'الميزانية',
        spent: 'المصروف',
        remaining: 'المتبقي',
      },

      confirms: {
        delete: 'هل أنت متأكد؟ لا يمكن التراجع عن ذلك.',
        deleteCategory: 'هل تريد أرشفة هذه الفئة؟ لن تظهر بعد الآن عند تسجيل مصروف جديد.',
      },

      toasts: {
        created: 'تم تسجيل المصروف بنجاح',
        createFailed: 'فشل تسجيل المصروف',
        deleted: 'تم حذف المصروف',
        deleteFailed: 'فشل الحذف',
        loadFailed: 'فشل تحميل المصروفات',

        categoryCreated: 'تم إنشاء الفئة',
        categoryCreateFailed: 'فشل إنشاء الفئة',
        categoryUpdated: 'تم تحديث الفئة',
        categoryUpdateFailed: 'فشل تحديث الفئة',
        categoryDeleted: 'تمت أرشفة الفئة',
        categoryDeleteFailed: 'فشل أرشفة الفئة',
        categoryNameRequired: 'اسم الفئة مطلوب',
        budgetInvalid: 'يجب أن تكون الميزانية رقماً صحيحاً',
      },

      apiErrors: {
        FIN_AMOUNT_MUST_BE_POSITIVE: 'يجب أن يكون المبلغ رقماً موجباً',
        FIN_AMOUNT_INVALID: 'المبلغ المدخل غير صحيح',
        FIN_DATE_INVALID: 'التاريخ المدخل غير صحيح',

        FIN_PRINT_MONTH_REQUIRED: 'الشهر مطلوب (YYYY-MM)',
        FIN_PRINT_MONTH_INVALID: 'تنسيق الشهر غير صحيح. المتوقّع: YYYY-MM',
        FIN_PRINT_STATUS_INVALID: 'حالة غير صحيحة. استخدم: Paid | Partial | Unpaid | All',
        FIN_PRINT_CLASSID_INVALID: 'معرّف الصف/الشعبة غير صالح',
        FIN_PRINT_ACADEMICYEARID_INVALID: 'معرّف السنة الدراسية غير صالح',
        FIN_PRINT_CATEGORYID_INVALID: 'معرّف نوع المبلغ/الفئة غير صالح',
        FIN_PRINT_DATES_REQUIRED: 'حقلا من/إلى مطلوبان',
        FIN_PRINT_DATERANGE_INVALID: 'نطاق التاريخ (من/إلى) غير صالح',
        FIN_PRINT_TRANSACTIONID_INVALID: 'معرّف المعاملة غير صالح',
        FIN_PRINT_TRANSACTION_NOT_FOUND: 'المعاملة غير موجودة',
        FIN_PRINT_PAYMENTGROUPID_INVALID: 'معرّف مجموعة الدفع غير صالح',
        FIN_PRINT_PAYMENT_GROUP_NOT_FOUND: 'مجموعة الدفع غير موجودة',
        FIN_PRINT_SERVER_ERROR: 'حدث خطأ في الخادم',

        FIN_EXPENSE_CATEGORY_REQUIRED: 'فئة المصروف مطلوبة',
        FIN_EXPENSE_CATEGORY_NOT_FOUND: 'فئة المصروف غير موجودة',
        FIN_EXPENSE_BUDGET_EXCEEDED: 'تم تجاوز ميزانية هذا الشهر',

        FIN_ACCOUNT_NOT_FOUND: 'الحساب غير موجود',
        FIN_INVALID_ACCOUNT_ID: 'معرّف الحساب غير صالح',
        FIN_INSUFFICIENT_FUNDS: 'لا توجد أموال كافية',
        FIN_EXPENSE_ACCOUNT_MISSING: 'حساب الدفع مفقود',

        FIN_INVALID_EXPENSE_ID: 'معرّف المصروف غير صالح',
        FIN_EXPENSE_NOT_FOUND: 'المصروف غير موجود',

        FIN_CATEGORY_NAME_REQUIRED: 'اسم الفئة مطلوب',
        FIN_CATEGORY_TYPE_REQUIRED: 'نوع الفئة مطلوب',
        FIN_INVALID_CATEGORY_ID: 'معرّف الفئة غير صالح',
        FIN_CATEGORY_NOT_FOUND: 'الفئة غير موجودة',
        FIN_CATEGORY_DUPLICATE: 'هذه الفئة مسجلة مسبقاً',
        FIN_CATEGORY_IN_USE: 'هذه الفئة مستخدمة بالفعل في المصروفات',

        FIN_INTERNAL_ERROR: 'حدث خطأ في الخادم',
        FIN_EXPENSE_LOCKED_PAYROLL: 'لا يمكن تعديل/حذف مصروفات الرواتب (Payroll) من شاشة المصروفات',
      },
    },

    payroll: {
      page: {
        kicker: 'المالية',
        title: 'الرواتب',
      },

      runModal: {
        title: 'سير عمل الرواتب',
        subtitle: 'معالجة رواتب الفترة: {{month}}',
        labels: {
          targetMonth: 'الشهر المالي المستهدف',
          scope: 'نطاق العملية',
        },
        scopes: {
          all: {
            label: 'على مستوى المؤسسة',
            desc: 'معالجة رواتب جميع الموظفين النشطين.',
          },
          single: {
            label: 'موظف واحد',
            desc: 'معالجة الرواتب لسجل شخص محدد.',
          },
        },
        placeholders: {
          search: 'ابحث في الدليل...',
        },
        empty: {
          search: 'لا توجد سجلات مطابقة.',
        },
        fallbacks: {
          personnel: 'موظف',
        },
        bulk: {
          title: 'تهيئة جماعية',
          staffAllActive: 'جميع الموظفين النشطين',
          desc: 'سيقوم النظام بإنشاء مسودات رواتب لـ {{staff}} للفترة المالية {{month}}.',
          tags: {
            autoApply: 'تطبيق البدلات تلقائياً',
            metadata: 'بيانات الأرشفة',
          },
        },
        actions: {
          previous: 'الخطوة السابقة',
          discard: 'إلغاء العملية',
          processing: 'جارٍ المعالجة...',
          configure: 'تهيئة الإستراتيجية',
          execute: 'تنفيذ التوليد',
        },
        toasts: {
          staffLoadFailed: 'فشل تحميل قائمة الموظفين',
          pipelineStarted: 'تم بدء سير عمل الرواتب بنجاح',
          pipelineStartFailed: 'فشل بدء الرواتب',
        },
      },

      modals: {
        chargeTitle: 'توليد الرواتب',
        deleteTitle: 'حذف قيود الرواتب',
        updateTitle: 'تحديث الرواتب',
      },

      actions: {
        charge: 'توليد',
        show: 'عرض',
        viewInfo: 'عرض التفاصيل',
      },

      fields: {
        employee: 'الموظف',
      },

      placeholders: {
        employee: 'اختر موظفاً…',
        account: 'اختر حساباً…',
      },

      charge: {
        fields: {
          scope: 'النطاق',
          mode: 'الوضع',
          account: 'الحساب',
          date: 'التاريخ',
        },
        scope: {
          all: 'جميع الموظفين',
          single: 'موظف واحد',
        },
        mode: {
          charge: 'توليد',
          fullPayment: 'دفع كامل (توليد + دفع)',
        },
        hints: {
          account: 'يُستخدم للدفع الكامل.',
        },
        success: 'تم إنشاء قيد الرواتب',
        errors: {
          missingSalary: 'الراتب مفقود لـ: {{names}}{{more}}',
          failed: 'فشلت العملية',
        },
      },

      fullPayment: {
        success: 'تم إكمال الدفع الكامل',
      },

      filters: {
        month: 'الشهر',
      },

      status: {
        paid: 'مدفوع',
        draft: 'مسودة',
        approved: 'معتمد',
      },

      columns: {
        date: 'التاريخ',
        no: 'رقم',
        employeeId: 'المعرف',
        employeeName: 'اسم الموظف',
        phone: 'الهاتف',
        employeeType: 'نوع الموظف',
        salary: 'الراتب',
      },

      table: {
        loading: 'جارٍ تحميل الرواتب…',
        emptyTitle: 'لا توجد سجلات رواتب.',
        emptyDescription: '',
      },

      errors: {
        loadFailed: 'فشل تحميل بيانات الرواتب',
      },

      validations: {
        monthRequired: 'الشهر مطلوب',
        academicYearRequired: 'السنة الدراسية مطلوبة',
        employeeRequired: 'الموظف مطلوب',
        amountRequired: 'المبلغ مطلوب',
      },

      delete: {
        fields: {
          deleteType: 'نوع الحذف',
        },
        single: 'موظف واحد',
        confirm: 'هل أنت متأكد؟ سيتم حذف القيود (غير المدفوعة).',
        success: 'تم الحذف',
        errors: {
          failed: 'فشل الحذف',
        },
      },

      update: {
        fields: {
          updateType: 'نوع التحديث',
          amount: 'المبلغ',
        },
        types: {
          salaryCharge: 'توليد راتب',
          commission: 'عمولة',
          salaryDecrease: 'خصم من الراتب',
        },
        success: 'تم تحديث الرواتب',
        errors: {
          failed: 'فشل التحديث',
        },
      },

      printModal: {
        title: 'طباعة وتصدير الرواتب',
        exportHint: 'قم بالتنزيل باستخدام نفس عوامل التصفية.',
      },

      export: {
        title: 'الرواتب',
        sheetName: 'الرواتب',
        month: 'الشهر: {{month}}',
        academicYear: 'السنة الدراسية: {{year}}',
        status: 'الحالة: {{status}}',
      },

      print: {
        title: 'الرواتب - {{month}} {{year}}',
        errors: {
          popupBlocked: 'تم حظر النافذة المنبثقة',
          failed: 'فشلت الطباعة',
        },
      },

      show: {
        title: 'الرواتب غير المدفوعة',
        hint: 'قم بتوليد الرواتب أولاً لعرض هذه القائمة.',
        emptyTitle: 'لا توجد رواتب غير مدفوعة.',
        columns: {
          balance: 'الرصيد',
          info: 'التفاصيل',
        },
        actions: {
          info: 'التفاصيل',
        },
        errors: {
          loadFailed: 'فشل تحميل الرواتب غير المدفوعة',
        },
      },

      employeeInfo: {
        title: 'معلومات الموظف',
        fields: {
          account: 'الحساب',
          date: 'تاريخ التسجيل',
        },
        actions: {
          show: 'عرض',
        },
        columns: {
          no: 'رقم',
          month: 'الشهر',
          sendNumber: 'رقم الإرسال',
          description: 'الوصف',
          commission: 'عمولة',
          decrease: 'خصم',
          dr: 'مدين',
          cr: 'دائن',
          paid: 'مدفوع',
          balance: 'الرصيد',
          remaining: 'المتبقي',
        },
        loading: 'جارٍ التحميل…',
        empty: 'لا توجد بيانات',
        toasts: {
          saved: 'تم الحفظ',
        },
        errors: {
          loadFailed: 'فشل تحميل معلومات الموظف',
          sendNumberRequired: 'رقم الإرسال مطلوب',
          saveFailed: 'فشل الحفظ',
        },
        receipt: {
          title: 'إيصال الرواتب',
          sendNumber: 'رقم الإرسال',
          description: 'الوصف',
          commission: 'عمولة',
          decrease: 'خصم',
          salary: 'الراتب',
          paid: 'مدفوع',
          balance: 'الرصيد',
        },
      },

      apiErrors: {
        PAYROLL_DELETE_NO_MATCH_UNPAID: 'لا توجد سجلات غير مدفوعة/مسودة للحذف',
        PAYROLL_DELETE_NO_MATCH_PAID: 'هذا الموظف ليس مدفوعاً بعد لهذا الشهر/السنة',
      },
    },

    graduationPaymentModal: {
      title: 'دفع التخرج',
      labels: {
        selectInvoice: 'اختر فاتورة التخرج',
        balance: 'الرصيد',
        paid: 'مدفوع',
        paymentAmount: 'مبلغ الدفع',
        paymentMethod: 'طريقة الدفع',
      },
      methods: {
        cash: 'نقدًا',
        bank: 'تحويل بنكي',
        edahab: 'E-Dahab',
        sahay: 'سهل / زاد',
      },
      actions: {
        cancel: 'إلغاء',
        processing: 'جارٍ المعالجة...',
        processAndPrint: 'تنفيذ وطباعة الإيصال',
      },
      toasts: {
        selectInvoiceRequired: 'اختر فاتورة للدفع',
        amountInvalid: 'أدخل مبلغًا صحيحًا',
        receiptGenerated: 'تم إنشاء إيصال التخرج',
        paymentFailed: 'فشل تسجيل الدفع',
      },
      description: 'دفع رسوم التخرج: {{title}}',
    },

    printModals: {
      actions: {
        close: 'إغلاق',
        print: 'طباعة',
        generating: 'جارٍ الإنشاء…',
        reset: 'إعادة ضبط',
      },
      common: {
        placeholders: {
          chooseYear: 'اختر السنة',
          chooseMonth: 'اختر الشهر',
          allFeeTypes: 'كل أنواع الرسوم',
          search: 'بحث…',
          grade: 'الصف',
          shift: 'الدوام',
          campusWide: 'على مستوى الحرم (افتراضي)',
          allClasses: 'كل الصفوف',
        },
      },
      titles: {
        monthlyVouchers: 'SYD ERP - قسائم شهرية',
        dailyAudit: 'SYD ERP - تدقيق يومي',
        passcards: 'بطاقات المرور الأكاديمية - {{examType}}',
      },
      toasts: {
        noInvoices: 'لا توجد فواتير للطباعة',
        noTransactions: 'لا توجد معاملات للطباعة',
        noPasscards: 'لا توجد بطاقات للطباعة',
      },
      voucher: {
        title: 'إيصال دفع',
        labels: {
          date: 'التاريخ',
          rv: 'رقم الإيصال',
          class: 'الصف',
          id: 'المعرف',
          studentName: 'اسم الطالب',
          shift: 'الدوام',
          description: 'الوصف',
          month: 'الشهر',
          balance: 'الرصيد',
          paid: 'مدفوع',
          fee: 'الرسوم',
          discount: 'خصم',
        },
        note: '* ملاحظة: هذا الإيصال يمثل المبلغ المتفق عليه حسب المستوى.',
        hormarisSuffix: ' (مقدم)',
        hormarisPayment: 'دفع مقدم ({{count}} شهر)',
        defaults: {
          monthlyFee: 'رسوم شهرية',
        },
      },
      monthly: {
        title: 'فوترة جماعية',
        subtitle: 'إنشاء بيان شهري',
        fields: {
          academicYear: 'السنة الدراسية',
          billingMonth: 'شهر الفوترة',
          feeCategory: 'فئة الرسوم / نوع المبلغ',
          classFiltering: 'تصفية الصف (اختياري)',
        },
        toasts: {
          syncFailed: 'فشل مزامنة التقرير',
          checkMonth: 'تحقق من حقل الشهر',
          selectAcademicYear: 'اختر السنة الدراسية',
          generationFailed: 'فشل إنشاء التقرير',
        },
      },
      dailyAudit: {
        title: 'سجل التدقيق',
        subtitle: 'إغلاق يومي زمني',
        auditTitle: 'تدقيق مالي يومي احترافي',
        fields: {
          fromDate: 'من تاريخ',
          toDate: 'إلى تاريخ',
        },
        toasts: {
          generationFailed: 'فشل إنشاء التدقيق',
        },
      },
      passcards: {
        title: 'المركز الأكاديمي',
        subtitle: 'بطاقات تخليص الطلاب',
        fields: {
          academicYear: 'السنة الدراسية المستهدفة',
          chooseClass: 'اختر الصف',
          examType: 'نوع الاختبار',
        },
        placeholders: {
          chooseExam: 'اختر الاختبار',
        },
        examTypes: {
          midterm: 'امتحان منتصف الفصل',
          final: 'الامتحان النهائي',
        },
        layout: {
          portrait: 'طولي',
          landscape: 'عرضي',
        },
        toasts: {
          syncFailed: 'فشلت مزامنة البطاقات',
          generationFailed: 'فشل إنشاء البطاقات',
        },
        validity: 'صالح من {{from}} إلى {{to}}',
        labels: {
          academicYear: 'السنة الدراسية',
          date: 'التاريخ',
          clearanceCard: 'بطاقة التخليص',
          studentName: 'اسم الطالب',
          class: 'الصف',
          shift: 'الدوام',
          id: 'المعرف',
          room: 'الغرفة',
          hall: 'القاعة',
          photo: 'صورة',
        },
        notice: 'أي طالب يحاول التلاعب لا يحق له مواصلة تعليمه في المدرسة',
        stamp: 'ختم رسمي لمسجل المدرسة',
      },
    },

    studentFinance: {
      printTab: {
        toasts: {
          noPrintPermission: 'ليست لديك صلاحية للطباعة',
        },
      },
      tabs: {
        receipt: 'إيصال',
        previousBalance: 'الرصيد السابق',
        amountType: 'نوع المبلغ',
        feeType: 'نوع الرسوم',
      },

      paymentModal: {
        title: 'مالية الطالب',
        print: {
          arrears: 'متأخرات',
        },
        tabs: {
          ledger: 'السجل',
          history: 'التاريخ',
        },
        controls: {
          selectLedgerAccount: 'اختر حساب السجل',
          paymentMode: 'وضع الدفع',
          byLevel: 'حسب المستوى',
          byReceipt: 'حسب الإيصال',
          paymentDate: 'تاريخ الدفع',
        },
        labels: {
          total: 'الإجمالي',
        },
        hormaris: {
          selectMonths: 'اختر أشهر الدفع المقدم',
        },
        actions: {
          paySelected: 'ادفع المحدد',
          save: 'حفظ',
          print: 'طباعة',
        },
        placeholders: {
          chooseAccount: '-- اختر حسابًا --',
          phoneRef: 'هاتف/مرجع',
          defaultPhone: 'الافتراضي: {{phone}}',
          full: 'كامل',
          amountZero: '0.00',
        },
        columns: {
          no: 'رقم',
          month: 'شهر',
          phoneRef: 'هاتف/مرجع',
          description: 'الوصف',
          drFees: 'مدين (الرسوم)',
          crPaid: 'دائن (مدفوع)',
          discount: 'خصم',
          payAmount: 'مبلغ الدفع',
          actions: 'إجراءات',
          balance: 'الرصيد',
        },
        loading: {
          analysing: 'جارٍ التحليل...',
        },
        empty: {
          noRecords: 'لا توجد سجلات.',
        },
        invoice: {
          titleFallback: 'رسوم الدراسة',
        },
        history: {
          title: 'سجل المدفوعات والإيصالات',
          actions: {
            printAll: 'طباعة السجل بالكامل',
            revert: 'إرجاع',
          },
          status: {
            cleared: 'مُسدَّد',
          },
          descFallback: 'رسوم دراسية قياسية',
          labels: {
            totalPaid: 'إجمالي المدفوع',
          },
        },
        errors: {
          cannotPrintNoPayment: 'لا يمكن الطباعة: لا توجد عملية دفع مسجلة',
        },
        confirms: {
          revertMonth: 'سيؤدي هذا إلى إرجاع مدفوعات هذا الشهر. هل تريد المتابعة؟',
        },
        validation: {
          selectAccount: 'يرجى اختيار حساب',
          selectAccountShort: 'اختر حسابًا',
          enterValidAmount: 'أدخل مبلغًا صحيحًا',
          phoneRefRequired: 'الهاتف/المرجع مطلوب',
          selectHormarisMonths: 'اختر أشهر الدفع المقدم',
          invalidAmountForMonth: 'مبلغ غير صحيح لشهر {{month}}',
          amountExceedsBalanceForMonth: 'المبلغ يتجاوز الرصيد لشهر {{month}}',
        },
        toasts: {
          noPaymentGroupsToRevert: 'لا توجد مجموعات دفع لإرجاعها',
          revertingPayments: 'جارٍ إرجاع المدفوعات...',
          paymentsReverted: 'تم إرجاع المدفوعات',
          failedRevertPayments: 'فشل إرجاع المدفوعات',
          paymentRecorded: 'تم تسجيل الدفع',
          paymentFailed: 'فشل الدفع',
          processingHormaris: 'جارٍ معالجة الدفع المقدم...',
          hormarisRecorded: 'تم تسجيل الدفع المقدم',
          hormarisFailed: 'فشل الدفع المقدم',
          preparingStatement: 'جارٍ تجهيز البيان...',
          printFailed: 'فشلت الطباعة',
        },
      },

      amountTypeTab: {
        title: 'إعداد نوع المبلغ',
        subtitle: 'مصفوفة تعريف الرسوم العامة',
        actions: {
          defineNew: 'تعريف نوع مبلغ جديد',
          custom: 'مخصص',
          useList: 'استخدم القائمة',
        },
        form: {
          label: {
            feeLabel: 'وسم الرسوم',
            defaultMultiplier: 'المضاعف الافتراضي ($)',
            status: 'الحالة',
            transactionCategory: 'فئة المعاملة',
          },
        },
        modal: {
          create: 'إضافة نوع مبلغ',
          edit: 'تعديل نوع المبلغ',
        },
        placeholders: {
          feeLabel: 'مثال: رسوم شهرية',
          defaultAmount: '0.00',
          enterFeeType: 'أدخل نوع الرسوم',
        },
        validation: {
          nameRequired: 'الاسم مطلوب',
          feeTypeRequired: 'نوع الرسوم مطلوب',
        },
        confirms: {
          delete: 'هل تريد حذف نوع المبلغ هذا نهائياً؟ إذا تم استخدامه من قبل، فسيتم حظر الحذف — اجعله غير مفعل بدلاً من ذلك.',
        },
        toasts: {
          loadFailed: 'فشل تحميل إعدادات المبالغ',
          created: 'تم تعريف هيكل المبالغ',
          updated: 'تمت مزامنة الإعدادات',
          deleted: 'تم حذف نوع المبلغ',
          deleteFailed: 'فشل الحذف',
          operationFailed: 'فشل الإجراء',
        },
        integrity: {
          title: 'قيد السلامة المعمارية',
          description: 'تعديل المبالغ الافتراضية سيؤثر فقط على الرسوم المستقبلية. السجلات التاريخية مرتبطة تشفيرياً بالمبلغ المحدد وقت إنشاء الرسوم لضمان اتساق سجل التدقيق عبر السنوات الدراسية.',
        },
        table: {
          emptyTitle: 'لا توجد إعدادات.',
          columns: {
            name: 'معرف الرسوم',
            defaultAmount: 'المبلغ الافتراضي',
            feeType: 'النوع',
            status: 'الحالة',
            actions: 'إجراءات',
          },
          loading: {
            initializing: 'جارٍ تهيئة مصدر البيانات…',
          },
        },
        defaults: {
          standard: 'قياسي',
          mandatory: 'إلزامي',
          registration: 'تسجيل',
          graduation: 'تخرج',
          optional: 'اختياري',
          personal: 'شخصي',
        },
      },

      previousBalanceTab: {
        placeholders: {
          search: 'ابحث برقم الطالب أو الاسم أو الهاتف…',
          searchShort: 'ابحث…',
          grade: 'الصف',
          shift: 'الدوام',
          section: 'الشعبة',
          amount: '0.00',
        },
        filters: {
          showAll: 'عرض الكل',
          showPrev: 'عرض الرصيد السابق',
        },
        actions: {
          save: 'حفظ',
          add: 'إضافة',
          reset: 'إعادة ضبط',
          resetTitle: 'إعادة ضبط الفلاتر',
          viewInfo: 'عرض المعلومات',
        },
        toasts: {
          fetchFailed: 'فشل جلب بيانات أرصدة الطلاب',
          noPreviousBalanceCategory: 'أنشئ نوع مبلغ باسم "Previous Balance" أولاً',
          saving: 'جارٍ حفظ الأرصدة السابقة...',
          saved: 'تم حفظ الأرصدة السابقة',
          saveFailed: 'فشل حفظ الأرصدة السابقة',
        },
        validation: {
          enterAtLeastOne: 'أدخل قيمة رصيد واحدة على الأقل',
          validAmountGreaterThanZero: 'أدخل مبالغ صالحة (> 0)',
        },
        loading: {
          openingArchives: 'جارٍ فتح الأرشيف…',
        },
        table: {
          columns: {
            studentId: 'ID',
            fullName: 'اسم الطالب',
            contact: 'جهة الاتصال',
            class: 'الصف',
            balance: 'الرصيد',
            actions: 'الإجراءات',
          },
          currentBalance: 'الحالي: {{amount}}',
          bfAccount: 'B/F ACCOUNT',
        },
        empty: {
          title: 'لا توجد سجلات لهذا الاختيار.',
        },
      },

      receiptTab: {
        toasts: {
          searchFailed: 'فشل البحث',
          exporting: 'جاري التصدير إلى Excel…',
        },
        placeholders: {
          search: 'ابحث بالرقم أو الاسم أو الهاتف…',
        },
        filters: {
          byClassLevel: 'حسب الصف',
          thisMonth: {
            title: 'تصفية (هذا الشهر)',
            charged: 'تمت الفوترة هذا الشهر',
            paid: 'تم الدفع هذا الشهر',
            unpaid: 'غير مدفوع هذا الشهر',
            uncharged: 'غير مفوتر هذا الشهر',
            hormaris: 'مقدم',
          },
        },
        actions: {
          charge: 'فوترة',
          updateCharge: 'تحديث الفوترة',
          deleteCharge: 'حذف الفوترة',
          printMonthly: 'شهري',
          printDaily: 'يومي',
          printPasscard: 'بطاقة',
          excelExport: 'تصدير Excel',
          go: 'بحث',
          viewInfo: 'عرض المعلومات',
        },
        labels: {
          hormaris: 'مقدم',
        },
        loading: {
          syncingLedger: 'جارٍ مزامنة السجل…',
        },
        empty: {
          title: 'لا توجد سجلات لهذه الاختيارات.',
        },
        columns: {
          id: 'المعرف',
          studentName: 'اسم الطالب',
          contact: 'الهاتف',
          class: 'الصف',
          balance: 'الرصيد',
          info: 'معلومات',
        },
      },

      editTab: {
        toasts: {
          fetchFailed: 'فشل جلب سجلات الطلاب',
        },
        placeholders: {
          search: 'ابحث برقم الطالب أو الاسم أو الهاتف…',
        },
        filters: {
          byClassLevel: 'حسب الصف',
        },
        actions: {
          go: 'بحث',
          viewInfo: 'عرض المعلومات',
        },
        labels: {
          regPrefix: 'تسجيل:',
        },
        columns: {
          id: 'المعرف',
          studentName: 'اسم الطالب',
          contact: 'الهاتف',
          class: 'الصف',
          balance: 'الرصيد',
          info: 'معلومات',
        },
        loading: {
          fetchingProfiles: 'جاري جلب البيانات…',
        },
        empty: {
          title: 'لا توجد سجلات',
          description: 'لا توجد سجلات لهذه الاختيارات.',
        },
      },

      printTab: {
        toasts: {
          fetchFailed: 'فشل جلب طلاب هذا الصف',
          selectAtLeastOne: 'اختر طالبًا واحدًا على الأقل',
        },
        title: 'مركز تقارير المالية',
        subtitle: 'معالجة الفواتير والتدقيق بالجملة',
        labels: {
          selectClass: 'اختر المرحلة / الصف',
          classCensus: 'إحصاء الصف:',
          studentsCountSuffix: 'طلاب',
        },
        placeholders: {
          targetClassLevel: 'المستوى المستهدف',
        },
        actions: {
          fetchRegister: 'جلب القائمة',
          monthlyInvoices: 'فواتير شهرية',
          dailyAuditLedger: 'سجل تدقيق يومي',
          enrollmentPasscards: 'بطاقات التسجيل',
        },
        defaults: {
          passcardsExamType: 'تسجيل',
        },
        loading: {
          streamingRegistry: 'جاري تحميل السجل…',
        },
        columns: {
          selection: 'تحديد',
          studentId: 'رقم الطالب',
          fullName: 'الاسم الكامل',
          balanceStatus: 'حالة الرصيد',
        },
        empty: {
          title: 'اختر صفًا لبدء التقارير.',
        },
        sections: {
          reportTools: 'أدوات إنشاء التقارير',
          printQueueAdvice: 'نصيحة قائمة الطباعة',
        },
        hints: {
          bulkPrinting:
            'قد تستغرق طباعة عدة فواتير حتى 30 ثانية لعرض علامات مائية عالية الدقة.',
        },
      },

      updateChargeModal: {
        title: 'سير عمل تحديث المالية',
        auditNotice:
          'يتم تسجيل كل تحديث هنا في سجلات التدقيق الدائمة مع قيم قبل/بعد. تتم إعادة حساب الأرصدة تلقائيًا.',
        workflows: {
          correction: {
            title: 'تحديث مبلغ الرسوم',
            desc: 'تصحيح خطأ بشري في مبلغ الرسوم',
          },
          monthlyDiscount: {
            title: 'تطبيق خصم شهري',
            desc: 'منحة لمرة واحدة لشهر محدد',
          },
          undoCharges: {
            title: 'التراجع عن الرسوم',
            desc: 'إلغاء الرسوم غير المدفوعة للأشهر المحددة',
          },
          overallDiscount: {
            title: 'تطبيق خصم شامل',
            desc: 'منحة دائمة لكل الرسوم المستقبلية',
          },
        },
        discountTypes: {
          fixed: 'مبلغ ثابت ($)',
          percentage: 'نسبة مئوية (%)',
        },
        labels: {
          studentId: 'رقم الطالب',
          feeCategory: 'فئة الرسوم',
          discountType: 'نوع الخصم',
          billingMonth: 'شهر الفوترة',
          multipleMonths: 'عدة أشهر',
          newCorrectAmount: 'المبلغ المصحح ($)',
          discountValue: 'قيمة الخصم',
          reason: 'سبب التعديل',
        },
        placeholders: {
          studentId: 'مثال: DU1S1A62',
          chooseFee: 'اختر الرسوم...',
          searchFeeCategories: 'ابحث عن فئات الرسوم…',
          amount: '0.00',
          reason: 'اشرح سبب إجراء هذا التعديل (التدقيق مطلوب)',
        },
        actions: {
          cancel: 'إلغاء',
          back: 'رجوع',
          processing: 'جارٍ المعالجة…',
          execute: 'تنفيذ',
        },
        confirms: {
          undoCharges: 'سيؤدي هذا إلى إلغاء الرسوم غير المدفوعة للأشهر المحددة. هل تريد المتابعة؟',
        },
        toasts: {
          loadConfigFailed: 'فشل تحميل بيانات الإعداد',
          enterValidStudentId: 'يرجى إدخال رقم طالب صالح',
          feeCategoryAndMonthRequired: 'فئة الرسوم والشهر مطلوبان',
          selectAtLeastOneMonth: 'اختر شهر فوترة واحدًا على الأقل',
          enterAmount: 'يرجى إدخال مبلغ',
          enterDiscountValue: 'يرجى إدخال قيمة الخصم',
          reasonMinLength: 'يرجى إدخال سبب واضح (على الأقل 5 أحرف)',
          cancelledSuccess: 'تم إلغاء الرسوم بنجاح ({{count}})',
          noneFoundToCancel: 'لم يتم العثور على رسوم غير مدفوعة مطابقة للإلغاء',
          updateSuccess: 'تم التحديث بنجاح وتم إنشاء سجل تدقيق',
          operationFailed: 'فشل الإجراء',
        },
      },

      chargeModal: {
        title: 'تسجيل رسوم للطلاب',
        steps: {
          one: 'الخطوة 1: اختر الطريقة',
          two: 'الخطوة 2: املأ نموذج الرسوم',
        },
        labels: {
          chargeMethod: 'طريقة التسجيل',
          studentRegistrationId: 'رقم تسجيل الطالب',
          selectTargetClass: 'اختر الصف المستهدف',
          amountType: 'نوع المبلغ',
          feeType: 'نوع الرسوم',
          enterAmount: 'أدخل المبلغ ($)',
          billingMonth: 'شهر الفوترة',
          multipleMonths: 'عدة أشهر',
          chargeDate: 'تاريخ التسجيل',
        },
        placeholders: {
          studentRegistrationId: 'مثال: STU-1001',
          grade: 'المرحلة',
          shift: 'الدوام',
          section: 'الشعبة',
          search: 'بحث…',
          selectType: '-- اختر النوع --',
          searchAmountTypes: 'ابحث عن أنواع المبالغ…',
          amount: '0.00',
        },
        actions: {
          reset: 'إعادة تعيين',
          close: 'إغلاق',
          back: 'رجوع',
          processing: 'جارٍ المعالجة...',
          next: 'الخطوة التالية',
          chargeStudents: 'تسجيل الرسوم للطلاب',
        },
        scopes: {
          all: 'الكل',
          single: 'طالب واحد',
          class: 'حسب الصف/المرحلة',
        },
        feeTypes: {
          regular: 'عادي',
          free: 'مجاني',
        },
        validation: {
          selectAmountType: 'اختر نوع المبلغ',
          enterStudentId: 'أدخل رقم الطالب',
          selectClass: 'اختر الصف',
          selectAtLeastOneMonth: 'اختر شهر فوترة واحدًا على الأقل',
        },
        toasts: {
          loadConfigFailed: 'فشل تحميل بيانات الإعداد',
          chargeRecorded: 'تم تسجيل الرسوم بنجاح',
          chargeFailed: 'فشل تسجيل الرسوم',
        },
      },

      recordPaymentModal: {
        title: 'تسجيل دفعة',
        subtitle: 'فاتورة أو رصيد مقدم',
        types: {
          invoice: 'دفع الفاتورة',
          hormaris: 'مقدم',
        },
        summary: {
          payingFor: 'الدفع مقابل:',
          student: 'الطالب:',
          totalBalance: 'إجمالي الرصيد:',
          hormarisHint: 'سيتم إضافة هذا الرصيد إلى حساب الطالب للرسوم المستقبلية.',
        },
        labels: {
          amountToCredit: 'المبلغ لإضافته كرصيد',
          amountToPay: 'المبلغ للدفع',
          targetMonth: 'الشهر المستهدف (YYYY-MM)',
          method: 'الطريقة',
          reference: 'رقم المرجع',
        },
        placeholders: {
          optional: 'اختياري',
        },
        actions: {
          cancel: 'إلغاء',
          processing: 'جارٍ المعالجة...',
          confirm: 'تأكيد الدفع',
        },
        toasts: {
          recorded: 'تم تسجيل الدفع بنجاح',
          failed: 'فشل تسجيل الدفع',
          noAddPermission: 'ليست لديك صلاحية لتسجيل المدفوعات',
        },
      },

      deleteChargesModal: {
        title: 'حذف الرسوم',
        warning: 'سيؤدي هذا إلى إلغاء الفواتير غير المدفوعة من سجلات الطلاب وفقًا للمعايير المحددة.',
        labels: {
          deletionScope: 'نطاق الحذف',
          studentRegistrationId: 'رقم تسجيل الطالب',
          selectTargetClass: 'اختر الصف المستهدف',
          amountType: 'نوع المبلغ',
          year: 'السنة',
          billingMonth: 'شهر الفوترة',
          multipleMonths: 'عدة أشهر',
          createdDate: 'تاريخ الإنشاء',
          useDateFilter: 'استخدم فلتر التاريخ',
        },
        placeholders: {
          studentRegistrationId: 'مثال: STU-1001',
          grade: 'المرحلة',
          shift: 'الدوام',
          section: 'الشعبة',
          search: 'بحث…',
          allTypes: '-- كل الأنواع --',
          searchAmountTypes: 'ابحث عن أنواع المبالغ…',
        },
        scopes: {
          all: 'حذف كل الرسوم',
          single: 'طالب واحد',
          class: 'حسب الصف/المرحلة',
        },
        actions: {
          reset: 'إعادة تعيين',
          close: 'إغلاق',
          deleting: 'جارٍ الحذف...',
          deleteCharges: 'حذف الرسوم',
        },
        confirms: {
          critical: 'هام: سيؤدي هذا الإجراء إلى حذف سجلات الرسوم نهائيًا. هل أنت متأكد؟',
        },
        toasts: {
          loadConfigFailed: 'فشل تحميل بيانات الإعداد',
          selectAtLeastOneMonth: 'اختر شهر فوترة واحدًا على الأقل',
          invalidBillingMonthYear: 'شهر/سنة الفوترة غير صالح',
          selectAmountType: 'اختر نوع المبلغ للحذف',
          deletedSuccess: 'تم حذف الرسوم بنجاح ({{count}})',
          noneFound: 'لم يتم العثور على رسوم غير مدفوعة مطابقة للحذف',
          deletionFailed: 'فشل الحذف',
        },
      },
    },

    feeTypes: {
      title: 'إعداد أنواع الرسوم',
      subtitle: 'شخصي مقابل مجاني',
      create: 'إنشاء نوع الرسوم',
      modal: {
        create: 'إنشاء نوع الرسوم',
        edit: 'تعديل نوع الرسوم',
      },
      labels: {
        displayName: 'الاسم الظاهر',
        behavior: 'السلوك',
        status: 'الحالة',
        discountPercent: 'نسبة الخصم',
      },
      table: {
        type: 'نوع الرسوم',
        behavior: 'السلوك',
        status: 'الحالة',
        actions: 'الإجراءات',
      },
      behaviors: {
        charge: 'مدفوع',
        waive: 'مجاني / إعفاء',
        discount: 'خصم (%)',
      },
      status: {
        active: 'نشط',
        inactive: 'غير نشط',
      },
      actions: {
        edit: 'تعديل',
        delete: 'حذف',
        save: 'حفظ',
      },
      placeholders: {
        discountPercent: '1 - 100',
      },
      loading: {
        initializing: 'جارٍ التهيئة...',
      },
      saving: 'جارٍ الحفظ…',
      emptyTitle: 'لم يتم تعريف أنواع الرسوم.',
      confirms: {
        deactivate: 'هل تريد إلغاء تفعيل هذا النوع؟',
        permanentDelete: 'هل تريد حذف هذا النوع نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.',
      },
      toasts: {
        loadFailed: 'فشل تحميل أنواع الرسوم',
        nameRequired: 'الاسم مطلوب',
        discountInvalid: 'يجب أن تكون نسبة الخصم بين 1 و 100',
        created: 'تم إنشاء نوع الرسوم',
        updated: 'تم تحديث نوع الرسوم',
        activated: 'تم تفعيل نوع الرسوم',
        deleted: 'تم حذف نوع الرسوم',
        deactivated: 'تم إلغاء تفعيل نوع الرسوم',
        deleteBlocked: 'لا يمكن الحذف — هذا النوع مستخدم في سجلات أخرى.',
        noAddPermission: 'ليست لديك صلاحية لإنشاء أنواع الرسوم',
        noEditPermission: 'ليست لديك صلاحية لتعديل أنواع الرسوم',
        noDeletePermission: 'ليست لديك صلاحية لحذف أنواع الرسوم',
        operationFailed: 'فشل الإجراء',
      },
    },
  },

  aiChat: {
    title: 'مساعد الذكاء الاصطناعي',
    subtitle: 'يتم حفظ المحادثة لحسابك',
    placeholder: 'اكتب رسالة…',
    send: 'إرسال',
    thinking: 'يفكر…',
    empty: 'اسأل أي شيء عن كيفية استخدام النظام.',
    resize: 'اسحب لتغيير الحجم',
    history: 'السجل',
    newChat: 'محادثة جديدة',
    deleteChat: 'حذف',
    deleteConfirm: 'هل تريد حذف هذه المحادثة؟',
    errors: {
      emptyReply: 'أعاد الذكاء الاصطناعي ردًا فارغًا',
    },
  },
};
