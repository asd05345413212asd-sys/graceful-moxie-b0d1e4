# AI Radar

AI Radar is a bilingual RTL-first AI tools discovery/search engine. The current release keeps the existing UI while adding a Netlify Functions backend, database-ready API, AI intent parsing, and a Supabase seed path.

## Architecture

Browser → Netlify Functions → Supabase/PostgreSQL (when configured)
                         ↘ seed-data fallback
                         ↘ Anthropic (when configured)

## Environment variables

Required for production database:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

Optional AI:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Never expose these variables in browser code.

## Database

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL editor.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables.
4. Run `npm run seed` from a trusted environment to migrate the verified seed catalog.

The app still falls back to `data/tools.js` when Supabase is not configured, so the UI can be previewed without a database.

## Local development

```bash
npm install
npm run dev
```

## API

- `GET /api/tools`
- `GET /api/tool?slug=chatgpt`
- `GET /api/search?q=...`
- `GET /api/health`

## Current scope

Implemented foundation:
- Existing UI preserved
- Normal search
- AI intent parsing with Anthropic + deterministic fallback
- Match scoring
- Database schema
- Supabase data access
- Tool detail API
- Search analytics storage when database is configured
- Verification/discovery tables
- Netlify configuration

Not yet implemented as production features:
- Automatic web crawler
- Automatic pricing verification
- Full authenticated admin CRUD
- User accounts and synced favorites
- Affiliate/ads/Pro billing
- Workflows

Those should be added after the core search/data pipeline is verified.
