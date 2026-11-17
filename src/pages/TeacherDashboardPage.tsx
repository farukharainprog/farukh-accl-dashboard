import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Search,
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
  Users,
  Bell,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // State: Add Student Form (scoped automatically to this teacher)
  const [studentName, setStudentName] = useState('');
  const [studentWhatsapp, setStudentWhatsapp] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [learningLevel, setLearningLevel] = useState('Book 1');
  const [registering, setRegistering] = useState(false);
  const [regNotice, setRegNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State: Submissions Queue (scoped to this teacher's students)
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [subFilter, setSubFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted');
  const [subSearch, setSubSearch] = useState('');

  // Reject / Needs Correction inline feedback
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Live notification for newly submitted tasks by teacher's students
  const [newSubAlert, setNewSubAlert] = useState<{ studentName: string; taskTitle: string; taskDay: number } | null>(null);
  const prevPendingCountRef = useRef<number | null>(null);

  // State: My Students Overview
  const [myStudents, setMyStudents] = useState<any[]>([]);
  const [totalCurriculum, setTotalCurriculum] = useState(180);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // Attendance modal
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState<any | null>(null);
  const [studentAttendanceLogs, setStudentAttendanceLogs] = useState<any[]>([]);
  const [loadingAttendanceLogs, setLoadingAttendanceLogs] = useState(false);

  // Notice banner
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-flight guards to prevent race-condition flicker on 3.5s polling
  const subInFlightRef = useRef(false);
  const stuInFlightRef = useRef(false);

  const fetchSubmissions = async (silent = false) => {
    if (silent && subInFlightRef.current) return;
    subInFlightRef.current = true;
    if (!silent) setLoadingSubmissions(true);

    try {
      const res = await api.getReviewQueue({
        status: subFilter === 'all' ? undefined : subFilter === 'rejected' ? 'needs_correction' : subFilter,
      });
      const items = res.submissions || [];

      const currentPending = items.filter((s: any) => s.status === 'submitted');
      if (prevPendingCountRef.current !== null && currentPending.length > prevPendingCountRef.current) {
        const newest = currentPending[0];
        if (newest) {
          setNewSubAlert({
            studentName: newest.student_name,
            taskTitle: newest.task_title,
            taskDay: newest.task_day,
          });
          setTimeout(() => setNewSubAlert(null), 8000);
        }
      }
      prevPendingCountRef.current = currentPending.length;
      setSubmissions(items);
    } catch (err) {
      console.error('Failed to load teacher submissions queue:', err);
    } finally {
      subInFlightRef.current = false;
      if (!silent) setLoadingSubmissions(false);
    }
  };

  const fetchMyStudents = async (silent = false) => {
    if (silent && stuInFlightRef.current) return;
    stuInFlightRef.current = true;
    if (!silent) setLoadingStudents(true);

    try {
      const res = await api.getStudentsOverview();
      setMyStudents(res.students || []);
      if (res.totalCurriculumTasks) setTotalCurriculum(res.totalCurriculumTasks);
    } catch (err) {
      console.error('Failed to load teacher students overview:', err);
    } finally {
      stuInFlightRef.current = false;
      if (!silent) setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchMyStudents();

    const interval = setInterval(() => {
      fetchSubmissions(true);
      fetchMyStudents(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [subFilter]);

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
        assigned_teacher_id: user?.id || null,
      });

      setRegNotice({
        type: 'success',
        text: res.message || `Student "${studentName}" added to your Teacher Portal! Their tasks will automatically come to you.`,
      });

      setStudentName('');
      setStudentWhatsapp('');
      setStudentEmail('');

      await fetchMyStudents(true);
    } catch (err: any) {
      setRegNotice({
        type: 'error',
        text: err.message || 'Failed to add student.',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleApproveSubmission = async (sub: any) => {
    if (user?.role === 'teacher' && user?.can_approve === false) {
      setActionNotice({
        type: 'error',
        text: 'Task approval permission is disabled for your teacher account. You can request corrections or contact the Academy Owner.',
      });
      return;
    }

    setActionLoadingId(sub.id);
    setActionNotice(null);

    try {
      await api.reviewSubmission(sub.id, {
        decision: 'approved',
        feedback: `Approved by Teacher ${user?.full_name || ''}`.trim(),
        submissionSnapshot: sub,
      });

      setActionNotice({
        type: 'success',
        text: `Task for ${sub.student_name} approved successfully!`,
      });

      await fetchSubmissions(true);
      await fetchMyStudents(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to approve task.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmission = async (sub: any) => {
    setActionLoadingId(sub.id);
    setActionNotice(null);

    try {
      await api.reviewSubmission(sub.id, {
        decision: 'needs_correction',
        feedback: rejectFeedback.trim() || `Correction requested by Teacher ${user?.full_name || ''}. Please review and resubmit.`,
        submissionSnapshot: sub,
      });

      setActionNotice({
        type: 'success',
        text: `Feedback sent to ${sub.student_name}. Status updated to Needs Correction.`,
      });

      setRejectingSubId(null);
      setRejectFeedback('');
      await fetchSubmissions(true);
      await fetchMyStudents(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to send correction feedback.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStudentStatus = async (studentId: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(studentId, { status: newStatus });
      setActionNotice({
        type: 'success',
        text: `Student ${name} status updated to ${newStatus.toUpperCase()}.`,
      });
      await fetchMyStudents(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Failed to update student status.',
      });
    }
  };

  const handleOpenAttendanceModal = async (student: any) => {
    setSelectedStudentForAttendance(student);
    setLoadingAttendanceLogs(true);
    try {
      const res = await api.getAttendanceHistory(student.id);
      setStudentAttendanceLogs(res?.history || []);
    } catch {
      setStudentAttendanceLogs([]);
    } finally {
      setLoadingAttendanceLogs(false);
    }
  };

  // Client-side search filtering with useMemo to eliminate flicker
  const filteredSubmissions = useMemo(() => {
    if (!subSearch.trim()) return submissions;
    const q = subSearch.toLowerCase();
    return submissions.filter(
      (s) =>
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.student_email || '').toLowerCase().includes(q) ||
        (s.task_title || '').toLowerCase().includes(q)
    );
  }, [submissions, subSearch]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return myStudents;
    const q = studentSearch.toLowerCase();
    return myStudents.filter(
      (s) =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.whatsapp || '').toLowerCase().includes(q)
    );
  }, [myStudents, studentSearch]);

  const totalStudents = myStudents.length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'submitted').length;
  const approvedSubmissionsCount = submissions.filter((s) => s.status === 'approved').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Action Notice */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Teacher Header Banner */}
      <div className="bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-teal-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              Teacher Portal
            </span>
            <span className="text-xs text-teal-200">&bull; {user?.full_name} ({user?.email})</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            My Students & Task Submissions Hub
          </h2>
          <p className="text-xs text-teal-100 mt-1">
            Add your own students using their Gmail & WhatsApp. Submissions from students in your portal appear here automatically.
          </p>
        </div>

        <button
          onClick={() => {
            fetchSubmissions(false);
            fetchMyStudents(false);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Students</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {totalStudents}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Added / Assigned to You</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs bg-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Tasks</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2 font-mono tabular-nums">
            {pendingSubmissionsCount}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Awaiting Your Review</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Approved Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
            {approvedSubmissionsCount}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Completed by My Students</p>
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

      {/* Live New Submission Alert */}
      {newSubAlert && (
        <div className="p-4 bg-linear-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-950 text-amber-300">
                New Student Task Submitted!
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                {newSubAlert.studentName} submitted Day {newSubAlert.taskDay}: &quot;{newSubAlert.taskTitle}&quot;
              </h4>
            </div>
          </div>
          <button
            onClick={() => setNewSubAlert(null)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: MY STUDENTS' TASK SUBMISSIONS & REVIEW                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                My Students&apos; Task Submissions
              </h3>
              <p className="text-xs text-slate-500">
                Showing submissions only from students registered under your portal.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or task..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 border rounded-lg bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500 w-44 sm:w-52"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSubFilter('submitted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subFilter === 'submitted'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pending ({pendingSubmissionsCount})
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
        </div>

        {loadingSubmissions ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading your students&apos; submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No submissions found</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {myStudents.length === 0
                ? 'Add a student below first — when they submit tasks, they will appear here automatically.'
                : 'No task submissions match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((sub) => {
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

                  {/* Submitted Proof Links */}
                  <div className="py-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Submitted Proof Links & Notes:
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

                  {/* Reject feedback box */}
                  {rejectingSubId === sub.id && (
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2 my-2">
                      <label className="block text-xs font-bold text-red-900">
                        Reason / Feedback to Student for Correction:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 'Please set your Facebook post to Public and resubmit.'"
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
                          onClick={() => handleRejectSubmission(sub)}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer"
                        >
                          Send Correction Request
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Teacher Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {user?.can_approve !== false && (
                      <button
                        type="button"
                        disabled={actionLoadingId === sub.id}
                        onClick={() => handleApproveSubmission(sub)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                          isApproved
                            ? 'bg-emerald-700 opacity-80'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isApproved ? 'Approved ✓' : 'Approve Task'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionLoadingId === sub.id}
                      onClick={() => {
                        setRejectingSubId(sub.id);
                        setRejectFeedback('');
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                        isRejected
                          ? 'bg-red-700 opacity-80'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isRejected ? 'Needs Correction' : 'Reject / Request Fix'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: ADD STUDENT TO MY TEACHER PORTAL                               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Add Student to My Portal
              </h3>
              <p className="text-xs text-slate-500">
                Students you add here can sign in immediately with their Gmail (no password needed), and all their task submissions will appear in your Teacher Dashboard.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
            Auto-Assigned to You
          </span>
        </div>

        {regNotice && (
          <div
            className={`p-3.5 mb-6 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              regNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {regNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
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
                className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

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
                className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

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
                className="w-full text-sm px-3.5 py-2.5 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
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
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{registering ? 'Adding Student...' : 'Add Student to My Portal'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: MY STUDENTS & PROGRESS REPORTS                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                My Students & Progress Reports ({filteredStudents.length})
              </h3>
              <p className="text-xs text-slate-500">
                Students added by you or assigned to you by the Academy Owner.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search my students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border rounded-xl bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {loadingStudents ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading your students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No students in your portal yet</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Use the &quot;Add Student to My Portal&quot; form above to register your students.
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
                  <th className="py-3 px-3">Attendance</th>
                  <th className="py-3 px-3">Approved</th>
                  <th className="py-3 px-3">Pending</th>
                  <th className="py-3 px-3">Rejected</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const waNumber = s.whatsapp ? String(s.whatsapp).replace(/[^0-9]/g, '') : '';
                  const waLink = waNumber ? `https://wa.me/${waNumber.startsWith('92') ? waNumber : `92${waNumber.replace(/^0/, '')}`}` : '';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{s.full_name}</div>
                        <div className="text-[11px] text-slate-500">{s.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Registered: {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Active'}
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
                          {String(s.status || 'active').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-[11px] text-slate-600 font-medium">
                          {s.attendance_days || 0} days &bull; {s.attendance_hours || '0.0'} hrs
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 tabular-nums">
                        {s.approved_count || 0}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-amber-700 tabular-nums">
                        {s.pending_count || 0}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-red-700 tabular-nums">
                        {s.rejected_count || 0}
                      </td>

                      <td className="py-3.5 px-3 min-w-40">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                          <span className="font-semibold text-slate-700">{s.approved_count || 0} / {totalCurriculum}</span>
                          <span className="font-bold text-teal-700">{s.progress_percent || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${s.progress_percent || 0}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAttendanceModal(s)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>Attendance</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStudentStatus(s.id, s.status, s.full_name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              s.status === 'active'
                                ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {s.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      {selectedStudentForAttendance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden text-slate-800 border border-slate-200">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                  Student Attendance Records
                </span>
                <h3 className="text-base font-bold text-white">
                  {selectedStudentForAttendance.full_name} ({selectedStudentForAttendance.email})
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForAttendance(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {loadingAttendanceLogs ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Loading attendance logs...
                </div>
              ) : studentAttendanceLogs.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No attendance records yet for this student.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Check-In</th>
                        <th className="py-2.5 px-3">Check-Out</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentAttendanceLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono">{log.date_key}</td>
                          <td className="py-2 px-3">{log.check_in_local || new Date(log.check_in_time).toLocaleTimeString()}</td>
                          <td className="py-2 px-3">{log.check_out_local || (log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : 'Active')}</td>
                          <td className="py-2 px-3 font-mono">{log.duration_minutes ? `${log.duration_minutes} min` : 'Active'}</td>
                          <td className="py-2 px-3 uppercase font-bold text-[10px]">{log.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForAttendance(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboardPage;
