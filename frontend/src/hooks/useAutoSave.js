import { useEffect, useRef } from 'react';
import { storyService } from '../services/storyService';

export function useAutoSave(submissionId, text, delay = 30000) {
  const timerRef = useRef(null);
  const lastSavedRef = useRef(text);

  useEffect(() => {
    if (!submissionId || text === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await storyService.saveText(submissionId, text);
        lastSavedRef.current = text;
        console.log('Auto-saved ✓');
      } catch (err) {
        console.warn('Auto-save failed silently:', err.message);
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [submissionId, text, delay]);
}
