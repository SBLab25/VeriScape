# Table Case And Name Audit (Quest Weaver -> Discovery Atlas)

Generated: 2026-04-21

## Goal

Check whether Quest Weaver table references are:

1. the same table names as Discovery Atlas,
2. the same tables but different case (uppercase/lowercase),
3. or possibly present in Discovery under different table names.

## How This Was Checked

- Compared runtime Supabase `.from(...)` table references in both projects.
- Compared typed schema table keys from each `src/integrations/supabase/types.ts`.
- Performed case-sensitive and case-insensitive matching.
- Ran column-shape comparisons for missing tables to detect possible renamed equivalents.

Reference artifacts:

- `project details files/CODE_REF_CASE_DIFF.json`
- `project details files/DATABASE_TABLE_PARITY_AUDIT.md`
- `project details files/DATABASE_TABLE_PARITY_AUDIT.json`

## Case-Sensitivity Result (After Fix)

Current runtime comparison result:

- Case-only mismatches in `.from(...)` references: `0`
- `quests` runtime references were removed.
- Canonical Discovery table name `Quests` is now used in app and edge-function query paths.

Note:

- Migration history still contains `public.quests` creation/references in 2026 migration files.
- This is a migration-level concern (not runtime app-query usage) and should be reviewed before applying those migrations to production.

## Tables Not Found In Discovery (Even After Case-Insensitive Check)

These 23 Quest Weaver table references do not have an exact or case-only same-name match in Discovery code:

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

## Different-Name Possibilities (Checked)

No high-confidence one-to-one rename mappings were found for most missing tables.

Lower-confidence conceptual overlaps:

1. `social_group_members` may correspond to Discovery membership tables:
   - Discovery `team_members` and `crew_members` are structurally very close (same core columns; only FK name differs).
2. `social_groups` is partially similar to `teams`/`crews`, but has additional social metadata (`banner_url`, `icon_emoji`, `is_public`, `member_count`, etc.).
3. `social_group_posts` is partially similar to `community_posts`, but schema is not drop-in equivalent (`group_id` vs community post model fields).

These are not safe automatic renames; they require explicit migration/adapter decisions.

## Merge Safety Conclusion

For a clean merge without DB runtime errors:

1. Keep `Quests` as the canonical runtime quest table name across frontend and edge functions.
2. Decide per missing table whether to:
   - add new migrations to Discovery DB, or
   - map to existing Discovery tables with transformation logic, or
   - temporarily disable those features.
3. Do not assume missing tables are already present under alternate names unless explicitly migrated and validated.
