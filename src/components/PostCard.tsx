import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimalSOS, SubredditType } from '../types';
import { SUBREDDITS, MARKETPLACE_CATEGORIES } from '../utils/postHelpers';
import { getProfileBadge } from '../utils/karmaHelpers';
import {
  MapPin,
  MessageCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Trash2,
  Share2,
  Sparkles,
  ShieldAlert,
  HeartHandshake,
  Send,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface PostCardProps {
  post: AnimalSOS;
  currentUserId?: string;
  onVote: (postId: string, value: number) => void;
  onDelete: (postId: string) => void;
  onOpenImageModal: (imageUrlsStr: string) => void;
  onSelectSubreddit?: (sub: SubredditType) => void;
  isUserNearby?: boolean;
}

export default function PostCard({
  post,
  currentUserId,
  onVote,
  onDelete,
  onOpenImageModal,
  onSelectSubreddit,
  isUserNearby
}: PostCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [activeStoryTab, setActiveStoryTab] = useState<'both' | 'before' | 'after'>('both');

  const subredditInfo = SUBREDDITS.find((s) => s.id === post.subreddit);
  const marketplaceInfo = MARKETPLACE_CATEGORIES.find((m) => m.id === post.marketplace_type);
  const { badge, karma } = getProfileBadge(post.profiles);

  const images = post.image_url ? post.image_url.split(',') : [];
  const displayImage = images.length > 0 ? images[0] : null;
  const netScore = (post.upvotes || 0) - (post.downvotes || 0);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/sos/${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleRespond = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) {
      navigate('/auth');
      return;
    }
    if (currentUserId === post.user_id) {
      navigate('/messages');
      return;
    }
    navigate(`/messages?user=${post.user_id}&sos=${post.id}`);
  };

  return (
    <article
      id={`post-${post.id}`}
      className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-600 ${
        post.urgency === 'critical'
          ? 'border-red-300 dark:border-red-900/60 ring-1 ring-red-500/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex">
        {/* Reddit-style Left Voting Column (Desktop) */}
        <div className="hidden sm:flex flex-col items-center bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-r-xl border-l border-gray-100 dark:border-gray-700/60 select-none">
          <button
            onClick={() => onVote(post.id, 1)}
            aria-label="Upvote"
            className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              post.user_vote === 1
                ? 'text-orange-600 dark:text-orange-500 font-bold'
                : 'text-gray-400 hover:text-orange-600'
            }`}
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          <span
            className={`text-xs font-black my-1 font-mono ${
              post.user_vote === 1
                ? 'text-orange-600'
                : post.user_vote === -1
                ? 'text-indigo-600'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {netScore}
          </span>

          <button
            onClick={() => onVote(post.id, -1)}
            aria-label="Downvote"
            className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              post.user_vote === -1
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-gray-400 hover:text-indigo-600'
            }`}
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>

        {/* Main Post Body */}
        <div className="flex-1 p-4 sm:p-5">
          {/* Header metadata bar */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Subreddit Badge */}
              <button
                type="button"
                onClick={() => post.subreddit && onSelectSubreddit?.(post.subreddit)}
                className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-full transition-colors"
              >
                <span>{subredditInfo?.icon || '🐾'}</span>
                <span>{post.subreddit || 'r/RescueEmergency'}</span>
              </button>

              {/* Urgency Badge */}
              {post.urgency === 'critical' && (
                <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full animate-pulse border border-red-200 dark:border-red-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  🚨 حرج جداً (Critical SOS)
                </span>
              )}
              {post.urgency === 'high' && (
                <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  ⚠️ عاجل (Urgent)
                </span>
              )}

              {/* Marketplace Category Badge */}
              {marketplaceInfo && (
                <span className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-medium px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                  <span>{marketplaceInfo.icon}</span>
                  <span>{marketplaceInfo.label}</span>
                </span>
              )}

              {/* Resolved Status */}
              {post.status === 'resolved' && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم الإنقاذ بنجاح ✓
                </span>
              )}

              {/* Nearby Radar Indicator */}
              {isUserNearby && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  <MapPin className="w-3 h-3 text-teal-500" />
                  قريب منك
                </span>
              )}

              <span className="text-gray-400">•</span>

              {/* Author Info with Rescuer Badges & Karma */}
              {post.is_anonymous ? (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                  <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                    🕵️
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    فاعل خير مجهول (Anonymous)
                  </span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">
                    هوية محمية
                  </span>
                </div>
              ) : (
                <Link
                  to={`/user/${post.user_id}`}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (post.profiles?.username || post.profiles?.email || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {post.profiles?.username || post.profiles?.email?.split('@')[0] || 'User'}
                  </span>

                  {/* Rescuer Badge */}
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-md ${badge.bgColor} ${badge.textColor} border ${badge.border}`}
                    title={badge.description}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.name.split(' ')[1] || badge.name}</span>
                  </span>

                  {/* Karma Score */}
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                    ⭐{karma}
                  </span>
                </Link>
              )}

              <span className="text-gray-400">•</span>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(post.created_at).toLocaleDateString('ar-EG', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Owner Actions */}
            {currentUserId === post.user_id && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(post.id);
                      }}
                      className="w-full text-right px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المنشور</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Line */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2.5">
            <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {post.area ? `${post.area}، ` : ''}
              {post.region}، {post.country}
            </span>
            {post.animal_type && (
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-[11px] font-medium mr-2">
                {post.animal_type}
              </span>
            )}
          </div>

          {/* Post Title */}
          {post.title && (
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">
              <Link to={`/sos/${post.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {post.title}
              </Link>
            </h2>
          )}

          {/* Description Text */}
          <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-line leading-relaxed">
            {post.description}
          </p>

          {/* Media: Before & After View for Success Stories */}
          {post.subreddit === 'r/SuccessStories' && post.before_after_image_url ? (
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold px-1">
                <span className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  قصة تحول ملهمة (Before & After)
                </span>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg text-[11px]">
                  <button
                    onClick={() => setActiveStoryTab('both')}
                    className={`px-2 py-0.5 rounded ${activeStoryTab === 'both' ? 'bg-white dark:bg-gray-800 font-bold shadow-xs' : 'text-gray-500'}`}
                  >
                    مقارنة معاً
                  </button>
                  <button
                    onClick={() => setActiveStoryTab('before')}
                    className={`px-2 py-0.5 rounded ${activeStoryTab === 'before' ? 'bg-white dark:bg-gray-800 font-bold shadow-xs' : 'text-gray-500'}`}
                  >
                    قبل
                  </button>
                  <button
                    onClick={() => setActiveStoryTab('after')}
                    className={`px-2 py-0.5 rounded ${activeStoryTab === 'after' ? 'bg-white dark:bg-gray-800 font-bold shadow-xs' : 'text-gray-500'}`}
                  >
                    بعد
                  </button>
                </div>
              </div>

              {activeStoryTab === 'both' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => displayImage && onOpenImageModal(displayImage)}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  >
                    {displayImage && (
                      <img src={displayImage} alt="Before" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                    <span className="absolute bottom-2 right-2 bg-red-600/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      قبل الإنقاذ
                    </span>
                  </div>

                  <div
                    onClick={() => onOpenImageModal(post.before_after_image_url!)}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-700 border border-emerald-300 dark:border-emerald-700"
                  >
                    <img
                      src={post.before_after_image_url}
                      alt="After"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 right-2 bg-emerald-600/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      بعد التبني والتعافي ✨
                    </span>
                  </div>
                </div>
              ) : activeStoryTab === 'before' ? (
                <div
                  onClick={() => displayImage && onOpenImageModal(displayImage)}
                  className="relative max-h-96 rounded-xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  {displayImage && <img src={displayImage} alt="Before" className="max-h-96 object-contain" />}
                  <span className="absolute bottom-2 right-2 bg-red-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    قبل الإنقاذ
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => onOpenImageModal(post.before_after_image_url!)}
                  className="relative max-h-96 rounded-xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  <img src={post.before_after_image_url} alt="After" className="max-h-96 object-contain" />
                  <span className="absolute bottom-2 right-2 bg-emerald-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    بعد التبني والتعافي ✨
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Standard Media Image */
            displayImage && (
              <div
                className="relative w-full max-h-[460px] bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden cursor-pointer mb-3 flex items-center justify-center border border-gray-200 dark:border-gray-700 group"
                onClick={() => onOpenImageModal(post.image_url)}
              >
                <img
                  src={displayImage}
                  alt={post.title || 'Pet or Stray'}
                  className="max-h-[460px] w-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>1 / {images.length}</span>
                  </div>
                )}
              </div>
            )
          )}

          {/* Bottom Reddit Actions Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs font-bold text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile Voting Horizontal Bar */}
              <div className="flex sm:hidden items-center bg-gray-100 dark:bg-gray-700 rounded-full px-1">
                <button
                  onClick={() => onVote(post.id, 1)}
                  className={`p-1.5 ${post.user_vote === 1 ? 'text-orange-600' : ''}`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <span className="px-1 font-bold font-mono text-gray-900 dark:text-white">
                  {netScore}
                </span>
                <button
                  onClick={() => onVote(post.id, -1)}
                  className={`p-1.5 ${post.user_vote === -1 ? 'text-indigo-600' : ''}`}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Comments */}
              <Link
                to={`/sos/${post.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>التعليقات</span>
              </Link>

              {/* Share */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>{showCopied ? 'تم نسخ الرابط ✓' : 'مشاركة'}</span>
              </button>
            </div>

            {/* Direct Message (if not owner and not anonymous) */}
            {currentUserId !== post.user_id && (
              <button
                onClick={handleRespond}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مراسلة مباشرة</span>
                <span className="sm:hidden">مراسلة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
