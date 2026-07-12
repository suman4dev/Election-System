export interface Post {
  id: string;
  title: string;
  order: number;
  status: 'pending' | 'active' | 'closed';
}

export interface Candidate {
  id: string;
  name: string;
  photoUrl: string;
  voteCount: number;
}

export interface ElectionState {
  isOpen: boolean;
  activePostId: string | null;
}

export interface Booth {
  id: string;
  unlocked: boolean;
  lastVoteAt: any; // Firestore Timestamp or null
}
