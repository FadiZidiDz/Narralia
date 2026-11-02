import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function StoryDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['story', id], queryFn: () => storyService.getById(id) });

  if (isLoading) return <LoadingSpinner fullPage message="Loading story..." />;
  if (!data?.story) return <div className="text-center text-slate-400 py-20">Story not found.</div>;

  const { story, parts } = data;

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <Link to="/stories" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">← Back to Stories</Link>

      <div className="bg-gradient-to-br from-purple-900/40 to-slate-800 rounded-2xl p-8 mb-8 border border-purple-700/30">
        <h1 className="text-4xl font-black text-white mb-2">{story.title}</h1>
        <p className="text-slate-300 text-lg">{story.description}</p>
        <div className="flex gap-3 mt-4 flex-wrap">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 capitalize">{story.theme}</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-700 text-slate-300">Age {story.ageLevel}+</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-700 text-slate-300">{story.language}</span>
          {story.vocabulary?.length > 0 ? (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
              📚 {story.vocabulary.length} vocabulary word{story.vocabulary.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Choose a Story Part</h2>
      <div className="space-y-4">
        {(parts || []).map((part, index) => (
          <Link
            key={part._id}
            to={`/stories/${id}/part/${part._id}`}
            className="block bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-purple-600/60 hover:shadow-glow transition group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 font-black text-lg shrink-0">
                {index + 1}
              </div>
              <div>
                <h3 className="font-black text-white text-lg group-hover:text-purple-300 transition">{part.title}</h3>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{part.text}</p>
                {part.writingPrompt && (
                  <p className="text-amber-400/80 text-xs mt-2 italic">📝 {part.writingPrompt}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
