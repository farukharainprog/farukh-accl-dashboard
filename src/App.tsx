import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { NavigationTabs, type NavTab } from './components/NavigationTabs';
import { Footer } from './components/Footer';
import { ProfileModal } from './components/ProfileModal';
import { WelcomePage } from './pages/WelcomePage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AdmissionsPage } from './pages/AdmissionsPage';
import { BatchesPage } from './pages/BatchesPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { AttendanceHistoryPage } from './pages/AttendanceHistoryPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import {
  Clock,
  MessageCircle,
  Phone,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Users,
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user, token, isLoading, isPending, settings } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('all_tasks');
  const [showProfile, setShowProfile] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">
          Loading Farukh Businessman Wala ACCL Dashboard...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Rehan School Tuition Academy
        </p>
      </div>
    );
  }

  // If user is not authenticated, show Welcome Landing Page
  if (!token || !user) {
    return <WelcomePage onSuccessLogin={() => setActiveTab('all_tasks')} />;
  }

  const primaryPhone = settings?.whatsapp_primary || '0345 3967083';
  const primaryWaLink = settings?.whatsapp_primary_link || 'https://wa.me/923453967083';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <Header
          onOpenProfile={() => setShowProfile(true)}
          onNavigateToBatches={() => setActiveTab('batches')}
          onOpenSettings={() => setActiveTab('admin_settings')}
        />

        {/* Navigation Tabs Bar */}
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          {/* Pending Activation Banner (if student account pending approval) */}
          {isPending && (
            <div className="mb-6 p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-200 rounded-xl shrink-0">
                  <Clock className="w-6 h-6 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">
                    Account Status: Pending Owner Activation
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your student registration is awaiting approval by the Academy Owner. Once activated, your full task submission privileges will be unlocked.
                  </p>
                </div>
              </div>

              <a
                href={primaryWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact Owner for Fast Activation</span>
              </a>
            </div>
          )}

          {/* VIEW ROUTING */}
          {activeTab === 'all_tasks' && (
            <StudentDashboard
              initialBook="Book 1"
              onNavigateToHistory={() => setActiveTab('attendance')}
            />
          )}

          {activeTab === 'book_1' && (
            <StudentDashboard
              initialBook="Book 1"
              onNavigateToHistory={() => setActiveTab('attendance')}
            />
          )}

          {activeTab === 'book_2' && (
            <StudentDashboard
              initialBook="Book 2"
              onNavigateToHistory={() => setActiveTab('attendance')}
            />
          )}

          {activeTab === 'pending' && (
            <StudentDashboard
              statusFilterTab="pending"
              onNavigateToHistory={() => setActiveTab('attendance')}
            />
          )}

          {activeTab === 'approved' && (
            <StudentDashboard
              statusFilterTab="approved"
              onNavigateToHistory={() => setActiveTab('attendance')}
            />
          )}

          {activeTab === 'rejected' && (
            <StudentDashboard
              statusFilterTab="rejected"
              onNavigateToHistory={() => setActiveTab('attendance')}
            />
          )}

          {activeTab === 'scoreboard' && <ScoreboardPage />}

          {activeTab === 'attendance' && <AttendanceHistoryPage />}

          {activeTab === 'submit_feedback' && <FeedbackPage />}

          {activeTab === 'feedback_scoreboard' && <FeedbackPage />}

          {activeTab === 'batches' && <BatchesPage filterOnlyEnrolled={false} />}

          {activeTab === 'my_enrollments' && <BatchesPage filterOnlyEnrolled={true} />}

          {activeTab === 'social_links' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Your Student Profile & Social Identity</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Keep your profile and contact numbers up to date so teachers and facilitators can verify your task submissions.
              </p>
              <button
                onClick={() => setShowProfile(true)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Edit My Profile & WhatsApp
              </button>
            </div>
          )}

          {activeTab === 'my_teacher' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Assigned Facilitator</h2>
              <div className="p-4 bg-slate-50 rounded-xl border max-w-sm mx-auto text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Teacher:</span>
                  <span className="font-bold text-slate-800">{user.assigned_teacher_name || 'Assigned Mentor'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Course Level:</span>
                  <span className="font-semibold text-slate-800">{user.learning_level}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Need extra guidance on Day tasks, StreamYard interviews, or Call Annie recordings? Join your teacher's live cohort in Group Learning Batches.
              </p>
              <button
                onClick={() => setActiveTab('batches')}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
              >
                View Batch Schedule
              </button>
            </div>
          )}

          {activeTab === 'review_queue' && <ReviewQueuePage />}

          {activeTab === 'user_management' && <UserManagementPage />}

          {activeTab === 'admissions_management' && <AdmissionsPage />}

          {activeTab === 'admin_settings' && <AdminSettingsPage />}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
