import OpenAI from 'openai';

const DEFAULT_MODEL = 'gpt-4.1';
const DEFAULT_BASE_URL = 'https://models.inference.ai.azure.com';

let clientCached = null;
let globalCooldownUntilMs = 0;

function nowMs() {
  return Date.now();
}

function parseRetryAfterSecondsFromMessage(msg) {
  const s = String(msg || '');
  const m = s.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseRetryAfterSecondsFromHeaders(headers) {
  if (!headers) return null;

  const getHeader = (k) => {
    if (!headers) return null;
    if (typeof headers.get === 'function') return headers.get(k);
    const key = String(k || '').toLowerCase();
    const direct = headers[k] ?? headers[key];
    if (Array.isArray(direct)) return direct[0];
    return direct;
  };

  const v = getHeader('retry-after');
  if (!v) return null;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

function getClient() {
  if (clientCached) return clientCached;

  const apiKey = process.env.GITHUB_TOKEN || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('AI_API_KEY is missing (set GITHUB_TOKEN or OPENAI_API_KEY)');
    err.status = 500;
    throw err;
  }

  const baseURL = String(process.env.AI_BASE_URL || DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;
  clientCached = new OpenAI({ apiKey, baseURL });
  return clientCached;
}

function asUserFacingError(err, { model }) {
  const status = Number(err?.status || err?.response?.status || 0);
  const msg = String(err?.message || 'AI request failed');

  const headerRetry = parseRetryAfterSecondsFromHeaders(err?.headers);
  const messageRetry = parseRetryAfterSecondsFromMessage(msg);
  const retryAfterSeconds = headerRetry || messageRetry;

  // 429: rate limit / quota
  if (status === 429) {
    const seconds = retryAfterSeconds ? Math.ceil(retryAfterSeconds) : 60;
    globalCooldownUntilMs = nowMs() + seconds * 1000;
    const e = new Error(`AI quota exceeded (model: ${String(model || '')}). Please retry in ${seconds}s.`);
    e.status = 429;
    e.retryAfterSeconds = seconds;
    e.details = { provider: 'openai', original: { message: msg, status } };
    return e;
  }

  // 503/504/529 etc: busy or upstream issues
  if (status === 503 || status === 504 || status === 529) {
    const seconds = retryAfterSeconds ? Math.ceil(retryAfterSeconds) : 3;
    const e = new Error(`AI service is busy. Please retry in ${seconds}s.`);
    e.status = 503;
    e.retryAfterSeconds = seconds;
    e.details = { provider: 'openai', original: { message: msg, status } };
    return e;
  }

  // Auth/config issues
  if (status === 401 || status === 403) {
    const e = new Error('AI is not configured or access is denied (check API key/billing/permissions).');
    e.status = 500;
    e.details = { provider: 'openai', original: { message: msg, status } };
    return e;
  }

  const e = new Error(msg);
  e.status = status || 502;
  e.details = { provider: 'openai', original: { message: msg, status } };
  return e;
}

/**
 * Provider-agnostic generate reply using OpenAI-compatible API.
 *
 * @param {object} input
 * @param {string} input.systemInstruction
 * @param {Array<{role:'user'|'assistant', content:string}>} input.messages
 * @param {'json'|'text'} [input.mode]
 * @param {string} [input.model]
 */
export async function aiGenerateReply({ systemInstruction, messages, mode = 'text', model }) {
  // Cooldown (if we were just rate-limited)
  if (globalCooldownUntilMs && nowMs() < globalCooldownUntilMs) {
    const seconds = Math.max(1, Math.ceil((globalCooldownUntilMs - nowMs()) / 1000));
    const err = new Error(`AI quota is temporarily exceeded. Please retry in ${seconds}s.`);
    err.status = 429;
    err.retryAfterSeconds = seconds;
    throw err;
  }

  const client = getClient();
  const chosenModel = String(model || process.env.AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

  const chatMessages = [
    { role: 'system', content: String(systemInstruction || '') },
    ...(Array.isArray(messages) ? messages : []).map((m) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content || ''),
    })),
  ];

  try {
    const params = {
      model: chosenModel,
      messages: chatMessages,
      temperature: 0.4,
      max_tokens: 1024,
      ...(mode === 'json' ? { response_format: { type: 'json_object' } } : {}),
    };

    let res;
    try {
      res = await client.chat.completions.create(params);
    } catch (err) {
      // Some OpenAI-compatible gateways don't support response_format.
      const status = Number(err?.status || err?.response?.status || 0);
      const msg = String(err?.message || '');
      const mentionsResponseFormat = /response_format/i.test(msg);
      if (mode === 'json' && (status === 400 || mentionsResponseFormat)) {
        const { response_format: _rf, ...paramsNoFormat } = params;
        res = await client.chat.completions.create(paramsNoFormat);
      } else {
        throw err;
      }
    }

    const text = String(res?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      const err = new Error('Empty AI response');
      err.status = 502;
      throw err;
    }
    return text;
  } catch (err) {
    throw asUserFacingError(err, { model: chosenModel });
  }
}
