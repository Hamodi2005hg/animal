import React from 'react';
import { Flame, AlertTriangle, Trophy, Sparkles, Navigation, X, MapPin, Filter } from 'lucide-react';

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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Reddit Sort Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
        <button
          onClick={() => onSortChange('hot')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'hot'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="المنشورات الأكثر تفاعلاً ونشاطاً"
        >
          <Flame className="w-4 h-4" />
          <span>🔥 ساخن (Hot)</span>
        </button>

        <button
          onClick={() => onSortChange('critical')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'critical'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
          }`}
          title="الحالات الحرجة والإنقاذ العاجل أولاً"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>🚨 الحالات الحرجة</span>
        </button>

        <button
          onClick={() => onSortChange('top')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'top'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="الأعلى تصويتاً"
        >
          <Trophy className="w-4 h-4" />
          <span>⭐ الأعلى تقييماً</span>
        </button>

        <button
          onClick={() => onSortChange('new')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            sortMode === 'new'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title="أحدث المنشورات زمنياً"
        >
          <Sparkles className="w-4 h-4" />
          <span>✨ الأحدث</span>
        </button>
      </div>

      {/* Location Radar Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Country Quick Selector */}
        {countriesList.length > 0 && (
          <div className="relative flex items-center text-xs">
            <MapPin className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
            <select
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value)}
              className="pr-7 pl-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">جميع البلدان (Global)</option>
              {countriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Near Me Radar Toggle */}
        <button
          onClick={onToggleNearMe}
          disabled={isNearMeLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all disabled:opacity-50 whitespace-nowrap ${
            isNearMeActive
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          {isNearMeLoading ? (
            <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : isNearMeActive ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Navigation className="h-3.5 w-3.5 animate-pulse" />
          )}
          <span>
            {isNearMeActive ? `📍 راداري مفعل (${userCountry || 'منطقتك'})` : '📍 رادار الحالات القريبة'}
          </span>
        </button>

        <span className="text-xs text-gray-400 hidden sm:inline">
          ({totalResultsCount} منشور)
        </span>
      </div>
    </div>
  );
}
