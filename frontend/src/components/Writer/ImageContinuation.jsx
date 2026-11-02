import { useState } from 'react';
import { useVision } from '../../hooks/useVision';

export default function ImageContinuation({ imageUrl, onAddText, ageLevel }) {
  const { getContinuation, analyzing, error } = useVision(ageLevel);
  const [hasUsed, setHasUsed] = useState(false);

  const handleVisionClick = async () => {
    const text = await getContinuation(imageUrl);
    if (text) {
      onAddText(text);
      setHasUsed(true);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Need a story idea?</p>
          <p className="text-slate-400 text-xs mt-0.5">Let AI "look" at the image and give you a starting paragraph!</p>
        </div>
        <button
          onClick={handleVisionClick}
          disabled={analyzing || !imageUrl}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-glow ${
            analyzing 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse'
          }`}
        >
          {analyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>👁️ Get Story Idea from Image</span>
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-[10px] text-red-400">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
