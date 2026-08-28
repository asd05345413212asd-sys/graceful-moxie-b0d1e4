import { getTools } from './_lib.mjs';
export default async (req) => {
  const url = new URL(req.url);
  const tools = await getTools({category:url.searchParams.get('category'), limit:url.searchParams.get('limit') || 1000});
  return new Response(JSON.stringify({tools}), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60'}});
};
