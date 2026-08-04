# Missing Tables Migration Runbook (Discovery Atlas DB)

## Purpose

Migrate Quest Weaver feature tables that are not present in Discovery Atlas database, without introducing the lowercase `public.quests` conflict.

## Important Rule

Do **not** apply migrations that create or depend on lowercase `public.quests` when Discovery uses `public."Quests"`.

Skip these files:

- `supabase/migrations/20260221135555_817610ba-1fee-4cba-a261-36902b7ca544.sql` (creates `public.quests`)
- `supabase/migrations/20260221231312_1a945f40-8f26-4c3f-8299-a66c03ccc555.sql` (`Submissions.quest_id` references `public.quests`)

## Pre-Migration Checklist

1. Take a DB backup in Supabase Dashboard before any schema change.
2. Run precheck SQL:
   - `sql config files/missing_tables_migration_precheck.sql`
3. Confirm:
   - `public."Quests"` exists
   - `public.quests` is not used as the canonical quest table
   - `public.has_role` function exists
   - `public.app_role` enum exists

## Migration Files To Apply (in order)

Apply these in timestamp order:

1. `supabase/migrations/20260221172219_ef9b94de-330e-4464-a6c0-f0cd45b0dc8f.sql`
2. `supabase/migrations/20260221180011_e332901a-80c7-4e7b-a99c-d4d3d11fe8a9.sql`
3. `supabase/migrations/20260221201431_3a051c05-277b-4327-bad6-05a66ba58da6.sql`
4. `supabase/migrations/20260221205521_04c48bf7-06e1-4319-b255-d3ce2be05638.sql`
5. `supabase/migrations/20260221215750_40c3a978-7618-4c70-89fc-346546513624.sql`
6. `supabase/migrations/20260221222128_b92510b2-c42b-43e0-9d23-8abea6c81399.sql`
7. `supabase/migrations/20260222103919_9403cabe-f85a-47a2-9623-eece61b90a01.sql`

## How To Apply

### Option A: Supabase SQL Editor (recommended)

1. Open each file above.
2. Copy/paste SQL into SQL Editor.
3. Run one file at a time in listed order.
4. Fix any error before moving to next file.

### Option B: CLI / psql (advanced)

Use your Supabase Postgres connection string and run each file in order with `psql -f`.

Note: `supabase db push` is **not** selective. If you run full push from this repo, it may also attempt skipped migrations unless you curate migration set first.

## Post-Migration Validation

1. Re-run:
   - `sql config files/missing_tables_migration_precheck.sql`
2. Confirm `missing_count = 0` (or expected reduced count if partial rollout).
3. Smoke-test features that use new tables:
   - Push subscriptions
   - Quest chains / routes
   - Social groups
   - Verification appeals and thresholds
   - AR marker collections

## Expected Tables Covered

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
