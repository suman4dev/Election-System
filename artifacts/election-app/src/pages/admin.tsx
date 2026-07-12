import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  getDocs,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ElectionState, Post, Candidate, Booth } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Power, 
  Lock, 
  Unlock, 
  Play, 
  SquareSquare, 
  Trash2, 
  Plus, 
  Save, 
  Edit2, 
  Settings,
  Users,
  BoxSelect,
  X,
  CheckCircle2,
  ImageIcon,
  RotateCcw,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App state
  const [election, setElection] = useState<ElectionState | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Listeners when logged in
  useEffect(() => {
    if (!user) return;

    // Election state
    const unsubElection = onSnapshot(doc(db, 'election', 'state'), (docSnap) => {
      if (docSnap.exists()) {
        setElection(docSnap.data() as ElectionState);
      } else {
        setElection({ isOpen: false, activePostId: null });
      }
    });

    // Posts
    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), orderBy('order')), 
      (snapshot) => {
        setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
      }
    );

    // Booths
    const unsubBooths = onSnapshot(collection(db, 'booths'), (snapshot) => {
      setBooths(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booth)));
    });

    // Initialize booths if they don't exist
    const initBooths = async () => {
      for (const id of ['booth-1', 'booth-2', 'booth-3']) {
        await setDoc(doc(db, 'booths', id), { unlocked: false }, { merge: true });
      }
    };
    initBooths();

    return () => {
      unsubElection();
      unsubPosts();
      unsubBooths();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Logged in successfully' });
    } catch (err: any) {
      toast({ title: 'Login Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleElection = async () => {
    if (!election) return;
    try {
      await setDoc(doc(db, 'election', 'state'), { isOpen: !election.isOpen }, { merge: true });
      toast({ title: `Election ${!election.isOpen ? 'Opened' : 'Closed'}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleInitPosts = async () => {
    const defaultPosts = [
      { id: "post-01", title: "Head Boy", order: 1, status: "pending" },
      { id: "post-02", title: "Head Girl", order: 2, status: "pending" },
      { id: "post-03", title: "Vice Head Boy", order: 3, status: "pending" },
      { id: "post-04", title: "Vice Head Girl", order: 4, status: "pending" },
      { id: "post-05", title: "Cultural Head", order: 5, status: "pending" },
      { id: "post-06", title: "Vice Cultural Head", order: 6, status: "pending" },
      { id: "post-07", title: "Sports Captain", order: 7, status: "pending" },
      { id: "post-08", title: "Vice Sports Captain", order: 8, status: "pending" },
      { id: "post-09", title: "Literary Captain", order: 9, status: "pending" },
      { id: "post-10", title: "Vice Literary Captain", order: 10, status: "pending" }
    ];

    try {
      for (const p of defaultPosts) {
        await setDoc(doc(db, 'posts', p.id), p);
      }
      toast({ title: 'Posts Initialized' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Reset a single closed post back to pending, zero out all its candidate votes
  const handleRerun = async (postId: string, postTitle: string) => {
    if (!confirm(`Re-run "${postTitle}"?\n\nThis will reset its status to pending and clear all vote counts for that post. This cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      // Reset post status
      batch.update(doc(db, 'posts', postId), { status: 'pending' });
      // If this post was somehow still the active post, clear it
      if (election?.activePostId === postId) {
        batch.set(doc(db, 'election', 'state'), { activePostId: null }, { merge: true });
      }
      // Zero out all candidate vote counts
      const candidatesSnap = await getDocs(collection(db, 'posts', postId, 'candidates'));
      candidatesSnap.forEach(c => batch.update(c.ref, { voteCount: 0 }));
      await batch.commit();
      toast({ title: `"${postTitle}" reset to pending — votes cleared.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Reset the entire election: all posts back to pending, all votes zeroed, election closed
  const handleResetElection = async () => {
    if (!confirm('Reset the ENTIRE election?\n\nAll posts will return to pending, all vote counts will be cleared, and the election will be closed.\n\nThis cannot be undone.')) return;
    try {
      const batch = writeBatch(db);
      // Close the election
      batch.set(doc(db, 'election', 'state'), { isOpen: false, activePostId: null });
      // Reset every post and its candidates
      for (const post of posts) {
        batch.update(doc(db, 'posts', post.id), { status: 'pending' });
        const candidatesSnap = await getDocs(collection(db, 'posts', post.id, 'candidates'));
        candidatesSnap.forEach(c => batch.update(c.ref, { voteCount: 0 }));
      }
      await batch.commit();
      toast({ title: 'Election fully reset — all posts are pending and votes cleared.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-3 bg-primary text-primary-foreground rounded-t-xl p-8 pb-10">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-accent" />
            </div>
            <CardTitle className="text-center text-3xl font-black tracking-tight">Admin Portal</CardTitle>
            <CardDescription className="text-center text-primary-foreground/80 text-lg">M.S. Kawar Election System</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email</label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="h-14 text-lg px-4 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                  placeholder="admin@school.edu"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="h-14 text-lg px-4 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-bold" data-testid="button-submit-login">Sign In</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-primary text-primary-foreground p-5 shadow-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-xl font-bold tracking-wide uppercase">M.S. Kawar Election Control</h1>
            <p className="text-xs text-primary-foreground/70 font-mono">AUTHORIZED PERSONNEL ONLY</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className={`px-4 py-1.5 rounded-full font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${election?.isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            <div className={`w-2 h-2 rounded-full ${election?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            {election?.isOpen ? 'Online' : 'Offline'}
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut(auth)} className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-primary-foreground/20">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">

        {/* Master Switch — always visible */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-xl ${election?.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <Power className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Master Switch</h2>
              <p className="text-slate-500 text-sm mt-0.5">Enable or disable the entire election system.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-600 uppercase tracking-widest text-sm">{election?.isOpen ? 'Enabled' : 'Disabled'}</span>
            <Switch
              checked={election?.isOpen || false}
              onCheckedChange={handleToggleElection}
              className="scale-125 data-[state=checked]:bg-emerald-500"
              data-testid="toggle-master-switch"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="control" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-12 bg-white border border-slate-200 shadow-sm rounded-xl p-1">
            <TabsTrigger value="control" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BoxSelect className="w-4 h-4 mr-2" /> Booths
            </TabsTrigger>
            <TabsTrigger value="election" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4 mr-2" /> Election
            </TabsTrigger>
            <TabsTrigger value="candidates" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" /> Candidates
            </TabsTrigger>
          </TabsList>

          {/* BOOTHS TAB */}
          <TabsContent value="control" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <BoxSelect className="w-5 h-5 text-primary" /> Voting Booths
                </CardTitle>
                <CardDescription>Control booth lock status. Booths auto-unlock 5 seconds after each vote.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {booths.sort((a, b) => a.id.localeCompare(b.id)).map(booth => (
                    <div key={booth.id} className={`p-5 rounded-xl border-2 transition-all ${booth.unlocked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-lg text-slate-900 uppercase tracking-widest">{booth.id}</span>
                        {booth.unlocked
                          ? <Badge className="bg-emerald-500 text-white border-0">Unlocked</Badge>
                          : <Badge variant="outline" className="text-slate-500 border-slate-300">Locked</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" disabled={booth.unlocked}
                          onClick={() => updateDoc(doc(db, 'booths', booth.id), { unlocked: true })}
                          data-testid={`button-unlock-${booth.id}`}>
                          <Unlock className="w-3.5 h-3.5 mr-1.5" /> Unlock
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" disabled={!booth.unlocked}
                          onClick={() => updateDoc(doc(db, 'booths', booth.id), { unlocked: false })}
                          data-testid={`button-lock-${booth.id}`}>
                          <Lock className="w-3.5 h-3.5 mr-1.5" /> Lock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ELECTION SEQUENCE TAB */}
          <TabsContent value="election" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Settings className="w-5 h-5 text-primary" /> Election Sequence
                  </CardTitle>
                  <CardDescription className="mt-1">Progress through each post one at a time.</CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {posts.length === 0 && (
                    <Button onClick={handleInitPosts} data-testid="button-init-posts">Initialize Default Posts</Button>
                  )}
                  {posts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 font-semibold"
                      onClick={handleResetElection}
                      data-testid="button-reset-election"
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Reset Entire Election
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {posts.map(post => {
                    const isActive = post.status === 'active';
                    const isClosed = post.status === 'closed';
                    const anyActive = posts.some(p => p.status === 'active');
                    return (
                      <div key={post.id} className={`p-5 flex items-center justify-between transition-colors ${isActive ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold font-mono">
                            {post.order}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isActive ? 'text-primary' : 'text-slate-900'}`}>{post.title}</h3>
                            <div className="mt-1">
                              {isActive && <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">IN PROGRESS</Badge>}
                              {isClosed && <Badge variant="secondary" className="bg-slate-200 text-xs">COMPLETED</Badge>}
                              {post.status === 'pending' && <Badge variant="outline" className="text-slate-400 border-slate-300 text-xs">WAITING</Badge>}
                            </div>
                          </div>
                        </div>
                        <div>
                          {post.status === 'pending' && !anyActive && (
                            <Button size="sm" className="font-bold uppercase tracking-wider"
                              onClick={async () => {
                                await updateDoc(doc(db, 'posts', post.id), { status: 'active' });
                                await setDoc(doc(db, 'election', 'state'), { activePostId: post.id }, { merge: true });
                              }}
                              data-testid={`button-start-${post.id}`}>
                              <Play className="w-4 h-4 mr-1.5" /> Start Voting
                            </Button>
                          )}
                          {isActive && (
                            <Button variant="destructive" size="sm" className="font-bold uppercase tracking-wider"
                              onClick={async () => {
                                await updateDoc(doc(db, 'posts', post.id), { status: 'closed' });
                                await setDoc(doc(db, 'election', 'state'), { activePostId: null }, { merge: true });
                              }}
                              data-testid={`button-end-${post.id}`}>
                              <SquareSquare className="w-4 h-4 mr-1.5" /> End Voting
                            </Button>
                          )}
                          {isClosed && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium">Done</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                onClick={() => handleRerun(post.id, post.title)}
                                data-testid={`button-rerun-${post.id}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-run
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {posts.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No posts yet. Click "Initialize Default Posts" to set up the 10 council positions.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CANDIDATES TAB */}
          <TabsContent value="candidates" className="mt-6">
            <CandidateManager posts={posts} />
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}

// ─── Candidate Manager (full tab) ────────────────────────────────────────────
function CandidateManager({ posts }: { posts: Post[] }) {
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const { toast } = useToast();

  const [newName, setNewName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');

  useEffect(() => {
    if (posts.length > 0 && !selectedPostId) {
      setSelectedPostId(posts[0].id);
    }
  }, [posts, selectedPostId]);

  useEffect(() => {
    if (!selectedPostId) { setCandidates([]); return; }
    const unsub = onSnapshot(collection(db, 'posts', selectedPostId, 'candidates'), (snap) => {
      setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
    });
    return () => unsub();
  }, [selectedPostId]);

  const handleAdd = async () => {
    if (!newName.trim() || !selectedPostId) return;
    try {
      await addDoc(collection(db, 'posts', selectedPostId, 'candidates'), { name: newName.trim(), photoUrl: newPhotoUrl.trim(), voteCount: 0 });
      setNewName(''); setNewPhotoUrl('');
      toast({ title: 'Candidate added' });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const handleSave = async (id: string) => {
    if (!selectedPostId) return;
    try {
      await updateDoc(doc(db, 'posts', selectedPostId, 'candidates', id), { name: editName.trim(), photoUrl: editPhotoUrl.trim() });
      setEditingId(null);
      toast({ title: 'Candidate updated' });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!selectedPostId || !confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'posts', selectedPostId, 'candidates', id));
      toast({ title: 'Candidate deleted' });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const selectedPost = posts.find(p => p.id === selectedPostId);

  return (
    <div className="space-y-5">
      {/* Post picker */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Select Post</label>
              <Select value={selectedPostId} onValueChange={v => { setSelectedPostId(v); setEditingId(null); }}>
                <SelectTrigger className="h-11 bg-white" data-testid="select-post">
                  <SelectValue placeholder="Choose a post..." />
                </SelectTrigger>
                <SelectContent>
                  {posts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-xs w-5">{p.order}.</span>
                        {p.title}
                        <Badge variant="outline" className={`ml-1 text-xs ${p.status === 'active' ? 'border-emerald-400 text-emerald-600' : p.status === 'closed' ? 'border-slate-300 text-slate-400' : 'border-slate-200 text-slate-400'}`}>
                          {p.status}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPost && (
              <div className="flex items-center gap-3 pt-5">
                <span className="text-sm text-slate-500">{candidates.length}/4 candidates</span>
                {selectedPost.status === 'active' && (
                  <Badge className="bg-emerald-500 text-white border-0 text-xs">Voting live</Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPostId && (
        <>
          {/* Existing candidates */}
          {candidates.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-base font-bold text-slate-700 uppercase tracking-widest">Current Candidates</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-3">
                {candidates.map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden" data-testid={`candidate-row-${c.id}`}>
                    {editingId === c.id ? (
                      /* ── Edit mode ── */
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                            {editPhotoUrl
                              ? <img src={editPhotoUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-4 h-4" /></div>}
                          </div>
                          <span className="text-xs text-slate-400 italic">Preview updates as you type the URL</span>
                        </div>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Full name"
                          className="bg-white"
                          data-testid={`input-edit-name-${c.id}`}
                        />
                        <Input
                          value={editPhotoUrl}
                          onChange={e => setEditPhotoUrl(e.target.value)}
                          placeholder="Photo URL (https://...)"
                          className="bg-white"
                          data-testid={`input-edit-photo-${c.id}`}
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-${c.id}`}>
                            <X className="w-4 h-4 mr-1.5" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSave(c.id)} disabled={!editName.trim()} data-testid={`button-save-${c.id}`}>
                            <Save className="w-4 h-4 mr-1.5" /> Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Display mode ── */
                      <div className="flex items-center gap-4 p-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                          {c.photoUrl
                            ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center font-bold text-xl text-slate-400">
                                {c.name.charAt(0).toUpperCase()}
                              </div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-lg leading-tight truncate">{c.name}</p>
                          <p className="text-sm text-slate-500 font-mono mt-0.5">{c.voteCount} vote{c.voteCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-600 hover:bg-slate-100"
                            onClick={() => { setEditingId(c.id); setEditName(c.name); setEditPhotoUrl(c.photoUrl || ''); }}
                            data-testid={`button-edit-${c.id}`}
                          >
                            <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                            onClick={() => handleDelete(c.id, c.name)}
                            data-testid={`button-delete-${c.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add new candidate */}
          {candidates.length < 4 ? (
            <Card className="border-0 shadow-sm border-dashed border-2 border-slate-300 bg-slate-50/50">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-base font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add New Candidate
                </CardTitle>
                <CardDescription>
                  {candidates.length === 0 ? 'No candidates added yet for this post.' : `${4 - candidates.length} slot${4 - candidates.length > 1 ? 's' : ''} remaining.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                    {newPhotoUrl
                      ? <img src={newPhotoUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>}
                  </div>
                  <span className="text-xs text-slate-400 italic">Photo preview</span>
                </div>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Candidate full name"
                  className="bg-white"
                  data-testid="input-new-name"
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <Input
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="Photo URL (https://...) — optional"
                  className="bg-white"
                  data-testid="input-new-photo"
                />
                <Button className="w-full" onClick={handleAdd} disabled={!newName.trim()} data-testid="button-add-candidate">
                  <Plus className="w-4 h-4 mr-2" /> Add to Ballot
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-sm text-slate-500 py-6 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              Maximum of 4 candidates reached for this post.
            </div>
          )}
        </>
      )}

      {!selectedPostId && posts.length > 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a post above to manage its candidates.</p>
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Initialize posts first from the Election tab.</p>
        </div>
      )}
    </div>
  );
}