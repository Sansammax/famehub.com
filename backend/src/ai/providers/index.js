import * as openai from './openai.js';
import * as gemini from './gemini.js';
import * as ollama from './ollama.js';

const getActiveProvider = () => {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'openai') return openai;
  if (provider === 'gemini') return gemini;
  if (provider === 'ollama') return ollama;

  // Default mock behavior routed via OpenAI wrapper
  return openai;
};

export const chat = async (messages, options = {}) => {
  const provider = getActiveProvider();
  return provider.chat(messages, options);
};

export const embed = async (text) => {
  const provider = getActiveProvider();
  return provider.embed(text);
};

export const getProviderName = () => {
  return process.env.AI_PROVIDER || 'mock';
};
