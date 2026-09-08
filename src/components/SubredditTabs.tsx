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
    title: 'All Feeds',
    icon: '🐾',
    color: 'from-gray-700 to-gray-900',
    description: 'Explore all reports, stories, and mutual aid across Pet Reddit'
  },
  {
    id: 'rescue',
    subreddit: 'r/RescueEmergency' as SubredditType,
    title: 'Emergency & Rescue',
    icon: '🚨',
    color: 'from-red-600 to-rose-700',
    description: 'Urgent reports for stray animals injured or in critical danger'
  },
  {
    id: 'success',
    subreddit: 'r/SuccessStories' as SubredditType,
    title: 'Success Stories',
    icon: '💖',
    color: 'from-pink-600 to-rose-600',
    description: 'Heartwarming Before & After recovery and adoption journeys'
  },
  {
    id: 'pets',
    title: 'Animal Communities',
    icon: '🐱',
    color: 'from-emerald-600 to-teal-700',
    description: 'Cats, dogs, birds, and free veterinary medical advice'
  },
  {
    id: 'marketplace',
    subreddit: 'r/PetMarketplace' as SubredditType,
    title: 'Mutual Aid Market',
    icon: '🍲',
    color: 'from-amber-600 to-orange-600',
    description: 'Surplus food donations, free checkups, supplies & transport'
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
      {/* 5 Main Community Cards / Tabs */}
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
                  if (!PET_SUBREDDITS.some(p => p.id === selectedSubreddit)) {
                    onSelectSubreddit('r/Cats');
                  }
                } else {
                  onSelectCategory(c.id as any);
                  onSelectSubreddit(c.subreddit!);
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative overflow-hidden group ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-gray-800 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-2xl p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:scale-110 transition-transform">
                  {c.icon}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                )}
              </div>

              <div>
                <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight mb-1">
                  {c.title}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                  {c.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-bar for Specialized Pet Subreddits */}
      {activeCategory === 'pets' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap px-2">
            Communities:
          </span>
          {PET_SUBREDDITS.map((sub) => {
            const isSubSelected = selectedSubreddit === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onSelectSubreddit(sub.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  isSubSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <span>{sub.icon}</span>
                <span>{sub.id}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
