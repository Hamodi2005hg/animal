import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AnimalSOS } from '../types';
import { useAuth } from '../components/AuthProvider';
import { MapPin, Clock, AlertCircle, CheckCircle, Heart, ChevronRight, ChevronLeft, X, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function MyCalls() {
  const [myList, setMyList] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedImages, setSelectedImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      fetchMySOS();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchMySOS = async () => {
    if (!supabase || !user) return;
    
    const { data, error } = await supabase
      .from('animal_sos')
      .select('*, profiles(email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyList(data as AnimalSOS[]);
    }
    setLoading(false);
  };

  const handleDeleteSOS = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    if (!supabase || !user) return;
    
    const { error } = await supabase
      .from('animal_sos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      alert("Failed to delete post. Please check permissions.");
      console.error(error);
    } else {
      setMyList(prev => prev.filter(sos => sos.id !== id));
    }
  };

  const handleResolveSOS = async (id: string) => {
    if (!supabase || !user) return;
    
    // Optimistic UI update
    setMyList(prev => prev.map(sos => sos.id === id ? { ...sos, status: 'resolved' } : sos));

    const { error } = await supabase
      .from('animal_sos')
      .update({ status: 'resolved' })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      alert("Failed to update status.");
      fetchMySOS();
    }
  };

  const openImageModal = (imageUrlsStr: string) => {
    if (!imageUrlsStr) return;
    const urls = imageUrlsStr.split(',');
    setSelectedImages(urls);
    setCurrentImageIndex(0);
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">My Reports & Posts</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Track and manage the stray animals and stories you have reported.</p>
      </div>

      {myList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reports found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You haven't reported any stray animals or shared stories yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myList.map((sos) => {
            const images = sos.image_url ? sos.image_url.split(',') : [];
            const displayImage = images.length > 0 ? images[0] : null;
            const isResolved = sos.status === 'resolved';

            return (
              <div
                key={sos.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xs border overflow-hidden flex flex-col hover:shadow-md transition-all duration-300 ${
                  isResolved ? 'border-emerald-200 dark:border-emerald-800' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {displayImage ? (
                  <div 
                    className="relative w-full h-64 bg-gray-200 dark:bg-gray-700 cursor-pointer group"
                    onClick={() => openImageModal(sos.image_url)}
                  >
                    <img 
                      src={displayImage} 
                      alt="Stray Animal" 
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isResolved ? 'grayscale-50' : ''}`}
                    />
                    {isResolved && (
                      <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                        <span className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-xs">
                          <CheckCircle className="h-4 w-4" />
                          Rescued & Sheltered ✓
                        </span>
                      </div>
                    )}
                    {!isResolved && images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-xs">
                        + {images.length - 1} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                    <AlertCircle className="h-12 w-12 text-gray-300" />
                    {isResolved && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-xs">
                          <CheckCircle className="h-4 w-4" />
                          Rescued & Sheltered ✓
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{sos.area ? `${sos.area}, ` : ''}{sos.region}, {sos.country}</span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isResolved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                      {isResolved ? 'Resolved' : 'Active SOS'}
                    </span>
                  </div>

                  {sos.title && (
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      <Link to={`/sos/${sos.id}`} className="hover:text-indigo-600">
                        {sos.title}
                      </Link>
                    </h3>
                  )}
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-4 flex-1 text-sm leading-relaxed line-clamp-3">
                    {sos.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(sos.created_at).toLocaleDateString('en-US')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/sos/${sos.id}`}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold"
                        title="View Details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => handleDeleteSOS(sos.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-semibold transition"
                        title="Delete Post"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      
                      {!isResolved && (
                        <button
                          onClick={() => handleResolveSOS(sos.id)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark as Sheltered</span>
                        </button>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xs p-4">
          <button 
            onClick={() => setSelectedImages(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors"
            aria-label="Close image modal"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
            <img 
              src={selectedImages[currentImageIndex]} 
              alt="Animal" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            
            {selectedImages.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => prev === 0 ? selectedImages.length - 1 : prev - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => prev === selectedImages.length - 1 ? 0 : prev + 1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                  {selectedImages.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/40 w-2'}`} 
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
