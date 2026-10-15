import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  GraduationCap,
  Shield,
  UserCheck,
  UserPlus,
  LogIn,
  MessageCircle,
  Phone,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Users,
  Video,
  KeyRound,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface WelcomePageProps {
  onSuccessLogin: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onSuccessLogin }) => {
  const { login, settings, hasOwner, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'teacher' | 'owner_setup'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pendingNotice, setPendingNotice] = useState(false);

  // Student Register form state
  const [regName, setRegName] = useState('');
  const [regFatherName, setRegFatherName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regLevel, setRegLevel] = useState('Book 1');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState('');

  // Teacher Application state
  const [teachName, setTeachName] = useState('');
  const [teachEmail, setTeachEmail] = useState('');
  const [teachWhatsapp, setTeachWhatsapp] = useState('');
  const [teachSubjects, setTeachSubjects] = useState('');
  const [teachIntro, setTeachIntro] = useState('');
  const [teachExp, setTeachExp] = useState('');
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachSuccess, setTeachSuccess] = useState<string | null>(null);
  const [teachError, setTeachError] = useState('');

  // Owner Setup state
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState('');

  const dashboardTitle = settings?.dashboard_title || 'Farukh Businessman Wala ACCL Dashboard';
  const academyName = settings?.academy_name || 'Rehan School Tuition Academy';
  const primaryPhone = settings?.whatsapp_primary || '0345 3967083';
  const primaryWaLink = settings?.whatsapp_primary_link || 'https://wa.me/923453967083';
  const secondPhone = settings?.whatsapp_second || '03421336388';
  const secondWaLink = settings?.whatsapp_second_link || 'https://wa.me/923421336388';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setPendingNotice(false);
    setLoginLoading(true);

    try {
      const res = await api.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      login(res.token, res.user);

      if (res.isPending) {
        setPendingNotice(true);
      } else {
        onSuccessLogin();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(null);
    setRegLoading(true);

    try {
      const res = await api.register({
        full_name: regName.trim(),
        father_name: regFatherName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        whatsapp: regWhatsapp.trim(),
        learning_level: regLevel,
      });

      login(res.token, res.user);
      setRegSuccess(res.message);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeachError('');
    setTeachSuccess(null);
    setTeachLoading(true);

    try {
      const res = await api.submitTeacherApplication({
        full_name: teachName.trim(),
        email: teachEmail.trim(),
        whatsapp: teachWhatsapp.trim(),
        subjects: teachSubjects.trim(),
        introduction: teachIntro.trim(),
        experience: teachExp.trim(),
      });
      setTeachSuccess(res.message);
      setTeachName('');
      setTeachEmail('');
      setTeachWhatsapp('');
      setTeachSubjects('');
      setTeachIntro('');
      setTeachExp('');
    } catch (err: any) {
      setTeachError(err.message || 'Application failed.');
    } finally {
      setTeachLoading(false);
    }
  };

  const handleOwnerSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    setOwnerLoading(true);

    try {
      const res = await api.firstOwnerSetup({
        full_name: ownerName.trim(),
        email: ownerEmail.trim(),
        password: ownerPassword,
        whatsapp: ownerWhatsapp.trim(),
        setup_key: ownerKey.trim(),
      });

      login(res.token, res.user);
      onSuccessLogin();
    } catch (err: any) {
      setOwnerError(err.message || 'Owner setup failed.');
    } finally {
      setOwnerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Banner */}
      <div className="bg-[#0B3A79] text-white py-8 px-4 sm:px-8 border-b border-blue-900 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <GraduationCap className="w-10 h-10 text-amber-300" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-blue-200">
                Official Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {dashboardTitle}
              </h1>
              <p className="text-sm font-semibold text-blue-200 mt-0.5">
                {academyName}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href={primaryWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: {primaryPhone}</span>
            </a>
            <a
              href={secondWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp: {secondPhone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 my-6">
        {/* Navigation Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Student Registration</span>
          </button>

          <button
            onClick={() => setActiveTab('teacher')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              activeTab === 'teacher'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Become a Teacher</span>
          </button>

          {!hasOwner && (
            <button
              onClick={() => setActiveTab('owner_setup')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                activeTab === 'owner_setup'
                  ? 'bg-amber-500 text-slate-900 shadow-md'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Initial Owner Setup</span>
            </button>
          )}
        </div>

        {/* Form Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'login' && (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Sign in to your Academy Account</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access your ACCL tasks, attendance tracker, and submissions
                </p>
              </div>

              {loginError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {pendingNotice && (
                <div className="p-4 mb-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900">
                  <h4 className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Account Pending Activation
                  </h4>
                  <p>
                    Your student registration has been received! The Academy Owner must review and activate your account before you can open the dashboard. You may contact Owner on WhatsApp at <strong>{primaryPhone}</strong> for priority activation.
                  </p>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email / Gmail Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                >
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                <span>New student? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Create an account
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENT REGISTRATION */}
          {activeTab === 'register' && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Student Admission & Access Request</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enroll in Rehan School Foundation ACCL Course (Day 1 - 180)
                </p>
              </div>

              {regError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-emerald-900 mb-1">Registration Submitted!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                    {regSuccess}
                  </p>
                  <p className="text-xs text-slate-600 mb-4">
                    Please send your name on WhatsApp to <strong>{primaryPhone}</strong> for rapid admission approval.
                  </p>
                  <button
                    onClick={() => setActiveTab('login')}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Farukh Arain"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        placeholder="Father's full name"
                        value={regFatherName}
                        onChange={(e) => setRegFatherName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Email / Gmail *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="student@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 03453967083"
                        value={regWhatsapp}
                        onChange={(e) => setRegWhatsapp(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Create Password * (min 6 chars)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Starting Level *
                      </label>
                      <select
                        value={regLevel}
                        onChange={(e) => setRegLevel(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="Book 1">Book 1 (Foundation Level)</option>
                        <option value="Book 2">Book 2 (Advanced Level)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Note: Newly registered accounts require Owner activation before opening tasks.
                  </p>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                  >
                    {regLoading ? 'Submitting Registration...' : 'Submit Student Admission Request'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: BECOME A TEACHER */}
          {activeTab === 'teacher' && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Become an ACCL Teacher / Mentor</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Guide students through Foundation Book 1 & Book 2 tasks, review proofs, and lead Live Zoom sessions
                </p>
              </div>

              {teachError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{teachError}</span>
                </div>
              )}

              {teachSuccess ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-emerald-900 mb-1">Application Submitted!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                    {teachSuccess}
                  </p>
                  <p className="text-xs text-slate-600 mb-4">
                    The Owner will review your credentials and contact you on WhatsApp at <strong>{primaryPhone}</strong> with your login passkey.
                  </p>
                  <button
                    onClick={() => setActiveTab('login')}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTeacherSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sir Asad / Miss Sana"
                        value={teachName}
                        onChange={(e) => setTeachName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="teacher@example.com"
                        value={teachEmail}
                        onChange={(e) => setTeachEmail(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="03XXXXXXXXX"
                        value={teachWhatsapp}
                        onChange={(e) => setTeachWhatsapp(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Subjects / Skills *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. English, Coding, Call Annie"
                        value={teachSubjects}
                        onChange={(e) => setTeachSubjects(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Short Introduction & Experience *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Tell us about your background, teaching experience, and why you wish to facilitate students..."
                      value={teachIntro}
                      onChange={(e) => setTeachIntro(e.target.value)}
                      className="w-full text-xs p-3 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={teachLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                  >
                    {teachLoading ? 'Submitting Application...' : 'Submit Teacher Application'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: OWNER SETUP */}
          {activeTab === 'owner_setup' && (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mx-auto mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Academy Owner Setup</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Initialize the first Super Admin / Owner account with full administrative authority
                </p>
              </div>

              {ownerError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{ownerError}</span>
                </div>
              )}

              <form onSubmit={handleOwnerSetupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Owner Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="FARUKH BUSINESSMAN WALA"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Owner Email / Gmail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@rehanschool.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Create Master Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Owner WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="03453967083"
                    value={ownerWhatsapp}
                    onChange={(e) => setOwnerWhatsapp(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ownerLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-black shadow-md transition-colors disabled:opacity-50"
                >
                  {ownerLoading ? 'Setting up Owner...' : 'Initialize Owner Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-4 text-center text-xs border-t border-slate-800">
        <p className="font-semibold text-slate-200">
          Created by FARUKH BUSINESSMAN WALA • {academyName}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          WhatsApp: {primaryPhone} / {secondPhone}
        </p>
      </footer>
    </div>
  );
};
