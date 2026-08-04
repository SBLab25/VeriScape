-- Precheck for migrating Quest Weaver missing tables into Discovery Atlas DB.
-- Run in Supabase SQL Editor BEFORE and AFTER migration.

-- 1) Canonical quest table case check.
select
  to_regclass('public."Quests"') as quests_uppercase,
  to_regclass('public.quests') as quests_lowercase;

-- 2) Dependency checks used by RLS policies.
select
  exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) as has_app_role_enum,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_role'
  ) as has_role_function;

-- 3) Missing table status matrix (expected from quest-weaver features).
with required(table_name) as (
  values
    ('ai_agent_config'),
    ('ar_quest_markers'),
    ('blocked_users'),
    ('content_reports'),
    ('push_subscriptions'),
    ('quest_chain_steps'),
    ('quest_chains'),
    ('quest_conversations'),
    ('quest_learning_engagement'),
    ('quest_routes'),
    ('seasonal_event_participation'),
    ('seasonal_event_quests'),
    ('seasonal_events'),
    ('social_group_members'),
    ('social_group_posts'),
    ('social_groups'),
    ('user_ar_collections'),
    ('user_quest_chain_progress'),
    ('user_quest_stats'),
    ('verification_appeals'),
    ('verification_cross_references'),
    ('verification_feedback'),
    ('verification_thresholds')
)
select
  r.table_name,
  case when to_regclass('public.' || quote_ident(r.table_name)) is not null then 'present' else 'missing' end as status
from required r
order by r.table_name;

-- 4) Summary count.
with required(table_name) as (
  values
    ('ai_agent_config'),
    ('ar_quest_markers'),
    ('blocked_users'),
    ('content_reports'),
    ('push_subscriptions'),
    ('quest_chain_steps'),
    ('quest_chains'),
    ('quest_conversations'),
    ('quest_learning_engagement'),
    ('quest_routes'),
    ('seasonal_event_participation'),
    ('seasonal_event_quests'),
    ('seasonal_events'),
    ('social_group_members'),
    ('social_group_posts'),
    ('social_groups'),
    ('user_ar_collections'),
    ('user_quest_chain_progress'),
    ('user_quest_stats'),
    ('verification_appeals'),
    ('verification_cross_references'),
    ('verification_feedback'),
    ('verification_thresholds')
)
select
  count(*) filter (where to_regclass('public.' || quote_ident(table_name)) is null) as missing_count,
  count(*) as required_count
from required;
