import { useEffect } from 'react';

export function useCJITracker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.CJI_CONFIG) {
      window.CJI_CONFIG = {
        api_key: 'cji_live_75a6f30d2abec8695229086515e7a1b8',
        journey_name: 'quest_journey',
        collector_url: 'https://atelier-backend-jv2m.onrender.com/collect/batch',
        step_map: {
          landing: '^/$',
          auth: '/auth',
          home: '/home',
          quest_catalog: '/all-quests',
          quest_view: '/quest/.*',
          quest_submit: '/submit/.*',
          badges: '/badges',
          leaderboard: '/leaderboard',
          community: '/community',
          admin: '/admin',
        },
      };

      const script = document.createElement('script');
      script.src = 'https://atelier-backend-jv2m.onrender.com/tracker.js';
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);
}
