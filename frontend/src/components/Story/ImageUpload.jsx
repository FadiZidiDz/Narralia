import { useState, useRef } from 'react';
import { aiService } from '../../services/aiService';

export default function ImageUpload({ storyId, partId, currentImageUrl, onSuccess }) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 4MB — Groq vision limit)
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be smaller than 4MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to backend
    setUploading(true);
    setError(null);
    try {
      const data = await aiService.uploadPartImage(storyId, partId, file);
      if (onSuccess) onSuccess(data.imageUrl || data.part?.imageUrl);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <p className="text-white font-bold text-sm">Story Part Image</p>
        <p className="text-slate-400 text-xs mt-1">
          Optional picture for mood or setting. Students write first; their final illustration is generated from <strong className="text-slate-300">their story text</strong> (this image only nudges style if present).
        </p>
      </div>

      {/* Image preview */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Story part preview"
            className="w-full object-cover max-h-64"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-semibold">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 m-3 rounded-xl">
          <div className="text-4xl mb-2">🖼</div>
          <p className="text-slate-500 text-sm">No image uploaded yet</p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs px-4 py-2">{error}</p>
      )}

      <div className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
        >
          {uploading ? 'Uploading...' : preview ? '🔄 Replace Image' : '📤 Upload Image'}
        </button>
      </div>
    </div>
  );
}
