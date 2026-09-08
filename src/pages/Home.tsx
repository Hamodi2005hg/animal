import { useEffect, useState } from 'react';
import { AnimalSOS } from '../types';
import { useAuth } from '../components/AuthProvider';
import { fetchApi } from '../lib/api';
import { MapPin, Clock, MessageCircle, AlertCircle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [sosList, setSosList] = useState<AnimalSOS[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSOS();
  }, []);

  const fetchSOS = async () => {
    try {
      const data = await fetchApi('/sos');
      if (Array.isArray(data)) {
        setSosList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (sos: AnimalSOS) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?user=${sos.user_id}&sos=${sos.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SOS Feed</h1>
          <p className="mt-2 text-gray-600">Help stray animals in your area</p>
        </div>
      </div>

      {sosList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No active calls</h3>
          <p className="mt-1 text-gray-500">There are currently no stray animal reports.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sosList.map((sos) => (
            <div key={sos.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              {sos.image_url ? (
                <div className="aspect-w-16 aspect-h-12 w-full bg-gray-200">
                  <img 
                    src={sos.image_url} 
                    alt="Stray Animal" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <AlertCircle className="h-12 w-12 text-gray-300" />
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span>{sos.region}, {sos.country}</span>
                </div>
                
                <p className="text-gray-900 mb-4 flex-1 line-clamp-3">
                  {sos.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(sos.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {user?.id !== sos.user_id && (
                    <button
                      onClick={() => handleRespond(sos)}
                      className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-indigo-100 transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Respond to Call
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
