import { useState } from 'react';
import { aiService } from '../services/aiService';

export function useVision(ageLevel = 8) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const getContinuation = async (imageUrl) => {
    if (!imageUrl) return null;
    
    setAnalyzing(true);
    setError(null);
    try {
      const data = await aiService.analyzeImage(imageUrl, ageLevel);
      return data.continuation;
    } catch (err) {
      setError(err.response?.data?.error || 'AI Vision failed');
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  return { getContinuation, analyzing, error };
}
