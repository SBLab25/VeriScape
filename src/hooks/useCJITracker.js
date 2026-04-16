import { useEffect } from 'react';

export function useCJITracker() {
    useEffect(() => {
        if (typeof window !== 'undefined' && !window.CJI_CONFIG) {
            window.CJI_CONFIG = {
                api_key: "cji_live_13e14cd5659b4874d45ebf6635754c71",
                journey_name: "onboarding",
                collector_url: "http://localhost:8000/collect/batch"
            };
            
            const script = document.createElement('script');
            script.src = "http://localhost:8000/tracker.js";
            script.defer = true;
            document.head.appendChild(script);
        }
    }, []);
}
