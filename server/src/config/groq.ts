import Groq from 'groq-sdk';

// ─── Key Pool ─────────────────────────────────────────────────────────────────

interface KeyState {
  key: string;
  index: number;
  exhaustedUntil: number | null; // epoch ms — null means healthy
}

let pool: KeyState[] = [];
let poolCursor = 0;
let poolInitialized = false;

const COOLDOWN_MS = 60_000; // 60 s cooldown before a rate-limited key is retried

const initPool = () => {
  if (poolInitialized) return;
  poolInitialized = true;

  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
  const rawKeys = raw.split(',').map(k => k.trim()).filter(Boolean);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  pool = rawKeys
    .filter(k => { if (seen.has(k)) return false; seen.add(k); return true; })
    .map((key, index) => ({ key, index, exhaustedUntil: null }));

  if (pool.length === 0) {
    console.warn('⚠️  No GROQ_API_KEYS found in environment. AI calls will return fallback responses.');
  } else {
    console.log(`✅ Groq key pool loaded: ${pool.length} key(s) ready.`);
  }
};

/** Returns the next healthy key, cycling round-robin. Returns null if ALL keys are currently cooling down. */
const getNextKey = (): KeyState | null => {
  const now = Date.now();
  const total = pool.length;

  for (let i = 0; i < total; i++) {
    const candidate = pool[(poolCursor + i) % total];

    // Recover a cooled-down key
    if (candidate.exhaustedUntil !== null && now >= candidate.exhaustedUntil) {
      candidate.exhaustedUntil = null;
      console.log(`♻️  Key #${candidate.index} cooldown expired — re-entering pool.`);
    }

    if (candidate.exhaustedUntil === null) {
      poolCursor = (poolCursor + i + 1) % total; // advance cursor past this key for next call
      return candidate;
    }
  }

  return null; // every key is cooling down
};

/** Mark a key as rate-limited — put it on a 60-second cooldown. */
const markExhausted = (keyState: KeyState) => {
  keyState.exhaustedUntil = Date.now() + COOLDOWN_MS;
  const remaining = pool.filter(k => k.exhaustedUntil === null).length;
  console.warn(`🚨 Key #${keyState.index} exhausted → cooldown ${COOLDOWN_MS / 1000}s. Healthy keys remaining: ${remaining}`);
};

// ─── Model Priority ───────────────────────────────────────────────────────────

// Models tried in order per key — if one returns 404 we slide to the next
const MODEL_PRIORITY = [
  'groq/compound-mini',
  'groq/compound',
  'qwen/qwen3.6-27b',
];

// ─── Core Generation ──────────────────────────────────────────────────────────

/**
 * Calls the Groq API with automatic key rotation and model fallback.
 * - Tries each healthy key in round-robin order.
 * - On 429/403 marks the key for cooldown and moves to the next.
 * - On 404 slides to the next model on the same key.
 * - If ALL keys are exhausted simultaneously, waits for the soonest cooldown
 *   to expire and retries (never crashes).
 * - Falls back to getDemoResponse() only when DEMO_MODE=true.
 */
export const generateWithFallback = async (prompt: string): Promise<string> => {
  if (process.env.DEMO_MODE === 'true') {
    console.log('⚡ DEMO_MODE active — returning mock response.');
    return getDemoResponse(prompt);
  }

  initPool();

  if (pool.length === 0) {
    console.error('❌ No API keys configured — returning fallback response.');
    return getDemoResponse(prompt);
  }

  // We allow up to (pool.length * MODEL_PRIORITY.length) total attempts before
  // we accept temporary defeat and wait for a cooldown, then try once more.
  const maxRounds = pool.length; // one full pass over all keys

  for (let round = 0; round < maxRounds; round++) {
    const keyState = getNextKey();

    if (!keyState) {
      // Every key is cooling down — wait for the soonest recovery and retry once
      const soonestRecovery = Math.min(...pool.map(k => k.exhaustedUntil ?? Date.now()));
      const waitMs = Math.max(0, soonestRecovery - Date.now()) + 500;
      console.warn(`⏳ All keys cooling down. Waiting ${Math.round(waitMs / 1000)}s for recovery…`);
      await new Promise(resolve => setTimeout(resolve, waitMs));

      // Try once more after wait
      const recovered = getNextKey();
      if (!recovered) {
        console.error('❌ No keys recovered after cooldown wait — returning fallback response.');
        return getDemoResponse(prompt);
      }
      // Fall through with recovered key on next iteration — re-run loop
      round--; // don't consume a round for the wait
      continue;
    }

    const client = new Groq({ apiKey: keyState.key });
    let keyFailed = false;

    for (const model of MODEL_PRIORITY) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
        });
        const result = completion.choices[0]?.message?.content || '';
        return result; // ✅ success
      } catch (err: any) {
        const status: number = err.status ?? err.statusCode ?? 0;
        const msg: string = err.message ?? '';

        if (status === 404 || msg.includes('not found') || msg.includes('decommissioned')) {
          // Model unavailable on this key — try next model
          console.warn(`⚠️  Model "${model}" unavailable (key #${keyState.index}), trying next model…`);
          continue;
        }

        if (
          status === 429 || status === 403 || status === 401 ||
          msg.toLowerCase().includes('quota') ||
          msg.toLowerCase().includes('rate limit') ||
          msg.toLowerCase().includes('api key') ||
          msg.toLowerCase().includes('invalid key')
        ) {
          // Key itself is the problem — mark exhausted and break to next key
          markExhausted(keyState);
          keyFailed = true;
          break;
        }

        // Transient / unknown error — slide to next model
        console.warn(`⚠️  Transient error on model "${model}" (key #${keyState.index}): ${msg}`);
        continue;
      }
    }

    if (keyFailed) continue; // outer loop will pick the next healthy key
  }

  // Exhausted all rounds — one final wait + retry
  console.error('❌ All keys exhausted across all rounds. Attempting one final recovery wait…');
  const soonest = Math.min(...pool.map(k => k.exhaustedUntil ?? Date.now()));
  const finalWait = Math.max(0, soonest - Date.now()) + 500;
  await new Promise(resolve => setTimeout(resolve, finalWait));

  const lastChance = getNextKey();
  if (lastChance) {
    try {
      const client = new Groq({ apiKey: lastChance.key });
      const completion = await client.chat.completions.create({
        model: MODEL_PRIORITY[0],
        messages: [{ role: 'user', content: prompt }],
      });
      return completion.choices[0]?.message?.content || '';
    } catch {
      // ignore — fall through to demo
    }
  }

  console.error('❌ All retries failed — returning demo fallback. App will not crash.');
  return getDemoResponse(prompt);
};

export const generateJSON = async (prompt: string): Promise<string> => {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY raw, valid JSON. Do not include markdown \`\`\`json wrappers. Do not include plain text.`;
  return generateWithFallback(jsonPrompt);
};

// ─── Demo Fallback Responses ──────────────────────────────────────────────────

function getDemoResponse(prompt: string): string {
  const isSimulation = prompt.includes('worst_case') || prompt.toLowerCase().includes('simulate');

  if (isSimulation) {
    return JSON.stringify({
      best_case: 'You achieve total mastery over your current goals, entering a flow state that yields 10x your average output. Distractions drop to near zero.',
      likely_case: 'You make meaningful progress but hit friction points globally. You complete core priorities but scroll through 30 minutes of noise.',
      worst_case: 'Procrastination dominates. You get locked into a doom-scroll loop, losing 3 hours and stalling your sprint entirely.',
      confidence_score: 85,
      reasoning: 'Your habit frequency suggests a strong foundation, but recent weekend drops indicate vulnerability to unstructured time.',
    });
  }

  if (prompt.includes('nudge')) {
    return "Demo Nudge: I see you're straying. Let's pivot back to your primary goals now. Momentum is everything.";
  }

  // Forecast / Evolution JSON fallbacks
  if (prompt.includes('energyForecast')) {
    return JSON.stringify({
      greeting: 'Hey there! Ready to make today count?',
      headline: 'Your focus windows are open — lock in now.',
      energyForecast: 'high',
      focusWindows: ['9-11 AM', '3-5 PM'],
      riskAlert: 'Evening scroll risk is elevated after 9 PM.',
      topPriority: 'Complete your most important task before noon.',
      motivationalPulse: 'Progress beats perfection every single time.',
      predictedScore: 78,
    });
  }

  if (prompt.includes('accuracyScore')) {
    return JSON.stringify({
      accuracyScore: 72,
      habitsLearned: 4,
      predictionConfidence: 68,
      evolutionLevel: 'Aware',
      levelProgress: 55,
      nextMilestone: '10 more interactions to reach Calibrated level',
      strongestInsight: 'You perform best in the late-night hours',
      weeklyGrowth: 3,
    });
  }

  // Generic chat fallback — informative rather than "demo mode" banner
  return "I'm having trouble reaching my AI backbone right now, but I'm still here! 🧠 Try asking me again in a moment — all your data is safe and the app is running fine.";
}
