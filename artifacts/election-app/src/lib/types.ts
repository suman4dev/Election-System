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
}

export interface Booth {
  id: string;
  unlocked: boolean;
  assignedPostId: string | null;
  lastVoteAt: any; // Firestore Timestamp or null
}
