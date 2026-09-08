import React from 'react';
import { Flame, AlertTriangle, Trophy, Sparkles, Navigation, X, MapPin } from 'lucide-react';

export type SortMode = 'hot' | 'critical' | 'top' | 'new';

interface FeedSortBarProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  isNearMeActive: boolean;
  isNearMeLoading: boolean;
  onToggleNearMe: () => void;
  userCountry?: string;
  userRegion?: string;
  selectedCountry: string;
  onCountryChange: (c: string) => void;
  countriesList: string[];
  totalResultsCount: number;
}

export default function FeedSortBar({
  sortMode,
  onSortChange,
  isNearMeActive,
  isNearMeLoading,
  onToggleNearMe,
  userCountry,
  selectedCountry,
  onCountryChange,
  countriesList,
  totalResultsCount
}: FeedSortBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-6 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Reddit Sort Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
        <button
          onClick={() => onSortChange('hot')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'hot'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Most active and trending posts"
        >
          <Flame className="w-4 h-4" />
          <span>🔥 Hot</span>
        </button>

        <button
          onClick={() => onSortChange('critical')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'critical'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
          }`}
          title="Critical emergency cases first"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>🚨 Critical SOS</span>
        </button>

        <button
          onClick={() => onSortChange('top')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'top'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Highest rated posts"
        >
          <Trophy className="w-4 h-4" />
          <span>⭐ Top</span>
        </button>

        <button
          onClick={() => onSortChange('new')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'new'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="Most recent submissions"
        >
          <Sparkles className="w-4 h-4" />
          <span>✨ New</span>
        </button>
      </div>

      {/* Location Radar Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Country Quick Selector */}
        {countriesList.length > 0 && (
          <div className="relative flex items-center text-xs">
            <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value)}
              className="pl-7 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Countries (Global)</option>
              {countriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location Radar Toggle */}
        <button
          onClick={onToggleNearMe}
          disabled={isNearMeLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isNearMeActive
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-300 dark:border-teal-800'
          }`}
          title="Filter posts near your geographical area"
        >
          <Navigation className={`w-3.5 h-3.5 ${isNearMeLoading ? 'animate-spin' : ''}`} />
          <span>
            {isNearMeLoading
              ? 'Detecting location...'
              : isNearMeActive && userCountry
              ? `📍 Near: ${userCountry}`
              : '📍 Near Me Radar'}
          </span>
        </button>

        {/* Active Filter Clear */}
        {(selectedCountry || isNearMeActive) && (
          <button
            onClick={() => {
              onCountryChange('');
              if (isNearMeActive) onToggleNearMe();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Clear location filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Posts Count Badge */}
        <span className="text-xs text-gray-400 font-medium px-1">
          {totalResultsCount} posts
        </span>
      </div>
    </div>
  );
}
