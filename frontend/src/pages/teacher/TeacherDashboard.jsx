import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function TeacherDashboard() {
  const { data: summaryData, isLoading: loadingSummary } = useQuery({ 
    queryKey: ['classSummary'], 
    queryFn: aiService.getClassSummary 
  });
  
  const { data: storiesData } = useQuery({ 
    queryKey: ['stories'], 
    queryFn: storyService.getAll 
  });

  return (
    <div className="fade-in space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white">Teacher Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage your stories and monitor student progress.</p>
        </div>
        <Link to="/teacher/stories" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-glow">
          🛠 Manage Stories
        </Link>
      </header>

      {/* AI Class Insights */}
      <section className="bg-gradient-to-br from-indigo-900/40 to-slate-800 rounded-3xl border border-indigo-500/30 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-indigo-500/20 bg-indigo-500/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🧠</span> AI Class Insights
          </h2>
          <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded tracking-widest">LIVE ANALYSIS</span>
        </div>
        
        <div className="p-8">
          {loadingSummary ? <LoadingSpinner message="Analyzing class performance..." /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-indigo-300 font-bold text-sm uppercase mb-3">Class Performance Summary</h3>
                <p className="text-white leading-relaxed text-lg italic font-medium">"{summaryData?.classSummary}"</p>
                
                <div className="mt-6 flex flex-wrap gap-2">
                  {(summaryData?.commonWeaknesses || []).map((w, i) => (
                    <span key={i} className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs px-3 py-1.5 rounded-full font-bold">
                      ⚠️ {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-indigo-300 font-bold text-sm uppercase mb-4">Recommended Actions</h3>
                <ul className="space-y-4">
                  {(summaryData?.suggestions || []).map((s, i) => (
                    <li key={i} className="flex gap-3 text-slate-300 text-sm">
                      <span className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0">{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Active Stories Grid */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Active Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(storiesData?.stories || []).map(story => (
            <div key={story._id} className="bg-slate-800 rounded-2xl border border-slate-700 p-5 hover:border-slate-500 transition">
              <h3 className="font-black text-white text-lg">{story.title}</h3>
              <p className="text-slate-400 text-xs mt-1 mb-4">{story.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{story.theme} • {story.ageLevel}Yrs</span>
                <Link to={`/teacher/stories`} className="text-purple-400 font-bold text-sm hover:text-purple-300">Edit →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
