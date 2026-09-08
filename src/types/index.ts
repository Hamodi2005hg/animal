export type Profile = {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  created_at: string;
};

export type AnimalSOS = {
  id: string;
  user_id: string;
  animal_type?: string;
  image_url: string;
  country: string;
  region: string;
  area?: string;
  description: string;
  created_at: string;
  status: 'open' | 'resolved';
  vote_score?: number;
  upvotes?: number;
  downvotes?: number;
  user_vote?: number;
  profiles?: Profile;
  sos_votes?: SOSVote[];
  sos_comments?: SOSComment[];
};

export type SOSVote = {
  id: string;
  sos_id: string;
  user_id: string;
  vote_value: number;
};

export type SOSComment = {
  id: string;
  sos_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles?: Profile;
  replies?: SOSComment[]; // For nested UI
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sos_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
};

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'vote' | 'comment' | 'reply' | 'message';
  post_id: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
};
