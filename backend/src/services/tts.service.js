/**
 * NOTE: The primary TTS is the Browser Web Speech API (zero latency, zero cost).
 * This service provides a backend bridge if server-side saving is ever needed.
 */

export const synthesizeSpeech = async (text) => {
  // Currently, we prioritize the Browser API.
  // This is a placeholder for server-side providers like ElevenLabs.
  return { provider: 'browser', status: 'ready' };
};
