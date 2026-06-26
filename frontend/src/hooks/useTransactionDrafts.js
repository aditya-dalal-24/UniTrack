/**
 * useTransactionDrafts.js
 *
 * React hook for managing the transaction draft queue.
 * Provides state + actions for the draft review UI.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  loadDrafts, saveDrafts, enqueueDraft,
  removeDraft, DraftStatus,
} from '../services/transactionDraftService';
import { api } from '../services/api';

export function useTransactionDrafts() {
  const [drafts, setDrafts] = useState(() => loadDrafts());

  // Sync with localStorage on mount and when other tabs change it
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'unitrack_transaction_drafts') {
        setDrafts(loadDrafts());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const pendingDrafts = drafts.filter(d => d.status === DraftStatus.PENDING_REVIEW);
  const pendingCount = pendingDrafts.length;

  const addDraft = useCallback((draft) => {
    const updated = enqueueDraft(draft);
    setDrafts(updated);
  }, []);

  const confirmDraft = useCallback(async (draftId, editedData = {}) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return { error: 'Draft not found' };

    const payload = {
      amount: editedData.amount ?? draft.amount,
      categoryId: editedData.categoryId ?? draft.categoryId,
      date: editedData.date ?? draft.date,
      time: editedData.time ?? draft.time,
      note: editedData.note ?? draft.note,
    };

    const { error } = await api.addExpense(payload);
    if (error) return { error };

    const updated = removeDraft(draftId);
    setDrafts(updated);
    return { error: null };
  }, [drafts]);

  const rejectDraft = useCallback((draftId) => {
    const updated = removeDraft(draftId);
    setDrafts(updated);
  }, []);

  const clearAll = useCallback(() => {
    saveDrafts([]);
    setDrafts([]);
  }, []);

  return {
    drafts,
    pendingDrafts,
    pendingCount,
    addDraft,
    confirmDraft,
    rejectDraft,
    clearAll,
  };
}
