import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

function ScoreRing({ score }) {
  const r = 52, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="#7c3aed" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          className="score-ring" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-slate-400 text-xs">/ 100</span>
      </div>
    </div>
  );
}

function RubricBar({ label, score }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300 capitalize">{label}</span>
        <span className="text-white font-bold">{score}%</span>
      </div>
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all duration-1000"
          style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function Results() {
  const { submissionId } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => storyService.getSubmission(submissionId)
  });
  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', submissionId],
    queryFn: () => storyService.getFeedback(submissionId)
  });

  const illustrationMutation = useMutation({
    mutationFn: ({ force }) => {
      const written =
        queryClient.getQueryData(['submission', submissionId])?.submission?.writtenText;
      return storyService.generateIllustration(submissionId, force, written);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    },
  });

  if (isLoading) return <LoadingSpinner fullPage message="Loading results..." />;
  const sub = data?.submission;
  const result = sub?.essaiResult;
  const feedback = feedbackData?.feedback || [];

  if (!result) return (
    <div className="text-center py-20">
      <p className="text-slate-400">No evaluation results found.</p>
      <Link to="/stories" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">Back to Stories</Link>
    </div>
  );

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">← Back to Dashboard</Link>

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
        <h2 className="font-bold text-white mb-3">Your story illustration</h2>
        <p className="text-slate-500 text-xs mb-3">
          This image is generated from the story text you submitted (not a separate &quot;AI full story&quot;). Optional AI paragraphs, if you used them while writing, are part of your text and stay editable only before submit.
        </p>
        {sub.generatedImageUrl ? (
          <div className="space-y-3">
            <img
              src={sub.generatedImageUrl}
              alt="Generated from your story"
              className="w-full rounded-xl border border-slate-600"
            />
            <button
              type="button"
              onClick={() => illustrationMutation.mutate({ force: true })}
              disabled={illustrationMutation.isPending}
              className="text-sm text-indigo-300 hover:text-indigo-200 font-bold disabled:opacity-50"
            >
              {illustrationMutation.isPending ? 'Regenerating…' : 'Generate a new version'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-4">No illustration yet — create one from the story you submitted.</p>
            <button
              type="button"
              onClick={() => illustrationMutation.mutate({ force: false })}
              disabled={illustrationMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {illustrationMutation.isPending ? 'Creating…' : 'Generate illustration'}
            </button>
          </div>
        )}
        {illustrationMutation.error ? (
          <p className="text-red-400 text-xs mt-2">
            {illustrationMutation.error?.response?.data?.error || illustrationMutation.error?.message || 'Something went wrong.'}
          </p>
        ) : null}
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 mb-6 text-center shadow-glow">
        <h1 className="text-2xl font-black text-white mb-6">Your Results 🎉</h1>
        <ScoreRing score={result.score} />
        <p className="text-slate-300 mt-6 leading-relaxed">{result.overallFeedback}</p>
      </div>

      {/* Rubric breakdown */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
        <h2 className="font-bold text-white mb-4">Score Breakdown</h2>
        <div className="space-y-4">
          {Object.entries(result.rubricBreakdown || {}).map(([key, val]) => (
            <RubricBar key={key} label={key} score={val} />
          ))}
        </div>
      </div>

      {/* Strengths and improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-900/20 rounded-2xl p-5 border border-green-700/30">
          <h3 className="text-green-400 font-bold mb-3">✅ Strengths</h3>
          <ul className="space-y-2">
            {(result.strengths || []).map((s, i) => (
              <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-green-400">•</span>{s}</li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-900/20 rounded-2xl p-5 border border-amber-700/30">
          <h3 className="text-amber-400 font-bold mb-3">💡 Areas to Improve</h3>
          <ul className="space-y-2">
            {(result.improvements || []).map((s, i) => (
              <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-amber-400">•</span>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Teacher feedback */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="font-bold text-white mb-3">👩‍🏫 Teacher Feedback</h2>
        {feedback.length > 0 ? feedback.map(f => (
          <div key={f._id} className="bg-slate-700/50 rounded-xl p-4">
            <p className="text-slate-300 leading-relaxed">{f.comment}</p>
            {f.score && <p className="text-amber-400 font-bold mt-2">Score from teacher: {f.score}/100</p>}
            <p className="text-slate-500 text-xs mt-2">— {f.teacherId?.name}</p>
          </div>
        )) : (
          <p className="text-slate-500 italic">Awaiting teacher review...</p>
        )}
      </div>
    </div>
  );
}
