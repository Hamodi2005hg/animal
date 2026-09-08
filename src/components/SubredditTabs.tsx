import React from 'react';
import { SubredditType } from '../types';
import { SUBREDDITS } from '../utils/postHelpers';

interface SubredditTabsProps {
  selectedSubreddit: SubredditType | 'all';
  onSelectSubreddit: (subreddit: SubredditType | 'all') => void;
  activeCategory: 'all' | 'rescue' | 'success' | 'pets' | 'marketplace';
  onSelectCategory: (category: 'all' | 'rescue' | 'success' | 'pets' | 'marketplace') => void;
}

export const MAIN_COMMUNITIES = [
  {
    id: 'all',
    titleAr: 'جميع المجتمعات',
    titleEn: 'All Feeds',
    icon: '🐾',
    color: 'from-gray-700 to-gray-900',
    description: 'استكشف جميع البلاغات، القصص، والنصائح في مكان واحد'
  },
  {
    id: 'rescue',
    subreddit: 'r/RescueEmergency' as SubredditType,
    titleAr: '🚨 الطوارئ والإنقاذ',
    titleEn: 'r/RescueEmergency',
    icon: '🚨',
    color: 'from-red-600 to-rose-700',
    description: 'بلاغات جغرافية سريعة لحالات الحيوانات المصابة أو في خطر'
  },
  {
    id: 'success',
    subreddit: 'r/SuccessStories' as SubredditType,
    titleAr: '💖 قصص التبني والنجاح',
    titleEn: 'r/SuccessStories',
    icon: '💖',
    color: 'from-pink-600 to-rose-600',
    description: 'صور وتحولات الحيوانات قبل وبعد الإنقاذ والتبني'
  },
  {
    id: 'pets',
    titleAr: '🐾 مجتمعات الحيوانات',
    titleEn: 'Animal Subreddits',
    icon: '🐱',
    color: 'from-emerald-600 to-teal-700',
    description: 'مربو القطط، الكلاب، الطيور، والاستشارات البيطرية'
  },
  {
    id: 'marketplace',
    subreddit: 'r/PetMarketplace' as SubredditType,
    titleAr: '🍲 سوق المساعدات والخدمات',
    titleEn: 'r/PetMarketplace',
    icon: '🍲',
    color: 'from-amber-600 to-orange-600',
    description: 'تبرع ببقايا طعام من المطاعم، كشوفات مجانية، ومستلزمات'
  }
];

export const PET_SUBREDDITS = SUBREDDITS.filter(s => s.category === 'pets');

export default function SubredditTabs({
  selectedSubreddit,
  onSelectSubreddit,
  activeCategory,
  onSelectCategory
}: SubredditTabsProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* 4 Main Community Cards / Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
        {MAIN_COMMUNITIES.map((c) => {
          const isSelected =
            c.id === 'all'
              ? activeCategory === 'all' && selectedSubreddit === 'all'
              : c.id === 'pets'
              ? activeCategory === 'pets'
              : selectedSubreddit === c.subreddit;

          return (
            <button
              key={c.id}
              onClick={() => {
                if (c.id === 'all') {
                  onSelectCategory('all');
                  onSelectSubreddit('all');
                } else if (c.id === 'pets') {
                  onSelectCategory('pets');
                  // Keep sub-choice or default to cats
                  if (!PET_SUBREDDITS.some(p => p.id === selectedSubreddit)) {
                    onSelectSubreddit('r/Cats');
                  }
                } else {
                  onSelectCategory(c.id as any);
                  onSelectSubreddit(c.subreddit!);
                }
              }}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between relative overflow-hidden group ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-gray-800 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {c.icon}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                  {c.titleAr}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  {c.titleEn}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary Pill Subreddits for Pet Interests (Cats, Dogs, Birds, VetAdvice, FunnyPets) */}
      {activeCategory === 'pets' && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-2.5 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap px-2">
            مجتمعات الحيوانات:
          </span>
          <div className="flex gap-1.5 flex-1 min-w-0">
            {PET_SUBREDDITS.map((sub) => {
              const isSubActive = selectedSubreddit === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSelectSubreddit(sub.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSubActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-100/50 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span>{sub.icon}</span>
                  <span>{sub.titleAr}</span>
                  <span className="text-[10px] opacity-75 font-mono">({sub.id})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
