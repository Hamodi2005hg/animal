import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnimalSOS, Profile } from '../types';
import { useAuth } from '../components/AuthProvider';
import { MapPin, MessageCircle, AlertCircle, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, ArrowLeft, Facebook, Instagram, Twitter, Globe } from 'lucide-react';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
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

    // Fetch Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }

    // Fetch Posts with votes
    const { data: postsData, error } = await supabase
      .from('animal_sos')
      .select('*, profiles(email, username, avatar_url), sos_votes(user_id, vote_value)')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (!error && postsData) {
      const processedData = postsData.map((sos: any) => {
        const votes = sos.sos_votes || [];
        const upvotes = votes.filter((v: any) => v.vote_value === 1).length;
        const downvotes = votes.filter((v: any) => v.vote_value === -1).length;
        const userVote = user ? votes.find((v: any) => v.user_id === user.id)?.vote_value : 0;
        return { ...sos, upvotes, downvotes, user_vote: userVote };
      });
      setUserPosts(processedData as AnimalSOS[]);
    } else if (error && error.code === 'PGRST200') {
      // Fallback if sos_votes relation doesn't exist yet
      const { data: fallbackData } = await supabase
        .from('animal_sos')
        .select('*, profiles(email, username, avatar_url)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      
      if (fallbackData) {
        const processedData = fallbackData.map((sos: any) => ({ ...sos, upvotes: 0, downvotes: 0, user_vote: 0 }));
        setUserPosts(processedData as AnimalSOS[]);
      }
    }
    
    setLoading(false);
  };

  const handleVote = async (sosId: string, value: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!supabase) return;

    const sos = userPosts.find(s => s.id === sosId);
    if (!sos) return;

    const previousVote = sos.user_vote || 0;
    const isRemoving = previousVote === value;
    
    // Store old state for rollback
    const oldUpvotes = sos.upvotes || 0;
    const oldDownvotes = sos.downvotes || 0;
    const oldUserVote = previousVote;

    // Optimistic UI update
    setUserPosts(prev => prev.map(s => {
      if (s.id === sosId) {
        let newUpvotes = oldUpvotes;
        let newDownvotes = oldDownvotes;
        
        if (isRemoving) {
          if (value === 1) newUpvotes = Math.max(0, newUpvotes - 1);
          if (value === -1) newDownvotes = Math.max(0, newDownvotes - 1);
          return { ...s, upvotes: newUpvotes, downvotes: newDownvotes, user_vote: 0 };
        } else {
          if (previousVote === 1) newUpvotes = Math.max(0, newUpvotes - 1);
          if (previousVote === -1) newDownvotes = Math.max(0, newDownvotes - 1);
          if (value === 1) newUpvotes += 1;
          if (value === -1) newDownvotes += 1;
          return { ...s, upvotes: newUpvotes, downvotes: newDownvotes, user_vote: value };
        }
      }
      return s;
    }));
    
    try {
      if (isRemoving) {
        const { error } = await supabase
          .from('sos_votes')
          .delete()
          .eq('sos_id', sosId)
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sos_votes')
          .upsert({ 
            sos_id: sosId, 
            user_id: user.id, 
            vote_value: value 
          }, { onConflict: 'sos_id, user_id' });
          
        if (error) {
          throw error;
        }

        if (sos.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: sos.user_id,
            actor_id: user.id,
            type: 'vote',
            post_id: sos.id
          }).catch(() => {});
        }
      }
    } catch(err) {
      console.error(err);
      setUserPosts(prev => prev.map(s => s.id === sosId ? { ...s, upvotes: oldUpvotes, downvotes: oldDownvotes, user_vote: oldUserVote } : s));
    }
  };

  const handleRespond = (sos: AnimalSOS) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.id === sos.user_id) {
      navigate('/messages');
      return;
    }
    navigate(`/messages?user=${sos.user_id}&sos=${sos.id}`);
  };

  const openImageModal = (imageUrlsStr: string) => {
    if (!imageUrlsStr) return;
    const urls = imageUrlsStr.split(',');
    setSelectedImages(urls);
    setCurrentImageIndex(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">User not found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-full transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 font-bold text-4xl">{(profile.username || profile.email || 'U').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {profile.username || profile.email?.split('@')[0]}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
          
          {profile?.bio && (
            <p className="mt-4 text-gray-700 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              {profile.bio}
            </p>
          )}

          {/* Social Links */}
          {(profile?.facebook_url || profile?.instagram_url || profile?.twitter_url) && (
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-5">
              {profile.facebook_url && (
                <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {profile.instagram_url && (
                <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {profile.twitter_url && (
                <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6 dark:text-white">Posts by {profile.username || profile.email?.split('@')[0]}</h2>

      {/* Posts Feed */}
      {userPosts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">This user hasn't posted any SOS calls yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto sm:mx-0">
          {userPosts.map((sos) => {
            const images = sos.image_url ? sos.image_url.split(',') : [];
            const displayImage = images.length > 0 ? images[0] : null;

            return (
              <div key={sos.id} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-300 dark:border-gray-700 flex flex-col hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <div className="p-4 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {sos.profiles?.avatar_url ? (
                        <img src={sos.profiles.avatar_url} alt="User" className="w-6 h-6 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                          {(sos.profiles?.username || sos.profiles?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold text-gray-900 dark:text-gray-100">{sos.profiles?.username || sos.profiles?.email?.split('@')[0] || 'user'}</span>
                    </div>
                    <span className="dark:text-gray-500">•</span>
                    {sos.animal_type && (
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{sos.animal_type}</span>
                    )}
                    <span className="dark:text-gray-500">•</span>
                    <span>{new Date(sos.created_at).toLocaleDateString()}</span>
                    <span className="dark:text-gray-500">•</span>
                    <MapPin className="h-3 w-3 ml-1" />
                    <span>{sos.area ? `${sos.area}, ` : ''}{sos.region}, {sos.country}</span>
                  </div>
                  
                  {/* Content */}
                  <p className="text-gray-900 dark:text-gray-100 text-sm mb-3">
                    {sos.description}
                  </p>

                  {/* Media */}
                  {displayImage ? (
                    <div 
                      className="relative w-full max-h-[500px] bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden cursor-pointer mb-2 flex items-center justify-center"
                      onClick={() => openImageModal(sos.image_url)}
                    >
                      <img 
                        src={displayImage} 
                        alt="Stray Animal" 
                        className="max-h-[500px] object-contain"
                      />
                      {images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                          1 / {images.length}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-md mb-2 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                      <AlertCircle className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center gap-2 mt-3 text-gray-500 dark:text-gray-400 font-bold text-xs">
                    {/* Horizontal Voting Pills */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-1">
                        <button 
                          onClick={() => handleVote(sos.id, 1)} 
                          className={`p-1.5 rounded-full transition-colors ${sos.user_vote === 1 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400'}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-xs px-1 pr-2">
                          {sos.upvotes || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-1">
                        <button 
                          onClick={() => handleVote(sos.id, -1)} 
                          className={`p-1.5 rounded-full transition-colors ${sos.user_vote === -1 ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-xs px-1 pr-2">
                          {sos.downvotes || 0}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/sos/${sos.id}`)}
                      className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comments
                    </button>
                    
                    {user?.id !== sos.user_id && (
                      <button
                        onClick={() => handleRespond(sos)}
                        className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 rounded transition-colors text-indigo-600 dark:text-indigo-400"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Direct Message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Modal / Lightbox */}
      {selectedImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
          <button 
            onClick={() => setSelectedImages(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
            <img 
              src={selectedImages[currentImageIndex]} 
              alt="Enlarged Animal" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            
            {selectedImages.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => prev === 0 ? selectedImages.length - 1 : prev - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => prev === selectedImages.length - 1 ? 0 : prev + 1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                  {selectedImages.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-2 w-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/40'}`} 
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
