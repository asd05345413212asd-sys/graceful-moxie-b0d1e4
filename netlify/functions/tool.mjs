import { getToolBySlug } from './_lib.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  if (!slug) return new Response(JSON.stringify({error:'Missing slug'}), {status:400, headers:{'content-type':'application/json'}});
  const tool = await getToolBySlug(slug);
  if (!tool) return new Response(JSON.stringify({error:'Tool not found'}), {status:404, headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({tool}), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60'}});
};
