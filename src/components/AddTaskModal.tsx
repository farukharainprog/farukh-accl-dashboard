import React, { useState } from 'react';
import { X, PlusCircle, BookOpen, Layers, CheckSquare, FileText } from 'lucide-react';
import { api } from '../services/api';

interface AddTaskModalProps {
  initialBook?: string;
  onClose: () => void;
  onTaskAdded: () => void;
}

const CATEGORIES = [
  'Account Creation',
  'Social Media Engagement',
  'Content Creation',
  'AI Tools & Practice',
  'Video Presentation',
  'English Conversation & Speaking',
  'Interview Preparation',
  'E-commerce & Freelancing',
  'General Learning',
];

const PROOF_OPTIONS = [
  'Facebook Post',
  'YouTube Content',
  'LinkedIn Post',
  'Instagram Video',
  'Project / Other Link',
];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  initialBook = 'Book 1',
  onClose,
  onTaskAdded,
}) => {
  const [book, setBook] = useState<string>(initialBook);
  const [dayNumber, setDayNumber] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Content Creation');
  const [requiredLinks, setRequiredLinks] = useState<string[]>(['Facebook Post', 'YouTube Content']);
  const [allowsText, setAllowsText] = useState<boolean>(true);
  const [allowsFile, setAllowsFile] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const toggleLink = (linkName: string) => {
    if (requiredLinks.includes(linkName)) {
      setRequiredLinks(requiredLinks.filter((l) => l !== linkName));
    } else {
      setRequiredLinks([...requiredLinks, linkName]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setLoading(true);
    try {
      await api.createTask({
        book,
        day_number: Number(dayNumber),
        title: title.trim(),
        description: description.trim(),
        category,
        required_links: requiredLinks.length > 0 ? requiredLinks : ['Facebook Post'],
        allows_text: allowsText,
        allows_file: allowsFile,
      });

      onTaskAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#0B3A79] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">Add New Curriculum Task (Owner/Admin)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Curriculum Book
              </label>
              <select
                value={book}
                onChange={(e) => setBook(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Book 1">Book 1 (Foundation Level)</option>
                <option value="Book 2">Book 2 (Advanced Level)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Day Number (1 - 180+)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                required
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Category / Topic
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Conduct a 10-minute live StreamYard interview with a classmate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Detailed Instructions & Steps *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Explain what the student needs to learn, practice, and record for this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Required Proof Links
            </label>
            <div className="flex flex-wrap gap-2">
              {PROOF_OPTIONS.map((opt) => {
                const isSelected = requiredLinks.includes(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => toggleLink(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowsText}
                onChange={(e) => setAllowsText(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Allow written notes & answers</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowsFile}
                onChange={(e) => setAllowsFile(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Allow file / screenshot upload</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving Task...' : 'Save Task to Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
