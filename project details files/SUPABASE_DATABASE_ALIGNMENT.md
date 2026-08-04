# Supabase Database Alignment (Quest Weaver -> Discovery Atlas)

## Purpose

`quest-weaver-main` must use the same Supabase database as the currently hosted Discovery Atlas application to avoid split data and cross-project edge-function failures.

Note: Some historical files in `report/` still mention `xmdgrionjygqrcsbddmo`; treat those as past state, not active configuration.

As of **April 20, 2026**, the shared target is:

- Project ID: `afglpoufxxgdxylvgeex`
- Supabase URL: `https://afglpoufxxgdxylvgeex.supabase.co`

## What Was Changed

1. Updated frontend env target in `.env` to the shared Discovery Atlas project:
   - `VITE_SUPABASE_PROJECT_ID=afglpoufxxgdxylvgeex`
   - `VITE_SUPABASE_URL=https://afglpoufxxgdxylvgeex.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<afgl... anon key>`
2. Updated `src/utils/edgeFunctionClient.ts`:
   - Uses generic `SUPABASE_URL` / `SUPABASE_ANON_KEY` naming.
   - Adds an explicit guard for missing env vars to avoid invalid URL runtime errors.
3. Updated `supabase/functions/generate-quest-suggestions/index.ts` fallback URL:
   - Replaced `xmdgrionjygqrcsbddmo` fallback with `afglpoufxxgdxylvgeex`.
4. Standardized quest table usage to Discovery Atlas naming:
   - Removed lowercase `"quests"` runtime fallbacks.
   - Frontend and edge functions now use canonical `"Quests"` only.
   - Updated `export-database` function table list from `"quests"` to `"Quests"`.

## Why This Fix Is Needed

Before this alignment:

- The generated frontend Supabase client and local Supabase config pointed to `afglpoufxxgdxylvgeex`.
- `.env` and some edge-function fallback logic pointed to `xmdgrionjygqrcsbddmo`.

This created mixed-project behavior where:

- Database operations and auth could hit one project.
- Edge-function calls could hit another project.

That mismatch can cause missing data, function 404s, auth/session confusion, and difficult-to-debug production behavior.

In addition, the 2026 migration set introduces a lowercase `public.quests` table while the existing Discovery Atlas schema uses uppercase `public."Quests"`. Runtime code has been standardized to `Quests`, but migration history still contains lowercase `public.quests` creation/reference and should be reviewed before applying to production.

## Deployment Checklist

When deploying `quest-weaver-main`, ensure all runtime values point to the same project (`afglpoufxxgdxylvgeex`):

1. Frontend environment variables
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Supabase edge function secret
   - `SUPABASE_URL` (set to `https://afglpoufxxgdxylvgeex.supabase.co`)

## Function Parity Check

`quest-weaver-main` includes newer edge functions that are not present in the checked-in Discovery Atlas function folder:

- `ai-verification-agent`
- `export-database`
- `generate-quest`
- `quest-knowledge-agent`
- `quest-master-agent`
- `send-push-notification`
- `verify-quest`

If these are not already deployed in the target Supabase project (`afglpoufxxgdxylvgeex`), deploy them before using related UI flows in production.

## Schema Compatibility Warning

The following tables used by new-only functions are not part of the checked-in Discovery Atlas type schema and may require migration deployment before those features fully work:

- `ai_agent_config`
- `user_quest_stats`
- `quest_chains`
- `quest_chain_steps`
- `quest_conversations`
- `quest_learning_engagement`
- `push_subscriptions`
- `ai_verifications`
- `ai_logs`
- `verification_appeals`
- `verification_cross_references`
- `verification_feedback`
- `verification_thresholds`
- `notifications`

For old-DB compatibility, avoid introducing a second quest table unless intentional; prefer existing `public."Quests"` as the canonical quest source.

Use the SQL audit script for a quick DB-side check:

- `sql config files/quest_table_case_audit.sql`
- `sql config files/missing_tables_migration_precheck.sql`

## Table Parity Audit (April 21, 2026)

A deeper cross-project table audit was completed and saved in:

- `project details files/DATABASE_TABLE_PARITY_AUDIT.md`
- `project details files/DATABASE_TABLE_PARITY_AUDIT.json`
- `project details files/TABLE_CASE_AND_NAME_AUDIT.md`
- `project details files/CODE_REF_CASE_DIFF.json`

### Confirmed Quest-Weaver-only table references (not present in Discovery code or checked-in Discovery schema)

- `ai_agent_config`
- `ar_quest_markers`
- `blocked_users`
- `content_reports`
- `push_subscriptions`
- `quest_chain_steps`
- `quest_chains`
- `quest_conversations`
- `quest_learning_engagement`
- `quest_routes`
- `seasonal_event_participation`
- `seasonal_event_quests`
- `seasonal_events`
- `social_group_members`
- `social_group_posts`
- `social_groups`
- `user_ar_collections`
- `user_quest_chain_progress`
- `user_quest_stats`
- `verification_appeals`
- `verification_cross_references`
- `verification_feedback`
- `verification_thresholds`

### Case-sensitive table conflict

- Discovery uses `Quests` (see `src/integrations/supabase/types.ts`)
- Runtime code has been standardized to `Quests`
- 2026 migration history still includes lowercase `public.quests`

Important: PostgreSQL treats quoted mixed-case identifiers as case-sensitive objects. Mixing `Quests` and `quests` can cause runtime query and FK inconsistencies if both are not intentionally maintained.

## Quick Verification

1. Start app and log in.
2. Perform one read and one write action (for example, load profile and submit/update an item).
3. Trigger an edge-function flow (for example, AI verification path).
4. Confirm all corresponding records/logs appear under the same Supabase project (`afglpoufxxgdxylvgeex`).

## Important: Copy/Paste Does Not Create DB Tables

Copying project files between folders does **not** create or update Supabase tables.

To create missing tables in a database, you must explicitly apply SQL/migrations to that Supabase project (for example via Supabase SQL Editor, migration pipeline, or `supabase db push` workflow).

Before applying migrations from `quest-weaver-main`, review 2026 migrations that reference/create lowercase `public.quests` so they do not conflict with Discovery Atlas canonical `public."Quests"` usage.

Migration runbook:

- `project details files/MISSING_TABLES_MIGRATION_RUNBOOK.md`
