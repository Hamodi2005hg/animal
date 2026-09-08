import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AnimalSOS } from '../types';
import { useAuth } from '../components/AuthProvider';
import { MapPin, Clock, MessageCircle, AlertCircle, Navigation, Heart, ChevronRight, ChevronLeft, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Home() {
  const [sosList, setSosList] = useState<AnimalSOS[]>([]);
  const [filteredList, setFilteredList] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNearMeLoading, setIsNearMeLoading] = useState(false);
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
      .select('*, profiles(email), sos_votes(vote_value)')
      .eq('status', 'open') // Only show active calls in feed
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Calculate vote score for each SOS
      const processedData = data.map((sos: any) => {
        const votes = sos.sos_votes || [];
        const score = votes.reduce((acc: number, v: any) => acc + v.vote_value, 0);
        return { ...sos, vote_score: score };
      });
      setSosList(processedData as AnimalSOS[]);
    } else if (error && error.code === 'PGRST200') {
      // Fallback if sos_votes relation doesn't exist yet
      const { data: fallbackData } = await supabase
        .from('animal_sos')
        .select('*, profiles(email)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (fallbackData) {
        const processedData = fallbackData.map((sos: any) => ({ ...sos, vote_score: 0 }));
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
    // Optimistic UI could be added here, but since SQL tables might not exist, 
    // let's just make the request and alert if error
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('sos_votes')
        .upsert({ 
          sos_id: sosId, 
          user_id: user.id, 
          vote_value: value 
        }, { onConflict: 'sos_id, user_id' });
        
      if (error) {
        if (error.code === '42P01') {
          alert('Voting system is not initialized yet. Please run the provided SQL script in Supabase.');
        } else {
          console.error(error);
        }
      } else {
        alert('Vote recorded! (UI will update upon refresh once full voting logic is synced)');
      }
    } catch(err) {
      console.error(err);
    }
  };

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
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-md font-medium hover:bg-indigo-100 transition disabled:opacity-50"
          >
            {isNearMeLoading ? (
              <div className="h-4 w-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Calls Near Me
          </button>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No active calls found</h3>
          <p className="mt-1 text-gray-500">There are currently no stray animal reports matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredList.map((sos) => {
            const images = sos.image_url ? sos.image_url.split(',') : [];
            const displayImage = images.length > 0 ? images[0] : null;

            return (
              <div key={sos.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-all duration-300">
                {displayImage ? (
                  <div 
                    className="relative w-full h-72 bg-gray-200 cursor-pointer group rounded-t-2xl overflow-hidden"
                    onClick={() => openImageModal(sos.image_url)}
                  >
                    <img 
                      src={displayImage} 
                      alt="Stray Animal" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">
                        + {images.length - 1} more
                      </div>
                    )}
                    {sos.animal_type && (
                      <div className="absolute top-3 left-3 bg-white/90 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
                        {sos.animal_type}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-72 bg-gray-100 flex items-center justify-center rounded-t-2xl relative">
                    <AlertCircle className="h-12 w-12 text-gray-300" />
                    {sos.animal_type && (
                      <div className="absolute top-3 left-3 bg-white/90 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                        {sos.animal_type}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-0 flex-1 flex flex-col">
                  <div className="flex">
                    
                    {/* Reddit style voting sidebar */}
                    <div className="w-12 bg-gray-50 flex flex-col items-center py-4 border-r border-gray-100 rounded-bl-2xl">
                      <button onClick={() => handleVote(sos.id, 1)} className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded">
                        <ArrowUp className="h-6 w-6" />
                      </button>
                      <span className="font-bold text-gray-700 my-1 text-sm">
                        {sos.vote_score || 0}
                      </span>
                      <button onClick={() => handleVote(sos.id, -1)} className="p-1 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded">
                        <ArrowDown className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3 font-medium">
                        <MapPin className="h-4 w-4 text-indigo-500" />
                        <span>{sos.area ? `${sos.area}, ` : ''}{sos.region}, {sos.country}</span>
                      </div>
                      
                      <p className="text-gray-800 mb-6 flex-1 text-base leading-relaxed line-clamp-3">
                        {sos.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(sos.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex gap-2">
                           <button
                            onClick={() => navigate(`/sos/${sos.id}`)}
                            className="flex items-center gap-1.5 bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                           >
                             <MessageCircle className="h-4 w-4" />
                             Comments
                           </button>
                           
                           {user?.id !== sos.user_id && (
                            <button
                              onClick={() => handleRespond(sos)}
                              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition"
                            >
                              Respond
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

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
