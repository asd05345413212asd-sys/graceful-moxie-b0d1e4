import { getTools, parseIntent, scoreTool, supabaseFetch } from './_lib.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const query = (url.searchParams.get('q') || '').trim();
  if (!query) return new Response(JSON.stringify({query:'',intent:{type:'tool_search',tasks:[],requirements:{}},results:[]}), {headers:{'content-type':'application/json'}});

  const intent = await parseIntent(query);
  let tools = await getTools({limit:1000});
  const f = url.searchParams;
  if (f.get('free') === 'true') tools = tools.filter(t => t.free_plan === true || t.pricing === 'free' || t.pricing === 'freemium');
  if (f.get('arabic') === 'true') tools = tools.filter(t => t.arabic_support === true);
  if (f.get('mobile') === 'true') tools = tools.filter(t => t.mobile_support === true);
  if (f.get('api') === 'true') tools = tools.filter(t => t.api_available === true);
  if (f.get('open_source') === 'true') tools = tools.filter(t => t.open_source === true);
  if (f.get('category')) tools = tools.filter(t => t.category === f.get('category') || t.categories?.includes(f.get('category')));

  let results = tools.map(t => ({...t, matchScore:scoreTool(t,intent)}));
  if (intent.type === 'intent_search') results = results.filter(t => t.matchScore >= 20);
  const sort = f.get('sort') || 'match';
  if (sort === 'match') results.sort((a,b)=>b.matchScore-a.matchScore);
  else if (sort === 'name') results.sort((a,b)=>a.name.localeCompare(b.name));
  else if (sort === 'free_first') results.sort((a,b)=>(b.free_plan?1:0)-(a.free_plan?1:0)||b.matchScore-a.matchScore);
  else if (sort === 'rating') results.sort((a,b)=>(b.rating||0)-(a.rating||0));
  results = results.slice(0,100);

  try { await supabaseFetch('searches', {method:'POST', body:JSON.stringify({query, result_count:results.length})}); } catch (_) {}
  return new Response(JSON.stringify({query,intent,results}), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
};
