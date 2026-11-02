import axios from 'axios';

function languageToolCheckUrl() {
  const raw = (process.env.LANGUAGETOOL_URL || 'http://languagetool:8010/v2/check').trim().replace(/\/$/, '');
  if (raw.endsWith('/check')) return raw;
  if (raw.endsWith('/v2')) return `${raw}/check`;
  return raw;
}

/**
 * Checks text for grammar/spelling using the self-hosted LanguageTool Docker.
 * Non-blocking: If LanguageTool is down, returns empty array instead of failing.
 */
export const checkGrammar = async (text, language = 'en-US') => {
  try {
    const response = await axios.post(
      languageToolCheckUrl(),
      null,
      {
        params: {
          text: text,
          language: language
        }
      }
    );

    // Simplify the matches for the frontend
    return (response.data.matches || []).map(match => ({
      message: match.message,
      shortMessage: match.shortMessage,
      offset: match.offset,
      length: match.length,
      replacements: (match.replacements || []).slice(0, 3).map(r => r.value),
      ruleId: match.rule?.id
    }));
  } catch (err) {
    // Silent fail — never block the user's writing flow
    console.warn('LanguageTool is offline or unreachable.');
    return []; 
  }
};
