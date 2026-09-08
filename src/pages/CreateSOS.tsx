import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, AlertCircle, X } from 'lucide-react';
import { Country, State } from 'country-state-city';
import imageCompression from 'browser-image-compression';

export default function CreateSOS() {
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode);
  }, [countryCode]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (imageFiles.length + newFiles.length > 5) {
        setError("You can only upload up to 5 images.");
        return;
      }
      setImageFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    if (imageFiles.length === 0) {
      setError("Please provide at least one photo of the animal.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];

      // Compress and Upload each image
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        // Compression options
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        
        const compressedFile = await imageCompression(file, options);
        
        const fileExt = compressedFile.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('animal-images')
          .upload(filePath, compressedFile);

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('relation "buckets" does not exist')) {
             throw new Error('Supabase configuration error: Please create a public storage bucket named "animal-images".');
          }
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('animal-images')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // Join URLs with a comma to store in a single text column
      const image_urls_string = uploadedUrls.join(',');

      const selectedCountry = Country.getCountryByCode(countryCode)?.name || '';
      const selectedState = State.getStateByCodeAndCountry(regionCode, countryCode)?.name || regionCode;

      const { error: insertError } = await supabase
        .from('animal_sos')
        .insert([
          {
            user_id: user.id,
            country: selectedCountry,
            region: selectedState,
            area: area,
            description,
            image_url: image_urls_string,
            status: 'open'
          }
        ]);

      if (insertError) {
        throw insertError;
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error creating SOS call');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="text-center py-12"><p>Loading...</p></div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">Please sign in to report a stray animal.</h2>
        <button 
          onClick={() => navigate('/auth')}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Report a Stray Animal (SOS)</h1>
          <p className="mt-2 text-sm text-gray-600">
            Provide details about the animal and its exact location to get help from the community.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country (الدولة)</label>
              <select
                id="country"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-white"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setRegionCode('');
                }}
              >
                <option value="">Select a country</option>
                {countries.map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700">State / Region (الولاية/المنطقة)</label>
              <select
                id="region"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-white disabled:bg-gray-100"
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                disabled={!countryCode || states.length === 0}
              >
                <option value="">Select a state</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700">Exact Area / Neighborhood (المنطقة بالضبط / الحي)</label>
            <input
              type="text"
              id="area"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
              placeholder="Enter the specific street, neighborhood, or landmark..."
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description & Condition (الوصف والحالة)</label>
            <textarea
              id="description"
              rows={4}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
              placeholder="Describe the animal, its condition, and any other helpful details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos (الصور) - {imageFiles.length}/5</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              {/* Display selected images */}
              {imageFiles.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-gray-200">
                  <img src={URL.createObjectURL(file)} alt={`upload-${index}`} className="object-cover w-full h-full" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Upload buttons (only show if < 5 images) */}
              {imageFiles.length < 5 && (
                <>
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500 font-medium">Gallery</span>
                    <input type="file" multiple accept="image/*" className="sr-only" onChange={handleImageChange} />
                  </label>

                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500 font-medium">Camera</span>
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageChange} />
                  </label>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">You can upload up to 5 photos. High quality images will be compressed automatically.</p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish SOS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
