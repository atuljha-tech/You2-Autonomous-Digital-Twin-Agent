import Groq from 'groq-sdk';

let keys: string[] = [];
let currentKeyIndex = 0;

const initKeys = () => {
  if (keys.length > 0) return;
  const multiKeys = process.env.GROQ_API_KEYS;
  if (multiKeys) {
    keys = multiKeys.split(',').map(k => k.trim()).filter(Boolean);
  } else if (process.env.GROQ_API_KEY) {
    keys = [process.env.GROQ_API_KEY];
  }

  if (keys.length === 0) {
    console.warn('⚠️ No GROQ_API_KEYS found. API calls may fail.');
  }
};

const getGroqClient = (): Groq => {
  initKeys();
  if (keys.length === 0) throw new Error('No Groq API keys configured.');
  return new Groq({ apiKey: keys[currentKeyIndex] });
};

const rotateKey = () => {
  if (keys.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  console.log(`🔄 Rotated Groq API Key (Using key index ${currentKeyIndex})`);
  return true;
};

// Try models in order — fallback if one is quota-exceeded
const MODEL_PRIORITY = [
  'groq/compound-mini',
  'groq/compound',
  'qwen/qwen3.6-27b',
];

export const generateWithFallback = async (prompt: string, _maxKeyRetries?: number): Promise<string> => {
  if (process.env.DEMO_MODE === 'true') {
     console.log('⚡ DEMO_MODE Active: Intercepting generation call.');
     return getDemoResponse(prompt);
  }

  let lastError: any = null;
  let keyAttempts = 0;

  initKeys();
  // Must be computed AFTER initKeys() — keys.length is 0 before that
  const maxKeyRetries = _maxKeyRetries ?? (keys.length || 1);

  while (keyAttempts < maxKeyRetries) {
    const client = getGroqClient();

    for (const modelName of MODEL_PRIORITY) {
      try {
        const chatCompletion = await client.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: modelName,
        });
        return chatCompletion.choices[0]?.message?.content || '';
      } catch (err: any) {
        lastError = err;
        
        // Handle Model Tier Quotas or Deprecations
        if (err.status === 404 || err.message?.includes('not found')) {
          console.warn(`⚠️ Model ${modelName} unavailable, sliding down priority list...`);
          continue;
        }

        // Handle Account Quotas or Invalid Auth
        if (err.status === 429 || err.status === 400 || err.status === 403 || err.message?.includes('quota') || err.message?.includes('API key')) {
          console.warn(`🚨 API Key ${currentKeyIndex} fully exhausted or rejected. Breaking model priority loop to rotate key.`);
          break; // Stop trying models on this dead key
        }

        // Other sporadic errors - just retry the next model
        console.warn(`⚠️ Transient error on ${modelName}:`, err.message);
        continue;
      }
    }

    // If we exhausted all models for the current key and we threw 429/403, rotate key
    keyAttempts++;
    if (keyAttempts < maxKeyRetries) {
       rotateKey();
    }
  }

  console.error("❌ ALL GROQ KEYS EXHAUSTED.");
  // Graceful Demo Fallback on full exhaustion
  return getDemoResponse(prompt);
};

export const generateJSON = async (prompt: string): Promise<string> => {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY raw, valid JSON. Do not include markdown \`\`\`json wrappers. Do not include plain text.`;
  return generateWithFallback(jsonPrompt);
};

// ─── DEMO MODE MOCK RESPONSES ───────────────────────────────────────────────

function getDemoResponse(prompt: string): string {
  const isSimulation = prompt.includes('worst_case') || prompt.toLowerCase().includes('simulate');
  
  if (isSimulation) {
     return JSON.stringify({
        best_case: "You achieve total mastery over your current goals, entering a flow state that yields 10x your average output. Distractions drop to near zero.",
        likely_case: "You make meaningful progress but hit friction points globally. You complete core priorities but scroll through 30 minutes of noise.",
        worst_case: "Procrastination dominates. You get locked into a doom-scroll loop, losing 3 hours and stalling your sprint entirely.",
        confidence_score: 85,
        reasoning: "Your habit frequency suggests a strong foundation, but recent weekend drops indicate vulnerability to unstructured time."
     });
  }

  const isNudge = prompt.includes('nudge');
  if (isNudge) {
     return "Demo Nudge: I see you're straying. Let's pivot back to your primary goals now. Momentum is everything.";
  }

  // Generic Chat
  return "*(Demo Mode Active)* This is a precomputed response to ensure stability during the presentation. The API is either toggled off or keys are exhausted. Your system flow remains intact!";
}
