import { ORIGINAL_TASKS } from '../data/seedTasks';
import type {
  UserProfile,
  UserRole,
  UserStatus,
  TaskItem,
  SubmissionSummary,
  AttendanceStatus,
  AcademySettings,
  BatchItem,
  FeedbackItem,
  LeaderboardEntry,
} from '../types';

// Storage keys
const KEYS = {
  USERS: 'accl_users_v2',
  TASKS: 'accl_tasks_v2',
  SUBMISSIONS: 'accl_submissions_v2',
  SUB_HISTORY: 'accl_sub_history_v2',
  ATTENDANCE: 'accl_attendance_v2',
  BATCHES: 'accl_batches_v2',
  ENROLLMENTS: 'accl_enrollments_v2',
  FEEDBACK: 'accl_feedback_v2',
  SETTINGS: 'accl_settings_v2',
  ADMISSIONS: 'accl_admissions_v2',
  TEACHER_APPS: 'accl_teacher_apps_v2',
  AUDIT_LOGS: 'accl_audit_logs_v2',
  TOKEN: 'accl_auth_token',
};

// Safe JSON Helpers
function getStore<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[LocalStorage] Failed to parse key ${key}:`, e);
    return defaultValue;
  }
}

function setStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[LocalStorage] Failed to save key ${key}:`, e);
  }
}

// Helper for Pakistan Standard Time
export function getKarachiTimeString(date = new Date()): string {
  return (
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date) + ' PKT'
  );
}

export function getKarachiDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Audit logger
function logAudit(userId: string, userName: string, userRole: string, action: string, details: string) {
  const logs = getStore<any[]>(KEYS.AUDIT_LOGS, []);
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
  setStore(KEYS.AUDIT_LOGS, logs.slice(0, 200));
}

// Database Initialization & Seeding
export function initializeStorage(forceResetTasks = false): void {
  // 1. Settings
  const existingSettings = getStore<AcademySettings | null>(KEYS.SETTINGS, null);
  if (!existingSettings) {
    const defaultSettings: AcademySettings = {
      dashboard_title: 'Farukh Businessman Wala ACCL Dashboard',
      academy_name: 'Rehan School Tuition Academy',
      footer_credit: 'Created by FARUKH BUSINESSMAN WALA',
      whatsapp_primary: '0345 3967083',
      whatsapp_second: '03421336388',
      whatsapp_primary_link: 'https://wa.me/923453967083',
      whatsapp_second_link: 'https://wa.me/923421336388',
      academy_timezone: 'Asia/Karachi',
      logo_url: '',
      require_student_approval: true,
      require_teacher_approval: true,
      currentTimePST: getKarachiTimeString(),
    };
    setStore(KEYS.SETTINGS, defaultSettings);
  }

  // 2. Tasks
  const existingTasks = getStore<TaskItem[]>(KEYS.TASKS, []);
  if (forceResetTasks || existingTasks.length === 0) {
    const seededTasks: TaskItem[] = ORIGINAL_TASKS.map((t, idx) => ({
      id: `task-${t.book.toLowerCase().replace(/\s+/g, '')}-d${t.day_number}-${idx + 1}`,
      book: t.book,
      day_number: t.day_number,
      title: t.title,
      description: t.description,
      category: t.category,
      required_links: t.required_links || ['Facebook Post', 'YouTube Content'],
      allows_text: t.allows_text !== false,
      allows_file: Boolean(t.allows_file),
      status: 'active',
      source_flag: t.source_flag || null,
      order_index: idx + 1,
      created_at: new Date().toISOString(),
    }));
    setStore(KEYS.TASKS, seededTasks);
    console.log(`[LocalStorage] Seeded ${seededTasks.length} curriculum tasks.`);
  }

  // 3. Batches
  const existingBatches = getStore<any[]>(KEYS.BATCHES, []);
  if (existingBatches.length === 0) {
    const defaultBatches: any[] = [
      {
        id: 'batch-foundation-01',
        title: 'Foundation Level 1 - Morning Batch',
        description: 'Daily morning guidance, task reviews, live English conversation practice with Call Annie and interview preparation.',
        teacher_id: 'user-owner-001',
        teacher_name: 'Sir Farukh (Lead Facilitator)',
        schedule: 'Monday to Friday: 10:00 AM - 11:30 AM PKT',
        zoom_link: 'https://us04web.zoom.us/j/rehan-school-accl',
        max_students: 30,
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ];
    setStore(KEYS.BATCHES, defaultBatches);
  }

  // 4. Default Owner (farukharain962@gmail.com with password @Farukh2199 is permanently provisioned)
  const existingUsers = getStore<any[]>(KEYS.USERS, []);
  const ownerIdx = existingUsers.findIndex((u) => u.email === 'farukharain962@gmail.com');
  const defaultOwner = {
    id: ownerIdx >= 0 ? existingUsers[ownerIdx].id : 'user-owner-001',
    email: 'farukharain962@gmail.com',
    password: '@Farukh2199',
    full_name: 'FARUKH BUSINESSMAN WALA',
    father_name: 'Haji Ghulam',
    whatsapp: '0345 3967083',
    role: 'owner' as UserRole,
    status: 'active' as UserStatus,
    learning_level: 'Book 1',
    assigned_teacher_id: null,
    can_approve: true,
    can_admit: true,
    created_at: new Date().toISOString(),
  };

  if (ownerIdx >= 0) {
    existingUsers[ownerIdx] = {
      ...existingUsers[ownerIdx],
      role: 'owner',
      status: 'active',
      password: '@Farukh2199',
      can_approve: true,
      can_admit: true,
    };
  } else {
    existingUsers.unshift(defaultOwner);
  }
  setStore(KEYS.USERS, existingUsers);
}

// Auto-run initialization on module load
initializeStorage();

// Storage API Implementation
export const storageService = {
  // Token
  getStoredToken(): string | null {
    return localStorage.getItem(KEYS.TOKEN);
  },
  setStoredToken(token: string): void {
    localStorage.setItem(KEYS.TOKEN, token);
  },
  removeStoredToken(): void {
    localStorage.removeItem(KEYS.TOKEN);
  },

  // Auth: Check Owner
  async checkOwnerExists(): Promise<{ hasOwner: boolean }> {
    const users = getStore<any[]>(KEYS.USERS, []);
    return { hasOwner: users.some((u) => u.role === 'owner') };
  },

  // Auth: First Owner Setup
  async firstOwnerSetup(data: any): Promise<{ message: string; token: string; user: UserProfile }> {
    const { full_name, email, password, whatsapp } = data;
    if (!full_name || !email || !password) {
      throw new Error('Full name, email, and password are required.');
    }

    const users = getStore<any[]>(KEYS.USERS, []);
    const cleanEmail = String(email).toLowerCase().trim();

    // Check existing
    const existingIdx = users.findIndex((u) => u.email === cleanEmail);
    const id = existingIdx >= 0 ? users[existingIdx].id : `user-${Date.now()}`;
    const now = new Date().toISOString();

    const ownerUser = {
      id,
      email: cleanEmail,
      password: String(password),
      full_name: String(full_name).trim(),
      father_name: null,
      whatsapp: whatsapp ? String(whatsapp).trim() : null,
      role: 'owner' as UserRole,
      status: 'active' as UserStatus,
      learning_level: 'Book 1',
      assigned_teacher_id: null,
      can_approve: true,
      can_admit: true,
      created_at: now,
    };

    if (existingIdx >= 0) {
      users[existingIdx] = ownerUser;
    } else {
      users.push(ownerUser);
    }
    setStore(KEYS.USERS, users);

    const token = `token-${id}-${Date.now()}`;
    storageService.setStoredToken(token);

    logAudit(id, ownerUser.full_name, 'owner', 'FIRST_OWNER_CREATED', `Owner initialized: ${cleanEmail}`);

    const userProfile: UserProfile = {
      id: ownerUser.id,
      email: ownerUser.email,
      full_name: ownerUser.full_name,
      whatsapp: ownerUser.whatsapp,
      role: 'owner',
      status: 'active',
      learning_level: 'Book 1',
      can_approve: true,
      can_admit: true,
      created_at: now,
    };

    return {
      message: 'Academy Owner account initialized successfully! You have full super admin access.',
      token,
      user: userProfile,
    };
  },

  // Auth: Student Registration
  async register(data: any): Promise<{ message: string; token: string; user: UserProfile; requiresActivation: boolean }> {
    const { full_name, father_name, email, password, whatsapp, learning_level } = data;
    if (!full_name || !email || !password) {
      throw new Error('Full name, email, and password are required.');
    }
    if (String(password).length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const users = getStore<any[]>(KEYS.USERS, []);
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const cleanEmail = String(email).toLowerCase().trim();

    const existingUser = users.find((u) => u.email === cleanEmail);
    const existingAdmission = admissions.find((a) => a.email === cleanEmail);

    if (existingUser || existingAdmission) {
      const isPending = existingUser?.status === 'pending' || existingAdmission?.status === 'pending';
      if (isPending) {
        throw new Error('An admission application with this Gmail address has already been submitted and is currently Pending Owner Review and Activation. Please wait for the Academy Owner to activate your account.');
      }
      throw new Error('An account with this Gmail address already exists and is active. Please select "Sign In" and enter your password.');
    }

    const settings = getStore<AcademySettings>(KEYS.SETTINGS, {} as any);
    const requireApproval = settings.require_student_approval !== false;
    const initialStatus: UserStatus = requireApproval ? 'pending' : 'active';

    const id = `student-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newUser = {
      id,
      email: cleanEmail,
      password: String(password),
      full_name: String(full_name).trim(),
      father_name: father_name ? String(father_name).trim() : null,
      whatsapp: whatsapp ? String(whatsapp).trim() : null,
      role: 'student' as UserRole,
      status: initialStatus,
      learning_level: learning_level || 'Book 1',
      assigned_teacher_id: null,
      can_approve: false,
      can_admit: false,
      created_at: now,
    };

    users.push(newUser);
    setStore(KEYS.USERS, users);

    // Record admission request
    admissions.unshift({
      id: `adm-${Date.now()}`,
      full_name: newUser.full_name,
      father_name: newUser.father_name || 'N/A',
      whatsapp: newUser.whatsapp || 'N/A',
      email: newUser.email,
      learning_level: newUser.learning_level,
      assigned_teacher_id: null,
      registered_by_id: id,
      notes: 'Self-registered student account',
      status: initialStatus,
      created_at: now,
    });
    setStore(KEYS.ADMISSIONS, admissions);

    logAudit(id, newUser.full_name, 'student', 'STUDENT_REGISTERED', `Student registered with status: ${initialStatus}`);

    const token = requireApproval ? '' : `token-${id}-${Date.now()}`;
    if (!requireApproval) {
      storageService.setStoredToken(token);
    }

    const userProfile: UserProfile = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      father_name: newUser.father_name,
      whatsapp: newUser.whatsapp,
      role: 'student',
      status: initialStatus,
      learning_level: newUser.learning_level,
      can_approve: false,
      can_admit: false,
      created_at: now,
    };

    return {
      message: requireApproval
        ? 'Your admission application has been submitted successfully to FARUKH BUSINESSMAN WALA for review. Please wait patiently up to 12 hours for the Owner\'s approval. Once approved, you will be able to sign in.'
        : 'Registration successful! Welcome to the Academy.',
      token,
      user: userProfile,
      requiresActivation: requireApproval,
    };
  },

  // Auth: Login
  async login(data: any): Promise<{ message: string; token: string; user: UserProfile; isPending: boolean }> {
    const { email, password } = data;
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const users = getStore<any[]>(KEYS.USERS, []);
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();
    let user = users.find((u) => u.email?.toLowerCase().trim() === cleanEmail);

    // If user not in users yet, check admissions
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const adm = admissions.find((a) => a.email?.toLowerCase().trim() === cleanEmail);

    if (!user && adm) {
      if (adm.status === 'approved') {
        user = {
          id: `student-${Date.now()}`,
          email: cleanEmail,
          password: cleanPassword || 'acclStudent@2026',
          full_name: adm.full_name,
          father_name: adm.father_name || 'N/A',
          whatsapp: adm.whatsapp,
          role: 'student',
          status: 'active',
          learning_level: adm.learning_level || 'Book 1',
          assigned_teacher_id: adm.assigned_teacher_id || null,
          can_approve: false,
          can_admit: false,
          created_at: new Date().toISOString(),
        };
        users.unshift(user);
        setStore(KEYS.USERS, users);
      } else if (adm.status === 'pending') {
        const err = new Error('Your admission is under review by Farukh Businessman Wala. Please allow up to 12 hours for owner approval. Once approved, you can sign in.') as any;
        err.status = 403;
        err.data = { error: err.message, isPending: true };
        throw err;
      } else if (adm.status === 'rejected') {
        throw new Error('Your admission was rejected by Farukh Businessman Wala. Please contact on WhatsApp (0345 3967083).');
      }
    }

    // Guaranteed Owner login for farukharain962@gmail.com with @Farukh2199
    if (cleanEmail === 'farukharain962@gmail.com') {
      if (cleanPassword === '@Farukh2199' || cleanPassword === 'acclOwner@2026') {
        if (!user) {
          user = {
            id: 'user-owner-001',
            email: 'farukharain962@gmail.com',
            password: '@Farukh2199',
            full_name: 'FARUKH BUSINESSMAN WALA',
            father_name: 'Haji Ghulam',
            whatsapp: '0345 3967083',
            role: 'owner',
            status: 'active',
            learning_level: 'Book 1',
            assigned_teacher_id: null,
            can_approve: true,
            can_admit: true,
            created_at: new Date().toISOString(),
          };
          users.unshift(user);
          setStore(KEYS.USERS, users);
        } else {
          user.role = 'owner';
          user.status = 'active';
          user.password = '@Farukh2199';
          setStore(KEYS.USERS, users);
        }
      } else {
        throw new Error('Invalid email or password.');
      }
    } else {
      if (!user) {
        throw new Error('Incorrect Email ID. This email address is not registered in the portal. Please contact Farukh Businessman Wala on WhatsApp (0345 3967083) to register your student admission.');
      }
      // Allow master override, standard default passwords, or save entered password if initial
      const isPassValid =
        user.password === cleanPassword ||
        cleanPassword === '@Farukh2199' ||
        cleanPassword === 'acclStudent@2026' ||
        cleanPassword === 'student123' ||
        cleanPassword === '123456' ||
        !user.password;

      if (!isPassValid) {
        throw new Error('Incorrect password. Please check your password or sign in with Google Sign-In.');
      }

      if (!user.password || user.password !== cleanPassword) {
        user.password = cleanPassword;
        setStore(KEYS.USERS, users);
      }
    }

    if (user.status === 'suspended') {
      throw new Error('Your account is suspended. Please contact the academy administration.');
    }

    if (user.status === 'pending') {
      const err = new Error('Your admission application is currently under review by FARUKH BUSINESSMAN WALA. Please allow up to 12 hours for the Owner to review and approve your application. Once approved, you will be able to sign in and access your student dashboard.') as any;
      err.status = 403;
      err.data = { error: err.message, isPending: true };
      throw err;
    }

    if (user.status === 'rejected') {
      const err = new Error('Your admission application was not approved by the Academy Owner. If you have questions, please contact the academy on WhatsApp.') as any;
      err.status = 403;
      err.data = { error: err.message };
      throw err;
    }

    const token = `token-${user.id}-${Date.now()}`;
    storageService.setStoredToken(token);

    // Look up assigned teacher name
    let assignedTeacherName = undefined;
    if (user.assigned_teacher_id) {
      const teacher = users.find((u) => u.id === user.assigned_teacher_id);
      if (teacher) assignedTeacherName = teacher.full_name;
    }

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      father_name: user.father_name,
      whatsapp: user.whatsapp,
      role: user.role,
      status: user.status,
      learning_level: user.learning_level || 'Book 1',
      assigned_teacher_id: user.assigned_teacher_id,
      assigned_teacher_name: assignedTeacherName,
      can_approve: Boolean(user.can_approve),
      can_admit: Boolean(user.can_admit),
      created_at: user.created_at,
    };

    return {
      message: 'Login successful.',
      token,
      user: userProfile,
      isPending: user.status === 'pending',
    };
  },

  // Google / Gmail Sign-In
  async googleLogin(data: { email: string; full_name?: string }): Promise<any> {
    const { email, full_name } = data;
    if (!email) throw new Error('Gmail address is required.');

    const cleanEmail = email.toLowerCase().trim();
    const users = getStore<any[]>(KEYS.USERS, []);
    let user = users.find((u) => u.email?.toLowerCase().trim() === cleanEmail);

    if (!user) {
      const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
      const adm = admissions.find((a) => a.email?.toLowerCase().trim() === cleanEmail);
      if (adm && adm.status === 'approved') {
        const id = `student-${Date.now()}`;
        user = {
          id,
          email: cleanEmail,
          password: 'acclStudent@2026',
          full_name: adm.full_name,
          father_name: adm.father_name || 'N/A',
          whatsapp: adm.whatsapp,
          role: 'student',
          status: 'active',
          learning_level: adm.learning_level || 'Book 1',
          assigned_teacher_id: adm.assigned_teacher_id || null,
          can_approve: false,
          can_admit: false,
          created_at: new Date().toISOString(),
        };
        users.unshift(user);
        setStore(KEYS.USERS, users);
      } else if (adm && adm.status === 'pending') {
        const err: any = new Error('Your admission is under review by Farukh Businessman Wala. Please allow up to 12 hours for owner approval.');
        err.isPending = true;
        throw err;
      }
    }

    if (!user) {
      throw new Error(`This Gmail address (${cleanEmail}) is not yet registered in the portal. Students must be registered by Farukh Businessman Wala in the Owner Dashboard first. Please contact Farukh Businessman Wala on WhatsApp (0345 3967083) to register your student account.`);
    }

    if (user.status === 'suspended') {
      throw new Error('Your student account is suspended. Please contact the academy administration.');
    }
    if (user.status === 'pending') {
      const err: any = new Error('Your admission is currently pending review by Farukh Businessman Wala. Please allow up to 12 hours for activation.');
      err.isPending = true;
      throw err;
    }
    if (user.status === 'rejected') {
      throw new Error('Your student registration was not approved. If you have questions, please contact the academy on WhatsApp.');
    }

    if (full_name && String(full_name).trim() && user.full_name === 'Student') {
      user.full_name = String(full_name).trim();
      setStore(KEYS.USERS, users);
    }

    const token = `token-${user.id}-${Date.now()}`;
    storageService.setStoredToken(token);

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      father_name: user.father_name,
      whatsapp: user.whatsapp,
      role: user.role,
      status: user.status,
      learning_level: user.learning_level || 'Book 1',
      assigned_teacher_id: user.assigned_teacher_id,
      can_approve: Boolean(user.can_approve),
      can_admit: Boolean(user.can_admit),
      created_at: user.created_at,
    };

    return {
      message: 'Signed in successfully with Google!',
      token,
      user: userProfile,
    };
  },

  async registerStudentByOwner(data: { full_name: string; whatsapp: string; email: string; learning_level?: string }): Promise<any> {
    const { full_name, whatsapp, email, learning_level } = data;
    if (!full_name || !whatsapp || !email) {
      throw new Error('Student Name, WhatsApp Number, and Gmail Address are required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = full_name.trim();
    const cleanWa = whatsapp.trim();
    const level = learning_level || 'Book 1';

    const users = getStore<any[]>(KEYS.USERS, []);
    if (users.some((u) => u.email?.toLowerCase().trim() === cleanEmail)) {
      throw new Error(`A user with Gmail address "${cleanEmail}" already exists in the system.`);
    }

    const id = `student-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newStudent = {
      id,
      email: cleanEmail,
      full_name: cleanName,
      whatsapp: cleanWa,
      role: 'student',
      status: 'active',
      learning_level: level,
      can_approve: false,
      can_admit: false,
      created_at: now,
      updated_at: now,
    };

    users.unshift(newStudent);
    setStore(KEYS.USERS, users);

    // Also admissions
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    admissions.unshift({
      id: `adm-${id}`,
      full_name: cleanName,
      father_name: 'N/A',
      whatsapp: cleanWa,
      email: cleanEmail,
      learning_level: level,
      status: 'approved',
      notes: 'Registered by Owner for Google Sign-In',
      created_at: now,
      reviewed_at: now,
    });
    setStore(KEYS.ADMISSIONS, admissions);

    return {
      message: `Student "${cleanName}" registered successfully! They can now sign in using Google Sign-In with ${cleanEmail}.`,
      student: newStudent,
    };
  },

  async registerTeacherByOwner(data: { full_name: string; email: string; whatsapp?: string; subjects?: string; password?: string; can_approve?: boolean }): Promise<any> {
    const { full_name, email, whatsapp, subjects, password, can_approve } = data;
    const users = getStore<any[]>(KEYS.USERS, []);
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = full_name.trim();

    const existing = users.find((u) => u.email === cleanEmail);
    if (existing) {
      throw new Error(`A user with email "${cleanEmail}" already exists.`);
    }

    const id = `user-teacher-${Date.now()}`;
    const now = new Date().toISOString();
    const teacherPassword = password?.trim() || 'teacher@accl2026';

    const newTeacher = {
      id,
      email: cleanEmail,
      full_name: cleanName,
      whatsapp: whatsapp?.trim() || '',
      password: teacherPassword,
      role: 'teacher' as UserRole,
      status: 'active' as UserStatus,
      learning_level: 'Book 1',
      assigned_teacher_id: null,
      can_approve: can_approve !== false,
      can_admit: false,
      created_at: now,
    };

    users.unshift(newTeacher);
    setStore(KEYS.USERS, users);

    // Also add to teacher applications
    const apps = getStore<any[]>(KEYS.TEACHER_APPS, []);
    apps.unshift({
      id: `app-${id}`,
      full_name: cleanName,
      email: cleanEmail,
      whatsapp: whatsapp?.trim() || '',
      subjects: subjects || 'General Curriculum Facilitator',
      introduction: 'Directly registered by Owner',
      status: 'approved',
      created_at: now,
      reviewed_at: now,
    });
    setStore(KEYS.TEACHER_APPS, apps);

    return {
      message: `Teacher "${cleanName}" registered successfully! Password: ${teacherPassword}`,
      teacher: newTeacher,
      temporaryPassword: teacherPassword,
    };
  },

  async clearDummyStudents(): Promise<{ message: string }> {
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const cleanAdmissions = admissions.filter((a) => a.status === 'approved' && !a.full_name?.toLowerCase().includes('dummy') && !a.email?.toLowerCase().includes('dummy') && !a.email?.toLowerCase().includes('test'));
    setStore(KEYS.ADMISSIONS, cleanAdmissions);

    const users = getStore<any[]>(KEYS.USERS, []);
    const cleanUsers = users.filter((u) => u.role !== 'student' || (!u.full_name?.toLowerCase().includes('dummy') && !u.email?.toLowerCase().includes('dummy') && !u.email?.toLowerCase().includes('test')));
    setStore(KEYS.USERS, cleanUsers);

    return { message: 'All dummy and unapproved student entries have been cleared successfully.' };
  },

  async getStudentsOverview(): Promise<{ students: any[]; totalCurriculumTasks: number }> {
    const users = getStore<any[]>(KEYS.USERS, []);
    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);
    const tasks = getStore<any[]>(KEYS.TASKS, []);
    const totalBook1 = tasks.filter((t) => t.book === 'Book 1' && t.status === 'active').length || 180;

    const students = users
      .filter((u) => u.role === 'student')
      .map((s) => {
        const studentSubs = submissions.filter((sub) => sub.student_id === s.id);
        const approved = studentSubs.filter((sub) => sub.status === 'approved').length;
        const pending = studentSubs.filter((sub) => sub.status === 'submitted').length;
        const rejected = studentSubs.filter((sub) => sub.status === 'needs_correction' || sub.status === 'rejected').length;
        const progressPercent = totalBook1 > 0 ? Math.min(100, Math.round((approved / totalBook1) * 100)) : 0;

        return {
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          whatsapp: s.whatsapp,
          status: s.status,
          learning_level: s.learning_level || 'Book 1',
          created_at: s.created_at,
          total_submissions: studentSubs.length,
          approved_count: approved,
          pending_count: pending,
          rejected_count: rejected,
          progress_percent: progressPercent,
        };
      });

    return { students, totalCurriculumTasks: totalBook1 };
  },

  // Auth: Get Current User
  async getMe(): Promise<{ user: UserProfile }> {
    const token = storageService.getStoredToken();
    if (!token) throw new Error('Unauthorized');

    // Token format: token-<userId>-<timestamp>
    const match = token.match(/^token-(.+?)-\d+$/);
    const userId = match ? match[1] : null;

    const users = getStore<any[]>(KEYS.USERS, []);
    const user = users.find((u) => u.id === userId);

    if (!user) throw new Error('Session expired or user not found.');

    let assignedTeacherName = undefined;
    if (user.assigned_teacher_id) {
      const teacher = users.find((u) => u.id === user.assigned_teacher_id);
      if (teacher) assignedTeacherName = teacher.full_name;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        father_name: user.father_name,
        whatsapp: user.whatsapp,
        role: user.role,
        status: user.status,
        learning_level: user.learning_level || 'Book 1',
        assigned_teacher_id: user.assigned_teacher_id,
        assigned_teacher_name: assignedTeacherName,
        can_approve: Boolean(user.can_approve),
        can_admit: Boolean(user.can_admit),
        created_at: user.created_at,
      },
    };
  },

  // Auth: Update Profile
  async updateProfile(data: any): Promise<{ message: string; user: UserProfile }> {
    const meRes = await storageService.getMe();
    const users = getStore<any[]>(KEYS.USERS, []);
    const idx = users.findIndex((u) => u.id === meRes.user.id);

    if (idx === -1) throw new Error('User not found.');

    const { full_name, father_name, whatsapp, password } = data;
    if (full_name) users[idx].full_name = String(full_name).trim();
    if (father_name !== undefined) users[idx].father_name = father_name ? String(father_name).trim() : null;
    if (whatsapp !== undefined) users[idx].whatsapp = whatsapp ? String(whatsapp).trim() : null;
    if (password && String(password).length >= 6) users[idx].password = String(password);

    setStore(KEYS.USERS, users);

    const updatedUser = users[idx];
    return {
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        father_name: updatedUser.father_name,
        whatsapp: updatedUser.whatsapp,
        role: updatedUser.role,
        status: updatedUser.status,
        learning_level: updatedUser.learning_level,
        can_approve: Boolean(updatedUser.can_approve),
        can_admit: Boolean(updatedUser.can_admit),
        created_at: updatedUser.created_at,
      },
    };
  },

  // Tasks: Load & Get Tasks
  async getTasks(params: { book?: string; day?: number; category?: string; search?: string; status?: string; student_id?: string } = {}): Promise<{ tasks: TaskItem[] }> {
    let tasks = getStore<TaskItem[]>(KEYS.TASKS, []);

    // If storage is empty, initialize immediately
    if (tasks.length === 0) {
      initializeStorage(true);
      tasks = getStore<TaskItem[]>(KEYS.TASKS, []);
    }

    // Get current student id
    let studentId = params.student_id;
    if (!studentId) {
      try {
        const me = await storageService.getMe();
        studentId = me.user.id;
      } catch {
        studentId = undefined;
      }
    }

    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);

    // Filter by book
    if (params.book) {
      tasks = tasks.filter((t) => t.book === params.book);
    }

    // Filter by day
    if (params.day !== undefined && !isNaN(params.day)) {
      tasks = tasks.filter((t) => t.day_number === params.day);
    }

    // Filter by category
    if (params.category && params.category !== 'all') {
      tasks = tasks.filter((t) => t.category === params.category);
    }

    // Search query
    if (params.search) {
      const q = params.search.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    // Attach submission proof for the active student
    const result: TaskItem[] = tasks.map((task) => {
      let sub = null;
      if (studentId) {
        const match = submissions.find((s) => s.task_id === task.id && s.student_id === studentId);
        if (match) {
          sub = {
            id: match.id,
            status: match.status,
            version: match.version || 1,
            fb_link: match.fb_link,
            yt_link: match.yt_link,
            li_link: match.li_link,
            insta_link: match.insta_link,
            other_link: match.other_link,
            file_url: match.file_url,
            file_name: match.file_name,
            student_notes: match.student_notes,
            reviewer_feedback: match.reviewer_feedback,
            reviewed_at: match.reviewed_at,
            submitted_at: match.submitted_at,
          };
        }
      }
      return {
        ...task,
        submission: sub,
      };
    });

    return { tasks: result };
  },

  // Tasks: Re-load Default Tasks for Owner
  async loadDefaultTasks(): Promise<{ message: string; count: number }> {
    initializeStorage(true);
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []);
    return {
      message: `Successfully loaded and synced ${tasks.length} curriculum foundation tasks into your database!`,
      count: tasks.length,
    };
  },

  // Tasks: Create New Task
  async createTask(data: any): Promise<{ message: string; taskId: string }> {
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []);
    const { book, day_number, title, description, category, required_links, allows_text, allows_file, source_flag } = data;

    if (!title || !description || !category || day_number === undefined) {
      throw new Error('Title, description, category, and day number are required.');
    }

    const taskId = `task-${String(book || 'book1').toLowerCase().replace(/\s+/g, '')}-d${day_number}-${Date.now().toString().slice(-4)}`;
    const newTask: TaskItem = {
      id: taskId,
      book: book || 'Book 1',
      day_number: Number(day_number),
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      required_links: Array.isArray(required_links) ? required_links : ['Facebook Post', 'YouTube Content'],
      allows_text: allows_text !== false,
      allows_file: Boolean(allows_file),
      status: 'active',
      source_flag: source_flag || null,
      order_index: tasks.length + 1,
      created_at: new Date().toISOString(),
    };

    tasks.push(newTask);
    setStore(KEYS.TASKS, tasks);

    return { message: 'Task added successfully!', taskId };
  },

  // Tasks: Update Task
  async updateTask(id: string, data: any): Promise<{ message: string }> {
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found.');

    tasks[idx] = {
      ...tasks[idx],
      ...data,
    };
    setStore(KEYS.TASKS, tasks);
    return { message: 'Task updated successfully.' };
  },

  // Tasks: Archive Task
  async archiveTask(id: string): Promise<{ message: string }> {
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found.');

    tasks[idx].status = 'archived';
    setStore(KEYS.TASKS, tasks);
    return { message: 'Task safely archived.' };
  },

  // Tasks: Meta Stats
  async getTaskStats(): Promise<{ totalTasks: number; book1Tasks: number; book2Tasks: number; categories: { category: string; count: number }[]; days: number[]; flaggedTasks: any[] }> {
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []).filter((t) => t.status === 'active');

    const book1Tasks = tasks.filter((t) => t.book === 'Book 1').length;
    const book2Tasks = tasks.filter((t) => t.book === 'Book 2').length;

    const catMap = new Map<string, number>();
    const daySet = new Set<number>();
    const flaggedTasks: any[] = [];

    tasks.forEach((t) => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + 1);
      if (t.book === 'Book 1') daySet.add(t.day_number);
      if (t.source_flag) flaggedTasks.push({ id: t.id, day_number: t.day_number, title: t.title, source_flag: t.source_flag });
    });

    const categories = Array.from(catMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    const days = Array.from(daySet).sort((a, b) => a - b);

    return {
      totalTasks: tasks.length,
      book1Tasks,
      book2Tasks,
      categories,
      days,
      flaggedTasks,
    };
  },

  // Submissions: Summary
  async getSummaryMe(book = 'Book 1'): Promise<SubmissionSummary> {
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []).filter((t) => (book === 'all' || t.book === book) && t.status === 'active');
    const totalTasks = tasks.length;

    let studentId = '';
    try {
      const me = await storageService.getMe();
      studentId = me.user.id;
    } catch {
      return {
        book,
        totalTasks,
        approvedCount: 0,
        pendingCount: 0,
        needsCorrectionCount: 0,
        remainingTasks: totalTasks,
        progressPercent: 0,
      };
    }

    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []).filter((s) => s.student_id === studentId);
    const approvedCount = submissions.filter((s) => s.status === 'approved' && tasks.some((t) => t.id === s.task_id)).length;
    const pendingCount = submissions.filter((s) => s.status === 'submitted' && tasks.some((t) => t.id === s.task_id)).length;
    const needsCorrectionCount = submissions.filter((s) => (s.status === 'needs_correction' || s.status === 'rejected') && tasks.some((t) => t.id === s.task_id)).length;

    const remainingTasks = Math.max(0, totalTasks - approvedCount);
    const progressPercent = totalTasks > 0 ? Math.min(100, Math.round((approvedCount / totalTasks) * 100)) : 0;

    return {
      book,
      totalTasks,
      approvedCount,
      pendingCount,
      needsCorrectionCount,
      remainingTasks,
      progressPercent,
    };
  },

  // Submissions: Submit Task
  async submitTask(data: any): Promise<{ message: string; submissionId: string; version: number; status: string }> {
    const me = await storageService.getMe();
    const studentId = me.user.id;
    const { task_id, fb_link, yt_link, li_link, insta_link, other_link, file_url, file_name, student_notes } = data;

    if (!task_id) throw new Error('Task ID is required.');

    const hasProof = Boolean(fb_link?.trim() || yt_link?.trim() || li_link?.trim() || insta_link?.trim() || other_link?.trim() || file_url?.trim() || student_notes?.trim());
    if (!hasProof) {
      throw new Error('Please provide at least one proof link, code explanation, or file upload.');
    }

    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);
    const subHistory = getStore<any[]>(KEYS.SUB_HISTORY, []);
    const now = new Date().toISOString();

    const existingIdx = submissions.findIndex((s) => s.student_id === studentId && s.task_id === task_id);

    if (existingIdx >= 0) {
      const existing = submissions[existingIdx];
      if (existing.status === 'approved') {
        throw new Error('This task is already Approved and completed! It cannot be modified.');
      }

      // Archive into history
      subHistory.push({
        id: `hist-${Date.now()}`,
        submission_id: existing.id,
        student_id: studentId,
        task_id,
        version: existing.version || 1,
        status: existing.status,
        links_json: JSON.stringify({
          fb_link: existing.fb_link,
          yt_link: existing.yt_link,
          li_link: existing.li_link,
          insta_link: existing.insta_link,
          other_link: existing.other_link,
          file_url: existing.file_url,
        }),
        student_notes: existing.student_notes,
        reviewer_id: existing.reviewer_id,
        reviewer_name: existing.reviewer_name,
        reviewer_feedback: existing.reviewer_feedback,
        timestamp: now,
      });
      setStore(KEYS.SUB_HISTORY, subHistory);

      const nextVersion = (existing.version || 1) + 1;
      submissions[existingIdx] = {
        ...existing,
        version: nextVersion,
        status: 'submitted',
        fb_link: fb_link?.trim() || null,
        yt_link: yt_link?.trim() || null,
        li_link: li_link?.trim() || null,
        insta_link: insta_link?.trim() || null,
        other_link: other_link?.trim() || null,
        file_url: file_url?.trim() || null,
        file_name: file_name?.trim() || null,
        student_notes: student_notes?.trim() || null,
        reviewer_feedback: null,
        reviewer_id: null,
        reviewer_name: null,
        reviewed_at: null,
        updated_at: now,
      };
      setStore(KEYS.SUBMISSIONS, submissions);

      logAudit(me.user.id, me.user.full_name, me.user.role, 'TASK_RESUBMITTED', `Resubmitted task ${task_id} (Version ${nextVersion})`);

      return {
        message: 'Task resubmitted successfully! Your revision is now Pending Review.',
        submissionId: existing.id,
        version: nextVersion,
        status: 'submitted',
      };
    } else {
      const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newSub = {
        id,
        student_id: studentId,
        task_id,
        version: 1,
        status: 'submitted',
        fb_link: fb_link?.trim() || null,
        yt_link: yt_link?.trim() || null,
        li_link: li_link?.trim() || null,
        insta_link: insta_link?.trim() || null,
        other_link: other_link?.trim() || null,
        file_url: file_url?.trim() || null,
        file_name: file_name?.trim() || null,
        student_notes: student_notes?.trim() || null,
        reviewer_feedback: null,
        reviewer_id: null,
        reviewer_name: null,
        reviewed_at: null,
        submitted_at: now,
        updated_at: now,
      };
      submissions.push(newSub);
      setStore(KEYS.SUBMISSIONS, submissions);

      logAudit(me.user.id, me.user.full_name, me.user.role, 'TASK_SUBMITTED', `Submitted task ${task_id} (Version 1)`);

      return {
        message: 'Task submitted successfully! It has been placed in the Pending Review queue.',
        submissionId: id,
        version: 1,
        status: 'submitted',
      };
    }
  },

  // Submissions: Review Queue
  async getReviewQueue(params: { status?: string; book?: string; search?: string; student_id?: string } = {}): Promise<{ submissions: any[] }> {
    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);
    const users = getStore<any[]>(KEYS.USERS, []);
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []);

    let list = submissions.map((sub) => {
      const student = users.find((u) => u.id === sub.student_id);
      const task = tasks.find((t) => t.id === sub.task_id);
      return {
        ...sub,
        student_name: student?.full_name || 'Student',
        student_email: student?.email || '',
        assigned_teacher_id: student?.assigned_teacher_id || null,
        task_title: task?.title || 'ACCL Task',
        task_day: task?.day_number || 1,
        task_category: task?.category || 'General',
        task_book: task?.book || 'Book 1',
      };
    });

    if (params.status) list = list.filter((s) => s.status === params.status);
    if (params.book) list = list.filter((s) => s.task_book === params.book);
    if (params.student_id) list = list.filter((s) => s.student_id === params.student_id);
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((s) => s.student_name.toLowerCase().includes(q) || s.student_email.toLowerCase().includes(q) || s.task_title.toLowerCase().includes(q));
    }

    list.sort((a, b) => new Date(b.updated_at || b.submitted_at).getTime() - new Date(a.updated_at || a.submitted_at).getTime());
    return { submissions: list };
  },

  // Submissions: Review Action
  async reviewSubmission(id: string, data: { decision: string; feedback?: string }): Promise<{ message: string; decision: string }> {
    const me = await storageService.getMe();
    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);
    const idx = submissions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Submission not found.');

    const sub = submissions[idx];
    const now = new Date().toISOString();

    submissions[idx] = {
      ...sub,
      status: data.decision,
      reviewer_id: me.user.id,
      reviewer_name: me.user.full_name,
      reviewer_feedback: data.feedback?.trim() || null,
      reviewed_at: now,
      updated_at: now,
    };
    setStore(KEYS.SUBMISSIONS, submissions);

    logAudit(me.user.id, me.user.full_name, me.user.role, 'SUBMISSION_REVIEWED', `Marked submission as ${data.decision.toUpperCase()}`);

    return {
      message: `Submission marked as ${data.decision === 'approved' ? 'Approved' : 'Needs Correction'}.`,
      decision: data.decision,
    };
  },

  // Submissions: Task History
  async getTaskHistory(taskId: string, studentId?: string): Promise<{ history: any[] }> {
    let targetId = studentId;
    if (!targetId) {
      const me = await storageService.getMe();
      targetId = me.user.id;
    }
    const history = getStore<any[]>(KEYS.SUB_HISTORY, []).filter((h) => h.task_id === taskId && h.student_id === targetId);
    return { history };
  },

  // Attendance: Status
  async getAttendanceStatus(): Promise<AttendanceStatus> {
    const me = await storageService.getMe();
    const studentId = me.user.id;
    const todayKey = getKarachiDateKey();
    const currentMonthPrefix = todayKey.substring(0, 7);

    const allSessions = getStore<any[]>(KEYS.ATTENDANCE, []).filter((s) => s.student_id === studentId);
    const activeSession = allSessions.find((s) => s.status === 'active') || null;
    const todaySessions = allSessions.filter((s) => s.date_key === todayKey);

    const distinctDays = new Set(allSessions.filter((s) => s.date_key.startsWith(currentMonthPrefix)).map((s) => s.date_key)).size;
    const completedMonth = allSessions.filter((s) => s.status === 'completed' && s.date_key.startsWith(currentMonthPrefix));
    const totalMinutes = completedMonth.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

    return {
      isCheckedIn: Boolean(activeSession),
      activeSession: activeSession
        ? {
            id: activeSession.id,
            student_id: activeSession.student_id,
            check_in_time: activeSession.check_in_time,
            check_in_local: activeSession.check_in_local,
            status: 'active',
            date_key: activeSession.date_key,
          }
        : null,
      serverCurrentTime: getKarachiTimeString(),
      dateKey: todayKey,
      todaySessions,
      monthlyStats: {
        daysPresent: distinctDays,
        completedSessions: completedMonth.length,
        totalHours: (totalMinutes / 60).toFixed(1),
      },
      disclaimer: 'App-recorded attendance, not proof of physical presence.',
    };
  },

  // Attendance: Check-In
  async checkIn(): Promise<{ message: string; session: any }> {
    const me = await storageService.getMe();
    const studentId = me.user.id;

    const allSessions = getStore<any[]>(KEYS.ATTENDANCE, []);
    const existing = allSessions.find((s) => s.student_id === studentId && s.status === 'active');
    if (existing) {
      throw new Error('You are already checked in! Please check out first before starting a new session.');
    }

    const now = new Date();
    const id = `att-${Date.now()}`;
    const checkInTime = now.toISOString();
    const checkInLocal = getKarachiTimeString(now);
    const dateKey = getKarachiDateKey(now);

    const newSession = {
      id,
      student_id: studentId,
      check_in_time: checkInTime,
      check_in_local: checkInLocal,
      status: 'active',
      date_key: dateKey,
      duration_minutes: 0,
    };

    allSessions.unshift(newSession);
    setStore(KEYS.ATTENDANCE, allSessions);

    logAudit(me.user.id, me.user.full_name, me.user.role, 'ATTENDANCE_CHECKIN', `Checked in at ${checkInLocal}`);

    return {
      message: `Checked in successfully at ${checkInLocal}! Attendance is recording.`,
      session: newSession,
    };
  },

  // Attendance: Check-Out
  async checkOut(): Promise<{ message: string; session: any }> {
    const me = await storageService.getMe();
    const studentId = me.user.id;

    const allSessions = getStore<any[]>(KEYS.ATTENDANCE, []);
    const idx = allSessions.findIndex((s) => s.student_id === studentId && s.status === 'active');
    if (idx === -1) {
      throw new Error('No active check-in session found to check out from.');
    }

    const session = allSessions[idx];
    const now = new Date();
    const checkOutTime = now.toISOString();
    const checkOutLocal = getKarachiTimeString(now);
    const durationMs = Math.max(0, now.getTime() - new Date(session.check_in_time).getTime());
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    allSessions[idx] = {
      ...session,
      check_out_time: checkOutTime,
      check_out_local: checkOutLocal,
      duration_minutes: durationMinutes,
      status: 'completed',
    };
    setStore(KEYS.ATTENDANCE, allSessions);

    logAudit(me.user.id, me.user.full_name, me.user.role, 'ATTENDANCE_CHECKOUT', `Checked out at ${checkOutLocal} (${durationMinutes} mins)`);

    return {
      message: `Checked out successfully! Session duration: ${durationMinutes} minute(s).`,
      session: allSessions[idx],
    };
  },

  // Attendance: History
  async getAttendanceHistory(studentId?: string): Promise<{ history: any[] }> {
    let targetId = studentId;
    if (!targetId) {
      const me = await storageService.getMe();
      targetId = me.user.id;
    }
    const history = getStore<any[]>(KEYS.ATTENDANCE, []).filter((s) => s.student_id === targetId);
    history.sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
    return { history };
  },

  // Admissions: Submit Student
  async submitStudentAdmission(data: any): Promise<{ message: string; admissionId: string }> {
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const id = `adm-${Date.now()}`;
    const now = new Date().toISOString();

    admissions.unshift({
      id,
      full_name: data.full_name.trim(),
      father_name: data.father_name.trim(),
      whatsapp: data.whatsapp.trim(),
      email: String(data.email).toLowerCase().trim(),
      learning_level: data.learning_level || 'Book 1',
      assigned_teacher_id: data.assigned_teacher_id || null,
      notes: data.notes?.trim() || null,
      status: 'pending',
      created_at: now,
    });
    setStore(KEYS.ADMISSIONS, admissions);

    return {
      message: 'New Student Admission request submitted! It is currently Pending Owner Review and Activation.',
      admissionId: id,
    };
  },

  // Admissions: Submit Teacher App
  async submitTeacherApplication(data: any): Promise<{ message: string; applicationId: string }> {
    const apps = getStore<any[]>(KEYS.TEACHER_APPS, []);
    const id = `tapp-${Date.now()}`;
    const now = new Date().toISOString();

    apps.unshift({
      id,
      full_name: data.full_name.trim(),
      email: String(data.email).toLowerCase().trim(),
      whatsapp: data.whatsapp.trim(),
      subjects: data.subjects.trim(),
      introduction: data.introduction.trim(),
      experience: data.experience?.trim() || null,
      status: 'pending',
      created_at: now,
    });
    setStore(KEYS.TEACHER_APPS, apps);

    return {
      message: 'Teacher application submitted successfully! Your application is now Pending Owner Approval.',
      applicationId: id,
    };
  },

  // Admissions: List Students
  async getStudentAdmissions(): Promise<{ admissions: any[] }> {
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    return { admissions };
  },

  // Admissions: Approve Student
  async approveStudentAdmission(id: string): Promise<{ message: string }> {
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const admIdx = admissions.findIndex((a) => a.id === id);
    if (admIdx === -1) throw new Error('Admission not found.');

    const adm = admissions[admIdx];
    admissions[admIdx].status = 'approved';
    admissions[admIdx].reviewed_at = new Date().toISOString();
    setStore(KEYS.ADMISSIONS, admissions);

    // Activate or create user
    const users = getStore<any[]>(KEYS.USERS, []);
    const cleanAdmEmail = adm.email.toLowerCase().trim();
    const userIdx = users.findIndex((u) => u.email?.toLowerCase().trim() === cleanAdmEmail);
    if (userIdx >= 0) {
      users[userIdx].status = 'active';
      users[userIdx].learning_level = adm.learning_level || users[userIdx].learning_level || 'Book 1';
      if (adm.assigned_teacher_id) users[userIdx].assigned_teacher_id = adm.assigned_teacher_id;
    } else {
      users.unshift({
        id: `student-${Date.now()}`,
        email: cleanAdmEmail,
        password: 'acclStudent@2026',
        full_name: adm.full_name,
        father_name: adm.father_name || 'N/A',
        whatsapp: adm.whatsapp,
        role: 'student',
        status: 'active',
        learning_level: adm.learning_level || 'Book 1',
        assigned_teacher_id: adm.assigned_teacher_id || null,
        can_approve: false,
        can_admit: false,
        created_at: new Date().toISOString(),
      });
    }
    setStore(KEYS.USERS, users);

    return { message: `Student admission approved! Student account for ${adm.full_name} is now Active.` };
  },

  // Admissions: Reject Student
  async rejectStudentAdmission(id: string): Promise<{ message: string }> {
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const admIdx = admissions.findIndex((a) => a.id === id);
    if (admIdx >= 0) {
      const email = admissions[admIdx].email;
      admissions[admIdx].status = 'rejected';
      admissions[admIdx].reviewed_at = new Date().toISOString();
      setStore(KEYS.ADMISSIONS, admissions);

      const users = getStore<any[]>(KEYS.USERS, []);
      const userIdx = users.findIndex((u) => u.email === email && u.status === 'pending');
      if (userIdx >= 0) {
        users[userIdx].status = 'suspended';
        setStore(KEYS.USERS, users);
      }
    }
    return { message: 'Student admission rejected.' };
  },

  // Admissions: List Teachers
  async getTeacherApplications(): Promise<{ applications: any[] }> {
    const apps = getStore<any[]>(KEYS.TEACHER_APPS, []);
    return { applications: apps };
  },

  // Admissions: Approve Teacher
  async approveTeacherApplication(id: string, data: any): Promise<{ message: string; temporaryPassword?: string }> {
    const apps = getStore<any[]>(KEYS.TEACHER_APPS, []);
    const appIdx = apps.findIndex((a) => a.id === id);
    if (appIdx === -1) throw new Error('Application not found.');

    const app = apps[appIdx];
    app.status = 'approved';
    app.reviewed_at = new Date().toISOString();
    setStore(KEYS.TEACHER_APPS, apps);

    const tempPassword = data.initial_password || 'teacher@accl2026';
    const users = getStore<any[]>(KEYS.USERS, []);
    const userIdx = users.findIndex((u) => u.email === app.email);

    if (userIdx >= 0) {
      users[userIdx].role = 'teacher';
      users[userIdx].status = 'active';
      users[userIdx].can_approve = Boolean(data.can_approve);
      users[userIdx].can_admit = Boolean(data.can_admit);
    } else {
      users.push({
        id: `teacher-${Date.now()}`,
        email: app.email,
        password: tempPassword,
        full_name: app.full_name,
        whatsapp: app.whatsapp,
        role: 'teacher',
        status: 'active',
        learning_level: 'Book 1',
        can_approve: Boolean(data.can_approve),
        can_admit: Boolean(data.can_admit),
        created_at: new Date().toISOString(),
      });
    }
    setStore(KEYS.USERS, users);

    return {
      message: `Teacher ${app.full_name} approved successfully! Login credentials activated.`,
      temporaryPassword: tempPassword,
    };
  },

  // Admissions: Reject Teacher
  async rejectTeacherApplication(id: string): Promise<{ message: string }> {
    const apps = getStore<any[]>(KEYS.TEACHER_APPS, []);
    const appIdx = apps.findIndex((a) => a.id === id);
    if (appIdx >= 0) {
      apps[appIdx].status = 'rejected';
      apps[appIdx].reviewed_at = new Date().toISOString();
      setStore(KEYS.TEACHER_APPS, apps);
    }
    return { message: 'Teacher application rejected.' };
  },

  // Users: List Users
  async getUsers(params: { role?: string; status?: string; search?: string } = {}): Promise<{ users: UserProfile[] }> {
    let users = getStore<any[]>(KEYS.USERS, []);
    if (params.role) users = users.filter((u) => u.role === params.role);
    if (params.status) users = users.filter((u) => u.status === params.status);
    if (params.search) {
      const q = params.search.toLowerCase();
      users = users.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.whatsapp && u.whatsapp.includes(q)));
    }

    const profiles: UserProfile[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      father_name: u.father_name,
      whatsapp: u.whatsapp,
      role: u.role,
      status: u.status,
      learning_level: u.learning_level || 'Book 1',
      assigned_teacher_id: u.assigned_teacher_id,
      can_approve: Boolean(u.can_approve),
      can_admit: Boolean(u.can_admit),
      created_at: u.created_at,
    }));

    return { users: profiles };
  },

  // Users: Teachers List
  async getTeachersList(): Promise<{ teachers: any[] }> {
    const users = getStore<any[]>(KEYS.USERS, []);
    const teachers = users
      .filter((u) => ['teacher', 'owner', 'admin'].includes(u.role) && u.status === 'active')
      .map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        whatsapp: u.whatsapp,
        can_approve: Boolean(u.can_approve),
        can_admit: Boolean(u.can_admit),
      }));
    return { teachers };
  },

  // Users: Update User
  async updateUser(id: string, data: any): Promise<{ message: string }> {
    const users = getStore<any[]>(KEYS.USERS, []);
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found.');

    users[idx] = {
      ...users[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    setStore(KEYS.USERS, users);
    return { message: 'User updated successfully.' };
  },

  // Users: Audit Logs
  async getAuditLogs(): Promise<{ logs: any[] }> {
    const logs = getStore<any[]>(KEYS.AUDIT_LOGS, []);
    return { logs };
  },

  // Batches: List
  async getBatches(): Promise<{ batches: BatchItem[] }> {
    const batches = getStore<any[]>(KEYS.BATCHES, []);
    const enrollments = getStore<any[]>(KEYS.ENROLLMENTS, []);

    let studentId = '';
    try {
      const me = await storageService.getMe();
      studentId = me.user.id;
    } catch {}

    const list: BatchItem[] = batches.map((b) => {
      const batchEnrolls = enrollments.filter((e) => e.batch_id === b.id);
      const isEnrolled = Boolean(studentId && batchEnrolls.some((e) => e.student_id === studentId));
      return {
        id: b.id,
        title: b.title,
        description: b.description,
        teacher_id: b.teacher_id,
        teacher_name: b.teacher_name,
        schedule: b.schedule,
        zoom_link: b.zoom_link,
        max_students: b.max_students || 25,
        status: b.status || 'active',
        enrolled_count: batchEnrolls.length,
        is_enrolled: isEnrolled,
      };
    });

    return { batches: list };
  },

  // Batches: Enroll
  async enrollBatch(batchId: string): Promise<{ message: string }> {
    const me = await storageService.getMe();
    const enrollments = getStore<any[]>(KEYS.ENROLLMENTS, []);

    const existing = enrollments.find((e) => e.batch_id === batchId && e.student_id === me.user.id);
    if (existing) throw new Error('You are already enrolled in this learning batch.');

    enrollments.push({
      id: `enr-${Date.now()}`,
      batch_id: batchId,
      student_id: me.user.id,
      status: 'enrolled',
      enrolled_at: new Date().toISOString(),
    });
    setStore(KEYS.ENROLLMENTS, enrollments);

    return { message: 'Successfully enrolled in batch!' };
  },

  // Batches: Create
  async createBatch(data: any): Promise<{ message: string; batchId: string }> {
    const batches = getStore<any[]>(KEYS.BATCHES, []);
    const id = `batch-${Date.now()}`;
    batches.unshift({
      id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      teacher_id: data.teacher_id || null,
      teacher_name: data.teacher_name?.trim() || null,
      schedule: data.schedule.trim(),
      zoom_link: data.zoom_link?.trim() || null,
      max_students: Number(data.max_students) || 25,
      status: 'active',
      created_at: new Date().toISOString(),
    });
    setStore(KEYS.BATCHES, batches);
    return { message: 'Group learning batch created successfully.', batchId: id };
  },

  // Feedback: Submit
  async submitFeedback(data: { category: string; rating: number; comment: string }): Promise<{ message: string; feedbackId: string }> {
    const me = await storageService.getMe();
    const feedbacks = getStore<any[]>(KEYS.FEEDBACK, []);
    const id = `fb-${Date.now()}`;

    feedbacks.unshift({
      id,
      student_id: me.user.id,
      student_name: me.user.full_name,
      category: data.category.trim(),
      rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
      comment: data.comment.trim(),
      admin_response: null,
      created_at: new Date().toISOString(),
    });
    setStore(KEYS.FEEDBACK, feedbacks);

    return { message: 'Thank you! Your feedback has been recorded.', feedbackId: id };
  },

  // Feedback: List
  async getFeedbacks(): Promise<{ feedbacks: FeedbackItem[]; stats: { total: number; averageRating: number } }> {
    const feedbacks = getStore<FeedbackItem[]>(KEYS.FEEDBACK, []);
    const total = feedbacks.length;
    const avg = total > 0 ? feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / total : 5;

    return {
      feedbacks,
      stats: {
        total,
        averageRating: Number(avg.toFixed(1)),
      },
    };
  },

  // Feedback: Respond
  async respondFeedback(id: string, response: string): Promise<{ message: string }> {
    const feedbacks = getStore<any[]>(KEYS.FEEDBACK, []);
    const idx = feedbacks.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error('Feedback not found.');

    feedbacks[idx].admin_response = response.trim();
    feedbacks[idx].responded_at = new Date().toISOString();
    setStore(KEYS.FEEDBACK, feedbacks);

    return { message: 'Response posted successfully to the feedback scoreboard.' };
  },

  // Scoreboard
  async getScoreboard(): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const users = getStore<any[]>(KEYS.USERS, []).filter((u) => u.role === 'student' && u.status === 'active');
    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);
    const attendance = getStore<any[]>(KEYS.ATTENDANCE, []);

    let currentUserId = '';
    try {
      const me = await storageService.getMe();
      currentUserId = me.user.id;
    } catch {}

    const entries = users.map((u) => {
      const approvedCount = submissions.filter((s) => s.student_id === u.id && s.status === 'approved').length;
      const attCount = attendance.filter((a) => a.student_id === u.id && a.status === 'completed').length;
      const totalPoints = approvedCount * 10 + attCount * 5;

      return {
        id: u.id,
        name: u.full_name,
        learning_level: u.learning_level || 'Book 1',
        approvedTasks: approvedCount,
        attendanceSessions: attCount,
        totalPoints,
        isCurrentStudent: u.id === currentUserId,
      };
    });

    entries.sort((a, b) => b.totalPoints - a.totalPoints || b.approvedTasks - a.approvedTasks);

    const leaderboard: LeaderboardEntry[] = entries.map((e, idx) => ({
      ...e,
      rank: idx + 1,
    }));

    return { leaderboard };
  },

  // Settings
  async getSettings(): Promise<AcademySettings> {
    const settings = getStore<AcademySettings>(KEYS.SETTINGS, {} as any);
    return {
      ...settings,
      currentTimePST: getKarachiTimeString(),
    };
  },

  async updateSettings(data: Partial<AcademySettings>): Promise<{ message: string }> {
    const current = getStore<AcademySettings>(KEYS.SETTINGS, {} as any);
    const updated = {
      ...current,
      ...data,
    };
    setStore(KEYS.SETTINGS, updated);
    return { message: 'Academy settings updated successfully.' };
  },

  // Admin Overview Stats
  async getAdminStats(): Promise<any> {
    const users = getStore<any[]>(KEYS.USERS, []);
    const tasks = getStore<TaskItem[]>(KEYS.TASKS, []).filter((t) => t.status === 'active');
    const submissions = getStore<any[]>(KEYS.SUBMISSIONS, []);
    const teacherApps = getStore<any[]>(KEYS.TEACHER_APPS, []);
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const attendance = getStore<any[]>(KEYS.ATTENDANCE, []);

    const totalStudents = users.filter((u) => u.role === 'student' && u.status === 'active').length;
    const pendingStudents = users.filter((u) => u.role === 'student' && u.status === 'pending').length;
    const totalTeachers = users.filter((u) => u.role === 'teacher' && u.status === 'active').length;
    const pendingTeachers = teacherApps.filter((a) => a.status === 'pending').length;
    const pendingAdmissions = admissions.filter((a) => a.status === 'pending').length;

    const totalTasks = tasks.length;
    const pendingSubmissions = submissions.filter((s) => s.status === 'submitted').length;
    const approvedSubmissions = submissions.filter((s) => s.status === 'approved').length;
    const needsCorrectionSubmissions = submissions.filter((s) => s.status === 'needs_correction' || s.status === 'rejected').length;

    const todayKey = getKarachiDateKey();
    const todayCheckins = attendance.filter((a) => a.date_key === todayKey).length;
    const activeNow = attendance.filter((a) => a.status === 'active').length;

    return {
      totalStudents,
      pendingStudents,
      totalTeachers,
      pendingTeachers,
      pendingAdmissions,
      totalTasks,
      pendingSubmissions,
      approvedSubmissions,
      needsCorrectionSubmissions,
      todayCheckins,
      activeNow,
      todayKey,
      currentTime: getKarachiTimeString(),
    };
  },

  // Backup & Restore
  exportDatabase(): string {
    const exportData: Record<string, any> = {};
    Object.entries(KEYS).forEach(([name, key]) => {
      exportData[name] = getStore(key, null);
    });
    return JSON.stringify(exportData, null, 2);
  },

  importDatabase(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      Object.entries(KEYS).forEach(([name, key]) => {
        if (data[name] !== undefined) {
          setStore(key, data[name]);
        }
      });
      return true;
    } catch {
      return false;
    }
  },

  // Permanent Cross-Device Synchronization Helpers
  mergeAdmissions(serverAdmissions: any[]): void {
    if (!Array.isArray(serverAdmissions)) return;
    const local = getStore<any[]>(KEYS.ADMISSIONS, []);
    const localMap = new Map(local.map((a) => [a.email?.toLowerCase().trim() || a.id, a]));

    for (const sa of serverAdmissions) {
      const key = sa.email?.toLowerCase().trim() || sa.id;
      const existing = localMap.get(key);
      if (!existing) {
        localMap.set(key, sa);
      } else {
        // Favor approved status or newer status
        localMap.set(key, {
          ...existing,
          ...sa,
          status: existing.status === 'approved' || sa.status === 'approved' ? 'approved' : sa.status,
        });
      }
    }
    setStore(KEYS.ADMISSIONS, Array.from(localMap.values()));
  },

  mergeUsers(serverUsers: any[]): void {
    if (!Array.isArray(serverUsers)) return;
    const local = getStore<any[]>(KEYS.USERS, []);
    const localMap = new Map(local.map((u) => [u.email?.toLowerCase().trim() || u.id, u]));

    for (const su of serverUsers) {
      const key = su.email?.toLowerCase().trim() || su.id;
      const existing = localMap.get(key);
      if (!existing) {
        localMap.set(key, su);
      } else {
        localMap.set(key, {
          ...existing,
          ...su,
          status: existing.status === 'active' || su.status === 'active' ? 'active' : su.status,
        });
      }
    }
    setStore(KEYS.USERS, Array.from(localMap.values()));
  },

  saveUserLocally(userProfile: UserProfile, password?: string): void {
    const local = getStore<any[]>(KEYS.USERS, []);
    const cleanEmail = userProfile.email?.toLowerCase().trim();
    const idx = local.findIndex((u) => u.email?.toLowerCase().trim() === cleanEmail);

    const record = {
      id: userProfile.id,
      email: cleanEmail,
      full_name: userProfile.full_name,
      father_name: userProfile.father_name,
      whatsapp: userProfile.whatsapp,
      role: userProfile.role,
      status: userProfile.status,
      learning_level: userProfile.learning_level,
      assigned_teacher_id: userProfile.assigned_teacher_id,
      can_approve: Boolean(userProfile.can_approve),
      can_admit: Boolean(userProfile.can_admit),
      created_at: userProfile.created_at || new Date().toISOString(),
      ...(password ? { password } : {}),
    };

    if (idx >= 0) {
      local[idx] = { ...local[idx], ...record };
    } else {
      local.push(record);
    }
    setStore(KEYS.USERS, local);
  },

  getAllForSync(): { clientAdmissions: any[]; clientUsers: any[] } {
    const clientAdmissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const clientUsers = getStore<any[]>(KEYS.USERS, []);
    return { clientAdmissions, clientUsers };
  },

  deleteAdmissionLocally(id: string): { message: string } {
    const admissions = getStore<any[]>(KEYS.ADMISSIONS, []);
    const adm = admissions.find((a) => a.id === id);
    const filtered = admissions.filter((a) => a.id !== id);
    setStore(KEYS.ADMISSIONS, filtered);

    if (adm?.email) {
      const users = getStore<any[]>(KEYS.USERS, []);
      const cleanUsers = users.filter((u) => u.email !== adm.email || u.role === 'owner');
      setStore(KEYS.USERS, cleanUsers);
    }
    return { message: 'Admission deleted successfully.' };
  },

  cleanAllAdmissionsLocally(): { message: string } {
    setStore(KEYS.ADMISSIONS, []);
    const users = getStore<any[]>(KEYS.USERS, []);
    const onlyOwner = users.filter((u) => u.role === 'owner');
    setStore(KEYS.USERS, onlyOwner);
    return { message: 'All student admissions cleaned.' };
  },
};


