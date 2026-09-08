import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnimalSOS, Profile } from '../types';
import { useAuth } from '../components/AuthProvider';
import {
  ArrowLeft,
  Facebook,
  Instagram,
  Twitter,
  Trophy,
  Shield,
  Heart,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import PostCard from '../components/PostCard';
import { extractPostMetadata } from '../utils/postHelpers';
import { calculateUserKarma, getBadgeByKarma } from '../utils/karmaHelpers';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox
  const [selectedImages, setSelectedImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    if (!supabase || !id) return;
    setLoading(true);

    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Fetch Posts with votes
      const { data: postsData, error } = await supabase
        .from('animal_sos')
        .select('*, profiles(id, email, username, avatar_url, karma, rescue_badge), sos_votes(user_id, vote_value)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (!error && postsData) {
        const processedData = postsData.map((sos: any) => {
          const votes = sos.sos_votes || [];
          const upvotes = votes.filter((v: any) => v.vote_value === 1).length;
          const downvotes = votes.filter((v: any) => v.vote_value === -1).length;
          const userVote = user ? votes.find((v: any) => v.user_id === user.id)?.vote_value : 0;
          return extractPostMetadata({
            ...sos,
            upvotes,
            downvotes,
            user_vote: userVote
          });
        });
        setUserPosts(processedData);
      } else {
        const { data: fallbackData } = await supabase
          .from('animal_sos')
          .select('*, profiles(id, email, username, avatar_url)')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (fallbackData) {
          const processedData = fallbackData.map((sos: any) =>
            extractPostMetadata({ ...sos, upvotes: 0, downvotes: 0, user_vote: 0 })
          );
          setUserPosts(processedData);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (sosId: string, value: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!supabase) return;

    const sos = userPosts.find((s) => s.id === sosId);
    if (!sos) return;

    const previousVote = sos.user_vote || 0;
    const isRemoving = previousVote === value;

    const oldUpvotes = sos.upvotes || 0;
    const oldDownvotes = sos.downvotes || 0;
    const oldUserVote = previousVote;

    setUserPosts((prev) =>
      prev.map((s) => {
        if (s.id === sosId) {
          let newUpvotes = oldUpvotes;
          let newDownvotes = oldDownvotes;

          if (isRemoving) {
            if (value === 1) newUpvotes = Math.max(0, newUpvotes - 1);
            if (value === -1) newDownvotes = Math.max(0, newDownvotes - 1);
            return {
              ...s,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              user_vote: 0,
              vote_score: newUpvotes - newDownvotes
            };
          } else {
            if (previousVote === 1) newUpvotes = Math.max(0, newUpvotes - 1);
            if (previousVote === -1) newDownvotes = Math.max(0, newDownvotes - 1);
            if (value === 1) newUpvotes += 1;
            if (value === -1) newDownvotes += 1;
            return {
              ...s,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              user_vote: value,
              vote_score: newUpvotes - newDownvotes
            };
          }
        }
        return s;
      })
    );

    try {
      if (isRemoving) {
        await supabase
          .from('sos_votes')
          .delete()
          .eq('sos_id', sosId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('sos_votes').upsert(
          { sos_id: sosId, user_id: user.id, vote_value: value },
          { onConflict: 'sos_id, user_id' }
        );

        if (sos.user_id !== user.id) {
          try {
            await supabase.from('notifications').insert({
              user_id: sos.user_id,
              actor_id: user.id,
              type: 'vote',
              post_id: sos.id
            });
          } catch (e) {
            console.warn('Could not send notification:', e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setUserPosts((prev) =>
        prev.map((s) =>
          s.id === sosId
            ? {
                ...s,
                upvotes: oldUpvotes,
                downvotes: oldDownvotes,
                user_vote: oldUserVote,
                vote_score: oldUpvotes - oldDownvotes
              }
            : s
        )
      );
    }
  };

  const handleDelete = async (sosId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنشور؟')) return;
    if (!supabase || !user) return;

    const { error } = await supabase
      .from('animal_sos')
      .delete()
      .eq('id', sosId)
      .eq('user_id', user.id);

    if (!error) {
      setUserPosts((prev) => prev.filter((s) => s.id !== sosId));
    }
  };

  const openImageModal = (imageUrlsStr: string) => {
    if (!imageUrlsStr) return;
    const urls = imageUrlsStr.split(',');
    setSelectedImages(urls);
    setCurrentImageIndex(0);
  };

  // Karma calculation
  const dynamicKarma = calculateUserKarma(userPosts);
  const userKarma = profile?.karma && profile.karma > dynamicKarma ? profile.karma : dynamicKarma;
  const userBadge = getBadgeByKarma(userKarma);
  const resolvedRescuesCount = userPosts.filter((p) => p.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-72">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          المستخدم غير موجود
        </h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-full transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>العودة إلى مجتمعات الحيوانات</span>
        </button>
      </div>

      {/* Profile Header & Rescuer Honors Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Badge ring */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-indigo-100 dark:border-indigo-900 shadow-sm flex items-center justify-center text-3xl font-bold">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile.username || profile.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div
              className="absolute -bottom-2 -right-2 text-xl bg-white dark:bg-gray-800 p-1 rounded-full shadow-md border"
              title={userBadge.name}
            >
              {userBadge.icon}
            </div>
          </div>

          {/* Details */}
          <div className="text-center sm:text-right flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                  {profile.username || profile.email?.split('@')[0]}
                </h1>
                <p className="text-xs text-gray-400">
                  انضم في {new Date(profile.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>

              {/* Badge Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${userBadge.bgColor} ${userBadge.textColor} border ${userBadge.border}`}
              >
                <span>{userBadge.icon}</span>
                <span>{userBadge.name}</span>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                {profile.bio}
              </p>
            )}

            {/* Rescuer Karma Stats Strip */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60 text-center">
              <div className="bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                  ⭐ {userKarma}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                  نقاط الكارما (Rescue Karma)
                </p>
              </div>

              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ✓ {resolvedRescuesCount}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                  حالات تم إنقاذها
                </p>
              </div>

              <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {userPosts.length}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                  إجمالي المنشورات
                </p>
              </div>
            </div>

            {/* Social Links */}
            {(profile.facebook_url || profile.instagram_url || profile.twitter_url) && (
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
                {profile.facebook_url && (
                  <a
                    href={profile.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 dark:bg-blue-900/30"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 dark:bg-pink-900/30"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 dark:bg-gray-700"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User's Posts Feed */}
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>منشورات ومساهمات المنقذ</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full">
            {userPosts.length}
          </span>
        </h2>

        {userPosts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-xs text-gray-500">
            لم يقم هذا المستخدم بنشر أي بلاغات أو قصص حتى الآن.
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onVote={handleVote}
                onDelete={handleDelete}
                onOpenImageModal={openImageModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xs p-4">
          <button
            onClick={() => setSelectedImages(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/50 p-2.5 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedImages[currentImageIndex]}
            alt=""
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
