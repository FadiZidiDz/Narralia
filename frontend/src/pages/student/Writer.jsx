import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStory } from '../../hooks/useStory';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useLanguageTool } from '../../hooks/useLanguageTool';
import { storyService } from '../../services/storyService';
import { aiService } from '../../services/aiService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const MIN_CHARS = 50;

export default function Writer() {
  const { id, partId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { story, part, partLoading } = useStory(id, partId);

  const [text, setText] = useState('');
  const [submissionId, setSubmissionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState(null);
  const [gettingHint, setGettingHint] = useState(false);
  const [illustrating, setIllustrating] = useState(false);
  const [illustrationError, setIllustrationError] = useState(null);
  const [expanding, setExpanding] = useState(false);
  const [expansionError, setExpansionError] = useState(null);

  const editorRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const data = await storyService.startSubmission(id, partId);
        setSubmissionId(data.submission._id);
        setText(data.submission.writtenText || '');
      } catch (err) {
        console.error('Failed to init submission');
      }
    }
    init();
  }, [id, partId]);

  const { data: submissionData } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => storyService.getSubmission(submissionId),
    enabled: !!submissionId,
  });

  const generatedImageUrl = submissionData?.submission?.generatedImageUrl;

  useAutoSave(submissionId, text);
  const { suggestions } = useLanguageTool(text);

  const handleGetHint = async () => {
    setGettingHint(true);
    try {
      const data = await aiService.getHint(text, story?.ageLevel);
      setHint(data.hint);
    } catch (err) {
      setHint('Try adding a new character or a surprise event!');
    } finally {
      setGettingHint(false);
    }
  };

  const teacherSetupForAi = [part?.writingPrompt, part?.text].filter(Boolean).join('\n\n');

  const handleExpandAiParagraph = async () => {
    if (!text.trim() || text.trim().length < MIN_CHARS) {
      alert(`Write at least ${MIN_CHARS} characters first.`);
      return;
    }
    setExpanding(true);
    setExpansionError(null);
    try {
      const { snippet } = await aiService.expandStorySnippet(text, teacherSetupForAi, story?.ageLevel);
      setText((prev) => `${prev.trimEnd()}\n\n${snippet.trim()}`);
      setHint(null);
    } catch (err) {
      setExpansionError(err.response?.data?.error || err.message || 'Could not add a paragraph.');
    } finally {
      setExpanding(false);
    }
  };

  const handleGenerateIllustration = async (force = false) => {
    if (!submissionId) return;
    if (text.trim().length < MIN_CHARS) {
      alert(`Write at least ${MIN_CHARS} characters first.`);
      return;
    }
    setIllustrating(true);
    setIllustrationError(null);
    try {
      await storyService.generateIllustration(submissionId, force, text);
      await queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not create illustration.';
      setIllustrationError(msg);
    } finally {
      setIllustrating(false);
    }
  };

  const handleSubmit = async () => {
    if (text.length < MIN_CHARS) {
      alert(`Please write a bit more before submitting! (Min ${MIN_CHARS} characters)`);
      return;
    }
    setSubmitting(true);
    try {
      await storyService.finalize(submissionId);
      navigate(`/results/${submissionId}`);
    } catch (err) {
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const listenToText = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  if (partLoading) return <LoadingSpinner fullPage message="Entering the story..." />;

  return (
    <div className="fixed inset-0 bg-navy flex flex-col font-nunito overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition">← Back</button>
          <div>
            <h1 className="text-white font-black text-sm uppercase tracking-wider">{story?.title}</h1>
            <p className="text-purple-400 text-xs font-bold">Part {part?.order}: {part?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => handleGenerateIllustration(!!generatedImageUrl)}
            disabled={illustrating || !submissionId}
            className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition text-sm disabled:opacity-50"
            title={generatedImageUrl ? 'Regenerate illustration' : 'Create an illustration from your story'}
          >
            {illustrating ? 'Drawing…' : generatedImageUrl ? '🖼 New illustration' : '🖼 Illustrate my story'}
          </button>
          <button
            type="button"
            onClick={listenToText}
            disabled={!text}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition disabled:opacity-30"
            title="Listen to your story"
          >
            🔊
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-2 rounded-xl transition shadow-glow disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : '🚀 Submit Story'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[40%] bg-slate-900 border-r border-slate-700 overflow-y-auto p-6 space-y-6">
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <span>💡</span> Story idea from your teacher
            </h3>
            {part?.writingPrompt ? (
              <p className="text-amber-200/90 text-sm leading-relaxed italic mb-4">{part.writingPrompt}</p>
            ) : null}
            <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Setup</h4>
            <p className="text-slate-400 text-sm leading-relaxed">{part?.text}</p>
          </div>

          {story?.vocabulary?.length > 0 ? (
            <div className="bg-emerald-950/30 rounded-2xl p-5 border border-emerald-700/40">
              <h3 className="text-emerald-200 font-bold mb-2 text-sm flex items-center gap-2">
                <span>📚</span> Vocabulary for this story
              </h3>
              <p className="text-slate-500 text-[10px] mb-3">Use these words in your writing when you can.</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-emerald-800/40">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 text-slate-400">
                    <tr>
                      <th className="px-2 py-1.5 font-bold">Word</th>
                      <th className="px-2 py-1.5 font-bold">Definition</th>
                      {story.vocabulary.some((v) => v.example) ? (
                        <th className="px-2 py-1.5 font-bold">Example</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {story.vocabulary.map((row, i) => (
                      <tr key={i} className="border-t border-slate-700/40 text-slate-300">
                        <td className="px-2 py-1.5 font-semibold text-white">{row.word}</td>
                        <td className="px-2 py-1.5">{row.definition || '—'}</td>
                        {story.vocabulary.some((v) => v.example) ? (
                          <td className="px-2 py-1.5 italic text-slate-400">{row.example || '—'}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
            <div className="p-3 bg-slate-700/50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Optional reference image</span>
              <span className="text-[10px] bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full font-bold">MOOD / STYLE</span>
            </div>
            {part?.imageUrl ? (
              <img src={part.imageUrl} alt="Teacher reference" className="w-full object-cover max-h-56" />
            ) : (
              <div className="h-36 bg-slate-800 flex items-center justify-center text-slate-600 italic text-sm px-4 text-center">
                No reference image — your illustration will be based on your writing and the idea above.
              </div>
            )}
          </div>

          <div className="bg-indigo-950/40 rounded-2xl p-5 border border-indigo-600/30">
            <h3 className="text-indigo-200 font-bold mb-2 text-sm">Illustration from your story</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Here, your &quot;full story&quot; is <strong className="text-slate-300">your own words</strong> plus this optional <strong className="text-slate-300">illustration</strong> (a picture of your scene). If you want more story text, use &quot;Add AI paragraph&quot; in the editor — you can edit or delete it; it only appears when you click.
            </p>
            {generatedImageUrl ? (
              <img src={generatedImageUrl} alt="Your generated illustration" className="w-full rounded-xl border border-indigo-500/30 mb-3" />
            ) : null}
            {illustrationError ? (
              <p className="text-red-400 text-xs mb-2">{illustrationError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => handleGenerateIllustration(!!generatedImageUrl)}
              disabled={illustrating || text.trim().length < MIN_CHARS}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              {illustrating ? 'Creating illustration…' : generatedImageUrl ? 'Generate again' : 'Generate illustration'}
            </button>
            {text.trim().length < MIN_CHARS ? (
              <p className="text-slate-500 text-[10px] mt-2">Need {MIN_CHARS}+ characters in your story first.</p>
            ) : null}
          </div>
        </div>

        <div className="flex-1 bg-slate-800 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <textarea
              ref={editorRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your story here. Illustration = picture from your text. Optional: Add AI paragraph adds draft words you can change."
              className="flex-1 bg-transparent text-white text-xl leading-relaxed resize-none focus:outline-none placeholder:text-slate-600 font-medium"
              spellCheck="false"
            />
          </div>

          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-none">
            {suggestions.length > 0 && (
              <div className="bg-slate-900/90 backdrop-blur border border-amber-500/30 rounded-2xl p-4 shadow-2xl max-w-xs pointer-events-auto fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">Grammar Hints</span>
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 rounded-full">{suggestions.length}</span>
                </div>
                <div className="space-y-3">
                  {suggestions.slice(0, 2).map((s, i) => (
                    <div key={i} className="text-slate-300 text-xs leading-tight">
                      <p className="mb-1 italic">
                        &quot;...{text.substring(Math.max(0, s.offset - 10), s.offset)}
                        <span className="bg-amber-500/30 text-white font-bold">{text.substring(s.offset, s.offset + s.length)}</span>
                        ...&quot;
                      </p>
                      <p className="text-slate-500 mb-1">{s.message}</p>
                      <div className="flex gap-2">
                        {(s.replacements || []).map((r, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => {
                              const newText = text.substring(0, s.offset) + r + text.substring(s.offset + s.length);
                              setText(newText);
                            }}
                            className="bg-purple-600/30 hover:bg-purple-600 text-purple-200 px-2 py-1 rounded text-[10px] transition"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hint && (
              <div className="bg-purple-900/90 backdrop-blur border border-purple-500/50 rounded-2xl p-5 shadow-2xl max-w-sm pointer-events-auto fade-in animate-bounce-subtle">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-purple-300 font-bold text-xs uppercase tracking-widest">Story Hint</span>
                  <button type="button" onClick={() => setHint(null)} className="text-purple-300/50 hover:text-white">✕</button>
                </div>
                <p className="text-white text-sm leading-relaxed">{hint}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGetHint}
              disabled={gettingHint || !text}
              className="bg-slate-900 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-full border border-slate-700 shadow-glow transition pointer-events-auto disabled:opacity-50 flex items-center gap-2"
            >
              {gettingHint ? 'Thinking...' : '💡 Need a Hint?'}
            </button>
            <button
              type="button"
              onClick={handleExpandAiParagraph}
              disabled={expanding || !text || text.trim().length < MIN_CHARS}
              title="Appends one draft paragraph from AI. Edit or remove it — your choice."
              className="bg-indigo-950/90 hover:bg-indigo-900 text-indigo-100 font-bold px-5 py-2.5 rounded-full border border-indigo-600/40 shadow-glow transition pointer-events-auto disabled:opacity-40 text-sm"
            >
              {expanding ? 'Writing…' : '✨ Add AI paragraph (optional)'}
            </button>
            {expansionError ? (
              <p className="text-red-400 text-xs max-w-xs text-right pointer-events-auto">{expansionError}</p>
            ) : null}
          </div>

          <footer className="bg-slate-900/50 border-t border-slate-700/50 px-8 py-3 flex items-center justify-between text-xs text-slate-500">
            <div className="flex gap-4">
              <span>{text.split(/\s+/).filter(Boolean).length} Words</span>
              <span>{text.length} Characters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Autosave while you type</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
