import { OpenAI } from 'openai';
import { logger } from '../../../utils/logger.js';

let openaiClient = null;

const getClient = () => {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('replace_with_a_secure')) {
    return null;
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

export const chat = async (messages, options = {}) => {
  const client = getClient();
  if (!client) {
    logger.warn('[OpenAI] API key missing, running in MOCK mode.');
    return mockChatResponse(messages, options);
  }

  try {
    const model = options.model || 'gpt-4o-mini';
    const response = await client.chat.completions.create({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      stream: !!options.stream
    });

    if (options.stream) {
      return response; // Async iterable stream
    }
    return response.choices[0].message.content;
  } catch (error) {
    logger.error('[OpenAI] Chat request failed: ' + error.message);
    throw error;
  }
};

export const embed = async (text) => {
  const client = getClient();
  if (!client) {
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    logger.error('[OpenAI] Embedding request failed: ' + error.message);
    throw error;
  }
};

const mockChatResponse = async (messages, options) => {
  const lastMsg = messages[messages.length - 1]?.content || '';
  let responseText = `[MOCK OpenAI RESPONSE] Thank you for your message. You asked: "${lastMsg}". How can I assist you further?`;

  if (options.stream) {
    return (async function* () {
      const words = responseText.split(' ');
      for (const word of words) {
        await new Promise(r => setTimeout(r, 40));
        yield {
          choices: [
            {
              delta: {
                content: word + ' '
              }
            }
          ]
        };
      }
    })();
  }

  return responseText;
};
