// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { TopNavbar } from '@/components/navigation/TopNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, Navigation, Crosshair, X, Sparkles, Trophy, Eye } from 'lucide-react';
import { useARQuest } from '@/hooks/useARQuest';
import { motion, AnimatePresence } from 'framer-motion';
import { LottieLoading } from '@/components/ui/LottieLoading';

const markerTypeStyles: Record<string, { bg: string; label: string }> = {
  collectible: { bg: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300', label: 'Collectible' },
  puzzle: { bg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300', label: 'Puzzle' },
  challenge: { bg: 'bg-red-500/20 text-red-700 dark:text-red-300', label: 'Challenge' },
};

const ARExplorer = () => {
  const { markers, collections, loading, userLocation, cameraActive, getUserLocation, getNearbyMarkers, isCollected, collectMarker, startCamera, stopCamera, getDistance } = useARQuest();
  const [showCamera, setShowCamera] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedEmoji, setCapturedEmoji] = useState<string | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const handleStartCamera = async () => {
    const s = await startCamera();
    if (s) {
      setStream(s);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 100);
    }
  };

  const handleStopCamera = () => {
    stopCamera();
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setShowCamera(false);
    setCapturedEmoji(null);
  };

  const handleCollect = async (markerId: string) => {
    const marker = markers.find(m => m.id === markerId);
    if (marker) {
      setCapturedEmoji(marker.ar_overlay_emoji);
      setTimeout(() => setCapturedEmoji(null), 2000);
    }
    await collectMarker(markerId);
    setSelectedMarker(null);
  };

  const nearbyMarkers = getNearbyMarkers();
  const collectedCount = collections.length;
  const totalMarkers = markers.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <div className="flex justify-center py-20">
          <LottieLoading size="lg" message="Scanning for AR elements..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <TopNavbar />
      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent mb-3">
            📸 AR Explorer
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {userLocation
              ? 'AR markers have been generated around your location — explore and collect them!'
              : 'Enable your location to discover AR markers nearby!'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{collectedCount}/{totalMarkers}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Navigation className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{nearbyMarkers.length}</p>
              <p className="text-xs text-muted-foreground">Nearby</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{userLocation ? '📍' : '❌'}</p>
              <p className="text-xs text-muted-foreground">{userLocation ? 'Located' : 'No Location'}</p>
            </CardContent>
          </Card>
        </div>

        {/* AR Camera View */}
        {showCamera && (
          <Card className="mb-6 overflow-hidden relative">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              
              {/* AR Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {nearbyMarkers.filter(m => !isCollected(m.id)).map((marker, idx) => (
                  <motion.div
                    key={marker.id}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                      left: `${20 + (idx * 25) % 60}%`,
                      top: `${15 + (idx * 20) % 50}%`,
                    }}
                    animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: idx * 0.3 }}
                    onClick={() => setSelectedMarker(marker.id)}
                  >
                    <div className="text-5xl filter drop-shadow-lg">{marker.ar_overlay_emoji}</div>
                    <p className="text-xs text-white text-center mt-1 bg-black/50 rounded px-1">{marker.title}</p>
                  </motion.div>
                ))}
              </div>

              {/* Capture animation */}
              <AnimatePresence>
                {capturedEmoji && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.span
                      className="text-8xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.5, 1], rotate: [0, 360] }}
                      transition={{ duration: 0.5 }}
                    >
                      {capturedEmoji}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close button */}
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-3 right-3"
                onClick={handleStopCamera}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Selected marker action */}
              {selectedMarker && (
                <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-4 backdrop-blur">
                  {(() => {
                    const m = markers.find(mk => mk.id === selectedMarker);
                    if (!m) return null;
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl mr-2">{m.ar_overlay_emoji}</span>
                          <span className="font-semibold">{m.title}</span>
                          <Badge className="ml-2" variant="secondary">+{m.xp_reward} XP</Badge>
                        </div>
                        <Button onClick={() => handleCollect(m.id)} disabled={isCollected(m.id)}>
                          {isCollected(m.id) ? 'Collected' : 'Collect!'}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          {!showCamera ? (
            <Button onClick={handleStartCamera} size="lg" className="gap-2">
              <Camera className="h-5 w-5" /> Open AR Camera
            </Button>
          ) : null}
          <Button variant="outline" onClick={getUserLocation} size="lg" className="gap-2">
            <Crosshair className="h-5 w-5" /> Update Location
          </Button>
        </div>

        {/* Nearby Markers */}
        {nearbyMarkers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Nearby Markers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyMarkers.map(marker => {
                const collected = isCollected(marker.id);
                const dist = userLocation ? Math.round(getDistance(userLocation.lat, userLocation.lng, marker.latitude, marker.longitude)) : null;
                const style = markerTypeStyles[marker.marker_type] || markerTypeStyles.collectible;
                return (
                  <Card key={marker.id} className={`${collected ? 'opacity-60 border-green-500/30' : ''}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <span className="text-4xl">{marker.ar_overlay_emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{marker.title}</h3>
                        <p className="text-sm text-muted-foreground">{marker.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-xs ${style.bg}`}>{style.label}</Badge>
                          {dist !== null && <span className="text-xs text-muted-foreground">{dist}m away</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">+{marker.xp_reward} XP</p>
                        {!collected ? (
                          <Button size="sm" variant="outline" className="mt-1" onClick={() => collectMarker(marker.id)}>
                            Collect
                          </Button>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 mt-1">✓</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Markers */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5" /> All AR Markers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markers.map(marker => {
            const collected = isCollected(marker.id);
            const style = markerTypeStyles[marker.marker_type] || markerTypeStyles.collectible;
            const dist = userLocation ? Math.round(getDistance(userLocation.lat, userLocation.lng, marker.latitude, marker.longitude)) : null;
            return (
              <motion.div key={marker.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={`${collected ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{marker.ar_overlay_emoji}</span>
                      <div>
                        <h3 className="font-semibold">{marker.title}</h3>
                        <Badge variant="outline" className={`text-xs ${style.bg}`}>{style.label}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{marker.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{dist !== null ? `${dist}m away` : 'Enable location'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">+{marker.xp_reward} XP</span>
                        {collected && <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-xs">Collected</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ARExplorer;
