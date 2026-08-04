// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, Trophy, MapPin, Edit3, Save, X, Calendar, Target, Grid3X3, History, Sparkles, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { StreakDisplay } from '@/components/streak/StreakDisplay';
import ThemeToggleButton from '@/components/ui/theme-toggle-button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ProfileDropdown } from '@/components/navigation/ProfileDropdown';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { UserPostsGrid } from '@/components/profile/UserPostsGrid';
import { QuestHistory } from '@/components/profile/QuestHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowersModal } from '@/components/social/FollowersModal';
import { useFollow } from '@/hooks/useFollow';
import { LocationPicker } from '@/components/location/LocationPicker';

interface ProfileData {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  website: string;
  location: string;
  bio: string;
  totalSubmissions: number;
  completedQuests: number;
  rejectedQuests: number;
  created_at: string;
}

export default function Profile() {
  const { user, session, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const { isFollowing, followUser, unfollowUser } = useFollow(profile?.id);

  useEffect(() => {
    if (!user?.id || authLoading) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, location, created_at')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        const [totalResult, completedResult, rejectedResult] = await Promise.all([
          supabase.from('Submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('Submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['approved', 'verified']),
          supabase.from('Submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'rejected'),
        ]);

        const totalSubmissions = totalResult.count || 0;
        const completedQuests = completedResult.count || 0;
        const rejectedQuests = rejectedResult.count || 0;

        const fullProfile: ProfileData = {
          ...profileData,
          totalSubmissions,
          completedQuests,
          rejectedQuests,
        };

        setProfile(fullProfile);
        setUsername(fullProfile?.username || '');
        setFullName(fullProfile?.full_name || '');
        setWebsite((fullProfile as any)?.website || '');
        setLocation(fullProfile?.location || '');
        setBio((fullProfile as any)?.bio || '');
      } catch (error: any) {
        console.error('Error fetching or processing profile data:', error.message);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, authLoading, toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates: any = {
        id: user.id,
        username,
        full_name: fullName,
        location,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates, {
        onConflict: 'id',
      });

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      setProfile({ ...profile, ...updates });
      setEditing(false);
      toast({ title: 'Profile Updated', description: 'Your profile has been updated successfully.' });
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setUsername(profile?.username || '');
    setFullName(profile?.full_name || '');
    setWebsite((profile as any)?.website || '');
    setLocation(profile?.location || '');
    setBio((profile as any)?.bio || '');
    setEditing(false);
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-screen">Profile not found.</div>;
  }

  return (
    <div className="container mx-auto mt-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="bg-white dark:bg-neutral-950 shadow-md rounded-md overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 p-6 pb-0">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback>{profile.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{profile.full_name}</CardTitle>
              <CardDescription className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggleButton />
            <NotificationCenter />
            <ProfileDropdown />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Profile Details */}
            <div className="md:col-span-1">
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-md font-semibold flex items-center gap-1"><User className="h-4 w-4 mr-1" /> About</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <>
                      <div className="mb-4">
                        <ProfileImageUpload profile={profile} setProfile={setProfile} />
                      </div>
                      <div className="mb-2">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <Input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <Input
                          type="text"
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
                        <Input
                          type="url"
                          id="website"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="mb-2">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                        <LocationPicker location={location} setLocation={setLocation} />
                      </div>
                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="ghost" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">Full Name:</span> {profile.full_name || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">Website:</span>{' '}
                        {profile.website ? (
                          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {profile.website}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <MapPin className="h-4 w-4 mr-1" /> {profile.location || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">Bio:</span> {profile.bio || 'N/A'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Calendar className="h-4 w-4 mr-1" /> Joined {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                      <Button onClick={() => setEditing(true)} className="mt-4 w-full">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-semibold flex items-center gap-1"><Sparkles className="h-4 w-4 mr-1" /> Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Target className="h-4 w-4 mr-1" /> Total Submissions: {profile.totalSubmissions}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Trophy className="h-4 w-4 mr-1" /> Completed Quests: {profile.completedQuests}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <X className="h-4 w-4 mr-1" /> Rejected Quests: {profile.rejectedQuests}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - User Activity */}
            <div className="md:col-span-2">
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="bg-muted p-1 rounded-md">
                  <TabsTrigger value="posts" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Posts
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                    <History className="h-4 w-4 mr-2" />
                    Quest History
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-4">
                  <UserPostsGrid userId={user.id} />
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                  <QuestHistory userId={user.id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
