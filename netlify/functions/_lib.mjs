import { TOOLS as SEED_TOOLS } from '../../data/tools.js';

export function seedTools() { return SEED_TOOLS; }

export async function supabaseFetch(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export async function getTools(params = {}) {
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    try {
      const limit = Math.min(Number(params.limit || 100), 1000);
      let path = `tools?select=*&status=eq.active&limit=${limit}`;
      if (params.category) path += `&or=(category.eq.${encodeURIComponent(params.category)},categories.cs.{${encodeURIComponent(params.category)}})`;
      const rows = await supabaseFetch(path);
      return rows || [];
    } catch (_) {}
  }
  let rows = [...SEED_TOOLS];
  if (params.category) rows = rows.filter(t => t.category === params.category || t.categories?.includes(params.category));
  return rows.slice(0, Math.min(Number(params.limit || 1000), 1000));
}


export async function getToolBySlug(slug) {
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    try {
      const rows = await supabaseFetch(`tools?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`);
      if (rows?.[0]) return rows[0];
    } catch (_) {}
  }
  return SEED_TOOLS.find(t => t.slug === slug && t.status !== 'archived') || null;
}

export function extractIntentFallback(query) {
  const q = query.toLowerCase();
  const tasks = [];
  const add = (task, patterns) => { if (patterns.some(p => p.test(q))) tasks.push(task); };
  add('text_to_video', [/نص.*فيديو|فيديو.*نص|text.?to.?video|video from text/]);
  add('image_to_video', [/صور.*فيديو|فيديو من صور|image.?to.?video|animate.*image/]);
  add('image_generation', [/توليد صور|صمم.*صورة|generate image|text.?to.?image|image generation/]);
  add('voice_generation', [/صوت|تعليق صوتي|نص إلى كلام|text.?to.?speech|tts|voice over|narration/]);
  add('video_editing', [/مونتاج|تحرير فيديو|video edit|editing/]);
  add('coding', [/برمجة|كود|coding|code/]);
  add('writing', [/كتابة|مقال|محتوى|writing|copywriting|blog/]);
  add('agents', [/وكيل|agent|أتمتة|automation|workflow/]);
  return {
    type: tasks.length ? 'intent_search' : 'tool_search',
    tasks: [...new Set(tasks)],
    requirements: {
      arabic: /عربي|عربية|بالعربي|arabic/i.test(q),
      mobile: /موبايل|هاتف|mobile|android|ios|آيفون/i.test(q),
      free: /مجاني|free|بلاش|بدون اشتراك/i.test(q),
      api: /\bapi\b|واجهة برمجة/i.test(q),
      open_source: /مفتوح المصدر|open.?source/i.test(q)
    },
    keywords: q.split(/[\s,،.]+/).filter(x => x.length > 2),
    confidence: tasks.length ? 'medium' : 'low'
  };
}

export async function parseIntent(query) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return extractIntentFallback(query);
  const prompt = `Convert the user's request into JSON only. Schema: {"type":"tool_search|intent_search","tasks":string[],"requirements":{"arabic":boolean,"mobile":boolean,"free":boolean,"api":boolean,"open_source":boolean,"beginner":boolean,"professional":boolean},"keywords":string[]}. User request: ${query}`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: {'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514', max_tokens: 700, temperature: 0, messages:[{role:'user',content:prompt}]})
    });
    if (!res.ok) throw new Error('Anthropic error');
    const data = await res.json();
    const text = data.content?.map(x => x.text || '').join('') || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid JSON');
    return JSON.parse(match[0]);
  } catch (_) { return extractIntentFallback(query); }
}

export function scoreTool(tool, intent) {
  if (intent.type === 'tool_search') {
    const q = (intent.keywords || []).join(' ').toLowerCase();
    const name = `${tool.name} ${tool.slug}`.toLowerCase();
    return name.includes(q) || q.includes(tool.name.toLowerCase()) ? 100 : 0;
  }
  let score = 0, max = 0;
  const reasons = [];
  max += 50;
  const tasks = intent.tasks || [];
  const text = `${tool.name} ${tool.description || ''} ${(tool.tags||[]).join(' ')} ${(tool.features||[]).join(' ')}`.toLowerCase();
  const hits = tasks.filter(t => text.includes(t.replaceAll('_',' ')) || text.includes(t)).length;
  const taskScore = tasks.length ? (hits / tasks.length) * 50 : 0;
  score += taskScore;
  if (taskScore >= 25) reasons.push('✓ Matches the requested task');
  const req = intent.requirements || {};
  const checks = [
    ['arabic',15,tool.arabic_support,'✓ Supports Arabic'],
    ['free',15,tool.free_plan || tool.pricing === 'free' || tool.pricing === 'freemium','✓ Has a free/freemium option'],
    ['mobile',10,tool.mobile_support,'✓ Works on mobile'],
    ['api',5,tool.api_available,'✓ API available'],
    ['open_source',5,tool.open_source,'✓ Open source']
  ];
  for (const [k,w,val,reason] of checks) { max += w; if (req[k]) { if (val === true) {score += w; reasons.push(reason);} } else score += w; }
  return Math.max(0, Math.min(100, Math.round(score/max*100)));
}
