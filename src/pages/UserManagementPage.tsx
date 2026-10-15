import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  KeyRound,
  Filter,
} from 'lucide-react';
import type { UserProfile } from '../types';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser, isOwner } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setUsers(res.users);

      const teachRes = await api.getTeachersList();
      setTeachers(teachRes.teachers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.getAuditLogs();
      setAuditLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchLogs();
    }
  }, [roleFilter, statusFilter, activeTab]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await api.updateUser(userId, { status: newStatus });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    try {
      await api.updateUser(userId, { role: newRole });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleTeacherAssign = async (userId: string, teacherId: string) => {
    try {
      await api.updateUser(userId, { assigned_teacher_id: teacherId || null });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to assign teacher');
    }
  };

  const handleToggleApproval = async (userId: string, currentVal: boolean) => {
    try {
      await api.updateUser(userId, { can_approve: !currentVal });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update permission');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>User & Access Control Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage student activations, promote teachers/admins, assign facilitators, and audit academy actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-amber-300 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border rounded-lg bg-slate-50 font-medium"
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="admin">Admins</option>
                <option value="owner">Owners</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border rounded-lg bg-slate-50 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Activation</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="w-full text-xs pl-8 pr-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Assigned Teacher</th>
                    <th className="py-3 px-3">Permissions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No users matching filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{u.full_name}</div>
                          <div className="text-slate-500 text-[11px]">{u.email}</div>
                          {u.whatsapp && (
                            <div className="text-emerald-700 font-mono text-[11px]">
                              WA: {u.whatsapp}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {isOwner && u.role !== 'owner' ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border bg-white font-semibold"
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {u.role}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {u.role === 'student' ? (
                            <select
                              value={u.assigned_teacher_id || ''}
                              onChange={(e) => handleTeacherAssign(u.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border bg-white max-w-[140px] truncate"
                            >
                              <option value="">No Teacher Assigned</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.full_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {u.role === 'teacher' ? (
                            <button
                              onClick={() => handleToggleApproval(u.id, u.can_approve)}
                              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                                u.can_approve
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {u.can_approve ? 'Approval: Enabled ✓' : 'Approval: Disabled'}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(u.id, 'active')}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                              >
                                Activate
                              </button>
                            )}

                            {u.status === 'active' && u.role !== 'owner' && (
                              <button
                                onClick={() => handleStatusChange(u.id, 'suspended')}
                                className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                              >
                                Suspend
                              </button>
                            )}

                            {u.status === 'suspended' && (
                              <button
                                onClick={() => handleStatusChange(u.id, 'active')}
                                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* AUDIT LOGS TAB */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Academy Audit Activity Log (Last 100 actions)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 text-[11px]">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-800">
                        {log.user_name}
                      </td>
                      <td className="py-2 px-3 uppercase text-[10px] text-blue-700 font-sans font-bold">
                        {log.user_role}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-bold">
                        {log.action}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-sans">
                        {log.details}
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
