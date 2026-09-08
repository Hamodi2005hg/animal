export type Profile = {
  id: string;
  email: string;
  created_at: string;
};

export type AnimalSOS = {
  id: string;
  user_id: string;
  image_url: string;
  country: string;
  region: string;
  area?: string;
  description: string;
  created_at: string;
  status: 'open' | 'resolved';
  profiles?: Profile;
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
