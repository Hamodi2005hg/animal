import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle } from 'lucide-react';
import { Country, State } from 'country-state-city';

export default function CreateSOS() {
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
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
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    
    setLoading(true);
    setError(null);

    try {
      let image_url = '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('animal-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('relation "buckets" does not exist')) {
             throw new Error('Supabase configuration error: Please create a public storage bucket named "animal-images" in your Supabase dashboard.');
          }
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('animal-images')
          .getPublicUrl(filePath);
          
        image_url = publicUrlData.publicUrl;
      }

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
            image_url,
            status: 'open'
          }
        ]);

      if (insertError) {
        if (insertError.code === 'PGRST204' || insertError.message.includes('area')) {
           throw new Error('Database schema error: Please add an "area" column (Type: text) to your "animal_sos" table in Supabase.');
        }
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
              {countryCode && states.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">No states available for this country, you can leave it blank.</p>
              )}
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
            <label className="block text-sm font-medium text-gray-700">Upload Photo (صورة الحيوان)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                {imageFile && (
                  <p className="text-sm font-medium text-green-600 mt-2">Selected: {imageFile.name}</p>
                )}
              </div>
            </div>
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
