import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { db, auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, collection, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { ElectionState, Booth, Candidate } from '@/lib/types';
import { Lock, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function VotePage() {
  const { boothId } = useParams<{ boothId: string }>();
  const [election, setElection] = useState<ElectionState | null>(null);
  const [booth, setBooth] = useState<Booth | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voted, setVoted] = useState(false);
  const { toast } = useToast();

  // Auth silently
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  // Listeners
  useEffect(() => {
    if (!boothId) return;

    // Election state listener
    const unsubElection = onSnapshot(doc(db, 'election', 'state'), (docSnap) => {
      if (docSnap.exists()) {
        setElection(docSnap.data() as ElectionState);
      } else {
        setElection({ isOpen: false, activePostId: null });
      }
    });

    // Booth listener
    const unsubBooth = onSnapshot(doc(db, 'booths', boothId), (docSnap) => {
      if (docSnap.exists()) {
        const b = docSnap.data() as Booth;
        setBooth(b);
        if (b.unlocked) setVoted(false); // Reset voted state when booth is unlocked
      } else {
        setBooth(null);
      }
    });

    return () => {
      unsubElection();
      unsubBooth();
    };
  }, [boothId]);

  // Candidates listener when active post changes
  useEffect(() => {
    if (!election?.activePostId) {
      setCandidates([]);
      return;
    }

    const unsubCandidates = onSnapshot(
      collection(db, 'posts', election.activePostId, 'candidates'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
        setCandidates(data);
      }
    );

    return () => unsubCandidates();
  }, [election?.activePostId]);

  const handleVote = async (candidateId: string) => {
    if (!election?.activePostId || !boothId || !booth?.unlocked) return;

    try {
      await runTransaction(db, async (tx) => {
        const boothRef = doc(db, 'booths', boothId);
        const boothSnap = await tx.get(boothRef);
        
        if (!boothSnap.exists() || !boothSnap.data().unlocked) {
          throw new Error('Booth is locked');
        }

        const candidateRef = doc(db, 'posts', election.activePostId!, 'candidates', candidateId);
        tx.update(candidateRef, { voteCount: increment(1) });
        tx.update(boothRef, { unlocked: false, lastVoteAt: serverTimestamp() });
      });

      setVoted(true);
      setTimeout(() => {
        setVoted(false);
      }, 4000);
    } catch (error: any) {
      // Race condition handled: silently ignore or show toast
      console.error("Vote failed:", error);
    }
  };

  // Rendering states
  if (voted) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-primary-foreground p-6">
        <CheckCircle2 className="w-32 h-32 mb-8 text-accent animate-in zoom-in" />
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-center">Thank You for Voting!</h1>
        <p className="text-xl md:text-2xl text-primary-foreground/80">Your ballot has been securely recorded.</p>
      </div>
    );
  }

  if (election?.isOpen === false) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
        <ShieldAlert className="w-24 h-24 mb-6 text-slate-400" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-center">Voting Not Open</h1>
        <p className="text-lg text-slate-500">The election is currently closed.</p>
      </div>
    );
  }

  if (election && !election.activePostId) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-16 h-16 border-4 border-slate-300 border-t-accent rounded-full animate-spin mb-8" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-center">Waiting for the Next Post</h1>
        <p className="text-xl text-slate-500">Please wait while the election officer prepares the next ballot.</p>
      </div>
    );
  }

  if (booth?.unlocked === false) {
    return (
      <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center max-w-lg w-full text-center">
          <Lock className="w-24 h-24 mb-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight mb-4">Booth Locked</h1>
          <p className="text-xl text-slate-600">Please see the poll worker to proceed.</p>
          <div className="mt-8 px-6 py-3 bg-slate-100 rounded-full text-slate-500 font-mono text-sm tracking-widest uppercase">
            {boothId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-primary text-primary-foreground py-6 px-8 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide">M.S. Kawar Int. School</h1>
          <p className="text-accent font-medium mt-1">Official Ballot</p>
        </div>
        <div className="px-4 py-2 bg-primary-foreground/10 rounded-lg backdrop-blur-sm border border-primary-foreground/20 font-mono text-xl">
          Booth: {boothId}
        </div>
      </header>

      <main className="flex-1 p-8 flex flex-col max-w-6xl w-full mx-auto justify-center">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-slate-900">Select Your Candidate</h2>
          <p className="text-xl text-slate-600 mt-2">Tap a candidate to cast your vote.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id}
              className="flex flex-col items-center overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:border-accent border-4 border-transparent bg-white group active:scale-95"
              onClick={() => handleVote(candidate.id)}
              data-testid={`candidate-card-${candidate.id}`}
            >
              <div className="w-full aspect-square bg-slate-100 p-8 flex items-center justify-center">
                {candidate.photoUrl ? (
                  <div 
                    className="w-full h-full rounded-2xl bg-cover bg-center shadow-inner group-hover:shadow-lg transition-all"
                    style={{ backgroundImage: `url(${candidate.photoUrl})` }}
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-slate-200 flex items-center justify-center shadow-inner">
                    <span className="text-6xl font-bold text-slate-400">
                      {candidate.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-6 w-full text-center bg-white border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                  {candidate.name}
                </h3>
              </div>
              <div className="w-full h-3 bg-slate-100 group-hover:bg-accent transition-colors" />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
