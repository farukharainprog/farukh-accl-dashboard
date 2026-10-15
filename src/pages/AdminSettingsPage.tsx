import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Settings,
  Save,
  CheckCircle2,
  Phone,
  MessageCircle,
  GraduationCap,
  Layers,
  Activity,
  Calendar,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { settings, refreshSettings } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form states
  const [title, setTitle] = useState(settings?.dashboard_title || 'Farukh Businessman Wala ACCL Dashboard');
  const [academyName, setAcademyName] = useState(settings?.academy_name || 'Rehan School Tuition Academy');
  const [footerCredit, setFooterCredit] = useState(settings?.footer_credit || 'Created by FARUKH BUSINESSMAN WALA');
  const [wa1, setWa1] = useState(settings?.whatsapp_primary || '0345 3967083');
  const [wa2, setWa2] = useState(settings?.whatsapp_second || '03421336388');
  const [wa1Link, setWa1Link] = useState(settings?.whatsapp_primary_link || 'https://wa.me/923453967083');
  const [wa2Link, setWa2Link] = useState(settings?.whatsapp_second_link || 'https://wa.me/923421336388');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [requireStudentApproval, setRequireStudentApproval] = useState(settings?.require_student_approval ?? true);
  const [requireTeacherApproval, setRequireTeacherApproval] = useState(settings?.require_teacher_approval ?? true);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api.getAdminStats()
      .then((res) => setStats(res))
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setLoadingStats(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      await api.updateSettings({
        dashboard_title: title.trim(),
        academy_name: academyName.trim(),
        footer_credit: footerCredit.trim(),
        whatsapp_primary: wa1.trim(),
        whatsapp_second: wa2.trim(),
        whatsapp_primary_link: wa1Link.trim(),
        whatsapp_second_link: wa2Link.trim(),
        logo_url: logoUrl.trim(),
        require_student_approval: requireStudentApproval,
        require_teacher_approval: requireTeacherApproval,
      });

      await refreshSettings();
      setSuccessMsg('Academy settings updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>Owner & Academy Global Settings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure system branding, official WhatsApp hotlines, admission approval workflows, and view real-time metrics.
          </p>
        </div>
      </div>

      {/* Real Database Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Active Students</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {stats?.totalStudents ?? 0}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">
            {stats?.pendingStudents ?? 0} Pending Activation
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Teachers</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {stats?.totalTeachers ?? 0}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">
            {stats?.pendingTeachers ?? 0} Pending Applications
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Task Submissions</span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">
            {stats?.pendingSubmissions ?? 0}
          </span>
          <span className="text-[10px] text-slate-500">
            Pending Review ({stats?.approvedSubmissions ?? 0} Approved)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Today's Check-Ins</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {stats?.todayCheckins ?? 0}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {stats?.activeNow ?? 0} Active Right Now
          </span>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-3xl">
        {successMsg && (
          <div className="p-3 mb-6 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="border-b pb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-blue-600" />
              <span>Academy Branding & Labels</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Main Dashboard Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Academy / Subtitle Name
                  </label>
                  <input
                    type="text"
                    required
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Footer Credit (Exact Branding)
                  </label>
                  <input
                    type="text"
                    required
                    value={footerCredit}
                    onChange={(e) => setFooterCredit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Academy Logo URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Official WhatsApp Hotlines */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Official WhatsApp Hotlines</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Primary WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={wa1}
                  onChange={(e) => setWa1(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Primary WhatsApp Link
                </label>
                <input
                  type="url"
                  required
                  value={wa1Link}
                  onChange={(e) => setWa1Link(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Second WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={wa2}
                  onChange={(e) => setWa2(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Second WhatsApp Link
                </label>
                <input
                  type="url"
                  required
                  value={wa2Link}
                  onChange={(e) => setWa2Link(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Access Policy Toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Admission & Activation Workflows
            </h3>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireStudentApproval}
                onChange={(e) => setRequireStudentApproval(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs text-slate-700 font-medium">
                Require Owner review & activation for new student registrations (Account remains Pending until approved)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireTeacherApproval}
                onChange={(e) => setRequireTeacherApproval(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs text-slate-700 font-medium">
                Require Owner approval for teacher applications
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Academy Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Database & Curriculum Tasks Management Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Database & Curriculum Tasks Tools</h3>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200">
            {stats?.totalTasks ?? 221} Tasks Loaded
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Manage your persistent curriculum tasks, reload default Rehan School Foundation items (Day 1 - 180), or export/import full JSON database backups for cross-device migration.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Reload Default Tasks */}
          <button
            type="button"
            onClick={async () => {
              if (confirm('Are you sure you want to re-load all default foundation tasks? Any default tasks will be refreshed.')) {
                try {
                  const res = await api.loadDefaultTasks();
                  alert(res.message);
                  const updated = await api.getAdminStats();
                  setStats(updated);
                } catch (e: any) {
                  alert(e.message || 'Failed to reload tasks');
                }
              }
            }}
            className="flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all"
          >
            <span>🔄 Reload 220+ Default Curriculum Tasks</span>
          </button>

          {/* Export JSON Backup */}
          <button
            type="button"
            onClick={() => {
              const json = api.exportDatabase();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `accl_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition-all"
          >
            <span>💾 Export Full Database (JSON Backup)</span>
          </button>
        </div>

        {/* Import JSON Backup */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">Restore from JSON backup file:</span>
          <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer">
            <span>Choose Backup File...</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  const content = evt.target?.result as string;
                  if (content) {
                    const ok = api.importDatabase(content);
                    if (ok) {
                      alert('Database restored successfully from backup!');
                      window.location.reload();
                    } else {
                      alert('Failed to restore database. Invalid backup file format.');
                    }
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
