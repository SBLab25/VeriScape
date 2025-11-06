import { useGamification } from '@/hooks/useGamification';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPowerUpIconEmoji,
  getTimeRemaining,
} from '@/utils/powerupUtils';

export const ActivePowerUpBar = () => {
  const { getActivePowerUps } = useGamification();
  const activePowerUps = getActivePowerUps();

  if (activePowerUps.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-16 left-0 right-0 z-40 pointer-events-none"
      >
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary/90 via-primary/80 to-primary/90 backdrop-blur-lg border border-primary/30 rounded-b-lg shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-2 p-3 overflow-x-auto">
              <Zap className="h-5 w-5 text-primary-foreground flex-shrink-0 animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground flex-shrink-0">
                Active Boosts:
              </span>
              
              <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                {activePowerUps.map(up => up.powerups && (
                  <motion.div
                    key={up.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2 bg-background/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-primary-foreground/20 flex-shrink-0"
                  >
                    <span className="text-lg">{getPowerUpIconEmoji(up.powerups.effect_type)}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-primary-foreground">
                        {up.powerups.name}
                      </span>
                      {up.powerups.multiplier > 1 && (
                        <span className="text-[10px] text-primary-foreground/80">
                          {up.powerups.multiplier}x boost
                        </span>
                      )}
                    </div>
                    {up.expires_at && (
                      <Badge 
                        variant="secondary" 
                        className="bg-background/40 text-primary-foreground border-primary-foreground/20 text-[10px] px-1.5 py-0.5"
                      >
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        {getTimeRemaining(up.expires_at, true)}
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 animate-pulse rounded-b-lg -z-10 blur-xl" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
