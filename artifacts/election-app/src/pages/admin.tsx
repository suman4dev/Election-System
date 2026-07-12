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
  query,
  orderBy
} from 'firebase/firestore';
import { ElectionState, Post, Candidate, Booth } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  BoxSelect
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
      <header className="bg-primary text-primary-foreground p-6 shadow-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-xl font-bold tracking-wide uppercase">M.S. Kawar Election Control</h1>
            <p className="text-xs text-primary-foreground/70 font-mono">AUTHORIZED PERSONNEL ONLY</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">System Status</span>
            <div className={`px-4 py-1.5 rounded-full font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${election?.isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              <div className={`w-2 h-2 rounded-full ${election?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              {election?.isOpen ? 'Online' : 'Offline'}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut(auth)} className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-primary-foreground/20">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Master Control */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${election?.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <Power className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Master Switch</h2>
              <p className="text-slate-500">Enable or disable the entire election system.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-slate-600 uppercase tracking-widest">{election?.isOpen ? 'Enabled' : 'Disabled'}</span>
            <Switch 
              checked={election?.isOpen || false} 
              onCheckedChange={handleToggleElection} 
              className="scale-150 data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Booths & Candidates */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <BoxSelect className="w-6 h-6 text-primary" />
                  Voting Booths
                </CardTitle>
                <CardDescription>Unlock booths for voters.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {booths.map(booth => (
                  <div key={booth.id} className={`p-5 rounded-xl border-2 transition-colors ${booth.unlocked ? 'border-accent bg-accent/5' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-lg text-slate-900 uppercase tracking-widest">{booth.id}</span>
                      {booth.unlocked ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Unlocked</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Locked</Badge>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="default"
                        className="w-full flex-1"
                        disabled={booth.unlocked}
                        onClick={() => updateDoc(doc(db, 'booths', booth.id), { unlocked: true })}
                      >
                        <Unlock className="w-4 h-4 mr-2" /> Unlock
                      </Button>
                      <Button 
                        variant="secondary"
                        className="w-full flex-1"
                        disabled={!booth.unlocked}
                        onClick={() => updateDoc(doc(db, 'booths', booth.id), { unlocked: false })}
                      >
                        <Lock className="w-4 h-4 mr-2" /> Lock
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <CandidateManager posts={posts} />
          </div>

          {/* Right Column: Election Sequence */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Settings className="w-6 h-6 text-primary" />
                    Election Sequence
                  </CardTitle>
                  <CardDescription className="mt-1">Manage the progression of posts to vote on.</CardDescription>
                </div>
                {posts.length === 0 && (
                  <Button onClick={handleInitPosts}>Initialize Default Posts</Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {posts.map(post => {
                    const isActive = post.status === 'active';
                    const isClosed = post.status === 'closed';
                    const anyActive = posts.some(p => p.status === 'active');
                    
                    return (
                      <div key={post.id} className={`p-6 flex items-center justify-between transition-colors ${isActive ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg font-mono">
                            {post.order}
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold ${isActive ? 'text-primary' : 'text-slate-900'}`}>{post.title}</h3>
                            <div className="mt-2">
                              {isActive && <Badge className="bg-emerald-500 hover:bg-emerald-600">IN PROGRESS</Badge>}
                              {isClosed && <Badge variant="secondary" className="bg-slate-200">COMPLETED</Badge>}
                              {post.status === 'pending' && <Badge variant="outline" className="text-slate-400 border-slate-300">WAITING</Badge>}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          {post.status === 'pending' && !anyActive && (
                            <Button 
                              size="lg"
                              className="font-bold tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={async () => {
                                await updateDoc(doc(db, 'posts', post.id), { status: 'active' });
                                await setDoc(doc(db, 'election', 'state'), { activePostId: post.id }, { merge: true });
                              }}
                            >
                              <Play className="w-4 h-4 mr-2" /> Start Voting
                            </Button>
                          )}
                          {isActive && (
                            <Button 
                              variant="destructive"
                              size="lg"
                              className="font-bold tracking-widest uppercase"
                              onClick={async () => {
                                await updateDoc(doc(db, 'posts', post.id), { status: 'closed' });
                                await setDoc(doc(db, 'election', 'state'), { activePostId: null }, { merge: true });
                              }}
                            >
                              <SquareSquare className="w-4 h-4 mr-2" /> End Voting
                            </Button>
                          )}
                          {isClosed && (
                            <Button variant="outline" disabled className="opacity-50">
                              Finished
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}

// Subcomponent for candidate management
function CandidateManager({ posts }: { posts: Post[] }) {
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const { toast } = useToast();

  const [newName, setNewName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');

  // Default select the first post
  useEffect(() => {
    if (posts.length > 0 && !selectedPostId) {
      setSelectedPostId(posts[0].id);
    }
  }, [posts, selectedPostId]);

  useEffect(() => {
    if (!selectedPostId) {
      setCandidates([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'posts', selectedPostId, 'candidates'), (snap) => {
      setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
    });
    return () => unsub();
  }, [selectedPostId]);

  const handleAddCandidate = async () => {
    if (!newName.trim() || !selectedPostId) return;
    try {
      await addDoc(collection(db, 'posts', selectedPostId, 'candidates'), {
        name: newName,
        photoUrl: newPhotoUrl,
        voteCount: 0
      });
      setNewName('');
      setNewPhotoUrl('');
      toast({ title: 'Candidate Added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateCandidate = async (id: string) => {
    if (!selectedPostId) return;
    try {
      await updateDoc(doc(db, 'posts', selectedPostId, 'candidates', id), {
        name: editName,
        photoUrl: editPhotoUrl
      });
      setEditingId(null);
      toast({ title: 'Candidate Updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedPostId || !confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'posts', selectedPostId, 'candidates', id));
      toast({ title: 'Candidate Deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const post = posts.find(p => p.id === selectedPostId);
  const isPostLocked = post?.status !== 'pending';

  return (
    <Card className="border-0 shadow-sm flex flex-col max-h-[800px]">
      <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Users className="w-6 h-6 text-primary" />
          Roster Management
        </CardTitle>
        <CardDescription>Add or edit candidates per post.</CardDescription>
        <div className="mt-4">
          <Select value={selectedPostId} onValueChange={setSelectedPostId}>
            <SelectTrigger className="w-full bg-white h-12">
              <SelectValue placeholder="Select a post" />
            </SelectTrigger>
            <SelectContent>
              {posts.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-y-auto flex-1 bg-slate-50/50">
        {selectedPostId && (
          <div className="p-6 space-y-4">
            {isPostLocked && (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm font-medium flex gap-3">
                <Lock className="w-5 h-5 shrink-0" />
                This post is active or completed. Editing roster is disabled to preserve election integrity.
              </div>
            )}

            {candidates.map(candidate => (
              <div key={candidate.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
                {editingId === candidate.id ? (
                  <div className="space-y-3">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                    <Input value={editPhotoUrl} onChange={e => setEditPhotoUrl(e.target.value)} placeholder="Photo URL" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleUpdateCandidate(candidate.id)}><Save className="w-4 h-4 mr-2" /> Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      {candidate.photoUrl ? (
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${candidate.photoUrl})` }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{candidate.name}</div>
                      <div className="text-sm font-mono text-slate-500">{candidate.voteCount} votes</div>
                    </div>
                    {!isPostLocked && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingId(candidate.id);
                          setEditName(candidate.name);
                          setEditPhotoUrl(candidate.photoUrl || '');
                        }}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(candidate.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {!isPostLocked && candidates.length < 4 && (
              <div className="bg-white p-5 rounded-xl border border-dashed border-slate-300">
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Add Candidate</h4>
                <div className="space-y-3">
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Candidate Name" />
                  <Input value={newPhotoUrl} onChange={e => setNewPhotoUrl(e.target.value)} placeholder="Photo URL (Optional)" />
                  <Button className="w-full" onClick={handleAddCandidate} disabled={!newName.trim()}>
                    <Plus className="w-4 h-4 mr-2" /> Add to Ballot
                  </Button>
                </div>
              </div>
            )}
            
            {!isPostLocked && candidates.length >= 4 && (
              <div className="text-center text-sm text-slate-500 p-4 border border-dashed border-slate-200 rounded-xl">
                Maximum candidates (4) reached for this post.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}