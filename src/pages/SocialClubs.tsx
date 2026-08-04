// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { TopNavbar } from '@/components/navigation/TopNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, LogIn, LogOut, MessageSquare, Crown, Send, Search } from 'lucide-react';
import { useSocialGroups, GroupMember, GroupPost } from '@/hooks/useSocialGroups';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { LottieLoading } from '@/components/ui/LottieLoading';

const SocialClubs = () => {
  const { user } = useAuth();
  const { groups, myGroups, loading, createGroup, joinGroup, leaveGroup, fetchGroupMembers, fetchGroupPosts, createPost, isMember, categories } = useSocialGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newEmoji, setNewEmoji] = useState('🏕️');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupPosts, setGroupPosts] = useState<GroupPost[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [postContent, setPostContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewTab, setViewTab] = useState<'discover' | 'my'>('discover');

  useEffect(() => {
    if (selectedGroup) {
      loadGroupData(selectedGroup);
    }
  }, [selectedGroup]);

  const loadGroupData = async (groupId: string) => {
    const [posts, members] = await Promise.all([
      fetchGroupPosts(groupId),
      fetchGroupMembers(groupId),
    ]);
    setGroupPosts(posts);
    setGroupMembers(members);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newDesc.trim()) return;
    const result = await createGroup(newName, newDesc, newCategory, newEmoji);
    if (result) {
      setShowCreate(false);
      setNewName(''); setNewDesc(''); setNewCategory('General'); setNewEmoji('🏕️');
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() || !selectedGroup) return;
    await createPost(selectedGroup, postContent);
    setPostContent('');
    await loadGroupData(selectedGroup);
  };

  const filteredGroups = (viewTab === 'my' ? myGroups : groups).filter(g => {
    const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'all' || g.category === filterCategory;
    return matchSearch && matchCat;
  });

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <div className="flex justify-center py-20">
          <LottieLoading size="lg" message="Loading clubs..." />
        </div>
      </div>
    );
  }

  // Detail view when group is selected
  if (selectedGroup && selectedGroupData) {
    const memberOfGroup = isMember(selectedGroup);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <TopNavbar />
        <main className="container mx-auto px-6 py-8">
          <Button variant="ghost" onClick={() => setSelectedGroup(null)} className="mb-4">← Back to Clubs</Button>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedGroupData.icon_emoji}</span>
                  <div>
                    <CardTitle className="text-2xl">{selectedGroupData.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedGroupData.category}</Badge>
                      <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{selectedGroupData.member_count}</Badge>
                    </div>
                  </div>
                </div>
                {memberOfGroup ? (
                  <Button variant="outline" size="sm" onClick={() => { leaveGroup(selectedGroup); setSelectedGroup(null); }}>
                    <LogOut className="h-4 w-4 mr-1" /> Leave
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => joinGroup(selectedGroup)}>
                    <LogIn className="h-4 w-4 mr-1" /> Join
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground mt-2">{selectedGroupData.description}</p>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Posts */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Group Feed
              </h3>

              {memberOfGroup && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Share something with the group..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button onClick={handlePost} disabled={!postContent.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {groupPosts.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                  </CardContent>
                </Card>
              ) : (
                groupPosts.map(post => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{(post.profile?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-sm">{post.profile?.username || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{post.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Members */}
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <Users className="h-5 w-5" /> Members ({groupMembers.length})
              </h3>
              <Card>
                <CardContent className="p-3 space-y-2">
                  {groupMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{(member.profile?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{member.profile?.username || 'Unknown'}</span>
                      </div>
                      {member.role === 'owner' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <TopNavbar />
      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent mb-3">
            🏕️ Social Clubs
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join interest-based clubs, share adventures, and connect with fellow explorers!
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setViewTab('discover')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${viewTab === 'discover' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Discover
            </button>
            <button onClick={() => setViewTab('my')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${viewTab === 'my' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              My Clubs ({myGroups.length})
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search clubs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Create Club</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create a New Club</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Input placeholder="Emoji" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-16 text-center text-2xl" maxLength={2} />
                    <Input placeholder="Club name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
                  </div>
                  <Textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreate} className="w-full" disabled={!newName.trim() || !newDesc.trim()}>
                    Create Club
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{viewTab === 'my' ? 'No Clubs Joined' : 'No Clubs Found'}</h3>
              <p className="text-muted-foreground">{viewTab === 'my' ? 'Join some clubs to see them here!' : 'Try a different search or create one!'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group, idx) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{group.icon_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{group.category}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />{group.member_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                    <div className="mt-3">
                      {isMember(group.id) ? (
                        <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 text-xs">Member</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); joinGroup(group.id); }}>
                          Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SocialClubs;
