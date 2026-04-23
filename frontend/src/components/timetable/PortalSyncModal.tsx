import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

interface PortalSyncModalProps {
  mode: 'timetable' | 'attendance';
  token: string;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

interface SlotEntry {
  id: number;
  subject: string;
  slot: string;
  room: string;
  type: 'theory' | 'lab';
}

const SLOT_HINT = 'e.g. A, B, P47+P48, L51+L52';

let idCounter = 0;
const newEntry = (): SlotEntry => ({
  id: ++idCounter,
  subject: '',
  slot: '',
  room: '',
  type: 'theory',
});

export default function PortalSyncModal({ mode, token, onClose, onSuccess }: PortalSyncModalProps) {
  const [entries, setEntries] = useState<SlotEntry[]>([newEntry()]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // For attendance mode keep the old credential flow
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const isAttendance = mode === 'attendance';

  const update = (id: number, field: keyof SlotEntry, value: string) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const addRow = () => setEntries(prev => [...prev, newEntry()]);
  const removeRow = (id: number) => setEntries(prev => prev.filter(e => e.id !== id));

  const handleTimetableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = entries.filter(e => e.subject.trim() && e.slot.trim());
    if (valid.length === 0) {
      setErrorMsg('Add at least one subject with a slot.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    // Build the payload the backend expects for manual slot entry
    const slots = valid.map(e => {
      const rawSlot = e.slot.trim().toUpperCase();
      const slotArr = rawSlot.split('+').map(s => s.trim()).filter(Boolean);
      return {
        slots: slotArr,
        normalizedKey: slotArr.join(','),
        subject: e.subject.trim(),
        room: e.room.trim() || 'N/A',
        type: rawSlot.includes('+') ? 'lab' : e.type,
      };
    });

    try {
      const res = await axios.post(
        '/api/student/timetable/manual',
        { slots },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('success');
      onSuccess(res.data);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Failed to save. Please try again.');
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await axios.post(
        '/api/student/portal/sync',
        { loginId, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('success');
      onSuccess(res.data);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Sync failed. Check your credentials.');
    } finally {
      setLoginId('');
      setPassword('');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-2xl bg-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-xl border border-brand/20">
                <TableCellsIcon className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {isAttendance ? 'Refresh Attendance' : 'Enter Your Timetable'}
                </h2>
                {!isAttendance && (
                  <p className="text-[10px] text-textLight/60 uppercase tracking-widest mt-0.5">
                    Saved permanently · no credentials needed
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-textLight hover:text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-6">
            {status === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-12 text-center"
              >
                <CheckCircleIcon className="w-16 h-16 text-green-400" />
                <p className="text-xl font-black text-white uppercase tracking-tight">
                  {isAttendance ? 'Sync Complete!' : 'Timetable Saved!'}
                </p>
                <p className="text-sm text-textLight">
                  {isAttendance
                    ? 'Attendance and marks refreshed.'
                    : 'Your subjects are now permanently linked to your account.'}
                </p>
                <button onClick={onClose} className="mt-2 px-6 py-3 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest">
                  Done
                </button>
              </motion.div>
            ) : isAttendance ? (
              /* ── Attendance: keep credential form ── */
              <form onSubmit={handleAttendanceSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-textLight uppercase tracking-widest">SRM Email ID</label>
                  <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="xyz@srmist.edu.in" required disabled={status === 'loading'}
                    className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand/50 outline-none transition-all disabled:opacity-50 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-textLight uppercase tracking-widest">SRM Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your SRM portal password" required disabled={status === 'loading'}
                    className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand/50 outline-none transition-all disabled:opacity-50 text-white" />
                </div>
                {status === 'error' && <ErrorBox msg={errorMsg} />}
                <SubmitBtn loading={status === 'loading'} label="Sync Attendance & Marks" disabled={!loginId || !password} />
              </form>
            ) : (
              /* ── Timetable: manual entry table ── */
              <form onSubmit={handleTimetableSubmit} className="space-y-5">
                <div className="p-4 bg-brand/5 border border-brand/15 rounded-2xl text-xs text-textLight leading-relaxed">
                  Open your <span className="text-brand font-black">SRM Academia → My Time Table</span> page and enter each subject below.
                  This is saved permanently — you only need to do this once.
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[2fr_1fr_1fr_80px_32px] gap-2 px-1">
                  {['Subject Name', 'Slot', 'Room', 'Type', ''].map(h => (
                    <span key={h} className="text-[9px] font-black text-textLight/50 uppercase tracking-widest">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="space-y-2">
                  {entries.map(entry => (
                    <div key={entry.id} className="grid grid-cols-[2fr_1fr_1fr_80px_32px] gap-2 items-center">
                      <input
                        value={entry.subject}
                        onChange={e => update(entry.id, 'subject', e.target.value)}
                        placeholder="e.g. Artificial Intelligence"
                        className="bg-background border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-brand/50 outline-none transition-all"
                      />
                      <input
                        value={entry.slot}
                        onChange={e => update(entry.id, 'slot', e.target.value)}
                        placeholder={SLOT_HINT}
                        className="bg-background border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-brand/50 outline-none transition-all font-mono"
                      />
                      <input
                        value={entry.room}
                        onChange={e => update(entry.id, 'room', e.target.value)}
                        placeholder="e.g. TP102"
                        className="bg-background border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-brand/50 outline-none transition-all"
                      />
                      <select
                        value={entry.type}
                        onChange={e => update(entry.id, 'type', e.target.value)}
                        className="bg-background border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:border-brand/50 outline-none transition-all"
                      >
                        <option value="theory">Theory</option>
                        <option value="lab">Lab</option>
                      </select>
                      <button type="button" onClick={() => removeRow(entry.id)} disabled={entries.length === 1}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-textLight/40 hover:text-red-400 transition-colors disabled:opacity-20">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addRow}
                  className="flex items-center gap-2 text-xs text-brand/70 hover:text-brand transition-colors font-black uppercase tracking-widest">
                  <PlusIcon className="w-4 h-4" />
                  Add Subject
                </button>

                {status === 'error' && <ErrorBox msg={errorMsg} />}
                <SubmitBtn loading={status === 'loading'} label="Save Timetable Permanently" disabled={entries.every(e => !e.subject.trim())} />
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
      <ExclamationCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <p className="text-xs text-red-300">{msg}</p>
    </motion.div>
  );
}

function SubmitBtn({ loading, label, disabled }: { loading: boolean; label: string; disabled: boolean }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full py-4 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3">
      {loading ? (
        <><span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
      ) : label}
    </button>
  );
}
