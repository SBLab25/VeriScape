-- Quest Table Case Audit (Discovery Atlas Compatibility)
-- Run this in Supabase SQL editor to diagnose Quests vs quests conflicts.

-- 1) Check whether each table exists
select
  to_regclass('public."Quests"') as legacy_quoted_Quests,
  to_regclass('public.quests') as lowercase_quests;

-- 2) Inspect row counts (if table exists)
do $$
begin
  if to_regclass('public."Quests"') is not null then
    raise notice 'Rows in public."Quests": %', (select count(*) from public."Quests");
  else
    raise notice 'public."Quests" does not exist';
  end if;

  if to_regclass('public.quests') is not null then
    raise notice 'Rows in public.quests: %', (select count(*) from public.quests);
  else
    raise notice 'public.quests does not exist';
  end if;
end $$;

-- 3) Show schema differences between quest tables
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('Quests', 'quests')
order by table_name, ordinal_position;

-- 4) Verify what table Submissions.quest_id foreign key targets
select
  con.conname as fk_name,
  src.relname as source_table,
  src_attr.attname as source_column,
  tgt_ns.nspname as target_schema,
  tgt.relname as target_table,
  tgt_attr.attname as target_column
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_class tgt on tgt.oid = con.confrelid
join pg_namespace tgt_ns on tgt_ns.oid = tgt.relnamespace
join unnest(con.conkey) with ordinality as src_cols(attnum, ord) on true
join unnest(con.confkey) with ordinality as tgt_cols(attnum, ord) on tgt_cols.ord = src_cols.ord
join pg_attribute src_attr on src_attr.attrelid = src.oid and src_attr.attnum = src_cols.attnum
join pg_attribute tgt_attr on tgt_attr.attrelid = tgt.oid and tgt_attr.attnum = tgt_cols.attnum
where con.contype = 'f'
  and src.relname = 'Submissions'
  and src_attr.attname = 'quest_id';

-- 5) Check presence of new-function dependency tables
with required_tables(name) as (
  values
    ('ai_agent_config'),
    ('user_quest_stats'),
    ('quest_chains'),
    ('quest_chain_steps'),
    ('quest_conversations'),
    ('quest_learning_engagement'),
    ('push_subscriptions'),
    ('ai_verifications'),
    ('ai_logs'),
    ('verification_appeals'),
    ('verification_cross_references'),
    ('verification_feedback'),
    ('verification_thresholds'),
    ('notifications')
)
select
  name as required_table,
  case when to_regclass('public.' || name) is null then 'MISSING' else 'OK' end as status
from required_tables
order by status desc, required_table;

-- Optional remediation notes (manual, not auto-executed):
-- - Keep public."Quests" as canonical for Discovery Atlas compatibility.
-- - Avoid creating/using public.quests unless intentionally migrating schema.
-- - Ensure Submissions.quest_id FK points to public."Quests"(id).
