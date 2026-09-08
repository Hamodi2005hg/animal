import { AnimalSOS, SubredditType, UrgencyLevel, MarketplaceType } from '../types';

export const SUBREDDITS: {
  id: SubredditType;
  title: string;
  titleAr: string;
  icon: string;
  color: string;
  description: string;
  category: 'rescue' | 'success' | 'pets' | 'marketplace';
}[] = [
  {
    id: 'r/RescueEmergency',
    title: 'Emergency & Rescue',
    titleAr: '🚨 طوارئ وإنقاذ',
    icon: '🚨',
    color: 'bg-red-500 text-white',
    description: 'بلاغات جغرافية سريعة لحالات الحيوانات المصابة أو في خطر عاجل.',
    category: 'rescue'
  },
  {
    id: 'r/SuccessStories',
    title: 'Success Stories & Adoption',
    titleAr: '💖 قصص نجاح وتبني',
    icon: '💖',
    color: 'bg-pink-500 text-white',
    description: 'صور وتحولات الحيوانات بعد الإنقاذ والتبني (قبل وبعد Before & After).',
    category: 'success'
  },
  {
    id: 'r/Cats',
    title: 'Cats Community',
    titleAr: '🐱 مجتمع القطط',
    icon: '🐱',
    color: 'bg-amber-500 text-white',
    description: 'تربية، تغذية، تجارب يومية، وصور قطط لطيفة من مجتمع المربين.',
    category: 'pets'
  },
  {
    id: 'r/Dogs',
    title: 'Dogs Community',
    titleAr: '🐶 مجتمع الكلاب',
    icon: '🐶',
    color: 'bg-emerald-500 text-white',
    description: 'تدريب، سلوك، صحة، ومواقف يومية لأصحاب الكلاب ومحبيها.',
    category: 'pets'
  },
  {
    id: 'r/Birds',
    title: 'Birds Care',
    titleAr: '🦜 العناية بالطيور',
    icon: '🦜',
    color: 'bg-cyan-500 text-white',
    description: 'تغذية الطيور، إسعاف الطيور المصابة في الشوارع، وتربية آمنة.',
    category: 'pets'
  },
  {
    id: 'r/VetAdvice',
    title: 'Free Vet Advice',
    titleAr: '🩺 استشارات بيطرية',
    icon: '🩺',
    color: 'bg-blue-600 text-white',
    description: 'نصائح طبية أولية، تجارب علاجية واستشارات مجانية من أطباء ومتطوعين.',
    category: 'pets'
  },
  {
    id: 'r/FunnyPets',
    title: 'Funny Pets & Daily Moments',
    titleAr: '🐾 يوميات ومواقف طريفة',
    icon: '🐾',
    color: 'bg-purple-500 text-white',
    description: 'مواقف مرحة، ميمز، ولقطات عفوية للحيوانات الأليفة ترسم الابتسامة.',
    category: 'pets'
  },
  {
    id: 'r/PetMarketplace',
    title: 'Community Aid & Marketplace',
    titleAr: '🍲 سوق المساعدات والخدمات',
    icon: '🍲',
    color: 'bg-orange-500 text-white',
    description: 'تبرع ببقايا طعام صالحة من المطاعم/الأفراد، كشوفات مجانية، ومستلزمات.',
    category: 'marketplace'
  }
];

export const MARKETPLACE_CATEGORIES: {
  id: MarketplaceType;
  label: string;
  icon: string;
}[] = [
  { id: 'food_donation', label: 'تبرع ببقايا طعام نظيفة (مطاعم وأفراد)', icon: '🍲' },
  { id: 'vet_clinic', label: 'كشف/تطعيم مجاني أو مخفض (عيادات)', icon: '🩺' },
  { id: 'supplies', label: 'أدوية ومستلزمات وأقفاص مجانية', icon: '💊' },
  { id: 'transport', label: 'تطوع بالنقل والإسعاف', icon: '🚗' },
  { id: 'other', label: 'مساعدات أخرى', icon: '🤝' }
];

/**
 * Extracts subreddit, title, urgency, anonymity, before/after images, and marketplace type
 * from raw post data or fallback tags embedded in description.
 */
export function extractPostMetadata(raw: any): AnimalSOS {
  let description = raw.description || '';
  let subreddit: SubredditType = raw.subreddit || 'r/RescueEmergency';
  let urgency: UrgencyLevel = raw.urgency || 'medium';
  let is_anonymous: boolean = Boolean(raw.is_anonymous);
  let before_after_image_url: string | undefined = raw.before_after_image_url;
  let title: string | undefined = raw.title;
  let marketplace_type: MarketplaceType | undefined = raw.marketplace_type;

  // Fallback tag parser if columns don't exist yet in the database table
  const metaRegex = /^\[META:(.*?)\]\s*/;
  const match = description.match(metaRegex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (!raw.subreddit && parsed.subreddit) subreddit = parsed.subreddit;
      if (!raw.urgency && parsed.urgency) urgency = parsed.urgency;
      if (raw.is_anonymous === undefined && parsed.is_anonymous !== undefined) is_anonymous = parsed.is_anonymous;
      if (!raw.before_after_image_url && parsed.before_after_image_url) before_after_image_url = parsed.before_after_image_url;
      if (!raw.title && parsed.title) title = parsed.title;
      if (!raw.marketplace_type && parsed.marketplace_type) marketplace_type = parsed.marketplace_type;
      
      // Clean visible description
      description = description.replace(metaRegex, '');
    } catch {
      // Ignore parse failure
    }
  }

  // Calculate vote_score
  const upvotes = raw.upvotes || 0;
  const downvotes = raw.downvotes || 0;
  const vote_score = upvotes - downvotes;

  return {
    ...raw,
    description,
    subreddit,
    urgency,
    is_anonymous,
    before_after_image_url,
    title,
    marketplace_type,
    upvotes,
    downvotes,
    vote_score
  };
}

/**
 * Packs post data into a payload that includes columns AND a fallback META header
 * so it works whether or not the SQL migration has been applied.
 */
export function preparePostPayload(data: {
  user_id: string;
  animal_type: string;
  country: string;
  region: string;
  area: string;
  description: string;
  image_url: string;
  status: 'open' | 'resolved';
  title?: string;
  subreddit: SubredditType;
  urgency: UrgencyLevel;
  is_anonymous: boolean;
  before_after_image_url?: string;
  marketplace_type?: MarketplaceType;
}) {
  const metaObject = {
    title: data.title,
    subreddit: data.subreddit,
    urgency: data.urgency,
    is_anonymous: data.is_anonymous,
    before_after_image_url: data.before_after_image_url,
    marketplace_type: data.marketplace_type
  };

  const encodedDescription = `[META:${JSON.stringify(metaObject)}] ${data.description}`;

  // Complete payload with both direct fields and embedded meta in description
  return {
    user_id: data.user_id,
    animal_type: data.animal_type,
    country: data.country,
    region: data.region,
    area: data.area,
    description: encodedDescription,
    image_url: data.image_url,
    status: data.status,
    title: data.title,
    subreddit: data.subreddit,
    urgency: data.urgency,
    is_anonymous: data.is_anonymous,
    before_after_image_url: data.before_after_image_url,
    marketplace_type: data.marketplace_type
  };
}

/**
 * Payload without new columns for graceful retry if Supabase returns 42703 (undefined column)
 */
export function prepareFallbackPostPayload(data: ReturnType<typeof preparePostPayload>) {
  return {
    user_id: data.user_id,
    animal_type: data.animal_type,
    country: data.country,
    region: data.region,
    area: data.area,
    description: data.description, // Contains [META:...]
    image_url: data.image_url,
    status: data.status
  };
}
