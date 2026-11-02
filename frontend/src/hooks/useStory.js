import { useQuery } from '@tanstack/react-query';
import { storyService } from '../services/storyService';

export function useStory(storyId, partId) {
  const storyQuery = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => storyService.getById(storyId),
    enabled: !!storyId
  });

  const partQuery = useQuery({
    queryKey: ['storyPart', storyId, partId],
    queryFn: () => storyService.getPart(storyId, partId),
    enabled: !!storyId && !!partId
  });

  return {
    story: storyQuery.data?.story,
    parts: storyQuery.data?.parts,
    part: partQuery.data?.part,
    storyLoading: storyQuery.isLoading,
    partLoading: partQuery.isLoading,
    storyError: storyQuery.error,
    partError: partQuery.error
  };
}
