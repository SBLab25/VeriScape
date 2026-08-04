// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopNavbar } from "@/components/navigation/TopNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, MessageCircle, Send, Share2, Filter, Plus, Tag, Image, MapPin, Clock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { PostImageCarousel } from "@/components/ui/post-image-carousel";
import { SimpleTeamDialog } from "@/components/teams/SimpleTeamDialog";
import CrewSidebar from "@/components/community/CrewSidebar";
import { TeamChatPanel } from "@/components/community/TeamChatPanel";

// Unified interface for all posts (community posts + quest submissions)
interface UnifiedPost {
  id: string;
  user_id: string;
  type: 'community' | 'quest';
  title?: string;
  content: string;
  description?: string;
  post_type?: "general" | "help" | "achievement" | "discussion";
  tags?: string[];
  image_urls: string[];
  created_at: string;
  geo_location?: string;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  user_has_liked: boolean;
  user_has_shared?: boolean;
  user_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const Community = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<UnifiedPost["post_type"]>("general");
  const [tagsInput, setTagsInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Filters
  const [tagFilter, setTagFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "community" | "quest">("all");
  const [postTypeFilter, setPostTypeFilter] = useState<UnifiedPost["post_type"] | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  

  // SEO
  useEffect(() => {
    document.title = "Adventure Crew | Quest Community";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Community chat to showcase achievements, ask for help, comment, and tag posts.");
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Community chat to showcase achievements, ask for help, comment, and tag posts.";
      document.head.appendChild(m);
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = window.location.href;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const refetch = () => fetchPosts();
    window.addEventListener('submissions-changed', refetch);
    window.addEventListener('community-posts-changed', refetch);
    // Refresh posts when likes/comments change
    const refreshInterval = setInterval(() => {
      fetchPosts();
    }, 30000); // Refresh every 30 seconds to sync data
    return () => {
      window.removeEventListener('submissions-changed', refetch);
      window.removeEventListener('community-posts-changed', refetch);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      // Helper to ensure we always have public URLs for storage objects
      const toPublicUrls = (bucket: string, urls: string[]) => {
        return (urls || []).map((u) => {
          if (!u) return u;
          if (u.startsWith("http")) return u;
          const { data } = supabase.storage.from(bucket).getPublicUrl(u);
          return data.publicUrl || u;
        });
      };
      
      // Fetch both community posts and quest submissions
      const [communityRes, questRes] = await Promise.all([
        // Community posts
        (supabase as any)
          .from("community_posts")
          .select("id, user_id, title, content, post_type, tags, image_urls, created_at")
          .order("created_at", { ascending: false }),
        
        // Quest submissions (approved or verified) - exclude quest_id from display
        supabase
          .from("Submissions")
          .select("id, description, photo_url, image_urls, user_id, geo_location, submitted_at, quest_id")
          .in("status", ["approved", "verified"])
          .order("submitted_at", { ascending: false })
      ]);

      if (communityRes.error || questRes.error) {
        throw communityRes.error || questRes.error;
      }

      const communityPosts = communityRes.data || [];
      const questSubmissions = questRes.data || [];

      // Get all unique user IDs
      const allUserIds = [
        ...communityPosts.map((p: any) => p.user_id),
        ...questSubmissions.map((s: any) => s.user_id)
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      // Fetch user profiles from both Users and profiles tables
      const { data: usersProfiles } = await supabase
        .from("Users")
        .select("id, username, bio, avatar_url")
        .in("id", uniqueUserIds);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", uniqueUserIds);

      // Merge profiles, prioritizing profiles table over Users table
      const profilesMap = new Map();
      (usersProfiles || []).forEach(p => profilesMap.set(p.id, p));
      (profiles || []).forEach(p => profilesMap.set(p.id, p)); // Override with profiles data if exists
      const allProfiles = Array.from(profilesMap.values());

      // Process community posts
      const processedCommunityPosts = await Promise.all(
        communityPosts.map(async (p: any) => {
          const [likesRes, commentsRes] = await Promise.all([
            (supabase as any).from("community_post_likes").select("user_id").eq("post_id", p.id),
            (supabase as any).from("community_post_comments").select("id").eq("post_id", p.id),
          ]);
          
          const likes = likesRes.data || [];
          const comments = commentsRes.data || [];
          const profile = allProfiles.find((pr) => pr.id === p.user_id);
          
          return {
            id: p.id,
            user_id: p.user_id,
            type: 'community',
            title: p.title,
            content: p.content,
            post_type: p.post_type,
            tags: p.tags || [],
            image_urls: toPublicUrls('community-images', p.image_urls || []),
            created_at: p.created_at,
            likes_count: likes.length,
            comments_count: comments.length,
            user_has_liked: user ? likes.some((l: any) => l.user_id === user.id) : false,
            user_profile: profile ? {
              username: profile.username || null,
              full_name: ('full_name' in profile) ? (profile as any).full_name : (('bio' in profile) ? (profile as any).bio : null),
              avatar_url: profile.avatar_url || null
            } : null,
          } as UnifiedPost;
        })
      );

      // Import cleanDescription utility
      const { cleanDescription } = await import('@/utils/cleanDescription');
      
      // Process quest submissions
      const processedQuestPosts = await Promise.all(
        questSubmissions.map(async (s: any) => {
          const [likesRes, commentsRes, sharesRes] = await Promise.all([
            supabase.from("post_likes").select("user_id").eq("submission_id", s.id),
            supabase.from("post_comments").select("id").eq("submission_id", s.id),
            supabase.from("post_shares").select("user_id").eq("submission_id", s.id)
          ]);

          // Ensure we have valid data arrays
          const likes = (likesRes.data || []);
          const comments = (commentsRes.data || []);
          const shares = (sharesRes.data || []);
          const profile = allProfiles.find((pr) => pr.id === s.user_id);

          // Process image URLs - ensure consistency between quest submissions and community posts
          let processedImageUrls: string[] = [];
          if (s.image_urls && s.image_urls.length > 0) {
            processedImageUrls = toPublicUrls('quest-submissions', s.image_urls);
          } else if (s.photo_url) {
            // photo_url is already a full URL, but ensure it's in array format for consistency
            processedImageUrls = [s.photo_url];
          }

          // Clean description to remove AI quest ID metadata if present
          const cleanDescriptionText = cleanDescription(s.description);
          
          return {
            id: s.id,
            user_id: s.user_id,
            type: 'quest',
            content: cleanDescriptionText,
            description: cleanDescriptionText,
            image_urls: processedImageUrls,
            created_at: s.submitted_at,
            geo_location: s.geo_location,
            likes_count: likes.length,
            comments_count: comments.length,
            shares_count: shares.length,
            user_has_liked: user ? likes.some((l: any) => l.user_id === user.id) : false,
            user_has_shared: user ? shares.some((sh: any) => sh.user_id === user.id) : false,
            user_profile: profile ? {
              username: profile.username || null,
              full_name: ('full_name' in profile) ? (profile as any).full_name : (('bio' in profile) ? (profile as any).bio : null),
              avatar_url: profile.avatar_url || null
            } : null,
          } as UnifiedPost;
        })
      );

      // Combine and sort by creation date
      const allPosts = [...processedCommunityPosts, ...processedQuestPosts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPosts(allPosts);
    } catch (err) {
      console.error("Error loading posts", err);
      toast({ title: "Error", description: "Failed to load posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const [globalSearch, setGlobalSearch] = useState("");

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const text = `${p.title || ""} ${p.content || p.description || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
      const searchOk = globalSearch ? text.includes(globalSearch.toLowerCase()) : true;
      const tagOk = tagFilter ? (p.tags || []).some((t) => t.toLowerCase() === tagFilter.toLowerCase()) : true;
      const contentTypeOk = typeFilter === "all" ? true : p.type === typeFilter;
      const postTypeOk = postTypeFilter === "all" ? true : p.post_type === postTypeFilter;
      return searchOk && tagOk && contentTypeOk && postTypeOk;
    });
  }, [posts, globalSearch, tagFilter, typeFilter, postTypeFilter]);

  const handleCreatePost = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to post", variant: "destructive" });
      return;
    }
    if (!title.trim() || !content.trim()) return;

    try {
      setCreating(true);
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const { data, error } = await (supabase as any)
        .from("community_posts")
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          post_type: postType,
          tags,
          image_urls: imageUrls,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic add
      setTitle("");
      setContent("");
      setTagsInput("");
      setPostType("general");
      setImageUrls([]);

      toast({ title: "Posted", description: "Your community post is live!" });
      await fetchPosts();
    } catch (err) {
      console.error("Error creating post", err);
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to like posts", variant: "destructive" });
      return;
    }
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.type === 'community') {
        if (post.user_has_liked) {
          await (supabase as any)
            .from("community_post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);
        } else {
          await (supabase as any)
            .from("community_post_likes")
            .insert({ post_id: postId, user_id: user.id });
        }
      } else {
        if (post.user_has_liked) {
          await supabase
            .from("post_likes")
            .delete()
            .eq("submission_id", postId)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("post_likes")
            .insert({ submission_id: postId, user_id: user.id });
        }
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_liked: !p.user_has_liked,
                likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Error toggling like", err);
    }
  };

  const toggleShare = async (postId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to share posts", variant: "destructive" });
      return;
    }
    const post = posts.find((p) => p.id === postId);
    if (!post || post.type !== 'quest') return;

    try {
      if (post.user_has_shared) {
        await supabase
          .from("post_shares")
          .delete()
          .eq("submission_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_shares")
          .insert({ submission_id: postId, user_id: user.id });
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_shared: !p.user_has_shared,
                shares_count: (p.shares_count || 0) + (p.user_has_shared ? -1 : 1),
              }
            : p
        )
      );

      toast({
        title: post.user_has_shared ? "Unshared" : "Shared",
        description: post.user_has_shared ? "Post removed from your shares" : "Post shared successfully",
      });
    } catch (err) {
      console.error("Error toggling share", err);
    }
  };


  const refreshPostCommentCount = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      let commentsRes;
      if (post.type === 'community') {
        commentsRes = await (supabase as any)
          .from("community_post_comments")
          .select("id")
          .eq("post_id", postId);
      } else {
        commentsRes = await supabase
          .from("post_comments")
          .select("id")
          .eq("submission_id", postId);
      }

      if (commentsRes.error) throw commentsRes.error;
      const commentsCount = (commentsRes.data || []).length;

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments_count: commentsCount } : p
      ));
    } catch (err) {
      console.error("Error refreshing comment count:", err);
    }
  };

  const handleUserProfileClick = (userId: string) => {
    if (userId && user && userId !== user.id) {
      navigate(`/profile/${userId}`);
    } else if (userId === user?.id) {
      navigate('/profile');
    }
  };

  const renderDescription = (post: UnifiedPost, maxLength: number = 150) => {
    const description = post.content || post.description || "";
    const isExpanded = expandedDescriptions[post.id];
    
    if (description.length <= maxLength || isExpanded) {
      return description;
    }
    
    return (
      <>
        {description.slice(0, maxLength)}...
        <button
          className="text-muted-foreground ml-1 hover:text-foreground"
          onClick={() => setExpandedDescriptions(prev => ({
            ...prev,
            [post.id]: true
          }))}
        >
          more
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <TopNavbar />
      <CrewSidebar onSearchChange={(t) => setGlobalSearch(t)} />
      
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent mb-2">Adventure Crew</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Share achievements, get help, and connect with fellow adventurers</p>
          </div>

          {/* Action Bar - Removed, filter button moved to bottom right */}

          {/* Filters Panel */}
          {showFilters && (
            <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-lg">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input 
                    placeholder="Filter by tag..." 
                    value={tagFilter} 
                    onChange={(e) => setTagFilter(e.target.value)} 
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                  >
                    <option value="all">All Content</option>
                    <option value="community">Community Posts</option>
                    <option value="quest">Quest Submissions</option>
                  </select>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={postTypeFilter}
                    onChange={(e) => setPostTypeFilter(e.target.value as any)}
                  >
                    <option value="all">All Types</option>
                    <option value="general">General</option>
                    <option value="help">Help</option>
                    <option value="achievement">Achievement</option>
                    <option value="discussion">Discussion</option>
                  </select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={() => { 
                    setTagFilter(""); 
                    setTypeFilter("all"); 
                    setPostTypeFilter("all"); 
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pinterest-style Masonry Feed */}
          <div>
            {loading ? (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="break-inside-avoid animate-pulse rounded-xl bg-card/50 overflow-hidden">
                    <div className={`bg-muted/50 ${i % 3 === 0 ? 'h-72' : i % 2 === 0 ? 'h-56' : 'h-64'}`}></div>
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted/50 rounded w-3/4"></div>
                      <div className="h-3 bg-muted/50 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No posts yet. Be the first to share!</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create First Post
                </Button>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="break-inside-avoid"
                  >
                    <div className="group rounded-xl overflow-hidden bg-card shadow-md hover:shadow-xl transition-all duration-300 border border-border/30 cursor-pointer">
                      {/* Image */}
                      {post.image_urls && post.image_urls.length > 0 ? (
                        <div className="relative overflow-hidden" onClick={() => navigate(`/post/${post.id}`)}>
                          <PostImageCarousel 
                            images={post.image_urls}
                            alt={post.title || "Post image"}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                            showCounter={post.image_urls.length > 1}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                      ) : (
                        <div 
                          className="bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 p-6 min-h-[120px] flex items-center justify-center"
                          onClick={() => navigate(`/post/${post.id}`)}
                        >
                          <p className="text-sm font-medium text-center line-clamp-4 text-foreground/80">
                            {post.content || post.description || ""}
                          </p>
                        </div>
                      )}

                      {/* Content below image */}
                      <div className="p-3 space-y-2">
                        {/* User info */}
                        <div className="flex items-center gap-2">
                          <Avatar 
                            className="h-7 w-7 cursor-pointer" 
                            onClick={() => handleUserProfileClick(post.user_id)}
                          >
                            <AvatarImage src={post.user_profile?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {post.user_profile?.username?.[0]?.toUpperCase() || 
                               post.user_profile?.full_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <p 
                            className="text-sm font-semibold truncate cursor-pointer hover:underline flex-1" 
                            onClick={() => handleUserProfileClick(post.user_id)}
                          >
                            {post.user_profile?.username || post.user_profile?.full_name || "Anonymous"}
                          </p>
                        </div>

                        {/* Caption */}
                        {post.image_urls && post.image_urls.length > 0 && (post.content || post.description) && (
                          <p className="text-sm text-foreground/80 line-clamp-2">
                            {post.content || post.description}
                          </p>
                        )}

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-secondary/80" 
                                onClick={() => setTagFilter(tag)}
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Actions row */}
                        <div className="flex items-center gap-3 pt-1 text-muted-foreground">
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                          >
                            <Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
                            <span className="text-xs font-medium">{post.likes_count || 0}</span>
                          </button>
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">{post.comments_count || 0}</span>
                          </button>
                          <button
                            className="ml-auto hover:text-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                navigator.share({ 
                                  title: post.title || 'Check out this post',
                                  text: post.content || post.description,
                                  url: window.location.href 
                                });
                              }
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Create Post Button - Fixed position right side, above chat button with 15px gap */}
        <div className="fixed bottom-[158px] right-6 z-50">
          <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative"
          >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 p-0"
                  >
                    <Plus className="h-7 w-7" />
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Share with Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input 
                  placeholder="Post title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as any)}
                  >
                    <option value="general">General</option>
                    <option value="help">Help</option>
                    <option value="achievement">Achievement</option>
                    <option value="discussion">Discussion</option>
                  </select>
                  <Input 
                    placeholder="Tags (comma separated)" 
                    value={tagsInput} 
                    onChange={(e) => setTagsInput(e.target.value)} 
                  />
                </div>
                <Textarea 
                  placeholder="Write your post..." 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  className="min-h-[100px]" 
                />
                
                {/* Multi-Image Upload */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Add Images (Optional, up to 3)
                  </label>
                  <MultiImageUpload
                    onImagesUpdate={setImageUrls}
                    existingImages={imageUrls}
                    maxImages={3}
                    bucket="community-images"
                    path="community-posts"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      handleCreatePost();
                      setShowCreateDialog(false);
                    }} 
                    disabled={!title.trim() || !content.trim() || creating}
                  >
                    {creating ? "Posting..." : "Share"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </motion.div>
        </div>

        {/* Team-Up Button and Filter Button - Fixed position bottom right */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <Button 
            variant="outline" 
            size="lg"
            className="rounded-full h-12 w-12 border-border/50 hover:bg-accent/20 shadow-lg"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
          </Button>
          <SimpleTeamDialog />
        </div>

        {/* Team Chat Panel - Fixed position bottom left */}
        <TeamChatPanel />
      </main>

    </div>
  );
};

export default Community;