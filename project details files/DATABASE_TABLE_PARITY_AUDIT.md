# Database Table Parity Audit (Discovery Atlas vs Quest Weaver)

Generated: 2026-04-21 02:03:52 +05:30

## Scope
- Discovery baseline: Discovery-atlas-main/Discovery-atlas-main
- Target project: quest-weaver-main/quest-weaver-main
- Sources compared: supabase types.ts, supabase/migrations, sql config files create-table statements, and runtime .from(...) references in src + supabase/functions

## 1) Tables Present In Quest Weaver Schema But Missing In Discovery Schema
Count: 24

- ai_agent_config
- ar_quest_markers
- blocked_users
- content_reports
- push_subscriptions
- quest_chain_steps
- quest_chains
- quest_conversations
- quest_learning_engagement
- quest_routes
- quests
- seasonal_event_participation
- seasonal_event_quests
- seasonal_events
- social_group_members
- social_group_posts
- social_groups
- user_ar_collections
- user_quest_chain_progress
- user_quest_stats
- verification_appeals
- verification_cross_references
- verification_feedback
- verification_thresholds

## 2) Table References Used In Quest Weaver Code But Not In Discovery Code
Count: 23

- ai_agent_config
- ar_quest_markers
- blocked_users
- content_reports
- push_subscriptions
- quest_chain_steps
- quest_chains
- quest_conversations
- quest_learning_engagement
- quest_routes
- seasonal_event_participation
- seasonal_event_quests
- seasonal_events
- social_group_members
- social_group_posts
- social_groups
- user_ar_collections
- user_quest_chain_progress
- user_quest_stats
- verification_appeals
- verification_cross_references
- verification_feedback
- verification_thresholds

## 3) Quest Weaver Runtime References Missing In Discovery Schema
Count: 40

- achievements
- ai_agent_config
- ar_quest_markers
- avatars
- blocked_users
- challenges
- content_reports
- follow_requests
- followers
- moderation_logs
- powerups
- push_subscriptions
- quest_chain_steps
- quest_chains
- quest_conversations
- quest_learning_engagement
- quest_routes
- QuestSubmissions
- quest-submissions
- seasonal_event_participation
- seasonal_event_quests
- seasonal_events
- social_group_members
- social_group_posts
- social_groups
- streaks
- team_challenge_progress
- team_challenges
- team_messages
- user_ar_collections
- user_challenges
- user_powerups
- user_quest_chain_progress
- user_quest_stats
- verification_appeals
- verification_cross_references
- verification_feedback
- verification_ledger
- verification_thresholds
- your-bucket

## 4) Quest Weaver Migration FK References Missing In Discovery Schema
Count: 8

- ar_quest_markers
- auth
- quest_chains
- quests
- seasonal_event_quests
- seasonal_events
- social_groups
- submissions

## 5) Case Sensitivity Conflicts
Count: 1

- Quest Weaver: quests vs Discovery: Quests

## 6) Evidence: Quest-Only Table References With File/Line

### ai_agent_config
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\LLMConfigPanel.tsx:58 -> .from('ai_agent_config')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\LLMConfigPanel.tsx:103 -> .from('ai_agent_config')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\LLMConfigPanel.tsx:108 -> .from('ai_agent_config')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\LLMConfigPanel.tsx:114 -> .from('ai_agent_config')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-master-agent\index.ts:67 -> .from('ai_agent_config')

### ar_quest_markers
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useARQuest.tsx:107 -> .from('ar_quest_markers')

### blocked_users
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useBlockedUsers.tsx:21 -> .from('blocked_users')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useBlockedUsers.tsx:39 -> .from('blocked_users')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useBlockedUsers.tsx:54 -> .from('blocked_users')

### content_reports
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\ContentReportsPanel.tsx:35 -> .from('content_reports')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\ContentReportsPanel.tsx:50 -> .from('content_reports')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useContentReport.tsx:26 -> .from('content_reports')

### push_subscriptions
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\send-push-notification\index.ts:60 -> .from('push_subscriptions')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\send-push-notification\index.ts:102 -> .from('push_subscriptions')

### quest_chain_steps
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestChains.tsx:65 -> .from('quest_chain_steps')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-master-agent\index.ts:318 -> await supabase.from('quest_chain_steps').insert({

### quest_chains
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestChains.tsx:56 -> .from('quest_chains')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-master-agent\index.ts:298 -> .from('quest_chains')

### quest_conversations
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:85 -> .from('quest_conversations')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:278 -> .from('quest_conversations')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:284 -> .from('quest_conversations')

### quest_learning_engagement
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:51 -> .from('quest_learning_engagement')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:300 -> .from('quest_learning_engagement')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:308 -> .from('quest_learning_engagement')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:316 -> .from('quest_learning_engagement')

### quest_routes
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestRoutes.tsx:32 -> .from('quest_routes')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestRoutes.tsx:48 -> .from('quest_routes')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestRoutes.tsx:64 -> const { error } = await supabase.from('quest_routes').delete().eq('id', routeId);

### seasonal_event_participation
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSeasonalEvents.tsx:76 -> .from('seasonal_event_participation')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSeasonalEvents.tsx:103 -> .from('seasonal_event_participation')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSeasonalEvents.tsx:121 -> .from('seasonal_event_participation')

### seasonal_event_quests
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSeasonalEvents.tsx:69 -> .from('seasonal_event_quests')

### seasonal_events
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSeasonalEvents.tsx:57 -> .from('seasonal_events')

### social_group_members
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:66 -> .from('social_group_members')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:95 -> .from('social_group_members')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:111 -> .from('social_group_members')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:136 -> .from('social_group_members')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:156 -> .from('social_group_members')

### social_group_posts
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:175 -> .from('social_group_posts')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:195 -> .from('social_group_posts')

### social_groups
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:57 -> .from('social_groups')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:86 -> .from('social_groups')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:118 -> await supabase.from('social_groups').update({ member_count: group.member_count + 1 }).eq('id', groupId);
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useSocialGroups.tsx:144 -> await supabase.from('social_groups').update({ member_count: Math.max(0, group.member_count - 1) }).eq('id', groupId);

### user_ar_collections
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useARQuest.tsx:116 -> .from('user_ar_collections')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useARQuest.tsx:194 -> .from('user_ar_collections')

### user_quest_chain_progress
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestChains.tsx:72 -> .from('user_quest_chain_progress')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestChains.tsx:99 -> .from('user_quest_chain_progress')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\hooks\useQuestChains.tsx:126 -> .from('user_quest_chain_progress')

### user_quest_stats
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\EngagementAnalytics.tsx:46 -> supabase.from('user_quest_stats').select('user_id, total_completed, total_xp, current_level'),
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-knowledge-agent\index.ts:112 -> .from('user_quest_stats')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\quest-master-agent\index.ts:87 -> supabase.from('user_quest_stats').select('*').eq('user_id', userId).maybeSingle(),

### verification_appeals
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\AIVerificationLogs.tsx:111 -> supabase.from('verification_appeals').select('*').order('created_at', { ascending: false }).limit(50),
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:562 -> await supabase.from('verification_appeals').update(updateData).eq('id', request.appealId);

### verification_cross_references
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:604 -> await supabase.from('verification_cross_references').insert({

### verification_feedback
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\AIVerificationLogs.tsx:113 -> supabase.from('verification_feedback').select('*').order('created_at', { ascending: false }).limit(50),
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:693 -> await supabase.from('verification_feedback').insert({
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:708 -> .from('verification_feedback')

### verification_thresholds
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\AIVerificationLogs.tsx:112 -> supabase.from('verification_thresholds').select('*'),
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\src\components\admin\AIVerificationLogs.tsx:290 -> .from('verification_thresholds')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:101 -> .from('verification_thresholds')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:729 -> .from('verification_thresholds')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:739 -> await supabase.from('verification_thresholds')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:753 -> .from('verification_thresholds')
- C:\Users\sovan\Documents\VS Code\Discovery Atlas\quest-weaver-main\quest-weaver-main\supabase\functions\ai-verification-agent\index.ts:763 -> await supabase.from('verification_thresholds')

