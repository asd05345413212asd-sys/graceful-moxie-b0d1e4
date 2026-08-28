// AI Radar - Core Application Logic
// Intent understanding + Match Score + Search + UI

let TOOLS = [];
let CATEGORIES = [
  { id: 'video', name: 'Video', name_ar: 'فيديو', icon: '🎬' },
  { id: 'images', name: 'Images', name_ar: 'صور', icon: '🖼️' },
  { id: 'audio', name: 'Audio', name_ar: 'صوت', icon: '🎙️' },
  { id: 'writing', name: 'Writing', name_ar: 'كتابة', icon: '✍️' },
  { id: 'coding', name: 'Coding', name_ar: 'برمجة', icon: '💻' },
  { id: 'education', name: 'Education', name_ar: 'تعليم', icon: '📚' },
  { id: 'design', name: 'Design', name_ar: 'تصميم', icon: '🎨' },
  { id: 'agents', name: 'Agents', name_ar: 'وكلاء', icon: '🤖' }
];
let lastSearchPayload = null;
let currentLang = 'ar';
let currentTheme = localStorage.getItem('theme') || 'light';
let currentPage = 'home';
let searchResults = [];
let selectedForCompare = [];
let currentFilters = {
  pricing: [],
  arabic: false,
  mobile: false,
  api: false,
  open_source: false,
  free: false
};
let currentSort = 'match';

// Apply theme
function applyTheme() {
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-icon').textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('theme-icon').textContent = '🌙';
  }
}
applyTheme();

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
}

function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('lang-btn').textContent = currentLang === 'ar' ? 'EN' : 'عربي';
  renderCurrentPage();
}

// ========== INTENT UNDERSTANDING (Improved) ==========
function understandQuery(query) {
  const q = query.toLowerCase().trim();
  const intent = {
    original: query,
    type: 'tool_search',
    tasks: [],
    requirements: {
      arabic: false,
      mobile: false,
      free: false,
      freemium: false,
      api: false,
      open_source: false,
      beginner: false,
      professional: false,
      realtime: false,
      local: false
    },
    keywords: [],
    language: /[\u0600-\u06FF]/.test(query) ? 'ar' : 'en',
    confidence: 'medium'
  };

  // Direct tool name detection (improved)
  const knownNames = TOOLS.map(t => ({ id: t.id, name: t.name.toLowerCase(), slug: t.slug }));
  const words = q.split(/[\s,،]+/).filter(Boolean);
  let directHit = null;
  for (const t of knownNames) {
    if (q === t.name || q === t.slug || q.includes(t.name) || t.name.includes(q)) {
      if (words.length <= 4) {
        directHit = t;
        break;
      }
    }
  }
  if (directHit) {
    intent.type = 'tool_search';
    intent.keywords = [directHit.name];
    intent.confidence = 'high';
    return intent;
  }

  intent.type = 'intent_search';

  // Richer task patterns (Arabic + English + dialects)
  const taskPatterns = [
    { tasks: ['text_to_video', 'video'], patterns: [/فيديو.*(نص|كلام|برومبت)|نص.*فيديو|text.?to.?video|video from text|generate video|اعمل فيديو|أسوي فيديو|اصنع فيديو|سوي فيديو|صناعة فيديو|فيديو من وصف/i] },
    { tasks: ['image_to_video', 'video'], patterns: [/صور.*فيديو|فيديو من صور|image.?to.?video|animate (image|photo)|حرك (الصور|صورة)|تحريك صور|صورة تتحرك/i] },
    { tasks: ['image_generation', 'images'], patterns: [/توليد صور|صور بالذكاء|generate image|image generation|text to image|ارسم|صمم صورة|تصميم صورة|midjourney|flux|dall.?e|صور من نص/i] },
    { tasks: ['voice_generation', 'audio', 'tts'], patterns: [/صوت|تعليق صوتي|نص إلى كلام|text.?to.?speech|tts|voice over|narration|elevenlabs|صوت عربي|تعليق عربي|voice generation|clone voice|استنساخ صوت/i] },
    { tasks: ['music_generation', 'audio'], patterns: [/موسيقى|أغنية|music|song|suno|udio|aiva|لحن|ساوند|background music|موسيقى خلفية|ولد أغنية/i] },
    { tasks: ['video_editing', 'video'], patterns: [/تحرير فيديو|مونتاج|video edit|capcut|premiere|قص فيديو|عدل فيديو|editing/i] },
    { tasks: ['code', 'coding'], patterns: [/كود|برمجة|code|coding|program|cursor|v0|اكتب كود|برمجة بالذكاء|pair programming|copilot/i] },
    { tasks: ['writing', 'text_generation'], patterns: [/كتابة|مقال|content|write|blog|تلخيص|summary|copywriting|محتوى|اكتب لي|صياغة/i] },
    { tasks: ['presentation', 'design'], patterns: [/عرض تقديمي|presentation|slides|gamma|powerpoint|كانفا|شرائح|بوربوينت/i] },
    { tasks: ['avatar', 'video'], patterns: [/avatar|أفاتار|heygen|synthesia|متحدث|talking head|فيديو أفاتار|digital human/i] },
    { tasks: ['transcription', 'audio', 'speech_to_text'], patterns: [/تفريغ|transcription|speech to text|whisper|ترجمة صوت|حول الكلام لنص|stt|meeting notes/i] },
    { tasks: ['ui_generation', 'coding'], patterns: [/واجهة|ui|frontend|v0|component|تصميم واجهة|landing page/i] },
    { tasks: ['search', 'research'], patterns: [/بحث|research|perplexity|search engine|مصادر|citations|أبحاث/i] },
    { tasks: ['local', 'privacy', 'open_source'], patterns: [/محلي|local|offline|خصوصية|privacy|ollama|self.?host|على جهازي|بدون إنترنت/i] },
    { tasks: ['dubbing', 'voice_generation', 'audio'], patterns: [/دبلجة|dubbing|ترجمة فيديو|localize video|دبلج|ترجمة صوتية/i] },
    { tasks: ['upscale', 'image_editing', 'images'], patterns: [/تكبير|upscale|enhance image|تحسين صورة|جودة أعلى|رفع دقة|super resolution/i] },
    { tasks: ['background_removal', 'image_editing'], patterns: [/إزالة خلفية|remove background|خلفية شفافة|remove\.bg|قص الخلفية/i] },
    { tasks: ['agents', 'automation'], patterns: [/وكيل|agent|أتمتة|automation|workflow|سير عمل|n8n|zapier|make|crewai|langchain|multi.?agent/i] },
    { tasks: ['rag', 'agents'], patterns: [/rag|retrieval|معرفة على بياناتي|chat with documents|تحدث مع ملفات/i] },
    { tasks: ['phone', 'voice_generation', 'agents'], patterns: [/مكالمة|phone call|voice agent|وكيل صوتي|اتصال هاتفي|vapi|retell/i] }
  ];

  for (const { tasks, patterns } of taskPatterns) {
    if (patterns.some(p => p.test(q))) {
      intent.tasks.push(...tasks);
    }
  }

  // Requirements extraction (richer)
  if (/عربي|arabic|عربية|بالعربي|بالعربية|عربى/i.test(q)) intent.requirements.arabic = true;
  if (/موبايل|mobile|هاتف|آيفون|اندرويد|android|ios|آيباد|tablet/i.test(q)) intent.requirements.mobile = true;
  if (/مجاني|free|بدون فلوس|gratis|بلاش|بدون اشتراك/i.test(q)) {
    intent.requirements.free = true;
    intent.requirements.freemium = true;
  }
  if (/api|واجهة برمجة|developer/i.test(q)) intent.requirements.api = true;
  if (/مفتوح المصدر|open.?source|opensource|مفتوح/i.test(q)) intent.requirements.open_source = true;
  if (/مبتدئ|beginner|سهل|بسيط|easy/i.test(q)) intent.requirements.beginner = true;
  if (/احترافي|professional|pro|enterprise|شركات/i.test(q)) intent.requirements.professional = true;
  if (/realtime|وقت حقيقي|فوري|live|streaming/i.test(q)) intent.requirements.realtime = true;
  if (/محلي|local|offline|on.?device|على جهازي/i.test(q)) intent.requirements.local = true;

  // Keywords fallback
  intent.keywords = q.split(/[\s,،.]+/).filter(w => w.length > 2);

  // Confidence
  if (intent.tasks.length >= 2 || (intent.tasks.length >= 1 && Object.values(intent.requirements).some(Boolean))) {
    intent.confidence = 'high';
  } else if (intent.tasks.length === 0) {
    intent.confidence = 'low';
  }

  // Deduplicate
  intent.tasks = [...new Set(intent.tasks)];

  // Deduplicate tasks
  intent.tasks = [...new Set(intent.tasks)];

  return intent;
}

// ========== MATCH SCORE ==========
function calculateMatchScore(tool, intent) {
  if (intent.type === 'tool_search') {
    const nameMatch = tool.name.toLowerCase().includes(intent.original.toLowerCase()) ||
                      tool.slug.includes(intent.original.toLowerCase());
    return {
      score: nameMatch ? 100 : 0,
      breakdown: { name: nameMatch ? 100 : 0 },
      reasons: nameMatch ? ['Direct name match'] : []
    };
  }

  let score = 0;
  let maxScore = 0;
  const breakdown = {};
  const reasons = [];

  // Task / Feature match (most important - 50 points)
  maxScore += 50;
  if (intent.tasks.length > 0) {
    let taskHits = 0;
    for (const task of intent.tasks) {
      if (tool.features && tool.features.some(f => f.includes(task) || task.includes(f))) {
        taskHits++;
      } else if (tool.categories && tool.categories.some(c => task.includes(c) || c.includes(task))) {
        taskHits += 0.6;
      } else if (tool.tags && tool.tags.some(t => task.includes(t) || t.includes(task))) {
        taskHits += 0.4;
      }
    }
    const taskScore = Math.min(50, (taskHits / intent.tasks.length) * 50);
    score += taskScore;
    breakdown.task = Math.round(taskScore);
    if (taskScore > 30) reasons.push(`✓ Matches your tasks (${Math.round(taskScore/50*100)}%)`);
  } else {
    // Keyword fallback
    let kwHits = 0;
    const searchText = (tool.name + ' ' + tool.description + ' ' + (tool.tags||[]).join(' ')).toLowerCase();
    for (const kw of intent.keywords) {
      if (searchText.includes(kw.toLowerCase())) kwHits++;
    }
    const kwScore = Math.min(40, (kwHits / Math.max(1, intent.keywords.length)) * 40);
    score += kwScore;
    breakdown.keywords = Math.round(kwScore);
  }

  // Arabic support (15 points)
  maxScore += 15;
  if (intent.requirements.arabic) {
    if (tool.arabic_support === true) {
      score += 15;
      breakdown.arabic = 15;
      reasons.push('✓ Supports Arabic');
    } else if (tool.arabic_support === false) {
      score += 0;
      breakdown.arabic = 0;
      reasons.push('✗ No Arabic support');
    } else {
      score += 5;
      breakdown.arabic = 5;
      reasons.push('? Arabic support unknown');
    }
  } else {
    score += 15; // full points if not required
    breakdown.arabic = 15;
  }

  // Pricing preference (15 points)
  maxScore += 15;
  if (intent.requirements.free || intent.requirements.freemium) {
    if (tool.free_plan === true || tool.pricing === 'free') {
      score += 15;
      breakdown.pricing = 15;
      reasons.push('✓ Has free plan');
    } else if (tool.pricing === 'freemium') {
      score += 12;
      breakdown.pricing = 12;
      reasons.push('✓ Freemium');
    } else {
      score += 0;
      breakdown.pricing = 0;
      reasons.push('✗ Paid only');
    }
  } else {
    score += 15;
    breakdown.pricing = 15;
  }

  // Mobile (10 points)
  maxScore += 10;
  if (intent.requirements.mobile) {
    if (tool.mobile_support === true) {
      score += 10;
      breakdown.mobile = 10;
      reasons.push('✓ Mobile support');
    } else {
      score += 0;
      breakdown.mobile = 0;
      reasons.push('✗ No mobile app');
    }
  } else {
    score += 10;
    breakdown.mobile = 10;
  }

  // API (5 points)
  maxScore += 5;
  if (intent.requirements.api) {
    if (tool.api_available === true) {
      score += 5;
      breakdown.api = 5;
      reasons.push('✓ API available');
    } else {
      score += 0;
      breakdown.api = 0;
    }
  } else {
    score += 5;
    breakdown.api = 5;
  }

  // Open source preference (5 points)
  maxScore += 5;
  if (intent.requirements.open_source) {
    if (tool.open_source === true) {
      score += 5;
      breakdown.open_source = 5;
      reasons.push('✓ Open source');
    } else {
      score += 0;
      breakdown.open_source = 0;
    }
  } else {
    score += 5;
    breakdown.open_source = 5;
  }

  const finalScore = Math.round((score / maxScore) * 100);
  return {
    score: finalScore,
    breakdown,
    reasons: reasons.slice(0, 5)
  };
}

// ========== SEARCH ==========
function searchTools(query, filters = {}, sort = 'match') {
  const intent = understandQuery(query);
  let results = TOOLS.map(tool => {
    const match = calculateMatchScore(tool, intent);
    return { ...tool, matchScore: match.score, matchBreakdown: match.breakdown, matchReasons: match.reasons, intent };
  });

  // Apply filters
  if (filters.free) results = results.filter(t => t.free_plan === true || t.pricing === 'free');
  if (filters.freemium) results = results.filter(t => t.pricing === 'freemium' || t.free_plan);
  if (filters.paid) results = results.filter(t => t.pricing === 'paid');
  if (filters.arabic) results = results.filter(t => t.arabic_support === true);
  if (filters.mobile) results = results.filter(t => t.mobile_support === true);
  if (filters.api) results = results.filter(t => t.api_available === true);
  if (filters.open_source) results = results.filter(t => t.open_source === true);
  if (filters.category) results = results.filter(t => t.categories?.includes(filters.category) || t.category === filters.category);

  // Sort
  if (sort === 'match') {
    results.sort((a, b) => b.matchScore - a.matchScore);
  } else if (sort === 'name') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'free_first') {
    results.sort((a, b) => (b.free_plan ? 1 : 0) - (a.free_plan ? 1 : 0) || b.matchScore - a.matchScore);
  }

  // Filter low scores for intent search
  if (intent.type === 'intent_search') {
    results = results.filter(t => t.matchScore >= 25);
  }

  return { results, intent };
}

// ========== UI RENDERING ==========
function t(ar, en) {
  return currentLang === 'ar' ? ar : en;
}

function showPage(page, params = {}) {
  currentPage = page;
  const app = document.getElementById('app');
  if (page === 'home') renderHome();
  else if (page === 'search') renderSearch(params.query || '', params.filters);
  else if (page === 'tool') renderToolDetail(params.slug);
  else if (page === 'discover') renderDiscover();
  else if (page === 'compare') renderCompare();
  else if (page === 'admin') renderAdmin();
  window.scrollTo(0, 0);
}

function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center max-w-3xl mx-auto pt-8 pb-12">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-l from-brand-600 to-brand-400 bg-clip-text text-transparent">
        AI Radar
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        ${t('أوجد الأداة المناسبة لما تريد إنجازه', 'Find the right AI tool for what you want to do')}
      </p>

      <div class="relative">
        <textarea id="search-input" rows="2"
          class="w-full px-5 py-4 text-lg rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none resize-none shadow-lg"
          placeholder="${t('مثلاً: بدي أداة تحول النص إلى فيديو واقعي وتدعم العربية وتشتغل على الموبايل', 'e.g. I need a free tool that turns text into realistic video with Arabic narration')}"
        ></textarea>
        <button onclick="doSearch()" 
          class="mt-4 w-full sm:w-auto px-10 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/30 transition active:scale-95">
          ${t('بحث', 'Search')}
        </button>
      </div>

      <div class="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${CATEGORIES.map(c => `
          <button onclick="searchCategory('${c.id}')" 
            class="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 hover:shadow-md transition">
            <span class="text-3xl">${c.icon}</span>
            <span class="text-sm font-medium">${currentLang === 'ar' ? c.name_ar : c.name}</span>
          </button>
        `).join('')}
      </div>

      <div class="mt-12 text-right">
        <h2 class="text-lg font-semibold mb-4">${t('أمثلة سريعة', 'Quick examples')}</h2>
        <div class="flex flex-wrap gap-2 justify-end">
          ${[
            'بدي أداة مجانية تعمل فيديوهات من النص وتدعم العربية',
            'أفضل أدوات توليد الصور',
            'ElevenLabs',
            'I need local open source LLM',
            'صوت عربي للتعليق الصوتي'
          ].map(ex => `
            <button onclick="document.getElementById('search-input').value='${ex.replace(/'/g,"\\'")}'; doSearch()" 
              class="px-3 py-1.5 text-sm rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-brand-100 dark:hover:bg-brand-900 transition">
              ${ex}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSearch();
    }
  });
}

async function doSearch() {
  const query = document.getElementById('search-input')?.value || '';
  if (!query.trim()) return;
  const app = document.getElementById('app');
  app.innerHTML = `<div class="py-20 text-center"><div class="inline-block w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div><p class="mt-4 text-gray-500">${t('جاري تحليل طلبك والبحث...', 'Understanding your request and searching...')}</p></div>`;
  try {
    const params = new URLSearchParams({ q: query, sort: currentSort, ...Object.fromEntries(Object.entries(currentFilters).filter(([k,v]) => v).map(([k,v]) => [k,'true'])) });
    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) throw new Error('Search API failed');
    lastSearchPayload = await res.json();
  } catch (e) {
    lastSearchPayload = null;
  }
  showPage('search', { query });
}

async function searchCategory(catId) {
  currentFilters = { pricing: [], arabic:false, mobile:false, api:false, open_source:false, free:false, category: catId };
  lastSearchPayload = null;
  const app = document.getElementById('app');
  app.innerHTML = `<div class="py-20 text-center"><div class="inline-block w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div></div>`;
  try {
    const res = await fetch(`/api/tools?category=${encodeURIComponent(catId)}&limit=1000`);
    const data = await res.json();
    lastSearchPayload = { query: '', results: (data.tools || []).map(x => ({...x, matchScore: 100})), intent: {type:'intent_search',tasks:[catId],requirements:{}} };
  } catch(e) {}
  showPage('search', { query: '', filters: { category: catId } });
}

function renderSearch(query, extraFilters = {}) {
  const filters = { ...currentFilters, ...extraFilters };
  let results, intent;
  if (lastSearchPayload && lastSearchPayload.query === query) {
    results = lastSearchPayload.results || [];
    intent = lastSearchPayload.intent || understandQuery(query);
  } else {
    ({ results, intent } = searchTools(query || (filters.category ? filters.category : ''), filters, currentSort));
  }
  searchResults = results;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="mb-6">
      <button onclick="showPage('home')" class="text-brand-600 hover:underline text-sm mb-4">← ${t('رجوع', 'Back')}</button>
      
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <input id="search-input" type="text" value="${query.replace(/"/g, '&quot;')}" 
          class="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-brand-500 outline-none"
          placeholder="${t('ابحث...', 'Search...')}"
          onkeydown="if(event.key==='Enter') doSearch()" />
        <button onclick="doSearch()" class="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium">${t('بحث', 'Search')}</button>
      </div>

      ${intent.type === 'intent_search' && intent.tasks.length ? `
        <div class="mb-6 p-4 rounded-xl bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800">
          <p class="text-sm font-medium text-brand-800 dark:text-brand-200 mb-2">${t('فهمت طلبك كالتالي:', 'I understood your request as:')}</p>
          <div class="flex flex-wrap gap-2 text-sm">
            ${intent.tasks.map(t => `<span class="px-2 py-1 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">${t}</span>`).join('')}
            ${intent.requirements.arabic ? '<span class="px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-700">Arabic</span>' : ''}
            ${intent.requirements.mobile ? '<span class="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700">Mobile</span>' : ''}
            ${intent.requirements.free ? '<span class="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700">Free/Freemium</span>' : ''}
          </div>
        </div>
      ` : ''}

      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <p class="text-gray-600 dark:text-gray-400">
          <strong>${results.length}</strong> ${t('أداة مطابقة', 'tools match')}
        </p>
        <div class="flex flex-wrap gap-2">
          <select onchange="currentSort=this.value; renderSearch(document.getElementById('search-input').value)" 
            class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <option value="match" ${currentSort==='match'?'selected':''}>${t('أفضل تطابق', 'Best Match')}</option>
            <option value="free_first" ${currentSort==='free_first'?'selected':''}>${t('مجاني أولاً', 'Free first')}</option>
            <option value="name" ${currentSort==='name'?'selected':''}>${t('الاسم', 'Name')}</option>
          </select>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button onclick="toggleFilter('free')" class="filter-btn px-3 py-1.5 rounded-full text-sm border ${filters.free ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700'}">${t('مجاني', 'Free')}</button>
        <button onclick="toggleFilter('arabic')" class="filter-btn px-3 py-1.5 rounded-full text-sm border ${filters.arabic ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700'}">${t('عربي', 'Arabic')}</button>
        <button onclick="toggleFilter('mobile')" class="filter-btn px-3 py-1.5 rounded-full text-sm border ${filters.mobile ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700'}">${t('موبايل', 'Mobile')}</button>
        <button onclick="toggleFilter('api')" class="filter-btn px-3 py-1.5 rounded-full text-sm border ${filters.api ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700'}">API</button>
        <button onclick="toggleFilter('open_source')" class="filter-btn px-3 py-1.5 rounded-full text-sm border ${filters.open_source ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700'}">${t('مفتوح المصدر', 'Open Source')}</button>
      </div>
    </div>

    <div class="grid gap-4">
      ${results.length === 0 ? `
        <div class="text-center py-16 text-gray-500">
          <p class="text-xl mb-2">${t('لا توجد نتائج', 'No results')}</p>
          <p>${t('جرب كلمات مختلفة أو قلل الفلاتر', 'Try different words or fewer filters')}</p>
        </div>
      ` : results.map(tool => renderToolCard(tool)).join('')}
    </div>
  `;
}

function toggleFilter(key) {
  currentFilters[key] = !currentFilters[key];
  const q = document.getElementById('search-input')?.value || '';
  renderSearch(q);
}

function renderToolCard(tool) {
  const scoreClass = tool.matchScore >= 80 ? 'match-high' : tool.matchScore >= 55 ? 'match-mid' : 'match-low';
  const desc = currentLang === 'ar' && tool.description_ar ? tool.description_ar : tool.description;
  
  return `
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <div class="flex items-start gap-3 mb-2">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              ${tool.name.charAt(0)}
            </div>
            <div>
              <h3 class="font-bold text-lg">
                <a href="#" onclick="showPage('tool',{slug:'${tool.slug}'}); return false;" class="hover:text-brand-600">${tool.name}</a>
              </h3>
              <p class="text-sm text-gray-500">${tool.company || ''} · ${tool.category}</p>
            </div>
            ${tool.matchScore ? `
              <div class="mr-auto ${scoreClass} text-white text-sm font-bold px-3 py-1 rounded-full">
                ${tool.matchScore}% ${t('تطابق', 'Match')}
              </div>
            ` : ''}
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">${desc}</p>
          
          <div class="flex flex-wrap gap-2 text-xs mb-3">
            <span class="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">${tool.pricing}</span>
            ${tool.free_plan ? `<span class="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">${t('خطة مجانية', 'Free plan')}</span>` : ''}
            ${tool.arabic_support === true ? `<span class="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-700">عربي ✓</span>` : tool.arabic_support === false ? `<span class="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">عربي ✗</span>` : ''}
            ${tool.mobile_support === true ? `<span class="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700">Mobile ✓</span>` : ''}
            ${tool.api_available === true ? `<span class="px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700">API ✓</span>` : ''}
            ${tool.open_source === true ? `<span class="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900 text-orange-700">Open Source</span>` : ''}
          </div>

          ${tool.matchReasons && tool.matchReasons.length ? `
            <div class="text-xs text-gray-500 space-y-0.5 mb-3">
              ${tool.matchReasons.map(r => `<div>${r}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <a href="${tool.website}" target="_blank" rel="noopener" class="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition">${t('جرب الأداة', 'Try Tool')}</a>
        <button onclick="showPage('tool',{slug:'${tool.slug}'})" class="px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">${t('التفاصيل', 'Details')}</button>
        <button onclick="addToCompare('${tool.id}')" class="px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">${t('قارن', 'Compare')}</button>
      </div>
    </div>
  `;
}

async function renderToolDetail(slug) {
  let tool = TOOLS.find(t => t.slug === slug);
  try {
    const res = await fetch(`/api/tool?slug=${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.tool) tool = data.tool;
    }
  } catch (_) {}
  if (!tool) {
    document.getElementById('app').innerHTML = `<p>${t('الأداة غير موجودة','Tool not found')}</p><button onclick="showPage('home')">${t('الرئيسية','Home')}</button>`;
    return;
  }

  // Simple alternatives: same category
  const alternatives = TOOLS.filter(t => t.id !== tool.id && (t.category === tool.category || t.categories?.some(c => tool.categories?.includes(c)))).slice(0, 4);

  const desc = currentLang === 'ar' && tool.description_ar ? tool.description_ar : tool.description;

  document.getElementById('app').innerHTML = `
    <button onclick="showPage('home')" class="text-brand-600 hover:underline text-sm mb-6">← ${t('رجوع', 'Back')}</button>
    
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
      <div class="flex flex-col sm:flex-row gap-6 mb-8">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-3xl shrink-0">
          ${tool.name.charAt(0)}
        </div>
        <div class="flex-1">
          <h1 class="text-3xl font-bold mb-1">${tool.name}</h1>
          <p class="text-gray-500 mb-3">${tool.company || 'Unknown'} · ${tool.country || ''}</p>
          <p class="text-lg text-gray-700 dark:text-gray-300">${desc}</p>
          <div class="flex flex-wrap gap-2 mt-4">
            <a href="${tool.website}" target="_blank" rel="noopener" class="px-5 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700">${t('الموقع الرسمي', 'Official Website')} ↗</a>
            <button onclick="addToCompare('${tool.id}')" class="px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl">${t('أضف للمقارنة', 'Add to Compare')}</button>
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <h3 class="font-semibold mb-2">${t('التسعير', 'Pricing')}</h3>
          <p class="capitalize">${tool.pricing}</p>
          <p class="text-sm text-gray-500 mt-1">${tool.price_note || (tool.free_plan ? t('يوجد خطة مجانية', 'Free plan available') : t('غير معروف', 'Unknown'))}</p>
        </div>
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <h3 class="font-semibold mb-2">${t('دعم العربية', 'Arabic Support')}</h3>
          <p>${tool.arabic_support === true ? '✓ ' + t('نعم', 'Yes') : tool.arabic_support === false ? '✗ ' + t('لا', 'No') : t('غير معروف', 'Unknown')}</p>
        </div>
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <h3 class="font-semibold mb-2">${t('الموبايل', 'Mobile')}</h3>
          <p>${tool.mobile_support === true ? '✓ ' + t('نعم', 'Yes') : tool.mobile_support === false ? '✗ ' + t('لا', 'No') : t('غير معروف', 'Unknown')}</p>
        </div>
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <h3 class="font-semibold mb-2">API</h3>
          <p>${tool.api_available === true ? '✓ Available' : tool.api_available === false ? '✗ Not available' : 'Unknown'}</p>
        </div>
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <h3 class="font-semibold mb-2">${t('مفتوح المصدر', 'Open Source')}</h3>
          <p>${tool.open_source === true ? '✓ Yes' : '✗ No'}</p>
        </div>
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <h3 class="font-semibold mb-2">${t('المنصات', 'Platforms')}</h3>
          <p class="text-sm">${(tool.platforms || []).join(', ') || 'Unknown'}</p>
        </div>
      </div>

      ${tool.best_for ? `
        <div class="mb-6">
          <h3 class="font-semibold text-lg mb-2">${t('الأفضل لـ', 'Best For')}</h3>
          <div class="flex flex-wrap gap-2">
            ${tool.best_for.map(b => `<span class="px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200 text-sm">${b}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="grid sm:grid-cols-2 gap-6 mb-6">
        ${tool.pros ? `
          <div>
            <h3 class="font-semibold mb-2 text-green-600">Pros</h3>
            <ul class="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-400">
              ${tool.pros.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${tool.cons ? `
          <div>
            <h3 class="font-semibold mb-2 text-red-500">Cons</h3>
            <ul class="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-400">
              ${tool.cons.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <p class="text-xs text-gray-400 mt-6">Last verified: ${tool.last_verified || 'Unknown'} · Status: ${tool.status}</p>
    </div>

    ${alternatives.length ? `
      <div class="mt-10">
        <h2 class="text-xl font-bold mb-4">${t('بدائل مشابهة', 'Similar Alternatives')}</h2>
        <div class="grid gap-3">
          ${alternatives.map(a => `
            <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div>
                <a href="#" onclick="showPage('tool',{slug:'${a.slug}'});return false" class="font-semibold hover:text-brand-600">${a.name}</a>
                <p class="text-sm text-gray-500">${a.pricing} ${a.free_plan ? '· Free plan' : ''}</p>
              </div>
              <a href="${a.website}" target="_blank" class="text-sm text-brand-600">${t('زيارة', 'Visit')} ↗</a>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderDiscover() {
  const byCat = {};
  CATEGORIES.forEach(c => {
    byCat[c.id] = TOOLS.filter(t => t.categories?.includes(c.id) || t.category === c.id).slice(0, 6);
  });

  const freeTools = TOOLS.filter(t => t.free_plan || t.pricing === 'free').slice(0, 8);
  const arabicTools = TOOLS.filter(t => t.arabic_support === true).slice(0, 8);
  const mobileTools = TOOLS.filter(t => t.mobile_support === true).slice(0, 6);

  document.getElementById('app').innerHTML = `
    <h1 class="text-3xl font-bold mb-8">${t('اكتشف', 'Discover')}</h1>

    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">🆓 ${t('أفضل الأدوات المجانية', 'Best Free AI Tools')}</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${freeTools.map(t => `
          <a href="#" onclick="showPage('tool',{slug:'${t.slug}'});return false" class="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 transition">
            <div class="font-semibold">${t.name}</div>
            <div class="text-xs text-gray-500 mt-1">${t.category}</div>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">🇦🇪 ${t('أدوات تدعم العربية', 'Best for Arabic')}</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${arabicTools.map(t => `
          <a href="#" onclick="showPage('tool',{slug:'${t.slug}'});return false" class="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 transition">
            <div class="font-semibold">${t.name}</div>
            <div class="text-xs text-gray-500 mt-1">${t.category}</div>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">📱 ${t('تعمل على الموبايل', 'Mobile Friendly')}</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${mobileTools.map(t => `
          <a href="#" onclick="showPage('tool',{slug:'${t.slug}'});return false" class="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 transition">
            <div class="font-semibold">${t.name}</div>
            <div class="text-xs text-gray-500 mt-1">${t.category}</div>
          </a>
        `).join('')}
      </div>
    </section>

    ${CATEGORIES.map(c => byCat[c.id]?.length ? `
      <section class="mb-10">
        <h2 class="text-xl font-semibold mb-4">${c.icon} ${currentLang==='ar' ? c.name_ar : c.name}</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${byCat[c.id].map(t => `
            <a href="#" onclick="showPage('tool',{slug:'${t.slug}'});return false" class="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-400 transition">
              <div class="font-semibold">${t.name}</div>
              <div class="text-xs text-gray-500 mt-1">${t.pricing}</div>
            </a>
          `).join('')}
        </div>
      </section>
    ` : '').join('')}
  `;
}

function addToCompare(id) {
  if (selectedForCompare.includes(id)) return;
  if (selectedForCompare.length >= 4) {
    alert(t('يمكنك مقارنة حتى 4 أدوات فقط', 'You can compare up to 4 tools'));
    return;
  }
  selectedForCompare.push(id);
  alert(t('تمت الإضافة للمقارنة (' + selectedForCompare.length + ')', 'Added to compare (' + selectedForCompare.length + ')'));
}

function renderCompare() {
  const tools = selectedForCompare.map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
  
  document.getElementById('app').innerHTML = `
    <h1 class="text-3xl font-bold mb-6">${t('مقارنة الأدوات', 'Compare Tools')}</h1>
    
    ${tools.length < 2 ? `
      <p class="text-gray-500 mb-4">${t('اختر أداتين على الأقل من نتائج البحث للمقارنة', 'Select at least 2 tools from search results to compare')}</p>
      <button onclick="showPage('home')" class="px-4 py-2 bg-brand-600 text-white rounded-lg">${t('ابحث عن أدوات', 'Search tools')}</button>
    ` : `
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="p-3 text-right font-semibold">${t('الميزة', 'Feature')}</th>
              ${tools.map(t => `<th class="p-3 text-center font-semibold">${t.name}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-3 font-medium">${t('التسعير', 'Pricing')}</td>
              ${tools.map(t => `<td class="p-3 text-center capitalize">${t.pricing}${t.free_plan ? ' (Free plan)' : ''}</td>`).join('')}
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-3 font-medium">${t('دعم العربية', 'Arabic')}</td>
              ${tools.map(t => `<td class="p-3 text-center">${t.arabic_support === true ? '✓' : t.arabic_support === false ? '✗' : '?'}</td>`).join('')}
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-3 font-medium">${t('موبايل', 'Mobile')}</td>
              ${tools.map(t => `<td class="p-3 text-center">${t.mobile_support === true ? '✓' : '✗'}</td>`).join('')}
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-3 font-medium">API</td>
              ${tools.map(t => `<td class="p-3 text-center">${t.api_available === true ? '✓' : '✗'}</td>`).join('')}
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-3 font-medium">${t('مفتوح المصدر', 'Open Source')}</td>
              ${tools.map(t => `<td class="p-3 text-center">${t.open_source === true ? '✓' : '✗'}</td>`).join('')}
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="p-3 font-medium">${t('الأفضل لـ', 'Best for')}</td>
              ${tools.map(t => `<td class="p-3 text-center text-xs">${(t.best_for || []).slice(0,2).join(', ')}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-3 font-medium">${t('رابط', 'Link')}</td>
              ${tools.map(t => `<td class="p-3 text-center"><a href="${t.website}" target="_blank" class="text-brand-600">Visit ↗</a></td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <button onclick="selectedForCompare=[]; renderCompare()" class="mt-6 px-4 py-2 border rounded-lg text-sm">${t('مسح المقارنة', 'Clear compare')}</button>
    `}
  `;
}

function renderAdmin() {
  const total = TOOLS.length;
  const active = TOOLS.filter(t => t.status === 'active').length;
  const withArabic = TOOLS.filter(t => t.arabic_support === true).length;
  const free = TOOLS.filter(t => t.free_plan || t.pricing === 'free').length;
  const withApi = TOOLS.filter(t => t.api_available === true).length;

  document.getElementById('app').innerHTML = `
    <h1 class="text-3xl font-bold mb-2">Admin Dashboard</h1>
    <p class="text-gray-500 mb-8 text-sm">MVP — Stats from real seed data. No fake numbers.</p>

    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
      <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div class="text-3xl font-bold text-brand-600">${total}</div>
        <div class="text-sm text-gray-500 mt-1">Total Tools</div>
      </div>
      <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div class="text-3xl font-bold text-green-600">${active}</div>
        <div class="text-sm text-gray-500 mt-1">Active</div>
      </div>
      <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div class="text-3xl font-bold">${withArabic}</div>
        <div class="text-sm text-gray-500 mt-1">Arabic Support</div>
      </div>
      <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div class="text-3xl font-bold">${free}</div>
        <div class="text-sm text-gray-500 mt-1">Free / Freemium</div>
      </div>
      <div class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div class="text-3xl font-bold">${withApi}</div>
        <div class="text-sm text-gray-500 mt-1">With API</div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 font-semibold">All Tools (${total})</div>
      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              <th class="p-3 text-right">Name</th>
              <th class="p-3 text-right">Category</th>
              <th class="p-3 text-right">Pricing</th>
              <th class="p-3 text-right">Arabic</th>
              <th class="p-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            ${TOOLS.map(t => `
              <tr class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td class="p-3 font-medium">${t.name}</td>
                <td class="p-3">${t.category}</td>
                <td class="p-3 capitalize">${t.pricing}</td>
                <td class="p-3">${t.arabic_support === true ? '✓' : t.arabic_support === false ? '✗' : '?'}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-xs ${t.status==='active'?'bg-green-100 text-green-700':'bg-gray-100'}">${t.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <p class="mt-6 text-xs text-gray-400">Future: Add/Edit/Delete, Pending Review queue, Broken links detection, Verification workflow.</p>
  `;
}

function renderCurrentPage() {
  if (currentPage === 'home') renderHome();
  else if (currentPage === 'search') {
    const q = document.getElementById('search-input')?.value || '';
    renderSearch(q);
  } else if (currentPage === 'discover') renderDiscover();
  else if (currentPage === 'compare') renderCompare();
  else if (currentPage === 'admin') renderAdmin();
}

// Init
async function loadTools() {
  try {
    const res = await fetch('/api/tools?limit=1000');
    if (!res.ok) throw new Error('tools api failed');
    const data = await res.json();
    TOOLS = data.tools || [];
  } catch (e) {
    TOOLS = [];
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadTools();
  showPage('home');
});
