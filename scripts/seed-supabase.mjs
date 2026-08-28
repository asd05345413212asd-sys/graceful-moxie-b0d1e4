import { TOOLS, CATEGORIES } from '../data/tools.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

async function request(path, options={}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal', ...(options.headers||{}) }
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}

await request('categories', {method:'POST', body:JSON.stringify(CATEGORIES.map(c=>({id:c.id,name:c.name,name_ar:c.name_ar,icon:c.icon})))});
await request('tools', {method:'POST', body:JSON.stringify(TOOLS.map(t=>({
  id:t.id,name:t.name,slug:t.slug,description:t.description,description_ar:t.description_ar,website:t.website,logo:t.logo||null,company:t.company||null,country:t.country||null,
  category:t.category||null,categories:t.categories||[],tags:t.tags||[],pricing:t.pricing||null,free_plan:t.free_plan??null,price_from:t.price_from??null,price_note:t.price_note||null,
  arabic_support:t.arabic_support??null,mobile_support:t.mobile_support??null,api_available:t.api_available??null,open_source:t.open_source??null,platforms:t.platforms||[],best_for:t.best_for||[],pros:t.pros||[],cons:t.cons||[],privacy_info:t.privacy_info||null,
  rating:t.rating??null,reviews_count:t.reviews_count??null,status:t.status||'active',verification_status:t.verification_status||'unverified',last_checked:t.last_checked||null,last_verified:t.last_verified||null,date_added:t.date_added||new Date().toISOString(),features:t.features||[]
})))});
console.log(`Seeded ${TOOLS.length} tools and ${CATEGORIES.length} categories.`);
