import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Shield,
  MessageCircle,
} from 'lucide-react';

export const AdmissionsPage: React.FC = () => {
  const { user, isOwner, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'student_form' | 'teacher_form' | 'student_requests' | 'teacher_requests'>('student_form');

  // New Student Admission Form state
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [studentWhatsapp, setStudentWhatsapp] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [learningLevel, setLearningLevel] = useState('Book 1');
  const [assignedTeacher, setAssignedTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [studentMessage, setStudentMessage] = useState<string | null>(null);

  // New Teacher Admission Form state
  const [teachName, setTeachName] = useState('');
  const [teachEmail, setTeachEmail] = useState('');
  const [teachWhatsapp, setTeachWhatsapp] = useState('');
  const [teachSubjects, setTeachSubjects] = useState('');
  const [teachIntro, setTeachIntro] = useState('');
  const [teachExp, setTeachExp] = useState('');
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);

  // Management tables state
  const [studentAdmissions, setStudentAdmissions] = useState<any[]>([]);
  const [teacherApplications, setTeacherApplications] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    api.getTeachersList().then((res) => setTeachers(res.teachers)).catch(() => {});
  }, []);

  const fetchAdmissionsData = async () => {
    setLoadingData(true);
    try {
      if (isAdmin) {
        const [sRes, tRes] = await Promise.all([
          api.getStudentAdmissions(),
          api.getTeacherApplications(),
        ]);
        setStudentAdmissions(sRes.admissions);
        setTeacherApplications(tRes.applications);
      } else {
        const sRes = await api.getStudentAdmissions();
        setStudentAdmissions(sRes.admissions);
      }
    } catch (err) {
      console.error('Failed to load admissions:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'student_requests' || activeTab === 'teacher_requests') {
      fetchAdmissionsData();
    }
  }, [activeTab]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStudent(true);
    setStudentMessage(null);
    try {
      const res = await api.submitStudentAdmission({
        full_name: studentName.trim(),
        father_name: fatherName.trim(),
        whatsapp: studentWhatsapp.trim(),
        email: studentEmail.trim(),
        learning_level: learningLevel,
        assigned_teacher_id: assignedTeacher || null,
        notes: notes.trim() || undefined,
      });
      setStudentMessage(res.message);
      setStudentName('');
      setFatherName('');
      setStudentWhatsapp('');
      setStudentEmail('');
      setNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit admission');
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTeacher(true);
    setTeacherMessage(null);
    try {
      const res = await api.submitTeacherApplication({
        full_name: teachName.trim(),
        email: teachEmail.trim(),
        whatsapp: teachWhatsapp.trim(),
        subjects: teachSubjects.trim(),
        introduction: teachIntro.trim(),
        experience: teachExp.trim() || undefined,
      });
      setTeacherMessage(res.message);
      setTeachName('');
      setTeachEmail('');
      setTeachWhatsapp('');
      setTeachSubjects('');
      setTeachIntro('');
      setTeachExp('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setSubmittingTeacher(false);
    }
  };

  const handleApproveStudent = async (id: string) => {
    try {
      const res = await api.approveStudentAdmission(id);
      alert(res.message);
      await fetchAdmissionsData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectStudent = async (id: string) => {
    try {
      await api.rejectStudentAdmission(id);
      await fetchAdmissionsData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleApproveTeacher = async (id: string) => {
    const canApprove = confirm('Enable Task Approval permission for this teacher? (OK = Yes, Cancel = Feedback only)');
    try {
      const res = await api.approveTeacherApplication(id, { can_approve: canApprove });
      alert(res.message + (res.temporaryPassword ? ` Initial Password: ${res.temporaryPassword}` : ''));
      await fetchAdmissionsData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectTeacher = async (id: string) => {
    try {
      await api.rejectTeacherApplication(id);
      await fetchAdmissionsData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-teal-600" />
            <span>Admissions & Recruitment Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register new students, submit teacher applications, and review pending admissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('student_form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'student_form'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            New Student Form
          </button>

          <button
            onClick={() => setActiveTab('teacher_form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'teacher_form'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            New Teacher Form
          </button>

          <button
            onClick={() => setActiveTab('student_requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'student_requests'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Review Admissions
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('teacher_requests')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'teacher_requests'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Teacher Applications
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: NEW STUDENT ADMISSION FORM */}
      {activeTab === 'student_form' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">New Student Admission Form</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter official details to enroll student in ACCL Foundation course
            </p>
          </div>

          {studentMessage && (
            <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{studentMessage}</span>
            </div>
          )}

          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farukh Arain"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father's Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Father's full name"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                  value={studentWhatsapp}
                  onChange={(e) => setStudentWhatsapp(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gmail / Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="student@gmail.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Class / Learning Level *
                </label>
                <select
                  value={learningLevel}
                  onChange={(e) => setLearningLevel(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Book 1">Book 1 (Foundation Level)</option>
                  <option value="Book 2">Book 2 (Advanced Level)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Teacher (Optional)
                </label>
                <select
                  value={assignedTeacher}
                  onChange={(e) => setAssignedTeacher(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Facilitator...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Admission Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Special learning requirements, referral notes, or schedule requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-3 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingStudent}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {submittingStudent ? 'Submitting...' : 'Register Admission (Pending Activation)'}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: NEW TEACHER ADMISSION FORM */}
      {activeTab === 'teacher_form' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">New Teacher / Mentor Application</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your facilitator profile for academy review
            </p>
          </div>

          {teacherMessage && (
            <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{teacherMessage}</span>
            </div>
          )}

          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sir Asad Khan"
                  value={teachName}
                  onChange={(e) => setTeachName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gmail / Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="teacher@example.com"
                  value={teachEmail}
                  onChange={(e) => setTeachEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Subjects / Skills *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call Annie, English, Coding"
                  value={teachSubjects}
                  onChange={(e) => setTeachSubjects(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Introduction & Experience *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe your background and why you wish to teach at Rehan School Tuition Academy..."
                value={teachIntro}
                onChange={(e) => setTeachIntro(e.target.value)}
                className="w-full text-xs p-3 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingTeacher}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {submittingTeacher ? 'Submitting...' : 'Submit Application (Pending Owner Approval)'}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 3: STUDENT ADMISSION REQUESTS TABLE */}
      {activeTab === 'student_requests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Registered Student Admissions ({studentAdmissions.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Father Name</th>
                  <th className="py-2.5 px-3">Email & WhatsApp</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingData ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      Loading admissions...
                    </td>
                  </tr>
                ) : studentAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No admissions requests found.
                    </td>
                  </tr>
                ) : (
                  studentAdmissions.map((sa) => (
                    <tr key={sa.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{sa.full_name}</td>
                      <td className="py-3 px-3 text-slate-600">{sa.father_name}</td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700">{sa.email}</div>
                        <div className="text-emerald-700 font-mono text-[11px]">{sa.whatsapp}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                          {sa.learning_level}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sa.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sa.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sa.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {sa.status === 'pending' && isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveStudent(sa.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectStudent(sa.id)}
                              className="px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[11px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: TEACHER APPLICATIONS TABLE */}
      {activeTab === 'teacher_requests' && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Teacher Applications ({teacherApplications.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Email & WhatsApp</th>
                  <th className="py-2.5 px-3">Subjects</th>
                  <th className="py-2.5 px-3">Introduction</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Owner Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingData ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      Loading teacher applications...
                    </td>
                  </tr>
                ) : teacherApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No teacher applications found.
                    </td>
                  </tr>
                ) : (
                  teacherApplications.map((ta) => (
                    <tr key={ta.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{ta.full_name}</td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700">{ta.email}</div>
                        <div className="text-emerald-700 font-mono text-[11px]">{ta.whatsapp}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{ta.subjects}</td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={ta.introduction}>
                        {ta.introduction}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ta.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ta.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ta.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {ta.status === 'pending' && isOwner && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveTeacher(ta.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectTeacher(ta.id)}
                              className="px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[11px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionsPage;
