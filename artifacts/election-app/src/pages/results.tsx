import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { ElectionState, Post, Candidate } from '@/lib/types';
import { Shield, Users, BarChart3, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ResultsPage() {
  const [election, setElection] = useState<ElectionState | null>(null);
  const [activeCandidates, setActiveCandidates] = useState<Candidate[]>([]);
  const [closedPosts, setClosedPosts] = useState<Post[]>([]);
  const [selectedClosedPostId, setSelectedClosedPostId] = useState<string | null>(null);
  const [closedCandidates, setClosedCandidates] = useState<Candidate[]>([]);

  // Listen to election state
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'election', 'state'), (docSnap) => {
      if (docSnap.exists()) {
        setElection(docSnap.data() as ElectionState);
      } else {
        setElection({ isOpen: false, activePostId: null });
      }
    });
    return () => unsub();
  }, []);

  // Listen to active candidates if there is an active post
  useEffect(() => {
    if (!election?.activePostId) {
      setActiveCandidates([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'posts', election.activePostId, 'candidates'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
        // Sort descending by vote count
        data.sort((a, b) => b.voteCount - a.voteCount);
        setActiveCandidates(data);
      }
    );
    return () => unsub();
  }, [election?.activePostId]);

  // Listen to all posts, filter closed ones client-side (avoids composite index requirement)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Post))
        .filter(p => p.status === 'closed')
        .sort((a, b) => a.order - b.order);
      setClosedPosts(data);

      // Select first closed post by default if nothing selected and no active post
      if (data.length > 0 && !selectedClosedPostId && !election?.activePostId) {
        setSelectedClosedPostId(data[0].id);
      }
    });
    return () => unsub();
  }, [selectedClosedPostId, election?.activePostId]);

  // Listen to selected closed post candidates
  useEffect(() => {
    if (!selectedClosedPostId) {
      setClosedCandidates([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'posts', selectedClosedPostId, 'candidates'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
        data.sort((a, b) => b.voteCount - a.voteCount);
        setClosedCandidates(data);
      }
    );
    return () => unsub();
  }, [selectedClosedPostId]);


  const renderResults = (candidates: Candidate[], title: string, subtitle?: string, isActive: boolean = false) => {
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

    return (
      <div className="w-full max-w-5xl mx-auto mt-8 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className={`p-8 md:p-10 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-slate-50 border-b border-slate-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {isActive ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-bold tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Live
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-sm font-bold tracking-widest uppercase">
                    Final
                  </div>
                )}
              </div>
              <h2 className={`text-4xl font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
              {subtitle && <p className={`mt-2 text-lg ${isActive ? 'text-primary-foreground/80' : 'text-slate-500'}`}>{subtitle}</p>}
            </div>
            <div className={`text-right ${isActive ? 'bg-black/20' : 'bg-white shadow-sm border border-slate-200'} p-6 rounded-2xl`}>
              <div className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Total Ballots</div>
              <div className="text-5xl font-black font-mono">{totalVotes.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 flex flex-col gap-8">
          {candidates.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No candidates available.</div>
          ) : (
            candidates.map((candidate, idx) => {
              const percentage = totalVotes === 0 ? 0 : (candidate.voteCount / totalVotes) * 100;
              const isWinner = !isActive && idx === 0 && candidate.voteCount > 0;
              
              return (
                <div key={candidate.id} className="relative group">
                  <div className="flex items-center gap-6 z-10 relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl bg-slate-100 overflow-hidden shadow-inner border-2 border-white relative z-20">
                      {candidate.photoUrl ? (
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${candidate.photoUrl})` }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-3xl font-bold text-slate-400">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isWinner && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white border-2 border-white shadow-md">
                          ★
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-2xl font-bold text-slate-900 truncate pr-4">{candidate.name}</h3>
                        <div className="text-right">
                          <span className="text-3xl font-black font-mono text-slate-900">{candidate.voteCount}</span>
                          <span className="text-slate-500 text-sm ml-2 font-medium">votes</span>
                        </div>
                      </div>
                      
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <motion.div 
                          className={`h-full ${isActive ? 'bg-primary' : (isWinner ? 'bg-accent' : 'bg-slate-300')}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-2 text-right text-sm font-bold text-slate-500 font-mono">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 py-6 px-8 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/mskawarlogo.jpg" alt="M.S. Kawar logo" className="w-10 h-10 object-contain rounded-md bg-white/90 p-1" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">M.S. Kawar</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Election Results</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${election?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">
              {election?.isOpen ? 'Polls Open' : 'Polls Closed'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12">
        {election?.activePostId ? (
          <div>
            {renderResults(activeCandidates, "Live Tally", "Currently actively voting across all booths", true)}
          </div>
        ) : (
          <div className="w-full max-w-5xl mx-auto text-center py-16">
            <BarChart3 className="w-24 h-24 text-slate-300 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">No Voting in Progress</h2>
            <p className="text-xl text-slate-500 mt-4">The election officer has not opened a post for voting yet.</p>
          </div>
        )}

        {closedPosts.length > 0 && (
          <div className="mt-24 w-full max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 pb-6">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-slate-400" />
                Previous Results
              </h3>
              
              <div className="w-full md:w-72">
                <Select value={selectedClosedPostId || ''} onValueChange={setSelectedClosedPostId}>
                  <SelectTrigger className="w-full h-14 text-lg font-medium bg-white rounded-xl shadow-sm border-slate-200">
                    <SelectValue placeholder="Select a post to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {closedPosts.map(post => (
                      <SelectItem key={post.id} value={post.id} className="text-base py-3">
                        {post.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedClosedPostId ? (
              renderResults(
                closedCandidates, 
                closedPosts.find(p => p.id === selectedClosedPostId)?.title || '', 
                "Final confirmed results", 
                false
              )
            ) : (
              <div className="text-center py-12 text-slate-500">Select a post above to view its results.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}