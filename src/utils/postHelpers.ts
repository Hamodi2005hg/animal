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
    titleAr: 'Emergency & Rescue',
    icon: '🚨',
    color: 'bg-red-500 text-white',
    description: 'Urgent geolocation reports for injured, trapped, or endangered stray animals.',
    category: 'rescue'
  },
  {
    id: 'r/SuccessStories',
    title: 'Success Stories & Adoption',
    titleAr: 'Success Stories & Adoption',
    icon: '💖',
    color: 'bg-pink-500 text-white',
    description: 'Inspiring transformation stories and adoption journeys (Before & After photos).',
    category: 'success'
  },
  {
    id: 'r/Cats',
    title: 'Cats Community',
    titleAr: 'Cats Community',
    icon: '🐱',
    color: 'bg-amber-500 text-white',
    description: 'Cat care, feeding tips, daily stories, and cute moments from feline lovers.',
    category: 'pets'
  },
  {
    id: 'r/Dogs',
    title: 'Dogs Community',
    titleAr: 'Dogs Community',
    icon: '🐶',
    color: 'bg-emerald-500 text-white',
    description: 'Dog training, behavior, canine health, and adventures with our best friends.',
    category: 'pets'
  },
  {
    id: 'r/Birds',
    title: 'Birds Care',
    titleAr: 'Birds Care',
    icon: '🦜',
    color: 'bg-cyan-500 text-white',
    description: 'Feeding, rehabilitating wild street birds, safe breeding, and avian health.',
    category: 'pets'
  },
  {
    id: 'r/VetAdvice',
    title: 'Free Vet Advice',
    titleAr: 'Free Vet Advice',
    icon: '🩺',
    color: 'bg-blue-600 text-white',
    description: 'Initial medical guidance, triage tips, and free consultations from vets and volunteers.',
    category: 'pets'
  },
  {
    id: 'r/FunnyPets',
    title: 'Funny Pets & Memes',
    titleAr: 'Funny Pets & Memes',
    icon: '🐾',
    color: 'bg-purple-500 text-white',
    description: 'Playful moments, pet memes, and heartwarming spontaneous photos that make you smile.',
    category: 'pets'
  },
  {
    id: 'r/PetMarketplace',
    title: 'Community Aid & Marketplace',
    titleAr: 'Community Aid & Marketplace',
    icon: '🍲',
    color: 'bg-orange-500 text-white',
    description: 'Surplus food donations from restaurants/individuals, free vet checkups, supplies & transport.',
    category: 'marketplace'
  }
];

export const MARKETPLACE_CATEGORIES: {
  id: MarketplaceType;
  label: string;
  icon: string;
}[] = [
  { id: 'food_donation', label: 'Surplus Clean Food Donations', icon: '🍲' },
  { id: 'vet_clinic', label: 'Free or Discounted Vet Care', icon: '🩺' },
  { id: 'supplies', label: 'Medicines, Supplies & Cages', icon: '💊' },
  { id: 'transport', label: 'Volunteer Transport & Ambulance', icon: '🚗' },
  { id: 'other', label: 'Other Mutual Aid', icon: '🤝' }
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

      // Clean metadata prefix from description for display
      description = description.replace(metaRegex, '');
    } catch {
      // ignore parse errors
    }
  }

  return {
    ...raw,
    title: title || raw.title,
    subreddit,
    urgency,
    is_anonymous,
    before_after_image_url,
    marketplace_type,
    description
  };
}

/**
 * Prepares payload for creating or updating post.
 */
export function preparePostPayload(data: {
  title: string;
  subreddit: SubredditType;
  urgency: UrgencyLevel;
  animalType: string;
  country: string;
  region: string;
  area?: string;
  description: string;
  imageUrls: string[];
  beforeAfterImageUrl?: string;
  isAnonymous: boolean;
  marketplaceType?: MarketplaceType;
  userId: string;
}) {
  return {
    user_id: data.userId,
    title: data.title,
    subreddit: data.subreddit,
    urgency: data.urgency,
    animal_type: data.animalType,
    country: data.country,
    region: data.region,
    area: data.area || null,
    description: data.description,
    image_url: data.imageUrls.join(','),
    before_after_image_url: data.beforeAfterImageUrl || null,
    is_anonymous: data.isAnonymous,
    marketplace_type: data.marketplaceType || null,
    status: 'open'
  };
}

/**
 * Fallback payload for legacy schema where new columns don't exist yet.
 */
export function prepareFallbackPostPayload(data: {
  title: string;
  subreddit: SubredditType;
  urgency: UrgencyLevel;
  animalType: string;
  country: string;
  region: string;
  area?: string;
  description: string;
  imageUrls: string[];
  beforeAfterImageUrl?: string;
  isAnonymous: boolean;
  marketplaceType?: MarketplaceType;
  userId: string;
}) {
  const meta = JSON.stringify({
    title: data.title,
    subreddit: data.subreddit,
    urgency: data.urgency,
    is_anonymous: data.isAnonymous,
    before_after_image_url: data.beforeAfterImageUrl,
    marketplace_type: data.marketplaceType
  });

  return {
    user_id: data.userId,
    animal_type: data.animalType,
    country: data.country,
    region: data.region,
    area: data.area || null,
    description: `[META:${meta}]\n${data.description}`,
    image_url: data.imageUrls.join(','),
    status: 'open'
  };
}
