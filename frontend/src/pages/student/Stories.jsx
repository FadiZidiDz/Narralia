import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const themeColor = { adventure: 'text-amber-400 bg-amber-500/20', fantasy: 'text-purple-400 bg-purple-500/20', science: 'text-blue-400 bg-blue-500/20', friendship: 'text-pink-400 bg-pink-500/20', nature: 'text-green-400 bg-green-500/20', animals: 'text-orange-400 bg-orange-500/20' };
const artStyleIcon = { children_book: '🎨', cartoon: '🖼️', realistic_soft: '🌟' };

export default function Stories() {
  const { data, isLoading } = useQuery({ queryKey: ['stories'], queryFn: storyService.getAll });
  const stories = data?.stories || [];

  return (
    <div className="fade-in">
      <h1 className="text-3xl font-black text-white mb-2">Story Library</h1>
      <p className="text-slate-400 mb-8">Choose a story and start writing your adventure</p>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map(story => (
            <div key={story._id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-purple-600/50 hover:shadow-glow transition group">
              {/* Cover image or placeholder */}
              <div className="h-40 bg-gradient-to-br from-purple-900 to-slate-800 flex items-center justify-center text-6xl">
                {artStyleIcon[story.artStyle] || '📖'}
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${themeColor[story.theme] || 'text-slate-400 bg-slate-700'}`}>
                    {story.theme}
                  </span>
                  <span className="text-xs text-slate-500">Age {story.ageLevel}+</span>
                </div>
                <h3 className="text-lg font-black text-white mb-1 group-hover:text-purple-300 transition">{story.title}</h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{story.description}</p>
                <Link
                  to={`/stories/${story._id}`}
                  className="block text-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition"
                >
                  Start Writing ✍️
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
