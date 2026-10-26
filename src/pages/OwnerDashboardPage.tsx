import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Check,
  X,
  Facebook,
  Youtube,
  Linkedin,
  Instagram,
  FileText,
  User,
  GraduationCap,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  Trash2,
  Plus,
  Bell,
} from 'lucide-react';

export const OwnerDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // State: Student Registration Form (Only 3 required fields)
  const [studentName, setStudentName] = useState('');
  const [studentWhatsapp, setStudentWhatsapp] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [learningLevel, setLearningLevel] = useState('Book 1');
  const [registering, setRegistering] = useState(false);
  const [regNotice, setRegNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State: Teacher Registration & Management
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherApps, setTeacherApps] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherWhatsapp, setTeacherWhatsapp] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState('');
  const [teacherCanApprove, setTeacherCanApprove] = useState(true);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [teacherNotice, setTeacherNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State: Task Submissions Review Queue
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [subFilter, setSubFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted');
  const [subSearch, setSubSearch] = useState('');

  // State: Reject modal / inline prompt
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Real-time submission live alert
  const [newSubAlert, setNewSubAlert] = useState<{ studentName: string; taskTitle: string; taskDay: number } | null>(null);
  const prevPendingCountRef = React.useRef<number | null>(null);

  // State: Students Progress Reports
  const [studentsOverview, setStudentsOverview] = useState<any[]>([]);
  const [totalCurriculum, setTotalCurriculum] = useState(180);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // General Action Notice banner
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Submissions
  const fetchSubmissions = async (silent = false) => {
    if (!silent) setLoadingSubmissions(true);
    try {
      const res = await api.getReviewQueue({
        status: subFilter === 'all' ? undefined : subFilter === 'rejected' ? 'needs_correction' : subFilter,
        search: subSearch.trim() || undefined,
      });
      const items = res.submissions || [];

      // Detect new incoming submissions in real-time
      const currentPending = items.filter((s: any) => s.status === 'submitted');
      if (prevPendingCountRef.current !== null && currentPending.length > prevPendingCountRef.current) {
        const newest = currentPending[0];
        if (newest) {
          setNewSubAlert({
            studentName: newest.student_name,
            taskTitle: newest.task_title,
            taskDay: newest.task_day,
          });
          // Play a gentle alert sound if supported
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, ctx.currentTime);
              osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.12, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
              osc.start();
              osc.stop(ctx.currentTime + 0.4);
            }
          } catch (e) {
            // Audio context autoplay might be restricted
          }
          setTimeout(() => setNewSubAlert(null), 8000);
        }
      }
      prevPendingCountRef.current = currentPending.length;
      setSubmissions(items);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      if (!silent) setLoadingSubmissions(false);
    }
  };

  // Load Students Overview
  const fetchStudents = async (silent = false) => {
    if (!silent) setLoadingStudents(true);
    try {
      const res = await api.getStudentsOverview();
      setStudentsOverview(res.students || []);
      if (res.totalCurriculumTasks) setTotalCurriculum(res.totalCurriculumTasks);
    } catch (err) {
      console.error('Failed to load students overview:', err);
    } finally {
      if (!silent) setLoadingStudents(false);
    }
  };

  // Load Teachers & Applications
  const fetchTeachers = async (silent = false) => {
    if (!silent) setLoadingTeachers(true);
    try {
      const [tList, tApps] = await Promise.all([
        api.getTeachersList(),
        api.getTeacherApplications().catch(() => ({ applications: [] })),
      ]);
      setTeachers(tList?.teachers || []);
      setTeacherApps(tApps?.applications || []);
    } catch (err) {
      console.warn('Failed to load teachers:', err);
    } finally {
      if (!silent) setLoadingTeachers(false);
    }
  };

  // Initial and polling sync (every 2 seconds for instant real-time live review queue)
  useEffect(() => {
    fetchSubmissions();
    fetchStudents();
    fetchTeachers();

    const interval = setInterval(() => {
      fetchSubmissions(true);
      fetchStudents(true);
      fetchTeachers(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [subFilter, subSearch]);

  // Handle Register Teacher
  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherNotice(null);
    setAddingTeacher(true);
    try {
      const res = await api.registerTeacherByOwner({
        full_name: teacherName.trim(),
        email: teacherEmail.trim().toLowerCase(),
        whatsapp: teacherWhatsapp.trim(),
        subjects: teacherSubjects.trim(),
        can_approve: teacherCanApprove,
      });
      setTeacherNotice({
        type: 'success',
        text: res.message || `Teacher "${teacherName}" added successfully! Initial temporary password: ${res.temporaryPassword || 'teacher@accl2026'}`,
      });
      setTeacherName('');
      setTeacherEmail('');
      setTeacherWhatsapp('');
      setTeacherSubjects('');
      await fetchTeachers(true);
    } catch (err: any) {
      setTeacherNotice({
        type: 'error',
        text: err.message || 'Failed to add teacher.',
      });
    } finally {
      setAddingTeacher(false);
    }
  };

  // Handle Approve Teacher Application
  const handleApproveTeacherApp = async (id: string, name: string) => {
    try {
      const res = await api.approveTeacherApplication(id, { can_approve: true });
      setActionNotice({
        type: 'success',
        text: (res.message || `Teacher ${name} approved successfully!`) + (res.temporaryPassword ? ` Password: ${res.temporaryPassword}` : ''),
      });
      await fetchTeachers(true);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Approval failed' });
    }
  };

  // Handle Reject Teacher Application
  const handleRejectTeacherApp = async (id: string) => {
    try {
      const res = await api.rejectTeacherApplication(id);
      setActionNotice({
        type: 'success',
        text: res.message || 'Teacher application rejected.',
      });
      await fetchTeachers(true);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Rejection failed' });
    }
  };

  // Handle Clear Dummy Students
  const handleClearDummyStudents = async () => {
    if (!confirm('Are you sure you want to clean all dummy and test student admission entries? Approved students with real assignments will be preserved.')) return;
    try {
      const res = await api.clearDummyStudents();
      setActionNotice({
        type: 'success',
        text: res.message || 'Dummy student entries cleared successfully!',
      });
      await fetchStudents(false);
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to clear dummy entries' });
    }
  };

  // Handle Register Student (Only Name, WhatsApp, Gmail)
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegNotice(null);
    setRegistering(true);

    try {
      const res = await api.registerStudentByOwner({
        full_name: studentName.trim(),
        whatsapp: studentWhatsapp.trim(),
        email: studentEmail.trim().toLowerCase(),
        learning_level: learningLevel,
      });

      setRegNotice({
        type: 'success',
        text: res.message || `Student "${studentName}" registered permanently! They can now sign in using Google Sign-In with ${studentEmail}.`,
      });

      // Reset form
      setStudentName('');
      setStudentWhatsapp('');
      setStudentEmail('');

      // Refresh data
      await fetchStudents(true);
    } catch (err: any) {
      setRegNotice({
        type: 'error',
        text: err.message || 'Failed to register student.',
      });
    } finally {
      setRegistering(false);
    }
  };

  // Direct 1-Click Approve Task
  const handleApproveSubmission = async (subId: string, studentName: string) => {
    setActionLoadingId(subId);
    setActionNotice(null);

    try {
      await api.reviewSubmission(subId, {
        decision: 'approved',
        feedback: 'Approved by Farukh Businessman Wala',
      });

      setActionNotice({
        type: 'success',
        text: `Task for ${studentName} approved successfully! The student dashboard is updated.`,
      });

      await fetchSubmissions(true);
      await fetchStudents(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to approve task.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Direct Reject Task
  const handleRejectSubmission = async (subId: string, studentName: string) => {
    setActionLoadingId(subId);
    setActionNotice(null);

    try {
      await api.reviewSubmission(subId, {
        decision: 'needs_correction',
        feedback: rejectFeedback.trim() || 'Submission rejected by Farukh Businessman Wala. Please revise your social media proof and resubmit.',
      });

      setActionNotice({
        type: 'success',
        text: `Task for ${studentName} marked as Rejected / Needs Correction. Feedback sent to student.`,
      });

      setRejectingSubId(null);
      setRejectFeedback('');
      await fetchSubmissions(true);
      await fetchStudents(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to reject task.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle Student Status (Active / Suspended)
  const handleToggleStudentStatus = async (studentId: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(studentId, { status: newStatus });
      setActionNotice({
        type: 'success',
        text: `Student ${name} status updated to ${newStatus.toUpperCase()}.`,
      });
      await fetchStudents(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to update student status.',
      });
    }
  };

  // Filtered students by search
  const filteredStudents = studentsOverview.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.whatsapp?.toLowerCase().includes(q)
    );
  });

  // Calculate quick metrics
  const totalStudents = studentsOverview.length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'submitted').length;
  const approvedSubmissionsCount = submissions.filter((s) => s.status === 'approved').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-slate-100 border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-slate-700 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-md cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              Owner Control Center
            </span>
            <span className="text-xs text-slate-400">&bull; Farukh Businessman Wala</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Student Admissions, Tasks & Approval Hub
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Register students in 3 steps without passwords, review task submissions, and track student progress in real time.
          </p>
        </div>

        <button
          onClick={() => {
            fetchSubmissions(false);
            fetchStudents(false);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary KPI Counters Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Students</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {totalStudents}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Permanent Google Accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs bg-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2 font-mono tabular-nums">
            {pendingSubmissionsCount}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Awaiting Owner Approval</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Approved Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
            {approvedSubmissionsCount}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Completed & Verified</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curriculum Tasks</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {totalCurriculum}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Book 1 & Book 2</p>
        </div>
      </div>

      {/* Real-time New Task Submission Alert Banner (Pops up immediately when a student submits) */}
      {newSubAlert && (
        <div className="p-4 bg-linear-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-950 text-amber-300">
                  New Task Submitted Just Now!
                </span>
                <span className="text-xs font-bold text-slate-900">Real-Time Sync</span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                {newSubAlert.studentName} submitted Day {newSubAlert.taskDay}: &quot;{newSubAlert.taskTitle}&quot;
              </h4>
              <p className="text-xs font-semibold text-slate-900/80">
                Awaiting your review and approval below.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNewSubAlert(null)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer"
          >
            Review Now ↓
          </button>
        </div>
      )}

      {/* Urgent Pending Review Banner if tasks are waiting */}
      {pendingSubmissionsCount > 0 && !newSubAlert && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-xl">
              <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {pendingSubmissionsCount} Student {pendingSubmissionsCount === 1 ? 'Task' : 'Tasks'} Waiting For Your Approval
              </h4>
              <p className="text-xs text-amber-800">
                Student dashboard displays &quot;Pending Task&quot; until you click Approve below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubFilter('submitted');
                const el = document.getElementById('submissions-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Review Pending Tasks ({pendingSubmissionsCount})
            </button>
          </div>
        </div>
      )}

      {/* Quick Section Anchor Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        <a
          href="#submissions-section"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
            pendingSubmissionsCount > 0
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Task Submissions</span>
          {pendingSubmissionsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded-full text-[10px] font-black">
              {pendingSubmissionsCount}
            </span>
          )}
        </a>

        <a
          href="#registration-section"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5 text-blue-600" />
          <span>Register Student (3 Details)</span>
        </a>

        <a
          href="#teachers-section"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
        >
          <Users className="w-3.5 h-3.5 text-teal-600" />
          <span>Teachers Directory ({teachers.length})</span>
        </a>

        <a
          href="#students-section"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
        >
          <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          <span>Students Progress ({totalStudents})</span>
        </a>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TASK SUBMISSIONS & APPROVAL REVIEW (DIRECT APPROVE / REJECT)   */}
      {/* ========================================================================= */}
      <div id="submissions-section" className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Task Submissions & Approval Review
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Sync (Every 2s)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Review student task submissions in real time. Click Approve or Reject to update student dashboard immediately.
              </p>
            </div>
          </div>

          {/* Filter Status Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSubFilter('submitted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subFilter === 'submitted'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending Review ({submissions.filter((s) => s.status === 'submitted').length})
            </button>

            <button
              onClick={() => setSubFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subFilter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Approved
            </button>

            <button
              onClick={() => setSubFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subFilter === 'rejected'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Needs Correction
            </button>

            <button
              onClick={() => setSubFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Submissions List */}
        {loadingSubmissions ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading task submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No submissions found</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {subFilter === 'submitted'
                ? 'Great job! There are no pending task submissions waiting for review.'
                : 'No task records matching this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isPending = sub.status === 'submitted';
              const isApproved = sub.status === 'approved';
              const isRejected = sub.status === 'needs_correction' || sub.status === 'rejected';

              return (
                <div
                  key={sub.id}
                  className={`bg-white border-2 rounded-xl p-4 sm:p-5 shadow-xs transition-all ${
                    isPending ? 'border-amber-300 bg-amber-50/15' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{sub.student_name}</span>
                        <span className="text-xs text-slate-400">&bull; {sub.student_email}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-700 mt-0.5">
                        Day {sub.task_day}: {sub.task_title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {new Date(sub.updated_at || sub.submitted_at).toLocaleDateString()}
                      </span>
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                          Needs Correction
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proof Links & Student Notes */}
                  <div className="py-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Submitted Social Media & Proof Links:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sub.fb_link && (
                        <a
                          href={sub.fb_link.startsWith('http') ? sub.fb_link : `https://${sub.fb_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                        >
                          <Facebook className="w-3.5 h-3.5 text-blue-600" />
                          <span>Facebook Post</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                      {sub.yt_link && (
                        <a
                          href={sub.yt_link.startsWith('http') ? sub.yt_link : `https://${sub.yt_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
                        >
                          <Youtube className="w-3.5 h-3.5 text-red-600" />
                          <span>YouTube Video</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                      {sub.li_link && (
                        <a
                          href={sub.li_link.startsWith('http') ? sub.li_link : `https://${sub.li_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
                        >
                          <Linkedin className="w-3.5 h-3.5 text-sky-600" />
                          <span>LinkedIn Post</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                      {sub.insta_link && (
                        <a
                          href={sub.insta_link.startsWith('http') ? sub.insta_link : `https://${sub.insta_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-pink-50 text-pink-800 border border-pink-200 hover:bg-pink-100"
                        >
                          <Instagram className="w-3.5 h-3.5 text-pink-600" />
                          <span>Instagram</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                      {sub.other_link && (
                        <a
                          href={sub.other_link.startsWith('http') ? sub.other_link : `https://${sub.other_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200"
                        >
                          <span>Other Link</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                      {sub.file_url && (
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{sub.file_name || 'View File'}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                    </div>

                    {sub.student_notes && (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono">
                        <span className="font-bold text-slate-500 uppercase text-[10px] block">
                          Student Notes:
                        </span>
                        {sub.student_notes}
                      </div>
                    )}

                    {sub.reviewer_feedback && (
                      <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 text-xs text-red-900">
                        <span className="font-bold text-red-800 uppercase text-[10px] block">
                          Feedback:
                        </span>
                        {sub.reviewer_feedback}
                      </div>
                    )}
                  </div>

                  {/* Reject Prompt (if currently rejecting this submission) */}
                  {rejectingSubId === sub.id && (
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2 my-2 animate-in fade-in">
                      <label className="block text-xs font-bold text-red-900">
                        Reason / Feedback to Student for Correction:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 'Please tag 10 friends on Facebook and set post to Public.'"
                        value={rejectFeedback}
                        onChange={(e) => setRejectFeedback(e.target.value)}
                        className="w-full text-xs p-2.5 border rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingSubId(null);
                            setRejectFeedback('');
                          }}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectSubmission(sub.id, sub.student_name)}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Owner Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={actionLoadingId === sub.id}
                      onClick={() => handleApproveSubmission(sub.id, sub.student_name)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                        isApproved
                          ? 'bg-emerald-700 opacity-80 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isApproved ? 'Approved ✓' : 'Approve Task'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoadingId === sub.id}
                      onClick={() => {
                        setRejectingSubId(sub.id);
                        setRejectFeedback('');
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                        isRejected
                          ? 'bg-red-700 opacity-80 cursor-default'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isRejected ? 'Rejected ✕' : 'Reject Task'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: SIMPLE STUDENT REGISTRATION (3 DETAILS ONLY)                  */}
      {/* ========================================================================= */}
      <div id="registration-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Register New Student (3 Fields Only)
              </h3>
              <p className="text-xs text-slate-500">
                No password required. Enter student details; they sign in directly using Google Sign-In with their Gmail.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Password-Free Google Access
          </span>
        </div>

        {/* Success / Notice Notification */}
        {regNotice && (
          <div
            className={`p-3.5 mb-6 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              regNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {regNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-700 shrink-0" />
              )}
              <span>{regNotice.text}</span>
            </div>
            <button
              onClick={() => setRegNotice(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleRegisterStudent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Student Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                1. Student Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Muhammad Ali"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            {/* 2. WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                2. WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 0300 1234567"
                value={studentWhatsapp}
                onChange={(e) => setStudentWhatsapp(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            {/* 3. Gmail Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                3. Gmail Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="student@gmail.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">Curriculum Level:</span>
              <select
                value={learningLevel}
                onChange={(e) => setLearningLevel(e.target.value)}
                className="text-xs py-1.5 px-3 border rounded-lg bg-slate-50"
              >
                <option value="Book 1">Book 1 (Foundation - 180 Days)</option>
                <option value="Book 2">Book 2 (Advanced)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{registering ? 'Saving & Granting Access...' : 'Save & Give Portal Access'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: TEACHER REGISTRATION & MANAGEMENT                             */}
      {/* ========================================================================= */}
      <div id="teachers-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Teacher & Facilitator Management
              </h3>
              <p className="text-xs text-slate-500">
                Register new academy teachers, assign task review privileges, and manage mentor staff.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
            {teachers.length} Active {teachers.length === 1 ? 'Teacher' : 'Teachers'}
          </span>
        </div>

        {/* Teacher Notice Alert */}
        {teacherNotice && (
          <div
            className={`p-3.5 mb-6 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              teacherNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {teacherNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-slate-700 shrink-0" />
              )}
              <span>{teacherNotice.text}</span>
            </div>
            <button
              onClick={() => setTeacherNotice(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Add Teacher Form */}
        <form onSubmit={handleRegisterTeacher} className="space-y-4 mb-6 pb-6 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Add New Teacher to Academy
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teacher Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sir Asad Khan"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teacher Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="teacher@gmail.com"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="03XXXXXXXXX"
                value={teacherWhatsapp}
                onChange={(e) => setTeacherWhatsapp(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Subjects / Expertise
              </label>
              <input
                type="text"
                placeholder="e.g. English, Call Annie, AI"
                value={teacherSubjects}
                onChange={(e) => setTeacherSubjects(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={teacherCanApprove}
                onChange={(e) => setTeacherCanApprove(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Allow this teacher to review & approve student tasks</span>
            </label>

            <button
              type="submit"
              disabled={addingTeacher}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{addingTeacher ? 'Adding Teacher...' : 'Add Teacher'}</span>
            </button>
          </div>
        </form>

        {/* Pending Teacher Applications (if any) */}
        {teacherApps.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-3">
              Pending Teacher Applications ({teacherApps.length})
            </h4>
            <div className="space-y-2">
              {teacherApps.map((app) => (
                <div key={app.id} className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{app.full_name}</span>
                    <span className="text-[11px] text-slate-500 ml-2">({app.email})</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">{app.subjects} &bull; WA: {app.whatsapp}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveTeacherApp(app.id, app.full_name)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                    >
                      Approve Teacher
                    </button>
                    <button
                      onClick={() => handleRejectTeacherApp(app.id)}
                      className="px-2.5 py-1 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Teachers List */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Academy Teachers Directory
          </h4>
          {loadingTeachers ? (
            <p className="text-xs text-slate-400 py-3">Loading teachers...</p>
          ) : teachers.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No teachers registered yet. Use the form above to add a teacher.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teachers.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{t.email}</p>
                    {t.whatsapp && (
                      <p className="text-[10px] text-emerald-700 font-mono mt-0.5">WA: {t.whatsapp}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-100 text-teal-800 shrink-0">
                    {t.can_approve ? 'Approver' : 'Mentor'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: STUDENT REGISTRATION DETAILS & PROGRESS REPORTS               */}
      {/* ========================================================================= */}
      <div id="students-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Registered Students & Progress Reports
              </h3>
              <p className="text-xs text-slate-500">
                All permanently saved student accounts, WhatsApp contacts, and curriculum completion stats.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, WhatsApp..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border rounded-xl bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loadingStudents ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading student reports...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No students found</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Use the registration form above to add your first student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Student Details</th>
                  <th className="py-3 px-3">WhatsApp</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Approved</th>
                  <th className="py-3 px-3">Pending</th>
                  <th className="py-3 px-3">Rejected</th>
                  <th className="py-3 px-3">Curriculum Progress</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const waNumber = s.whatsapp ? s.whatsapp.replace(/[^0-9]/g, '') : '';
                  const waLink = waNumber ? `https://wa.me/${waNumber.startsWith('92') ? waNumber : `92${waNumber.replace(/^0/, '')}`}` : '';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{s.full_name}</div>
                        <div className="text-[11px] text-slate-500">{s.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Registered: {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {s.whatsapp ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{s.whatsapp}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 tabular-nums">
                        {s.approved_count}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-amber-700 tabular-nums">
                        {s.pending_count}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-red-700 tabular-nums">
                        {s.rejected_count}
                      </td>

                      <td className="py-3.5 px-3 min-w-44">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                          <span className="font-semibold text-slate-700">{s.approved_count} / {totalCurriculum}</span>
                          <span className="font-bold text-blue-700">{s.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${s.progress_percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(s.id, s.status, s.full_name)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            s.status === 'active'
                              ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          }`}
                        >
                          {s.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
