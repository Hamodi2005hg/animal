export type SubredditType = 
  | 'r/RescueEmergency'   // قسم الطوارئ والإنقاذ
  | 'r/SuccessStories'    // مجتمعات التبني والرعاية اللاحقة (قبل وبعد)
  | 'r/Cats'              // مربو وعشاق القطط
  | 'r/Dogs'              // مربو وعشاق الكلاب
  | 'r/Birds'             // العناية بالطيور
  | 'r/VetAdvice'         // استشارات بيطرية مجانية
  | 'r/FunnyPets'         // يوميات ومواقف طريفة
  | 'r/PetMarketplace';   // سوق المساعدات والخدمات المصغر

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type MarketplaceType = 
  | 'food_donation'       // تبرع ببقايا طعام صالحة
  | 'vet_clinic'          // كشف/علاج مجاني أو مخفض
  | 'supplies'            // أدوية ومستلزمات مجانية
  | 'transport'           // تطوع نقل وإسعاف
  | 'other';

export type Profile = {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  karma?: number;
  rescue_badge?: string;
  rescuer_role?: string;
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
  // Reddit-inspired fields
  title?: string;
  subreddit?: SubredditType;
  urgency?: UrgencyLevel;
  is_anonymous?: boolean;
  before_after_image_url?: string; // For Success Stories (After photo)
  marketplace_type?: MarketplaceType; // For Pet Marketplace
  // Computed voting & profile stats
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
  is_anonymous?: boolean;
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
