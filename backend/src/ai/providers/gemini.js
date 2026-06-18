import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../../utils/logger.js';

let geminiClient = null;

const getClient = () => {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('replace_with_a_secure')) {
    return null;
  }
  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
};

export const chat = async (messages, options = {}) => {
  const client = getClient();
  if (!client) {
    logger.warn('[Gemini] API key missing, running in MOCK mode.');
    return mockChatResponse(messages, options);
  }

  try {
    const modelName = options.model || 'gemini-1.5-flash';
    const model = client.getGenerativeModel({ model: modelName });

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (options.stream) {
      const responseStream = await model.generateContentStream({ contents });
      return responseStream;
    } else {
      const result = await model.generateContent({ contents });
      return result.response.text();
    }
  } catch (error) {
    logger.error('[Gemini] Chat request failed: ' + error.message);
    throw error;
  }
};

export const embed = async (text) => {
  const client = getClient();
  if (!client) {
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }

  try {
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    logger.error('[Gemini] Embedding request failed: ' + error.message);
    throw error;
  }
};

const mockChatResponse = async (messages, options) => {
  const lastMsg = messages[messages.length - 1]?.content || '';
  let responseText = `[MOCK Gemini RESPONSE] Thank you for asking: "${lastMsg}". Here is your helpful answer.`;

  if (options.stream) {
    return (async function* () {
      const words = responseText.split(' ');
      for (const word of words) {
        await new Promise(r => setTimeout(r, 45));
        yield {
          text: () => word + ' '
        };
      }
    })();
  }

  return responseText;
};
