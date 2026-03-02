const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_API_VERSION = 'v1beta';

let cachedResolved = null;
let globalCooldownUntil = 0;

function nowMs() {
  return Date.now();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeApiVersion(v) {
  const s = String(v || '').trim();
  if (s === 'v1' || s === 'v1beta') return s;
  return DEFAULT_API_VERSION;
}

function apiBase(version) {
  return `https://generativelanguage.googleapis.com/${normalizeApiVersion(version)}`;
}

function extractTextFromCandidate(candidate) {
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}

async function listModels({ apiKey, version }) {
  const url = `${apiBase(version)}/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: 'GET' });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = data?.error?.message || `ListModels failed (${res.status})`;
    const err = new Error(msg);
    err.status = 502;
    err.details = data;
    throw err;
  }
  return Array.isArray(data?.models) ? data.models : [];
}

function pickModel(models, preference = 'flash') {
  const list = Array.isArray(models) ? models : [];
  const canGenerate = (m) => Array.isArray(m?.supportedGenerationMethods)
    && m.supportedGenerationMethods.includes('generateContent');

  const usable = list
    .filter(canGenerate)
    .map((m) => ({
      name: String(m?.name || ''),
    }))
    .filter((m) => m.name);

  const pref = String(preference || '').toLowerCase();

  const score = (name) => {
    const n = name.toLowerCase();
    let s = 0;
    if (n.includes('gemini')) s += 50;
    if (pref.includes('flash') && n.includes('flash')) s += 30;
    if (pref.includes('pro') && n.includes('pro')) s += 30;
    if (n.includes('latest')) s += 5;
    if (n.includes('embedding')) s -= 50;
    return s;
  };

  usable.sort((a, b) => score(b.name) - score(a.name));
  const picked = usable[0]?.name || '';
  if (!picked) return '';
  return picked.startsWith('models/') ? picked.slice('models/'.length) : picked;
}

function normalizeModelName(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  return s.startsWith('models/') ? s.slice('models/'.length) : s;
}

function modelListIncludes(models, modelName) {
  const target = normalizeModelName(modelName);
  if (!target) return false;
  const list = Array.isArray(models) ? models : [];
  return list.some((m) => normalizeModelName(m?.name) === target);
}

function parseRetryAfterSecondsFromMessage(msg) {
  const s = String(msg || '');
  const m = s.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function resolveWorkingModel({ apiKey, version }) {
  const v = normalizeApiVersion(version);
  if (cachedResolved && cachedResolved.version === v && cachedResolved.model) return cachedResolved.model;

  const preference = String(process.env.GEMINI_MODEL_PREFERENCE || 'flash').trim() || 'flash';
  const models = await listModels({ apiKey, version: v });

  // Prefer a stable default if it's available, to avoid picking newer models
  // that may have stricter free-tier quotas.
  if (modelListIncludes(models, DEFAULT_MODEL)) {
    cachedResolved = { version: v, model: DEFAULT_MODEL };
    return DEFAULT_MODEL;
  }

  const picked = pickModel(models, preference);
  if (!picked) {
    const err = new Error('No AI models available for generateContent');
    err.status = 502;
    throw err;
  }
  cachedResolved = { version: v, model: picked };
  return picked;
}

export async function geminiGenerateReply({ systemInstruction, messages, locale }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is missing');
    err.status = 500;
    throw err;
  }

  const configuredVersion = normalizeApiVersion(process.env.GEMINI_API_VERSION);
  const configuredModel = String(process.env.GEMINI_MODEL || '').trim();

  // Simple global cooldown: if we just got rate-limited, fail fast to avoid
  // hammering the upstream and spamming logs/UI.
  if (globalCooldownUntil && nowMs() < globalCooldownUntil) {
    const seconds = Math.max(1, Math.ceil((globalCooldownUntil - nowMs()) / 1000));
    const err = new Error(`AI quota is temporarily exceeded. Please retry in ${seconds}s.`);
    err.status = 429;
    err.retryAfterSeconds = seconds;
    throw err;
  }

  const initialModel = configuredModel
    ? configuredModel
    : await resolveWorkingModel({ apiKey, version: configuredVersion });

  const contents = (Array.isArray(messages) ? messages : []).map((m) => ({
    role: m?.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m?.content || '') }],
  }));

  const payload = {
    systemInstruction: {
      parts: [{ text: String(systemInstruction || '') }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };

  if (locale) {
    payload.generationConfig.responseMimeType = 'text/plain';
  }

  const makeUrl = (version, model) => (
    `${apiBase(version)}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  );

  const run = async ({ version, model }) => {
    const res = await fetch(makeUrl(version, model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }

    return { res, data };
  };

  const parseFailure = ({ res, data }) => {
    const code = Number(data?.error?.code || 0);
    const statusText = String(data?.error?.status || '').toUpperCase();
    const msg = data?.error?.message || `Gemini request failed (${res.status})`;
    return { resStatus: res.status, code, statusText, msg, data };
  };

  const asUserFacingError = (failure, { model }) => {
    const retryAfterSeconds = parseRetryAfterSecondsFromMessage(failure?.msg);

    // Upstream 429/RESOURCE_EXHAUSTED
    if (failure?.code === 429 || failure?.statusText === 'RESOURCE_EXHAUSTED' || failure?.resStatus === 429) {
      const seconds = retryAfterSeconds ? Math.ceil(retryAfterSeconds) : 60;
      globalCooldownUntil = nowMs() + seconds * 1000;
      const err = new Error(
        `AI quota exceeded (model: ${String(model || '')}). Please retry in ${seconds}s, or upgrade the Gemini API plan/billing.`
      );
      err.status = 429;
      err.retryAfterSeconds = seconds;
      err.details = failure?.data;
      return err;
    }

    // Upstream 503/UNAVAILABLE
    if (failure?.code === 503 || failure?.statusText === 'UNAVAILABLE' || failure?.resStatus === 503) {
      const seconds = retryAfterSeconds ? Math.ceil(retryAfterSeconds) : 3;
      const err = new Error(`AI service is busy. Please retry in ${seconds}s.`);
      err.status = 503;
      err.retryAfterSeconds = seconds;
      err.details = failure?.data;
      return err;
    }

    // Default mapping
    const err = new Error(failure?.msg || 'AI request failed');
    err.status = 502;
    err.details = failure?.data;
    return err;
  };

  const maybeGetFallbackModel = async ({ version, excludeModel }) => {
    try {
      const models = await listModels({ apiKey, version });
      const exclude = normalizeModelName(excludeModel);
      if (modelListIncludes(models, DEFAULT_MODEL) && normalizeModelName(DEFAULT_MODEL) !== exclude) {
        return DEFAULT_MODEL;
      }

      const preference = String(process.env.GEMINI_MODEL_PREFERENCE || 'flash').trim() || 'flash';
      const picked = pickModel(models, preference);
      const pickedNorm = normalizeModelName(picked);
      if (!pickedNorm || pickedNorm === exclude) return '';
      return pickedNorm;
    } catch {
      return '';
    }
  };

  // Attempt 1: configured model (if provided) or an auto-resolved working model.
  let out = await run({ version: configuredVersion, model: initialModel });
  if (out.res.ok) {
    const candidate = Array.isArray(out.data?.candidates) ? out.data.candidates[0] : null;
    const text = extractTextFromCandidate(candidate);
    if (!text) {
      const err = new Error('Empty AI response');
      err.status = 502;
      err.details = out.data;
      throw err;
    }
    return text;
  }

  let failure = parseFailure(out);
  const isTransientBusy = failure.code === 503 || failure.statusText === 'UNAVAILABLE' || failure.resStatus === 503;
  const isQuota = failure.code === 429 || failure.statusText === 'RESOURCE_EXHAUSTED' || failure.resStatus === 429;
  const isModelNotFound = (failure.code === 404 || failure.statusText === 'NOT_FOUND' || failure.resStatus === 404)
    && /models\//i.test(String(failure.msg || ''));

  const tryAutopick = async (version) => {
    const model = await resolveWorkingModel({ apiKey, version });
    const out2 = await run({ version, model });
    if (out2.res.ok) return out2;
    failure = parseFailure(out2);
    return null;
  };

  if (isModelNotFound) {
    const ok1 = await tryAutopick(configuredVersion);
    if (ok1) {
      const candidate = Array.isArray(ok1.data?.candidates) ? ok1.data.candidates[0] : null;
      const text = extractTextFromCandidate(candidate);
      if (!text) {
        const err = new Error('Empty AI response');
        err.status = 502;
        err.details = ok1.data;
        throw err;
      }
      return text;
    }

    if (configuredVersion === 'v1beta') {
      const ok2 = await tryAutopick('v1');
      if (ok2) {
        const candidate = Array.isArray(ok2.data?.candidates) ? ok2.data.candidates[0] : null;
        const text = extractTextFromCandidate(candidate);
        if (!text) {
          const err = new Error('Empty AI response');
          err.status = 502;
          err.details = ok2.data;
          throw err;
        }
        return text;
      }
    }
  }

  // Transient errors: try a short retry and optionally a fallback model.
  if (isTransientBusy) {
    // Quick backoff retry on same model (avoid long blocking waits).
    await delay(350 + Math.floor(Math.random() * 250));
    const outRetry = await run({ version: configuredVersion, model: initialModel });
    if (outRetry.res.ok) {
      const candidate = Array.isArray(outRetry.data?.candidates) ? outRetry.data.candidates[0] : null;
      const text = extractTextFromCandidate(candidate);
      if (!text) {
        const err = new Error('Empty AI response');
        err.status = 502;
        err.details = outRetry.data;
        throw err;
      }
      return text;
    }

    failure = parseFailure(outRetry);
    const fallback = await maybeGetFallbackModel({ version: configuredVersion, excludeModel: initialModel });
    if (fallback) {
      const outFb = await run({ version: configuredVersion, model: fallback });
      if (outFb.res.ok) {
        const candidate = Array.isArray(outFb.data?.candidates) ? outFb.data.candidates[0] : null;
        const text = extractTextFromCandidate(candidate);
        if (!text) {
          const err = new Error('Empty AI response');
          err.status = 502;
          err.details = outFb.data;
          throw err;
        }
        return text;
      }
      failure = parseFailure(outFb);
    }

    throw asUserFacingError(failure, { model: initialModel });
  }

  // Quota errors: do not retry here; surface Retry-After so UI can behave.
  if (isQuota) {
    throw asUserFacingError(failure, { model: initialModel });
  }

  throw asUserFacingError(failure, { model: initialModel });
}
