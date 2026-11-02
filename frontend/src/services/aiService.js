import axios from 'axios';

const API_URL = '/api/ai';

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const aiService = {
  analyzeImage: async (imageUrl, ageLevel) => {
    const response = await axios.post(`${API_URL}/image-analyze`, { imageUrl, ageLevel }, getHeaders());
    return response.data;
  },
  getHint: async (text, ageLevel) => {
    const response = await axios.post(`${API_URL}/hint`, { text, ageLevel }, getHeaders());
    return response.data;
  },
  /** Opt-in: one AI paragraph to append; student edits or removes in the editor. */
  expandStorySnippet: async (text, teacherSetup, ageLevel) => {
    const response = await axios.post(
      `${API_URL}/expand-snippet`,
      { text, teacherSetup, ageLevel },
      getHeaders()
    );
    return response.data;
  },
  checkText: async (text, language) => {
    const response = await axios.post(`${API_URL}/check-grammar`, { text, language }, getHeaders());
    return response.data;
  },
  
  // Teacher utilities
  getTeacherSubmissions: async (status = null) => {
    // We'll reuse the submission endpoint but for all students (backend needs to support this or we use a separate route)
    // For now, assume a separate or filtered route
    const url = status ? `/api/submissions?status=${status}` : '/api/submissions'; 
    const response = await axios.get(url, getHeaders());
    return response.data;
  },
  getClassSummary: async () => {
    const response = await axios.get(`${API_URL}/class-summary`, getHeaders());
    return response.data;
  },
  saveFeedback: async (feedbackData) => {
    const response = await axios.post(`${API_URL}/feedback`, feedbackData, getHeaders());
    return response.data;
  },
  uploadPartImage: async (storyId, partId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.put(
      `/api/stories/${storyId}/parts/${partId}/image`,
      formData,
      {
        headers: {
          ...getHeaders().headers,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
