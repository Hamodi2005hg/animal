import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AnimalSOS, SubredditType } from '../types';
import { useAuth } from '../components/AuthProvider';
import { ChevronRight, ChevronLeft, X, AlertCircle, Heart, PlusCircle, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import SubredditTabs from '../components/SubredditTabs';
import FeedSortBar, { SortMode } from '../components/FeedSortBar';
import CommunitySidebar from '../components/CommunitySidebar';
import PostCard from '../components/PostCard';
import { extractPostMetadata } from '../utils/postHelpers';
import { calculateUserKarma } from '../utils/karmaHelpers';

export default function Home() {
  const [sosList, setSosList] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);

  // Subreddit and Community Filters
  const [selectedSubreddit, setSelectedSubreddit] = useState<SubredditType | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<'all' | 'rescue' | 'success' | 'pets' | 'marketplace'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('hot');

  // Location Radar State
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [isNearMeLoading, setIsNearMeLoading] = useState(false);
  const [userCountry, setUserCountry] = useState<string | undefined>(undefined);
  const [userRegion, setUserRegion] = useState<string | undefined>(undefined);
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  // Image Modal / Lightbox
  const [selectedImages, setSelectedImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const animalTypeFilter = searchParams.get('type');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSOS();
  }, []);

  const fetchSOS = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch posts with profiles and votes
      const { data, error } = await supabase
        .from('animal_sos')
        .select('*, profiles(id, email, username, avatar_url, karma, rescue_badge), sos_votes(user_id, vote_value)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const processedData = data.map((sos: any) => {
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
        setSosList(processedData);
      } else {
        // Fallback query if relation isn't created yet
        const { data: fallbackData } = await supabase
          .from('animal_sos')
          .select('*, profiles(id, email, username, avatar_url)')
          .order('created_at', { ascending: false });

        if (fallbackData) {
          const processedData = fallbackData.map((sos: any) =>
            extractPostMetadata({
              ...sos,
              upvotes: 0,
              downvotes: 0,
              user_vote: 0
            })
          );
          setSosList(processedData);
        }
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract distinct countries for radar filter
  const countriesList = useMemo(() => {
    const set = new Set<string>();
    sosList.forEach((s) => {
      if (s.country) set.add(s.country);
    });
    return Array.from(set).sort();
  }, [sosList]);

  // Rescuer Karma Leaderboard calculation
  const leaderboardUsers = useMemo(() => {
    const userMap: Record<
      string,
      {
        id: string;
        username: string;
        avatar_url?: string;
        karma: number;
        resolvedCount: number;
      }
    > = {};

    sosList.forEach((post) => {
      if (post.is_anonymous || !post.user_id) return;
      const uId = post.user_id;
      const uName =
        post.profiles?.username ||
        post.profiles?.email?.split('@')[0] ||
        'Guardian';
      const uAvatar = post.profiles?.avatar_url;

      if (!userMap[uId]) {
        userMap[uId] = {
          id: uId,
          username: uName,
          avatar_url: uAvatar,
          karma: post.profiles?.karma || 15,
          resolvedCount: 0
        };
      }

      // Add points for resolved rescues
      if (post.status === 'resolved') {
        userMap[uId].resolvedCount += 1;
        userMap[uId].karma += 50;
      } else {
        userMap[uId].karma += 15;
      }

      // Add points for upvotes
      const net = (post.upvotes || 0) - (post.downvotes || 0);
      if (net > 0) userMap[uId].karma += net * 5;
    });

    return Object.values(userMap).sort((a, b) => b.karma - a.karma);
  }, [sosList]);

  // Reddit Ranking & Filtering Algorithm
  const displayedPosts = useMemo(() => {
    let result = [...sosList];

    // 1. Subreddit / Category Filter
    if (selectedSubreddit !== 'all') {
      result = result.filter((p) => p.subreddit === selectedSubreddit);
    } else if (activeCategory === 'rescue') {
      result = result.filter((p) => p.subreddit === 'r/RescueEmergency');
    } else if (activeCategory === 'success') {
      result = result.filter((p) => p.subreddit === 'r/SuccessStories');
    } else if (activeCategory === 'pets') {
      result = result.filter(
        (p) =>
          p.subreddit === 'r/Cats' ||
          p.subreddit === 'r/Dogs' ||
          p.subreddit === 'r/Birds' ||
          p.subreddit === 'r/VetAdvice' ||
          p.subreddit === 'r/FunnyPets'
      );
    } else if (activeCategory === 'marketplace') {
      result = result.filter((p) => p.subreddit === 'r/PetMarketplace');
    }

    // 2. Animal Type Filter (from search bar)
    if (animalTypeFilter) {
      result = result.filter(
        (p) => p.animal_type?.toLowerCase() === animalTypeFilter.toLowerCase()
      );
    }

    // 3. Location Radar Filter
    if (isNearMeActive && userCountry) {
      result = result.filter(
        (p) => p.country?.toLowerCase() === userCountry.toLowerCase()
      );
    } else if (selectedCountry) {
      result = result.filter(
        (p) => p.country?.toLowerCase() === selectedCountry.toLowerCase()
      );
    }

    // 4. Reddit-style Sorting Modes
    if (sortMode === 'critical') {
      // Emergency priority: Critical posts rise first, then high urgency, then net upvotes
      result.sort((a, b) => {
        const urgWeight = (urg?: string) =>
          urg === 'critical' ? 1000 : urg === 'high' ? 500 : 100;
        const scoreA = urgWeight(a.urgency) + (a.vote_score || 0);
        const scoreB = urgWeight(b.urgency) + (b.vote_score || 0);
        return scoreB - scoreA;
      });
    } else if (sortMode === 'hot') {
      // Hot Algorithm: Score + recency decay + boost for critical emergency
      const now = Date.now();
      result.sort((a, b) => {
        const ageHoursA = Math.max(1, (now - new Date(a.created_at).getTime()) / 3600000);
        const ageHoursB = Math.max(1, (now - new Date(b.created_at).getTime()) / 3600000);
        const boostA = a.urgency === 'critical' ? 50 : 0;
        const boostB = b.urgency === 'critical' ? 50 : 0;
        const hotA = ((a.vote_score || 0) + 10 + boostA) / Math.pow(ageHoursA + 2, 1.2);
        const hotB = ((b.vote_score || 0) + 10 + boostB) / Math.pow(ageHoursB + 2, 1.2);
        return hotB - hotA;
      });
    } else if (sortMode === 'top') {
      // Highest net upvotes
      result.sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0));
    } else if (sortMode === 'new') {
      // Pure chronological
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [
    sosList,
    selectedSubreddit,
    activeCategory,
    animalTypeFilter,
    isNearMeActive,
    userCountry,
    selectedCountry,
    sortMode
  ]);

  // Location detection for "Near Me Radar"
  const handleToggleNearMe = async () => {
    if (isNearMeActive) {
      setIsNearMeActive(false);
      return;
    }

    setIsNearMeLoading(true);
    try {
      const res = await fetch(
        'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'
      );
      const data = await res.json();
      if (data && data.countryName) {
        setUserCountry(data.countryName);
        setUserRegion(data.principalSubdivision || '');
        setIsNearMeActive(true);
      } else {
        alert('تعذر تحديد دولتك تلقائياً، يمكنك اختيار دولتك من القائمة يدوياً.');
      }
    } catch {
      alert('تعذر الوصول لخدمة تحديد الموقع، يرجى فحص الاتصال.');
    } finally {
      setIsNearMeLoading(false);
    }
  };

  // Voting handler with optimistic UI
  const handleVote = async (sosId: string, value: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!supabase) return;

    const targetPost = sosList.find((s) => s.id === sosId);
    if (!targetPost) return;

    const previousVote = targetPost.user_vote || 0;
    const isRemoving = previousVote === value;

    const oldUpvotes = targetPost.upvotes || 0;
    const oldDownvotes = targetPost.downvotes || 0;
    const oldUserVote = previousVote;

    // Optimistic UI update
    setSosList((prev) =>
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
          {
            sos_id: sosId,
            user_id: user.id,
            vote_value: value
          },
          { onConflict: 'sos_id, user_id' }
        );

        if (targetPost.user_id !== user.id) {
          try {
            await supabase.from('notifications').insert({
              user_id: targetPost.user_id,
              actor_id: user.id,
              type: 'vote',
              post_id: targetPost.id
            });
          } catch (e) {
            console.warn('Could not send notification:', e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setSosList((prev) =>
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
      setSosList((prev) => prev.filter((s) => s.id !== sosId));
    } else {
      alert('تعذر حذف المنشور.');
    }
  };

  const openImageModal = (imageUrlsStr: string) => {
    if (!imageUrlsStr) return;
    const urls = imageUrlsStr.split(',');
    setSelectedImages(urls);
    setCurrentImageIndex(0);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-gray-500">جاري تحميل مجتمعات الحيوانات...</p>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          قاعدة البيانات غير مهيأة
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          يرجى ربط Supabase لعرض والمشاركة في مجتمعات الحيوانات.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 4 Main Community Tabs */}
      <SubredditTabs
        selectedSubreddit={selectedSubreddit}
        onSelectSubreddit={(sub) => setSelectedSubreddit(sub)}
        activeCategory={activeCategory}
        onSelectCategory={(cat) => setActiveCategory(cat)}
      />

      {/* Reddit Feed Sort Bar & Location Radar */}
      <FeedSortBar
        sortMode={sortMode}
        onSortChange={(m) => setSortMode(m)}
        isNearMeActive={isNearMeActive}
        isNearMeLoading={isNearMeLoading}
        onToggleNearMe={handleToggleNearMe}
        userCountry={userCountry}
        selectedCountry={selectedCountry}
        onCountryChange={(c) => setSelectedCountry(c)}
        countriesList={countriesList}
        totalResultsCount={displayedPosts.length}
      />

      {/* Main 2-Column Reddit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Posts Feed Column */}
        <main className="lg:col-span-8 space-y-4">
          {displayedPosts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-xs">
              <Heart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                لا توجد منشورات في هذا المجتمع حالياً
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
                كن أول من يشارك بلاغاً، قصة تبني ملهمة، أو يقدم مساعدة لحيوانات منطقتك!
              </p>
              <Link
                to="/create-sos"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>انشر أول منشور الآن</span>
              </Link>
            </div>
          ) : (
            displayedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onVote={handleVote}
                onDelete={handleDelete}
                onOpenImageModal={openImageModal}
                onSelectSubreddit={(sub) => {
                  setSelectedSubreddit(sub);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                isUserNearby={
                  Boolean(userCountry) &&
                  post.country?.toLowerCase() === userCountry?.toLowerCase()
                }
              />
            ))
          )}
        </main>

        {/* Reddit Community Sidebar Column */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-20">
            <CommunitySidebar
              selectedSubreddit={selectedSubreddit}
              activeCategory={activeCategory}
              leaderboardUsers={leaderboardUsers}
              totalRescuesCount={sosList.length}
              onSelectSubreddit={(sub) => setSelectedSubreddit(sub)}
            />
          </div>
        </aside>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xs p-4">
          <button
            onClick={() => setSelectedImages(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/50 p-2.5 rounded-full transition"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
            <img
              src={selectedImages[currentImageIndex]}
              alt="Pet or Rescue"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />

            {selectedImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? selectedImages.length - 1 : prev - 1
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-3 rounded-full hover:bg-black/80 transition"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) =>
                      prev === selectedImages.length - 1 ? 0 : prev + 1
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-3 rounded-full hover:bg-black/80 transition"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                  {selectedImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-white w-5' : 'bg-white/40 w-2'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
