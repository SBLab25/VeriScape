import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ActivePowerUpBar } from "@/components/gamification/ActivePowerUpBar";
import { PageLoader } from "@/components/ui/PageLoader";
import { LottieLoading } from "@/components/ui/LottieLoading";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import AllQuests from "./pages/AllQuests";
import QuestDetail from "./pages/QuestDetail";
import SubmitQuest from "./pages/SubmitQuest";
import BadgeGallery from "./pages/BadgeGallery";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Leaderboard from "./pages/Leaderboard";
import QuestMapPage from "./pages/QuestMap";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";
import PostDetail from "./pages/PostDetail";
import MobileTest from "./pages/MobileTest";
import Admin from "./pages/Admin";
import SeasonalEvents from "./pages/SeasonalEvents";
import QuestChains from "./pages/QuestChains";
import SocialClubs from "./pages/SocialClubs";
import ARExplorer from "./pages/ARExplorer";
import { useCJITracker } from './hooks/useCJITracker';


const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LottieLoading size="lg" message="Loading..." />
      </div>
    );
  }
  
  // If no user, redirect to auth with replace to prevent back navigation
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LottieLoading size="lg" message="Loading..." />
      </div>
    );
  }
  
  // If user is logged in, redirect to home with replace
  if (user) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
};

// Error Boundary to catch render crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">An unexpected error occurred.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = "/home";
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global handler for uncaught promise rejections
const GlobalErrorHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return <>{children}</>;
};

const App = () => {
  useCJITracker();
return(
  <ErrorBoundary>
    <GlobalErrorHandler>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageLoader delay={200} minDisplayTime={600} />
            <ActivePowerUpBar />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/all-quests" element={<ProtectedRoute><AllQuests /></ProtectedRoute>} />
              <Route path="/quest/:id" element={<ProtectedRoute><QuestDetail /></ProtectedRoute>} />
              <Route path="/submit/:id" element={<ProtectedRoute><SubmitQuest /></ProtectedRoute>} />
              <Route path="/badges" element={<ProtectedRoute><BadgeGallery /></ProtectedRoute>} />
              <Route path="/treasure" element={<ProtectedRoute><BadgeGallery /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
              <Route path="/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
              <Route path="/quest-map" element={<ProtectedRoute><QuestMapPage /></ProtectedRoute>} />
              <Route path="/seasonal-events" element={<ProtectedRoute><SeasonalEvents /></ProtectedRoute>} />
              <Route path="/quest-chains" element={<ProtectedRoute><QuestChains /></ProtectedRoute>} />
              <Route path="/social-clubs" element={<ProtectedRoute><SocialClubs /></ProtectedRoute>} />
              <Route path="/ar-explorer" element={<ProtectedRoute><ARExplorer /></ProtectedRoute>} />
              <Route path="/mobile-test" element={<MobileTest />} />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorHandler>
  </ErrorBoundary>
);
};

export default App;
