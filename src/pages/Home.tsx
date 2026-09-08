import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AnimalSOS } from '../types';
import { useAuth } from '../components/AuthProvider';
import { MapPin, Clock, MessageCircle, AlertCircle, Navigation, Heart, ChevronRight, ChevronLeft, X, ArrowUp, ArrowDown, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function Home() {
  const [sosList, setSosList] = useState<AnimalSOS[]>([]);
  const [filteredList, setFilteredList] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNearMeLoading, setIsNearMeLoading] = useState(false);
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [searchParams] = useSearchParams();
  const animalTypeFilter = searchParams.get('type');
  
  // Modal states
  const [selectedImages, setSelectedImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSOS();
  }, []);

  useEffect(() => {
    applyFilters(sosList);
  }, [animalTypeFilter, sosList]);

  const applyFilters = (list: AnimalSOS[], detectedCountry?: string) => {
    let result = list;
    
    if (animalTypeFilter) {
      result = result.filter(sos => sos.animal_type === animalTypeFilter);
    }
    
    if (detectedCountry) {
      result = result.filter(sos => 
        sos.country?.toLowerCase() === detectedCountry.toLowerCase()
      );
    }

    setFilteredList(result);
  };

  const fetchSOS = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    // Fetch SOS with votes
    const { data, error } = await supabase
      .from('animal_sos')
      .select('*, profiles(email, username, avatar_url), sos_votes(user_id, vote_value)')
      .eq('status', 'open') // Only show active calls in feed
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Calculate vote score for each SOS
      const processedData = data.map((sos: any) => {
        const votes = sos.sos_votes || [];
        const upvotes = votes.filter((v: any) => v.vote_value === 1).length;
        const downvotes = votes.filter((v: any) => v.vote_value === -1).length;
        const userVote = user ? votes.find((v: any) => v.user_id === user.id)?.vote_value : 0;
        return { ...sos, upvotes, downvotes, user_vote: userVote };
      });
      setSosList(processedData as AnimalSOS[]);
    } else if (error && error.code === 'PGRST200') {
      // Fallback if sos_votes relation doesn't exist yet
      const { data: fallbackData } = await supabase
        .from('animal_sos')
        .select('*, profiles(email, username, avatar_url)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (fallbackData) {
        const processedData = fallbackData.map((sos: any) => ({ ...sos, upvotes: 0, downvotes: 0, user_vote: 0 }));
        setSosList(processedData as AnimalSOS[]);
      }
    }
    setLoading(false);
  };

  const handleRespond = (sos: AnimalSOS) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?user=${sos.user_id}&sos=${sos.id}`);
  };

  const handleNearMe = async () => {
    if (isNearMeActive) {
      setIsNearMeActive(false);
      applyFilters(sosList, undefined);
      return;
    }

    setIsNearMeLoading(true);

    const applyCountryFilter = (detectedCountry: string) => {
      applyFilters(sosList, detectedCountry);
      // Double check if empty
      const filtered = sosList.filter(sos => 
        sos.country?.toLowerCase() === detectedCountry?.toLowerCase() && 
        (!animalTypeFilter || sos.animal_type === animalTypeFilter)
      );
      if (filtered.length === 0) {
        alert(`We found your location (${detectedCountry}) but there are no matching SOS calls here right now.`);
      } else {
        setIsNearMeActive(true);
      }
      setIsNearMeLoading(false);
    };

    const ipFallback = async () => {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en`);
        const data = await res.json();
        
        if (data && data.countryName) {
          applyCountryFilter(data.countryName);
        } else {
          alert("Could not determine your country from the location.");
          setIsNearMeLoading(false);
        }
      } catch (e) {
        alert("Could not detect location automatically. Please check your connection.");
        setIsNearMeLoading(false);
      }
    };

    // Fast path: just use IP API directly for better UX (no permission prompts needed, instant)
    // The user specifically requested a reliable alternative that does the job.
    ipFallback();
  };

  const resetFilter = () => {
    navigate('/');
    setIsNearMeActive(false);
    setFilteredList(sosList);
  };

  const openImageModal = (imageUrlsStr: string) => {
    if (!imageUrlsStr) return;
    const urls = imageUrlsStr.split(',');
    setSelectedImages(urls);
    setCurrentImageIndex(0);
  };

  const handleVote = async (sosId: string, value: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!supabase) return;

    const sos = sosList.find(s => s.id === sosId);
    if (!sos) return;

    const previousVote = sos.user_vote || 0;
    const isRemoving = previousVote === value;
    
    // Store old state for rollback
    const oldUpvotes = sos.upvotes || 0;
    const oldDownvotes = sos.downvotes || 0;
    const oldUserVote = previousVote;

    // Optimistic UI update
    setSosList(prev => prev.map(s => {
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
          if (error.code === '42P01') {
            console.error('Voting system is not initialized yet.');
          } else {
            console.error(error);
          }
          throw error;
        }

        // Notification logic
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
      // Revert optimistic update
      setSosList(prev => prev.map(s => s.id === sosId ? { ...s, upvotes: oldUpvotes, downvotes: oldDownvotes, user_vote: oldUserVote } : s));
    }
  };

  const handleDelete = async (sosId: string) => {
    if (!window.confirm("Are you sure you want to delete this SOS call?")) return;
    
    if (!supabase) return;
    const { error } = await supabase.from('animal_sos').delete().eq('id', sosId).eq('user_id', user?.id);
    
    if (error) {
      alert("Failed to delete post.");
      console.error(error);
    } else {
      setSosList(prev => prev.filter(s => s.id !== sosId));
    }
  };

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Database Not Configured</h3>
        <p className="mt-1 text-gray-500">Please connect Supabase to view and report SOS calls.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {animalTypeFilter ? `${animalTypeFilter} SOS Feed` : 'SOS Feed'}
          </h1>
          <p className="mt-2 text-gray-600">Help stray animals in need</p>
        </div>
        
        <div className="flex gap-3 items-center">
          {(filteredList.length !== sosList.length || animalTypeFilter) && (
            <button
              onClick={resetFilter}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2 px-3 py-2"
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={handleNearMe}
            disabled={isNearMeLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition disabled:opacity-50 ${isNearMeActive ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
          >
            {isNearMeLoading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : isNearMeActive ? (
              <X className="h-4 w-4" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {isNearMeActive ? 'Clear Location' : 'Calls Near Me'}
          </button>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-2xl mx-auto">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No active calls found</h3>
          <p className="mt-1 text-gray-500">There are currently no stray animal reports matching your criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
          {filteredList.map((sos) => {
            const images = sos.image_url ? sos.image_url.split(',') : [];
            const displayImage = images.length > 0 ? images[0] : null;

            return (
              <div key={sos.id} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-300 dark:border-gray-700 flex flex-col hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                
                <div className="p-4 flex flex-col relative">
                  {/* Header */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-wrap pr-8">
                     <Link to={`/user/${sos.user_id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                       {sos.profiles?.avatar_url ? (
                         <img src={sos.profiles.avatar_url} alt="User" className="w-6 h-6 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                       ) : (
                         <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">
                           {(sos.profiles?.username || sos.profiles?.email || 'U').charAt(0).toUpperCase()}
                         </div>
                       )}
                       <span className="font-bold text-gray-900 dark:text-gray-100">{sos.profiles?.username || sos.profiles?.email?.split('@')[0] || 'user'}</span>
                     </Link>
                     <span className="dark:text-gray-500">•</span>
                     {sos.animal_type && (
                       <span className="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{sos.animal_type}</span>
                     )}
                     <span>•</span>
                     <span>{new Date(sos.created_at).toLocaleDateString()}</span>
                     <span>•</span>
                     <MapPin className="h-3 w-3 ml-1" />
                     <span>{sos.area ? `${sos.area}, ` : ''}{sos.region}, {sos.country}</span>
                  </div>

                  {user?.id === sos.user_id && (
                    <div className="absolute top-4 right-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === sos.id ? null : sos.id);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {menuOpenId === sos.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sos.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Content */}
                  <p className="text-gray-900 dark:text-gray-100 text-sm mb-3">
                    {sos.description}
                  </p>

                  {/* Media */}
                  {displayImage ? (
                    <div 
                      className="relative w-full max-h-[500px] bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden cursor-pointer mb-2 flex items-center justify-center"
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
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-md mb-2 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      <AlertCircle className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center gap-2 mt-3 text-gray-500 dark:text-gray-400 font-bold text-xs">
                    
                    {/* Horizontal Voting Pills */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-1">
                        <button 
                          onClick={() => handleVote(sos.id, 1)} 
                          className={`p-1.5 rounded-full transition-colors ${sos.user_vote === 1 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-orange-500'}`}
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
                          className={`p-1.5 rounded-full transition-colors ${sos.user_vote === -1 ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500'}`}
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
                        className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 rounded transition-colors text-indigo-600 dark:text-indigo-400 ml-auto"
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
                
                {/* Dots indicator */}
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
