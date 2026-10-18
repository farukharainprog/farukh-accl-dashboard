import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  GraduationCap,
  LogIn,
  MessageCircle,
  Phone,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface WelcomePageProps {
  onSuccessLogin: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onSuccessLogin }) => {
  const { login, settings } = useAuth();

  // Mode: 'student' (Google/Gmail Sign-in) vs 'owner' (Owner & Staff Password Sign-in)
  const [authMode, setAuthMode] = useState<'student' | 'owner'>('student');

  // Student Google / Gmail Sign-In state
  const [studentGmail, setStudentGmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [unregisteredNotice, setUnregisteredNotice] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);

  // Student sign-in sub-mode: 'google' vs 'password'
  const [studentAuthType, setStudentAuthType] = useState<'google' | 'password'>('google');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentPassLoading, setStudentPassLoading] = useState(false);

  // Owner / Staff Password Sign-In state
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState('');

  // Handle Student Email & Password Sign-In
  const handleStudentPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setUnregisteredNotice(false);
    setPendingNotice(false);

    if (!studentGmail.trim()) {
      setStudentError('Please enter your registered Gmail / Email address.');
      return;
    }
    if (!studentPassword.trim()) {
      setStudentError('Please enter your password.');
      return;
    }

    setStudentPassLoading(true);

    try {
      const res = await api.login({
        email: studentGmail.trim().toLowerCase(),
        password: studentPassword.trim(),
      });

      if (res.user?.status === 'pending' || res.isPending) {
        setPendingNotice(true);
        setStudentError('Aap ka admission Farukh Businessman Wala review kar rahe hain. Baraye meherbani 12 hours sabar farmayein.');
        return;
      }

      if (res.user?.status === 'suspended' || res.user?.status === 'rejected') {
        setStudentError('Your student account is not active. Please contact Farukh Businessman Wala on WhatsApp.');
        return;
      }

      // Remember last signed in student Gmail on this device
      try {
        localStorage.setItem('accl_last_student_gmail', studentGmail.trim().toLowerCase());
      } catch {}

      login(res.token, res.user);
      onSuccessLogin();
    } catch (err: any) {
      if (err?.data?.isUnregistered || err?.message?.toLowerCase().includes('not registered') || err?.message?.toLowerCase().includes('incorrect email')) {
        setUnregisteredNotice(true);
      } else if (err?.data?.isPending || err?.message?.toLowerCase().includes('sabar') || err?.message?.toLowerCase().includes('pending')) {
        setPendingNotice(true);
      }
      setStudentError(err?.message || 'Login failed. Please check your email and password.');
    } finally {
      setStudentPassLoading(false);
    }
  };

  const dashboardTitle = settings?.dashboard_title || 'Farukh Businessman Wala ACCL Dashboard';
  const academyName = settings?.academy_name || 'Rehan School Tuition Academy';
  const primaryPhone = settings?.whatsapp_primary || '0345 3967083';
  const primaryWaLink = settings?.whatsapp_primary_link || 'https://wa.me/923453967083';
  const secondPhone = settings?.whatsapp_second || '03421336388';
  const secondWaLink = settings?.whatsapp_second_link || 'https://wa.me/923421336388';

  // Handle Student Google / Gmail Sign-In (Password-Free)
  const handleStudentGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setUnregisteredNotice(false);
    setPendingNotice(false);

    if (!studentGmail.trim()) {
      setStudentError('Please enter your Gmail address.');
      return;
    }

    setStudentLoading(true);

    try {
      const res = await api.googleLogin({
        email: studentGmail.trim().toLowerCase(),
        full_name: studentName.trim() || undefined,
      });

      if (res.user?.status === 'pending' || res.isPending) {
        setPendingNotice(true);
        setStudentError('Your student account is pending activation by Farukh Businessman Wala.');
        return;
      }

      if (res.user?.status === 'suspended' || res.user?.status === 'rejected') {
        setStudentError('Your student account is not active. Please contact Farukh Businessman Wala on WhatsApp.');
        return;
      }

      // Remember last signed in student Gmail on this laptop
      try {
        localStorage.setItem('accl_last_student_gmail', studentGmail.trim().toLowerCase());
        if (studentName.trim()) {
          localStorage.setItem('accl_last_student_name', studentName.trim());
        }
      } catch {}

      login(res.token, res.user);
      onSuccessLogin();
    } catch (err: any) {
      if (err?.data?.isUnregistered || err?.message?.toLowerCase().includes('not yet registered')) {
        setUnregisteredNotice(true);
      } else if (err?.data?.isPending || err?.message?.toLowerCase().includes('pending')) {
        setPendingNotice(true);
      }
      setStudentError(err?.message || 'Failed to sign in. Please check your Gmail address.');
    } finally {
      setStudentLoading(false);
    }
  };

  // Handle Owner / Staff Login (Email + Password)
  const handleOwnerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    setOwnerLoading(true);

    try {
      const res = await api.login({
        email: ownerEmail.trim().toLowerCase(),
        password: ownerPassword,
      });

      if (res.user?.status === 'suspended') {
        setOwnerError('Your account is suspended.');
        return;
      }

      login(res.token, res.user);
      onSuccessLogin();
    } catch (err: any) {
      setOwnerError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setOwnerLoading(false);
    }
  };

  // Auto-fill last used student Gmail on this laptop for frictionless access
  React.useEffect(() => {
    try {
      const savedGmail = localStorage.getItem('accl_last_student_gmail');
      const savedName = localStorage.getItem('accl_last_student_name');
      if (savedGmail) setStudentGmail(savedGmail);
      if (savedName) setStudentName(savedName);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar Header */}
      <div className="bg-[#0B3A79] text-white py-6 px-4 sm:px-8 border-b border-blue-900 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="w-13 h-13 rounded-xl bg-white/10 p-2 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <GraduationCap className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">
                Official Student & Curriculum Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {dashboardTitle}
              </h1>
              <p className="text-xs font-medium text-blue-200">
                {academyName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={primaryWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp: {primaryPhone}</span>
            </a>
            <a
              href={secondWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{secondPhone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Login Viewport */}
      <main className="max-w-md w-full mx-auto p-4 sm:p-6 my-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
          {/* Role Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('student');
                setStudentError('');
                setUnregisteredNotice(false);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'student'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Student Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('owner');
                setOwnerError('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'owner'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Owner & Staff</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: STUDENT GOOGLE / GMAIL SIGN IN                      */}
          {/* ========================================================= */}
          {authMode === 'student' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
                  {/* Google SVG G-Logo */}
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Sign in with Google</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access your daily ACCL tasks, attendance tracker, and submissions
                </p>
              </div>

              {/* Unregistered Notice Banner */}
              {unregisteredNotice && (
                <div className="p-4 mb-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 mb-1">
                        Gmail Not Yet Registered
                      </h4>
                      <p className="leading-relaxed">
                        This Gmail address is not yet registered by the Owner (<strong>Farukh Businessman Wala</strong>). Students must be registered by the Owner first.
                      </p>
                      <a
                        href={`${primaryWaLink}?text=${encodeURIComponent(`Hello Farukh Businessman Wala, please register my student Gmail account: ${studentGmail}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Request Owner on WhatsApp to Register Me</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Approval Notice */}
              {pendingNotice && (
                <div className="p-4 mb-4 rounded-xl bg-blue-50 border border-blue-300 text-xs text-blue-950">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-blue-900 mb-1">
                        Account Under Review
                      </h4>
                      <p className="leading-relaxed">
                        Your admission is currently under review by <strong>Farukh Businessman Wala</strong>. Please allow up to 12 hours for the Owner to activate your access.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {studentError && !unregisteredNotice && !pendingNotice && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{studentError}</span>
                </div>
              )}

              {/* Student Sign-In Method Selector */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 mb-5 text-[11px] font-semibold border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setStudentAuthType('google');
                    setStudentError('');
                  }}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    studentAuthType === 'google'
                      ? 'bg-white text-blue-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Google Sign-In (No Password)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentAuthType('password');
                    setStudentError('');
                  }}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    studentAuthType === 'password'
                      ? 'bg-white text-blue-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3 h-3 text-blue-600" />
                  <span>Email & Password</span>
                </button>
              </div>

              {/* OPTION A: GOOGLE SIGN-IN */}
              {studentAuthType === 'google' && (
                <form onSubmit={handleStudentGoogleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Your Registered Gmail Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="student@gmail.com"
                        value={studentGmail}
                        onChange={(e) => setStudentGmail(e.target.value)}
                        className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter the Gmail address registered with Farukh Businessman Wala
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your student name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                  </div>

                  {/* Primary Google Sign In Action Button */}
                  <button
                    type="submit"
                    disabled={studentLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {studentLoading ? (
                      <span>Signing in securely...</span>
                    ) : (
                      <>
                        <span>Continue with Google Sign-In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* OPTION B: EMAIL & PASSWORD SIGN-IN */}
              {studentAuthType === 'password' && (
                <form onSubmit={handleStudentPasswordSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Registered Email / Gmail
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@gmail.com"
                      value={studentGmail}
                      onChange={(e) => setStudentGmail(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter your password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Initial default password: <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">acclStudent@2026</code> (or your chosen password)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={studentPassLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{studentPassLoading ? 'Signing in...' : 'Sign In with Password'}</span>
                  </button>
                </form>
              )}

              <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Permanent Device Session</p>
                <p>
                  Your account and task submissions remain permanently saved on this device (laptops & mobile phones).
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: OWNER & STAFF LOGIN WITH PASSWORD                   */}
          {/* ========================================================= */}
          {authMode === 'owner' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-indigo-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Owner & Staff Login</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Farukh Businessman Wala Administration Portal
                </p>
              </div>

              {ownerError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{ownerError}</span>
                </div>
              )}

              <form onSubmit={handleOwnerLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Owner Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter owner email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter owner password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ownerLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{ownerLoading ? 'Verifying...' : 'Sign in as Owner'}</span>
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('student')}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  ← Back to Student Google Sign-In
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <p className="font-medium text-slate-600">
          Farukh Businessman Wala ACCL Dashboard &copy; {new Date().getFullYear()}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Rehan School Tuition Academy &bull; Karachi Standard Time (Asia/Karachi)
        </p>
      </footer>
    </div>
  );
};

export default WelcomePage;
