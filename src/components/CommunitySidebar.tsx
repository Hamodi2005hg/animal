import React from 'react';
import { Link } from 'react-router-dom';
import { SubredditType, Profile } from '../types';
import { SUBREDDITS } from '../utils/postHelpers';
import { RESCUE_BADGES, getBadgeByKarma } from '../utils/karmaHelpers';
import { Shield, Trophy, PlusCircle, AlertCircle, Sparkles, Heart, ChevronLeft, MapPin } from 'lucide-react';

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
  activeCategory,
  leaderboardUsers = [],
  totalRescuesCount,
  onSelectSubreddit
}: CommunitySidebarProps) {
  const currentSubredditInfo = SUBREDDITS.find((s) => s.id === selectedSubreddit);

  return (
    <div className="space-y-5">
      {/* Community Info Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-sm text-white">
            {currentSubredditInfo?.icon || '🐾'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {currentSubredditInfo?.titleAr || 'مجتمع حماية الحيوانات'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {currentSubredditInfo?.id || 'r/AnimalRescueHub'}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {currentSubredditInfo?.description ||
            'منصة ريديت المخصصة لحماية وإنقاذ الحيوانات الأليفة والضالة، تبادل الرعاية، وقصص التبني السعيدة.'}
        </p>

        <div className="grid grid-cols-2 gap-2 py-3 border-y border-gray-100 dark:border-gray-700/60 mb-4 text-center">
          <div>
            <p className="font-bold text-base text-gray-900 dark:text-white">
              {totalRescuesCount}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">حالة مسجلة</p>
          </div>
          <div>
            <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
              نشط الآن
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">مجتمع متكاتف</p>
          </div>
        </div>

        <Link
          to="/create-sos"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>نشر بلاغ / قصة في {currentSubredditInfo?.id || 'المجتمع'}</span>
        </Link>
      </div>

      {/* Rescuer Karma Leaderboard (لوحة شرف المنقذين) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
              أبطال الإنقاذ (Karma Leaderboard)
            </h4>
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
            نقاط الكارما
          </span>
        </div>

        <div className="space-y-3">
          {leaderboardUsers.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">
              كن أول من يجمع نقاط الكارما عبر الإبلاغ والمساعدة!
            </div>
          ) : (
            leaderboardUsers.slice(0, 5).map((u, idx) => {
              const badge = getBadgeByKarma(u.karma);
              return (
                <Link
                  key={u.id}
                  to={`/user/${u.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 text-center text-xs font-bold ${
                        idx === 0
                          ? 'text-amber-500'
                          : idx === 1
                          ? 'text-gray-400'
                          : idx === 2
                          ? 'text-amber-700'
                          : 'text-gray-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.username?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>

                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {u.username}
                      </p>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {badge.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-left flex flex-col items-end">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                      ⭐ {u.karma}
                    </span>
                    {u.resolvedCount > 0 && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400">
                        ✓ {u.resolvedCount} إنقاذ
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Karma & Badges Guide (دليل الرتب) */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 text-xs">
        <h5 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>كيف تكسب نقاط الكارما (Rescue Karma)؟</span>
        </h5>
        <ul className="space-y-1.5 text-gray-600 dark:text-gray-300 text-[11px] list-disc list-inside">
          <li><strong>+50 نقطة</strong> عند إنقاذ أو حل بلاغ حيوان في خطر.</li>
          <li><strong>+15 نقطة</strong> عند نشر بلاغ دقيق أو قصة تبني ملهمة.</li>
          <li><strong>+5 نقاط</strong> عن كل تصويت إيجابي (Upvote) تحصده منشوراتك.</li>
          <li><strong>شارات تقدير</strong> تظهر بجانب اسمك في كل المجتمعات!</li>
        </ul>
      </div>

      {/* Reddit Community Rules */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm text-xs text-gray-600 dark:text-gray-400 space-y-2">
        <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>إرشادات مجتمع الحيوانات</span>
        </h5>
        <p className="text-[11px]">1. الدقة والأمانة في تحديد الموقع لتسهيل وصول المنقذين.</p>
        <p className="text-[11px]">2. احترام الخصوصية: يمكنك التبليغ بهوية مجهولة بنقرة واحدة.</p>
        <p className="text-[11px]">3. نشر الطاقة الإيجابية وقصص التبني الناجحة.</p>
      </div>
    </div>
  );
}
