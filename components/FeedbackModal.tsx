/**
 * Feedback modal — opened from the hamburger menu's Feedback item.
 *
 * Form is platform-adaptive (sub-skill 07): the agent customizes fields and
 * categories per product. Default fields shown here.
 */

'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  surface?: string;
}

const DEFAULT_CATEGORIES = ['bug', 'idea', 'praise', 'other'] as const;

export function FeedbackModal({ open, onClose, surface = 'general' }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    formData.set('surface', surface);
    formData.set('contextUrl', typeof window !== 'undefined' ? window.location.href : '');
    try {
      const r = await fetch('/api/feedback', { method: 'POST', body: formData });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? 'Couldn\'t send — try again?');
      }
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-md w-full rounded-xl border border-base-300/60 bg-base-100 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 btn btn-sm btn-ghost btn-circle"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">Send feedback</h3>
        {done ? (
          <p className="mt-4 text-success">Thanks — we read every one of these.</p>
        ) : (
          <form action={submit} className="space-y-3 mt-4">
            <div className="flex gap-2">
              {DEFAULT_CATEGORIES.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="category" value={c} required className="hidden peer" />
                  <span className="btn btn-sm btn-ghost border border-base-300/60 peer-checked:btn-primary peer-checked:border-primary capitalize">
                    {c}
                  </span>
                </label>
              ))}
            </div>
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="textarea textarea-bordered w-full"
              placeholder="Tell us what's on your mind…"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
