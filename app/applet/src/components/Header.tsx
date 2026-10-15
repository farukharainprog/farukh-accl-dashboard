import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  User,
  LogOut,
  Video,
  Phone,
  MessageCircle,
  Shield,
  Settings,
  Sparkles,
  Camera,
} from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  onOpenProfile: () => void;
  onNavigateToBatches: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProfile,
  onNavigateToBatches,
  onOpenSettings,
}) => {
  const { user, settings, logout, isOwner, refreshSettings } = useAuth();
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoInput, setLogoInput] = useState(settings?.logo_url || '');
  const [savingLogo, setSavingLogo] = useState(false);

  const handleSaveLogo = async () => {
    setSavingLogo(true);
    try {
      await api.updateSettings({ logo_url: logoInput.trim() });
      await refreshSettings();
      setShowLogoModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update logo');
    } finally {
      setSavingLogo(false);
    }
  };

  const dashboardTitle = settings?.dashboard_title || 'Farukh Businessman Wala ACCL Dashboard';
  const academyName = settings?.academy_name || 'Rehan School Tuition Academy';
  const primaryPhone = settings?.whatsapp_primary || '0345 3967083';
  const primaryWaLink = settings?.whatsapp_primary_link || 'https://wa.me/923453967083';
  const secondPhone = settings?.whatsapp_second || '03421336388';
  const secondWaLink = settings?.whatsapp_second_link || 'https://wa.me/923421336388';

  return (
    <header className="w-full shadow-md">
      {/* Top Bar with WhatsApp Hotline and Pakistan Time */}
      <div className="bg-[#072550] text-slate-200 text-xs py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/60">
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1.5 text-blue-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Asia/Karachi (Pakistan):
          </span>
          <span className="text-white font-mono">{settings?.currentTimePST || 'Live Time'}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-300 hidden sm:inline">Official WhatsApp:</span>
          <a
            href={primaryWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{primaryPhone}</span>
          </a>
          <span className="text-slate-500 hidden md:inline">|</span>
          <a
            href={secondWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors hidden md:flex"
          >
            <Phone className="w-3 h-3" />
            <span>{secondPhone}</span>
          </a>
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="bg-[#0B3A79] text-white py-4 px-4 sm:px-8 border-b border-blue-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Academy Titles */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="relative group">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Academy Logo"
                  className="w-14 h-14 object-contain rounded-xl bg-white/10 p-1.5 border border-white/20 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-inner border border-white/20">
                  <GraduationCap className="w-8 h-8" />
                </div>
              )}

              {/* Owner Logo Edit Button */}
              {isOwner && (
                <button
                  onClick={() => {
                    setLogoInput(settings?.logo_url || '');
                    setShowLogoModal(true);
                  }}
                  title="Owner: Change Academy Logo"
                  className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full p-1 shadow-md transition-transform hover:scale-110"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-center md:justify-start">
                <span>{dashboardTitle}</span>
              </h1>
              <p className="text-blue-200 text-sm font-medium tracking-wide">
                {academyName}
              </p>
            </div>
          </div>

          {/* User Controls & Actions */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Learn with a Teacher CTA */}
                <button
                  onClick={onNavigateToBatches}
                  className="group flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all hover:shadow"
                >
                  <Video className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">Learn with a Teacher</span>
                    <span className="text-[10px] text-emerald-100 font-normal">Live Zoom • Support</span>
                  </div>
                </button>

                {/* Profile Pill */}
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-blue-300" />
                  <span className="truncate max-w-[130px]">Welcome, {user.full_name}</span>
                  {user.role !== 'student' && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 ml-1">
                      {user.role}
                    </span>
                  )}
                </button>

                {/* Owner Settings Quick Button */}
                {isOwner && onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Academy Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={primaryWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Admission</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-header Announcement Bar */}
      <div className="bg-[#10488f] text-blue-100 py-2 px-4 sm:px-8 text-center text-xs sm:text-sm font-medium border-b border-blue-900/50 shadow-inner flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Welcome to Rehan School Academy - Enroll in ACCL (Foundation)</span>
      </div>

      {/* Owner Logo Upload Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Owner: Update Academy Logo
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Enter the image URL for the academy logo. If empty, the default crest will be displayed.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Logo Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {logoInput && (
                <div className="p-3 bg-slate-50 rounded-lg border text-center">
                  <p className="text-xs text-slate-500 mb-2">Preview:</p>
                  <img
                    src={logoInput}
                    alt="Logo Preview"
                    className="w-16 h-16 object-contain mx-auto rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingLogo}
                  onClick={handleSaveLogo}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow disabled:opacity-50"
                >
                  {savingLogo ? 'Saving...' : 'Save Logo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
