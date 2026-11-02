import { useState, useRef } from 'react';
import { storyService } from '../../services/storyService';

export default function VocabularyUpload({ storyId, story, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const fileInputRef = useRef(null);

  const vocabulary = story?.vocabulary || [];
  const previewRows = vocabulary.slice(0, 5);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Please upload an .xlsx or .xls file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Excel file must be smaller than 2MB.');
      return;
    }

    setUploading(true);
    setError(null);
    setInfo(null);
    try {
      const data = await storyService.uploadVocabulary(storyId, file);
      if (data.message) setInfo(data.message);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Check your Excel format.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!vocabulary.length) return;
    if (!window.confirm('Remove vocabulary for this story? Students will no longer see it.')) return;

    setRemoving(true);
    setError(null);
    setInfo(null);
    try {
      const data = await storyService.deleteVocabulary(storyId);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove vocabulary.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <p className="text-white font-bold text-sm">Story vocabulary (Excel)</p>
        <p className="text-slate-400 text-xs mt-1">
          Upload any Excel table (.xlsx or .xls). We read the first sheet: column 1 = word, column 2 = definition, column 3 = example (optional). Header names like Word/Mot are fine but not required.
          Students see these words while they write every part of this story.
        </p>
      </div>

      {vocabulary.length > 0 ? (
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-emerald-400 text-xs font-bold">
              {vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''} loaded
              {story?.vocabularyFileName ? ` · ${story.vocabularyFileName}` : ''}
            </p>
          </div>
          <div className="max-h-40 overflow-y-auto overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400">
                  <th className="px-3 py-2 font-bold">Word</th>
                  <th className="px-3 py-2 font-bold">Definition</th>
                  <th className="px-3 py-2 font-bold">Example</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-700/50 text-slate-300">
                    <td className="px-3 py-2 font-semibold text-white">{row.word}</td>
                    <td className="px-3 py-2">{row.definition || '—'}</td>
                    <td className="px-3 py-2 italic text-slate-400">{row.example || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vocabulary.length > 5 ? (
            <p className="text-slate-500 text-[10px] mt-2">Preview shows 5 of {vocabulary.length} rows.</p>
          ) : null}
        </div>
      ) : (
        <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 m-3 rounded-xl">
          <div className="text-3xl mb-1">📊</div>
          <p className="text-slate-500 text-sm">No vocabulary uploaded yet</p>
        </div>
      )}

      {error ? <p className="text-red-400 text-xs px-4 py-2">{error}</p> : null}
      {info ? <p className="text-amber-400 text-xs px-4 py-2">{info}</p> : null}

      <div className="p-3 flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
          className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
        >
          {uploading ? 'Uploading…' : vocabulary.length ? '🔄 Replace Excel file' : '📤 Upload Excel file'}
        </button>
        {vocabulary.length > 0 ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading || removing}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-bold py-2 rounded-xl transition text-sm"
          >
            {removing ? 'Removing…' : 'Remove vocabulary'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
