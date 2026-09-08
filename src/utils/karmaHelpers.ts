import { Profile, AnimalSOS } from '../types';

export interface UserBadge {
  name: string;
  nameEn: string;
  icon: string;
  bgColor: string;
  textColor: string;
  border: string;
  description: string;
}

export const RESCUE_BADGES: Record<string, UserBadge> = {
  legendary: {
    name: '🌟 بطل الإنقاذ الأسطوري',
    nameEn: 'Legendary Hero',
    icon: '🌟',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-400 dark:border-amber-600',
    description: 'أنقذ وساهم في حماية عشرات الحيوانات مع أعلى رصيد كارما مجتمعي (+500).'
  },
  medic: {
    name: '🩺 مسعف الميدان',
    nameEn: 'Field Medic',
    icon: '🩺',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-400 dark:border-blue-600',
    description: 'مستجيب سريع للبلاغات الطارئة وتقديم الإسعافات والمشورة (200 - 499 كارما).'
  },
  guardian: {
    name: '🛡️ حارس الأرواح',
    nameEn: 'Life Shield',
    icon: '🛡️',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-400 dark:border-emerald-600',
    description: 'عضو فاعل يساهم في رصد وإطعام الحيوانات الضالة (50 - 199 كارما).'
  },
  junior: {
    name: '🐾 المنقذ المبتدئ',
    nameEn: 'Junior Guardian',
    icon: '🐾',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-700',
    description: 'بداية مشرفة في مجتمع حماية الحيوانات الأليفة والضالة (0 - 49 كارما).'
  }
};

/**
 * Calculates Karma score dynamically from user's posts, resolutions, and upvotes
 */
export function calculateUserKarma(posts: AnimalSOS[]): number {
  if (!posts || posts.length === 0) return 10; // Starting baseline karma

  let karma = 10;
  posts.forEach((post) => {
    // Karma for reporting
    karma += 15;
    
    // Extra karma if the case is solved / rescued!
    if (post.status === 'resolved') {
      karma += 50;
    }

    // Karma from net upvotes
    const netVotes = (post.upvotes || 0) - (post.downvotes || 0);
    if (netVotes > 0) {
      karma += netVotes * 5;
    }
  });

  return karma;
}

/**
 * Determines the rescue badge based on karma score
 */
export function getBadgeByKarma(karma: number): UserBadge {
  if (karma >= 500) return RESCUE_BADGES.legendary;
  if (karma >= 200) return RESCUE_BADGES.medic;
  if (karma >= 50) return RESCUE_BADGES.guardian;
  return RESCUE_BADGES.junior;
}

/**
 * Returns a display badge object for a profile or post author
 */
export function getProfileBadge(profile?: Profile, authorPosts?: AnimalSOS[]): {
  badge: UserBadge;
  karma: number;
} {
  const karma = profile?.karma !== undefined && profile.karma > 0
    ? profile.karma
    : authorPosts
    ? calculateUserKarma(authorPosts)
    : 25;

  return {
    badge: getBadgeByKarma(karma),
    karma
  };
}
