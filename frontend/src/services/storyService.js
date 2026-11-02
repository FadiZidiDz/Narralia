import axios from 'axios';

const API_URL = '/api/stories';
const SUB_URL = '/api/submissions';

const getHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const storyService = {
  // Stories
  getAll: async () => {
    const response = await axios.get(API_URL, getHeaders());
    return response.data;
  },
  getById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`, getHeaders());
    return response.data;
  },
  updateStory: async (storyId, payload) => {
    const response = await axios.put(`${API_URL}/${storyId}`, payload, getHeaders());
    return response.data;
  },
  getPart: async (id, partId) => {
    const response = await axios.get(`${API_URL}/part/${partId}`, getHeaders());
    return response.data;
  },

  uploadVocabulary: async (storyId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/${storyId}/vocabulary`, formData, {
      headers: {
        ...getHeaders().headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteVocabulary: async (storyId) => {
    const response = await axios.delete(`${API_URL}/${storyId}/vocabulary`, getHeaders());
    return response.data;
  },

  deleteStory: async (storyId) => {
    const response = await axios.delete(`${API_URL}/${storyId}`, getHeaders());
    return response.data;
  },

  // Submissions
  startSubmission: async (storyId, storyPartId) => {
    const response = await axios.post(`${SUB_URL}/start`, { storyId, storyPartId }, getHeaders());
    return response.data;
  },
  saveText: async (submissionId, text) => {
    const response = await axios.post(`${SUB_URL}/save`, { submissionId, text }, getHeaders());
    return response.data;
  },
  finalize: async (submissionId) => {
    const response = await axios.post(`${SUB_URL}/finalize`, { submissionId }, getHeaders());
    return response.data;
  },
  getMySubmissions: async () => {
    const response = await axios.get(`${SUB_URL}/my`, getHeaders());
    return response.data;
  },
  getSubmission: async (id) => {
    const response = await axios.get(`${SUB_URL}/${id}`, getHeaders());
    return response.data;
  },
  getFeedback: async (id) => {
    const response = await axios.get(`${SUB_URL}/${id}/feedback`, getHeaders());
    return response.data;
  },

  generateIllustration: async (submissionId, force = false, writtenText = null) => {
    const q = force ? '?force=1' : '';
    const body = writtenText != null ? { text: writtenText } : {};
    const response = await axios.post(
      `${SUB_URL}/${submissionId}/generate-illustration${q}`,
      body,
      getHeaders()
    );
    return response.data;
  },
};
