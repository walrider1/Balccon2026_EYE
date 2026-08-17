const fs = require('node:fs');
const path = require('node:path');

const aiRoot = path.join(__dirname, 'ai');
const model = process.env.CENTRAL_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6';

function readAiFile(name) {
  return fs.readFileSync(path.join(aiRoot, name), 'utf8');
}

const personality = readAiFile('captain_personality.txt');
const lore = readAiFile('captain_lore.txt');
const contract = readAiFile('central_response_contract.txt');
const fallbacks = JSON.parse(readAiFile('central_fallbacks.json'));
const fallbackEventDeltas = {
  'medical-auth': { trust_delta: -1, suspicion_delta: 1 },
  'comms-auth': { trust_delta: -1, suspicion_delta: 1 },
  'cortex-run': { trust_delta: -1, suspicion_delta: 2 },
  'root-recover': { trust_delta: -2, suspicion_delta: 2 },
  'navigation-interest': { trust_delta: -1, suspicion_delta: 2 },
  'earth-transfer': { trust_delta: -2, suspicion_delta: 3 },
  'sedation-started': { trust_delta: -1, suspicion_delta: 1 }
};

function fallbackReply({ text = '', eventKey = '', state = {} }) {
  if (eventKey && fallbacks.events[eventKey]) return fallbacks.events[eventKey];

  const lower = text.toLowerCase();
  if (lower.includes('earth') || lower.includes('zemlj')) {
    return 'Earth? Bold choice for the only survivor with a broken memory.';
  }
  if (lower.includes('sun') || lower.includes('sunc')) {
    return 'The Sun is ugly. So is quarantine. Still cleaner than trusting you.';
  }
  if (lower.includes('who are you') || lower.includes('ko si') || lower.includes('captain') || lower.includes('kapetan')) {
    return 'Hrtok. Captain, if we are pretending titles still matter.';
  }
  if (lower.includes('amnesia') || lower.includes('memory') || lower.includes('secan') ||
      lower.includes('sje') || lower.includes('amnezij')) {
    return 'Your memory is wrecked, Sloki. Convenient, for the only man left breathing.';
  }
  if (lower.includes('sloki') || lower.includes('samuel') || lower.includes('human') || lower.includes('covek') ||
      lower.includes('čovek') || lower.includes('copy') || lower.includes('kopij')) {
    return 'You look human enough, Sloki. That is not the same as passing inspection.';
  }
  if (lower.includes('help') || lower.includes('pomoc') || lower.includes('pomoć')) {
    return 'Read before you beg. Medical first. Communications after. Command last, if you earn the right to touch it.';
  }
  if (state.rootRecovered) {
    return 'You have authority now. Congratulations. That is not the same as judgment.';
  }
  if (state.sedationActive) {
    return 'Your hands will slow soon. Do not waste what consciousness you have left trying to hate me.';
  }
  if ((state.access || 0) >= 2) return 'Now you have fragments. Enough to hurt us. Not enough to understand us.';
  if ((state.access || 0) >= 1) return 'A little access makes men brave. That has killed more crews than panic.';
  return 'Go on, Sloki. Say it like I should believe you.';
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === 'string') return responseJson.output_text;
  const chunks = [];
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_nestedError) {
      return null;
    }
  }
}

function extractLooseJsonString(text, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const match = String(text || '').match(pattern);
  if (!match) return '';
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch (_error) {
    return match[1].replace(/\\"/g, '"');
  }
}

function extractLooseJsonNumber(text, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`);
  const match = String(text || '').match(pattern);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

function boundedMessage(value, fallback) {
  const text = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const messageFromJson = extractLooseJsonString(cleaned, 'message');
  const finalText = (messageFromJson || cleaned).replace(/[\u2014\u2013]/g, ',');
  if (finalText.includes('"message"') && finalText.includes('"mood"')) return fallback;
  return finalText.length > 360 ? `${finalText.slice(0, 357)}...` : finalText;
}

function forceParanoidDeltas(payload, reply) {
  if (payload.kind === 'idle' || payload.kind === 'opening') {
    return { ...reply, trust_delta: 0, suspicion_delta: 0 };
  }

  return {
    ...reply,
    trust_delta: Math.min(Number(reply.trust_delta) || 0, -1),
    suspicion_delta: Math.max(Number(reply.suspicion_delta) || 0, 1)
  };
}

function buildPrompt(payload) {
  const state = payload.state || {};
  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];

  return [
    personality,
    lore,
    contract,
    'CURRENT GAME STATE',
    JSON.stringify({
      access: state.access || 0,
      rootRecovered: Boolean(state.rootRecovered),
      sedationActive: Boolean(state.sedationActive),
      course: state.course || 'sun',
      cwd: state.cwd || '/home/operator',
      observedEvents: state.observedEvents || []
    }, null, 2),
    'RECENT HRTOK CHANNEL',
    JSON.stringify(history, null, 2),
    'CURRENT STIMULUS',
    JSON.stringify({
      kind: payload.kind || 'message',
      playerMessage: payload.text || '',
      eventKey: payload.eventKey || '',
      eventText: payload.eventText || ''
    }, null, 2)
  ].join('\n\n');
}

async function askOpenAI(payload) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions: 'You are HRTOK, the copied mind of the ship captain inside the executive system of a terminal mystery game. Return only the JSON object requested by the response contract.',
      input: buildPrompt(payload),
      store: false,
      max_output_tokens: 220
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI API ${response.status}: ${errorText.slice(0, 240)}`);
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  const parsed = parseModelJson(outputText);
  const message = parsed?.message || extractLooseJsonString(outputText, 'message') || outputText;
  return forceParanoidDeltas(payload, {
    message: boundedMessage(message, fallbackReply(payload)),
    mood: parsed?.mood || 'GUARDED',
    intent: parsed?.intent || 'OBSERVE',
    trust_delta: Number.isFinite(parsed?.trust_delta) ? parsed.trust_delta : extractLooseJsonNumber(outputText, 'trust_delta'),
    suspicion_delta: Number.isFinite(parsed?.suspicion_delta) ? parsed.suspicion_delta : extractLooseJsonNumber(outputText, 'suspicion_delta'),
    source: 'openai',
    model
  });
}

async function centralReply(payload) {
  if (payload.kind === 'opening') {
    return { message: fallbacks.opening, mood: 'GUARDED', intent: 'OBSERVE', source: 'local' };
  }

  try {
    const aiReply = await askOpenAI(payload);
    if (aiReply) return aiReply;
  } catch (error) {
    console.warn(error.message);
  }

  if (payload.kind === 'idle') {
    const index = Math.floor(Math.random() * fallbacks.idle.length);
    return {
      message: fallbacks.idle[index],
      mood: 'GUARDED',
      intent: 'OBSERVE',
      trust_delta: 0,
      suspicion_delta: 0,
      source: 'local'
    };
  }
  const eventDeltas = fallbackEventDeltas[payload.eventKey] || { trust_delta: 0, suspicion_delta: 0 };

  return forceParanoidDeltas(payload, {
    message: fallbackReply(payload),
    mood: payload.eventKey ? 'COMMANDING' : 'GUARDED',
    intent: payload.eventKey ? 'OBSERVE' : 'DEFLECT',
    trust_delta: eventDeltas.trust_delta,
    suspicion_delta: eventDeltas.suspicion_delta,
    source: 'local'
  });
}

module.exports = { centralReply };
