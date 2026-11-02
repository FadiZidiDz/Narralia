import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const statusColor = { draft: 'text-slate-400 bg-slate-700', submitted: 'text-amber-400 bg-amber-500/20', reviewed: 'text-green-400 bg-green-500/20' };

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['mySubmissions'], queryFn: storyService.getMySubmissions });

  const submissions = data?.submissions || [];
  const stats = {
    started: submissions.length,
    submitted: submissions.filter(s => s.status !== 'draft').length,
    avgScore: submissions.filter(s => s.essaiResult?.score).length > 0
      ? Math.round(submissions.reduce((a, s) => a + (s.essaiResult?.score || 0), 0) / submissions.filter(s => s.essaiResult?.score).length)
      : null
  };

  return (
    <div className="fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-purple-900/60 to-slate-800/60 rounded-2xl p-6 mb-8 border border-purple-700/30">
        <h1 className="text-3xl font-black text-white">Hello, {user?.name}! 👋</h1>
        <p className="text-slate-300 mt-1">Ready to write your next story?</p>
        <Link to="/stories" className="inline-block mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-glow">
          ✨ Start a New Story
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Stories Started', value: stats.started, icon: '📖' },
          { label: 'Submitted', value: stats.submitted, icon: '📤' },
          { label: 'Avg Score', value: stats.avgScore !== null ? `${stats.avgScore}%` : '—', icon: '⭐' }
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 text-center">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-slate-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <h2 className="text-xl font-bold text-white mb-4">My Recent Work</h2>
      {isLoading ? <LoadingSpinner /> : submissions.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-700">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-slate-400">You haven't started any stories yet.</p>
          <Link to="/stories" className="inline-block mt-4 text-purple-400 hover:text-purple-300 font-semibold">Browse Stories →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.slice(0, 8).map(sub => (
            <div key={sub._id} className="bg-slate-800 rounded-xl px-5 py-4 border border-slate-700 flex items-center justify-between hover:border-purple-700/50 transition">
              <div>
                <p className="font-bold text-white">{sub.storyId?.title || 'Story'}</p>
                <p className="text-slate-400 text-sm">Part {sub.storyPartId?.order}: {sub.storyPartId?.title}</p>
              </div>
              <div className="flex items-center gap-3">
                {sub.essaiResult?.score && (
                  <span className="text-amber-400 font-bold">{sub.essaiResult.score}%</span>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusColor[sub.status]}`}>
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
