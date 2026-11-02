import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';

export function useLanguageTool(text, language = 'en-US', debounceMs = 1500) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!text || text.trim().length < 10) {
      setSuggestions([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await aiService.checkText(text, language);
        setSuggestions(data.matches || []);
      } catch {
        setSuggestions([]); // silent fail — never block editor
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [text, language, debounceMs]);

  return { suggestions, loading };
}
