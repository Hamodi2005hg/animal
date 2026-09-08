import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AnimalSOS } from '../types';
import { useAuth } from '../components/AuthProvider';
import { MapPin, Clock, AlertCircle, CheckCircle, Navigation, Heart, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
      alert("Failed to update status. Please make sure you have added the UPDATE policy in Supabase SQL Editor.");
      // Revert if error
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
        <h1 className="text-3xl font-bold text-gray-900">My Record (سجل نداءاتي)</h1>
        <p className="mt-2 text-gray-600">Track and manage the stray animals you have reported.</p>
      </div>

      {myList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No records found</h3>
          <p className="mt-1 text-gray-500">You haven't reported any stray animals yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {myList.map((sos) => {
            const images = sos.image_url ? sos.image_url.split(',') : [];
            const displayImage = images.length > 0 ? images[0] : null;
            const isResolved = sos.status === 'resolved';

            return (
              <div key={sos.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${isResolved ? 'border-green-200' : 'border-gray-100'}`}>
                {displayImage ? (
                  <div 
                    className="relative w-full h-72 bg-gray-200 cursor-pointer group"
                    onClick={() => openImageModal(sos.image_url)}
                  >
                    <img 
                      src={displayImage} 
                      alt="Stray Animal" 
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isResolved ? 'grayscale' : ''}`}
                    />
                    {isResolved && (
                       <div className="absolute inset-0 bg-green-900/30 flex items-center justify-center">
                          <span className="bg-green-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Sheltered (تم إيوائه)
                          </span>
                       </div>
                    )}
                    {!isResolved && images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">
                        + {images.length - 1} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-72 bg-gray-100 flex items-center justify-center relative">
                    <AlertCircle className="h-12 w-12 text-gray-300" />
                    {isResolved && (
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-green-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Sheltered
                          </span>
                       </div>
                    )}
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      <span>{sos.area ? `${sos.area}, ` : ''}{sos.region}, {sos.country}</span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isResolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  
                  <p className="text-gray-800 mb-6 flex-1 text-base leading-relaxed line-clamp-3">
                    {sos.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(sos.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {!isResolved && (
                      <button
                        onClick={() => handleResolveSOS(sos.id)}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 shadow-sm transition"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark as Sheltered
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
