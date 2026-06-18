import { logger } from '../../../utils/logger.js';

const getOllamaHost = () => {
  return process.env.OLLAMA_HOST || 'http://localhost:11434';
};

export const chat = async (messages, options = {}) => {
  const host = getOllamaHost();
  const model = options.model || 'llama3';

  if (process.env.OLLAMA_ENABLED !== 'true') {
    return mockChatResponse(messages, options);
  }

  try {
    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: !!options.stream
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: HTTP ${response.status}`);
    }

    if (options.stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      return (async function* () {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const parsed = JSON.parse(line);
              yield parsed;
            } catch (err) {
              // Ignore partial chunk parse error
            }
          }
        }
      })();
    } else {
      const data = await response.json();
      return data.message.content;
    }
  } catch (error) {
    logger.error('[Ollama] Chat request failed, falling back to mock: ' + error.message);
    return mockChatResponse(messages, options);
  }
};

export const embed = async (text) => {
  const host = getOllamaHost();
  const model = 'nomic-embed-text';

  if (process.env.OLLAMA_ENABLED !== 'true') {
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }

  try {
    const response = await fetch(`${host}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });
    if (!response.ok) {
      throw new Error(`Ollama embeddings HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    logger.error('[Ollama] Embeddings failed: ' + error.message);
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }
};

const mockChatResponse = async (messages, options) => {
  const lastMsg = messages[messages.length - 1]?.content || '';
  const responseText = `[MOCK Ollama RESPONSE] Local Ollama is offline or disabled. You asked: "${lastMsg}"`;

  if (options.stream) {
    return (async function* () {
      const words = responseText.split(' ');
      for (const word of words) {
        await new Promise(r => setTimeout(r, 45));
        yield {
          message: {
            content: word + ' '
          }
        };
      }
    })();
  }

  return responseText;
};
