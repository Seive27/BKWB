import React, { useEffect, useState } from 'react';
import { X, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { getResidents } from '../../services/ticketService';
import {
  ResidentOption,
  TicketCategory,
  TicketDraft,
  TicketPriority,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_SUBJECTS,
} from '../../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Creates the ticket. May throw — the error is shown in the modal. */
  onCreate: (draft: TicketDraft) => Promise<void>;
}

const CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];
const PRIORITIES = Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[];

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentId, setResidentId] = useState('');
  const [category, setCategory] = useState<TicketCategory>('water_supply');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setResidentId('');
    setCategory('water_supply');
    setSubject('');
    setDescription('');
    setPriority('medium');
    setError(null);
    setSubmitting(false);

    setLoadingResidents(true);
    getResidents()
      .then(setResidents)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load residents.')
      )
      .finally(() => setLoadingResidents(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit =
    residentId !== '' && subject.trim().length > 0 && description.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        resident_id: residentId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Ticket</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                File a ticket on behalf of a resident
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 space-y-6">
            {/* Resident */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Resident <span className="text-red-500">*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                disabled={loadingResidents}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white disabled:bg-gray-50"
              >
                <option value="">
                  {loadingResidents ? 'Loading residents…' : 'Select a resident'}
                </option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.first_name} {resident.last_name} — {resident.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Category and Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as TicketCategory);
                    setSubject('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {TICKET_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {TICKET_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Select a subject</option>
                {TICKET_SUBJECTS[category].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about the concern…"
                rows={5}
                maxLength={1000}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{description.length}/1000</p>
            </div>

            {/* Attachment Upload (UI only) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Attachment (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer group">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3 group-hover:text-primary-500 transition-colors" />
                <p className="text-sm text-gray-600 font-medium">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>

            {error && (
              <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Info Notice */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                A unique ticket number (TKT-YYYY-000001) is generated automatically by the database.
                The resident will see this ticket in their mobile app.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-2.5 rounded-xl transition-all text-sm font-medium shadow-sm inline-flex items-center space-x-2 ${
                canSubmit
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Creating…' : 'Create Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
