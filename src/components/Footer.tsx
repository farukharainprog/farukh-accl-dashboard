import React, { useState } from 'react';
import { MessageCircle, Phone, Shield, FileText, Heart, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { settings } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const academyName = settings?.academy_name || 'Rehan School Tuition Academy';
  const primaryPhone = settings?.whatsapp_primary || '0345 3967083';
  const primaryWaLink = settings?.whatsapp_primary_link || 'https://wa.me/923453967083';
  const secondPhone = settings?.whatsapp_second || '03421336388';
  const secondWaLink = settings?.whatsapp_second_link || 'https://wa.me/923421336388';

  return (
    <footer className="w-full bg-[#072550] text-slate-300 border-t border-blue-900 mt-12 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Branding & Subtitle */}
        <div className="text-center md:text-left">
          <div className="text-sm font-bold text-white tracking-wide">
            {academyName}
          </div>
          <div className="text-xs text-blue-300 font-semibold mt-1">
            Artificial Intelligence & Creative Leadership (ACCL)
          </div>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
            Official ACCL curriculum tracking, social proof submission, and mentor evaluation system.
          </p>
        </div>

        {/* Center: Official WhatsApp Hotlines */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href={primaryWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp: {primaryPhone}</span>
          </a>

          <a
            href={secondWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>WhatsApp: {secondPhone}</span>
          </a>
        </div>

        {/* Right: Policy Links & Copyright */}
        <div className="flex flex-col items-center md:items-end text-xs text-slate-400 gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTerms(true)}
              className="hover:text-blue-300 hover:underline cursor-pointer"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-blue-300 hover:underline cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} {academyName}. All rights reserved.
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
                <FileText className="w-5 h-5 text-blue-600" />
                Terms of Service
              </h3>
              <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 mt-4 max-h-72 overflow-y-auto leading-relaxed">
              <p>
                <strong>1. ACCL Curriculum:</strong> The Artificial Intelligence & Creative Leadership (ACCL) dashboard is designed for students enrolled in Rehan School Tuition Academy.
              </p>
              <p>
                <strong>2. Submissions & Academic Honesty:</strong> Students are responsible for submitting authentic links to their public social posts, videos, and code challenges. Duplicate or plagiarized proof links may result in submission rejection or account suspension.
              </p>
              <p>
                <strong>3. Attendance Policy:</strong> The attendance widget records software-based study sessions in Asia/Karachi local time. It is an application-recorded attendance metric and does not constitute verification of physical presence.
              </p>
              <p>
                <strong>4. Account Approvals:</strong> Student access and teacher roles are subject to Academy Owner review and activation.
              </p>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
                <Shield className="w-5 h-5 text-emerald-600" />
                Privacy Policy
              </h3>
              <button onClick={() => setShowPrivacy(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 mt-4 max-h-72 overflow-y-auto leading-relaxed">
              <p>
                <strong>1. Data Protection:</strong> We store only student registration information (name, father name, WhatsApp number, email) and task proof links necessary to verify ACCL course completion.
              </p>
              <p>
                <strong>2. Passwords & Security:</strong> Passwords are cryptographic hashes using PBKDF2 with unique salts. We never store raw Gmail or social passwords.
              </p>
              <p>
                <strong>3. Student Privacy:</strong> Student records and task progress are private to the student, their assigned teacher, and the Academy Owner.
              </p>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setShowPrivacy(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
