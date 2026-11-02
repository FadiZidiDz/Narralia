import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyService } from '../../services/storyService';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ImageUpload from '../../components/Story/ImageUpload';
import VocabularyUpload from '../../components/Story/VocabularyUpload';

const STORY_THEMES = ['adventure', 'fantasy', 'science', 'friendship', 'nature', 'animals'];

export default function StoryManagement() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['stories'], queryFn: storyService.getAll });
  const [editingStory, setEditingStory] = useState(null);
  const [newPart, setNewPart] = useState({ title: '', text: '', writingPrompt: '', order: 1 });
  const [storyForm, setStoryForm] = useState({
    title: '',
    description: '',
    theme: 'adventure',
    ageLevel: 8,
  });
  const [savingStory, setSavingStory] = useState(false);
  const [storyFormError, setStoryFormError] = useState(null);

  const { data: storyDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['story', editingStory?._id],
    queryFn: () => storyService.getById(editingStory._id),
    enabled: !!editingStory?._id,
  });

  useEffect(() => {
    const s = storyDetail?.story || editingStory;
    if (!s?._id) return;
    setStoryForm({
      title: s.title || '',
      description: s.description || '',
      theme: s.theme || 'adventure',
      ageLevel: s.ageLevel ?? 8,
    });
    setStoryFormError(null);
  }, [editingStory?._id, storyDetail?.story]);

  const parts = storyDetail?.parts || [];

  const createStoryMutation = useMutation({
    mutationFn: (story) => axios.post('/api/stories', story, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['stories']);
      if (response.data?.story) {
        setEditingStory(response.data.story);
      }
    },
  });

  const handleDeleteStory = async (e, story) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${story.title}"? This removes all parts, vocabulary, and student work for this story.`)) {
      return;
    }
    try {
      await storyService.deleteStory(story._id);
      if (editingStory?._id === story._id) setEditingStory(null);
      queryClient.invalidateQueries(['stories']);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete story.');
    }
  };

  const handleSaveStoryDetails = async (e) => {
    e.preventDefault();
    if (!editingStory?._id) return;
    if (!storyForm.title.trim()) {
      setStoryFormError('Title is required.');
      return;
    }
    setSavingStory(true);
    setStoryFormError(null);
    try {
      const { story } = await storyService.updateStory(editingStory._id, {
        title: storyForm.title.trim(),
        description: storyForm.description.trim(),
        theme: storyForm.theme,
        ageLevel: Number(storyForm.ageLevel),
      });
      setEditingStory(story);
      queryClient.invalidateQueries(['stories']);
      queryClient.invalidateQueries(['story', editingStory._id]);
    } catch (err) {
      setStoryFormError(err.response?.data?.error || 'Could not save story details.');
    } finally {
      setSavingStory(false);
    }
  };

  const handleCreatePart = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/stories/${editingStory._id}/part`, newPart, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNewPart({ title: '', text: '', writingPrompt: '', order: 1 });
      queryClient.invalidateQueries(['story', editingStory._id]);
      queryClient.invalidateQueries(['stories']);
      alert('Part added!');
    } catch (err) {
      alert('Error adding part');
    }
  };

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-black text-white">Story & Curriculum Workshop</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Story List */}
        <div className="lg:col-span-1 space-y-4">
          <button 
            onClick={() => createStoryMutation.mutate({ title: 'New Story', description: 'Description', theme: 'adventure', ageLevel: 8 })}
            className="w-full bg-slate-800 border-2 border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-purple-500 py-4 rounded-2xl transition font-bold"
          >
            + Create New Story
          </button>
          
          {(data?.stories || []).map(s => (
            <div 
              key={s._id} 
              onClick={() => setEditingStory(s)}
              className={`p-5 rounded-2xl border cursor-pointer transition relative group ${editingStory?._id === s._id ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
            >
              <button
                type="button"
                onClick={(e) => handleDeleteStory(e, s)}
                className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/80 hover:bg-red-600 border border-red-800/60 text-red-300 hover:text-white text-[10px] font-bold transition z-10"
                title="Delete story"
                aria-label={`Delete ${s.title}`}
              >
                <Trash2 size={14} aria-hidden />
                Delete
              </button>
              <p className="font-black pr-16">{s.title}</p>
              <p className="text-xs mt-1 opacity-70">{s.theme} • {s.ageLevel}Yrs</p>
            </div>
          ))}
        </div>

        {/* Right: Editing Area */}
        <div className="lg:col-span-2">
          {editingStory ? (
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-lg font-black text-white">Story details</h2>
                  <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded font-bold shrink-0">ID: {editingStory._id}</span>
                </div>
                <form onSubmit={handleSaveStoryDetails} className="space-y-4">
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold"
                    placeholder="Story title"
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    required
                  />
                  <textarea
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none"
                    placeholder="Short description for students"
                    value={storyForm.description}
                    onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 block">Theme</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm capitalize"
                        value={storyForm.theme}
                        onChange={(e) => setStoryForm({ ...storyForm, theme: e.target.value })}
                      >
                        {STORY_THEMES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 block">Age level</label>
                      <input
                        type="number"
                        min={5}
                        max={18}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                        value={storyForm.ageLevel}
                        onChange={(e) => setStoryForm({ ...storyForm, ageLevel: parseInt(e.target.value, 10) || 8 })}
                        required
                      />
                    </div>
                  </div>
                  {storyFormError ? (
                    <p className="text-red-400 text-xs">{storyFormError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={savingStory}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-glow"
                  >
                    {savingStory ? 'Saving…' : 'Save story details'}
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-700 pt-8">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <span>📚</span> Vocabulary sheet (Excel)
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  One file per story. Any spreadsheet layout works — words in the first column. Students use these while writing <strong className="text-slate-400">any part</strong> of this story.
                </p>
                <VocabularyUpload
                  storyId={editingStory._id}
                  story={storyDetail?.story || editingStory}
                  onSuccess={() => {
                    queryClient.invalidateQueries(['story', editingStory._id]);
                    queryClient.invalidateQueries(['stories']);
                  }}
                />
              </div>

              <div className="border-t border-slate-700 pt-8">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <span>🎞️</span> Add a lesson part (scene)
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  Students read your <strong className="text-slate-400">idea</strong> and <strong className="text-slate-400">setup</strong>, write their own story, then get an illustration from their text.
                </p>
                
                <form onSubmit={handleCreatePart} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" 
                      placeholder="Scene title (e.g. The spooky cave)"
                      value={newPart.title}
                      onChange={e => setNewPart({...newPart, title: e.target.value})}
                      required
                    />
                    <input 
                      type="number"
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" 
                      placeholder="Order"
                      value={newPart.order}
                      onChange={e => setNewPart({...newPart, order: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <textarea 
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none" 
                    placeholder="Setup / context: what already happened in the story world before the student writes (characters, place, mood)..."
                    value={newPart.text}
                    onChange={e => setNewPart({...newPart, text: e.target.value})}
                    required
                  />
                  <input 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" 
                    placeholder="Story idea for the student: what should they focus on? (task / question)"
                    value={newPart.writingPrompt}
                    onChange={e => setNewPart({...newPart, writingPrompt: e.target.value})}
                  />
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition shadow-glow">
                    Save Part
                  </button>
                </form>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-amber-400 text-xs font-bold uppercase mb-1">Teacher tip</p>
                <p className="text-amber-200/70 text-xs">
                  After each part is saved, you can add an <strong>optional reference image</strong> (max 4MB). It helps style the <strong>illustration generated from the student&apos;s own writing</strong>, not replace their words.
                </p>
              </div>

              <div className="border-t border-slate-700 pt-8">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span>🖼️</span> Optional reference images (per scene)
                </h3>
                {detailLoading ? (
                  <p className="text-slate-500 text-sm">Loading scenes…</p>
                ) : parts.length === 0 ? (
                  <p className="text-slate-500 text-sm">Save at least one story part above, then upload an image for each scene.</p>
                ) : (
                  <div className="space-y-6">
                    {parts.map((p) => (
                      <div key={p._id} className="space-y-2">
                        <p className="text-slate-300 text-sm font-bold">
                          Part {p.order}: {p.title}
                        </p>
                        <ImageUpload
                          storyId={editingStory._id}
                          partId={p._id}
                          currentImageUrl={p.imageUrl}
                          onSuccess={() => {
                            queryClient.invalidateQueries(['story', editingStory._id]);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-96 bg-slate-800/30 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
              <span className="text-5xl mb-4">👈</span>
              <p className="font-bold">Select a story to manage its curriculum</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
