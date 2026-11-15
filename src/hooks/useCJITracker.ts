// hooks/useCJITracker.ts
import { useEffect } from 'react';

export function useCJITracker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.CJI_CONFIG) {
      window.CJI_CONFIG = {
        api_key: 'cji_live_80c9318b55fe0c33c99a580259a2149f',
        journey_name: 'user_onboarding',
        collector_url: 'https://atelier-backend-jv2m.onrender.com/collect/batch',
        step_map: {
          landing: '/$',
          checkout: '/checkout',
          success: '/success',
        },
      };

      step_map: {
        landing: "^/$",
        auth: "/auth",
        home: "/home",
        quest_catalog: "/all-quests",
        quest_view: "/quest/.*",
        quest_submit: "/submit/.*",
        badges: "/badges",
        leaderboard: "/leaderboard",
        community: "/community",
        admin: "/admin",
      }

      const script = document.createElement('script');
      script.src = 'https://atelier-backend-jv2m.onrender.com/tracker.js';
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);
}
