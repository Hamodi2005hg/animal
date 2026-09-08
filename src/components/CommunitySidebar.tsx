import React from 'react';
import { Link } from 'react-router-dom';
import { SubredditType } from '../types';
import { SUBREDDITS } from '../utils/postHelpers';
import { getBadgeByKarma } from '../utils/karmaHelpers';
import { Trophy, PlusCircle, Shield, Sparkles, Heart } from 'lucide-react';

interface CommunitySidebarProps {
  selectedSubreddit: SubredditType | 'all';
  activeCategory: string;
  leaderboardUsers?: {
    id: string;
    username: string;
    avatar_url?: string;
    karma: number;
    resolvedCount: number;
  }[];
  totalRescuesCount: number;
  onSelectSubreddit: (sub: SubredditType | 'all') => void;
}

export default function CommunitySidebar({
  selectedSubreddit,
  leaderboardUsers = [],
  totalRescuesCount
}: CommunitySidebarProps) {
  const currentSubredditInfo = SUBREDDITS.find((s) => s.id === selectedSubreddit);

  return (
    <div className="space-y-5">
      {/* Community Info Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-xs text-white">
            {currentSubredditInfo?.icon || '🐾'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {currentSubredditInfo?.title || 'Animal Rescue Hub'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {currentSubredditInfo?.id || 'r/AnimalRescueHub'}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {currentSubredditInfo?.description ||
            'Dedicated Reddit platform for animal rescue emergencies, pet communities, and mutual aid.'}
        </p>

        <div className="grid grid-cols-2 gap-2 py-3 border-y border-gray-100 dark:border-gray-700/60 mb-4 text-center">
          <div>
            <p className="font-bold text-base text-gray-900 dark:text-white">
              {totalRescuesCount}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Total Posts</p>
          </div>
          <div>
            <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
              Active Now
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Community Aid</p>
          </div>
        </div>

        <Link
          to="/create-sos"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post in {currentSubredditInfo?.id || 'Community'}</span>
        </Link>
      </div>

      {/* Rescuer Karma Leaderboard */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
              Rescue Champions
            </h4>
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
            Karma Points
          </span>
        </div>

        <div className="space-y-3">
          {leaderboardUsers.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">
              Be the first to earn Karma by reporting or helping strays!
            </div>
          ) : (
            leaderboardUsers.slice(0, 5).map((u, idx) => {
              const badge = getBadgeByKarma(u.karma);
              return (
                <Link
                  to={`/user/${u.id}`}
                  key={u.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700'
                          : idx === 2
                          ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40'
                          : 'text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.username.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {u.username}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {badge.icon} {badge.nameEn || badge.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      ⭐{u.karma}
                    </span>
                    {u.resolvedCount > 0 && (
                      <span className="block text-[10px] text-emerald-600 font-medium">
                        {u.resolvedCount} rescued
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* How Karma Works Card */}
      <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 text-xs">
        <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>How Rescue Karma Works</span>
        </h5>
        <ul className="space-y-1.5 text-gray-600 dark:text-gray-300 text-[11px]">
          <li className="flex items-center justify-between">
            <span>• Report or share post</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">+15 pts</span>
          </li>
          <li className="flex items-center justify-between">
            <span>• Rescue / resolve case</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">+50 pts</span>
          </li>
          <li className="flex items-center justify-between">
            <span>• Community upvote</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">+5 pts</span>
          </li>
        </ul>
      </div>

      {/* Community Guidelines */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400">
        <h5 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Community Guidelines</span>
        </h5>
        <ul className="space-y-1 text-[11px] list-disc list-inside">
          <li>Report genuine animal cases with precise locations</li>
          <li>Use Anonymous mode if you want privacy</li>
          <li>Commercial animal breeding/sales strictly prohibited</li>
        </ul>
      </div>
    </div>
  );
}
