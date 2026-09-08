import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, AlertCircle, X, Shield, Sparkles, Heart, HelpCircle } from 'lucide-react';
import { Country, State } from 'country-state-city';
import imageCompression from 'browser-image-compression';
import { SubredditType, UrgencyLevel, MarketplaceType } from '../types';
import { SUBREDDITS, MARKETPLACE_CATEGORIES, preparePostPayload, prepareFallbackPostPayload } from '../utils/postHelpers';

export default function CreateSOS() {
  const [subreddit, setSubreddit] = useState<SubredditType>('r/RescueEmergency');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [marketplaceType, setMarketplaceType] = useState<MarketplaceType>('food_donation');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [title, setTitle] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [area, setArea] = useState('');
  const [animalType, setAnimalType] = useState('Dog');
  const [description, setDescription] = useState('');
  
  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);

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
        setError("يمكنك رفع حتى 5 صور كحد أقصى.");
        return;
      }
      setImageFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAfterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAfterImageFile(e.target.files[0]);
    }
  };

  const uploadSingleFile = async (file: File, prefix = 'img') => {
    if (!supabase || !user) throw new Error('User or Supabase not ready');
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    const compressedFile = await imageCompression(file, options);
    const fileExt = compressedFile.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${prefix}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('animal-images')
      .upload(filePath, compressedFile);

    if (uploadError) {
      if (
        uploadError.message.includes('Bucket not found') ||
        uploadError.message.includes('relation "buckets" does not exist')
      ) {
        throw new Error('خطأ في التخزين: تأكد من إنشاء Storage Bucket عام باسم "animal-images".');
      }
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('animal-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    if (imageFiles.length === 0) {
      setError("يرجى إرفاق صورة واحدة على الأقل توضح الحالة.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Upload main images
      const uploadedUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const url = await uploadSingleFile(imageFiles[i], `main_${i}`);
        uploadedUrls.push(url);
      }
      const imageUrlsString = uploadedUrls.join(',');

      // 2. Upload After image if Success Stories
      let afterImageUrl: string | undefined = undefined;
      if (subreddit === 'r/SuccessStories' && afterImageFile) {
        afterImageUrl = await uploadSingleFile(afterImageFile, 'after');
      }

      const selectedCountry = Country.getCountryByCode(countryCode)?.name || '';
      const selectedState = State.getStateByCodeAndCountry(regionCode, countryCode)?.name || regionCode;

      // 3. Prepare payload with Subreddit, Urgency, Anonymity, etc.
      const payload = preparePostPayload({
        user_id: user.id,
        animal_type: animalType,
        country: selectedCountry,
        region: selectedState,
        area,
        description,
        image_url: imageUrlsString,
        status: 'open',
        title: title.trim() || undefined,
        subreddit,
        urgency,
        is_anonymous: isAnonymous,
        before_after_image_url: afterImageUrl,
        marketplace_type: subreddit === 'r/PetMarketplace' ? marketplaceType : undefined
      });

      // Try inserting with new columns
      let insertRes = await supabase.from('animal_sos').insert([payload]);

      // If columns do not exist yet (error 42703), retry with fallback payload
      if (insertRes.error && insertRes.error.code === '42703') {
        const fallbackPayload = prepareFallbackPostPayload(payload);
        insertRes = await supabase.from('animal_sos').insert([fallbackPayload]);
      }

      if (insertRes.error) {
        throw insertRes.error;
      }

      // Add user karma for reporting
      try {
        await supabase.rpc('increment_karma', { user_id: user.id, amount: 15 });
      } catch {
        // Safe to ignore if RPC doesn't exist
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء نشر المنشور');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-gray-800 p-8 rounded-xl text-center border border-gray-200 dark:border-gray-700 shadow-sm">
        <Heart className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          تسجيل الدخول للمشاركة
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          انضم إلى مجتمع حماية الحيوانات الأليفة والضالة للإبلاغ أو نشر قصص النجاح والمساعدات.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition"
        >
          تسجيل الدخول / إنشاء حساب
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>انشر في مجتمعات الحيوانات</span>
            <span className="text-sm font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full">
              Pet Reddit
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
            اختر المجتمع المناسب لبلاغك، قصة تبنيك، أو مساعدتك ليصل للجمهور المناسب فوراً.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium whitespace-pre-wrap">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subreddit Selector */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
              اختر المجتمع الفرعي (Subreddit)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUBREDDITS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubreddit(s.id)}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between ${
                    subreddit === s.id
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{s.icon}</span>
                    <div>
                      <p className="font-bold text-xs text-gray-900 dark:text-gray-100">
                        {s.titleAr}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">{s.id}</p>
                    </div>
                  </div>
                  {subreddit === s.id && (
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* If Emergency: Urgency Selector */}
          {subreddit === 'r/RescueEmergency' && (
            <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 rounded-xl">
              <label className="block text-xs font-bold text-red-900 dark:text-red-300 mb-2">
                🚨 درجة الخطورة والاستعجال (الحالات الحرجة ترتفع لأعلى الصفحة الرئيسية بتصويت المجتمع)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency('critical')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    urgency === 'critical'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-red-700 border border-red-200 dark:border-red-800'
                  }`}
                >
                  🚨 حرج جداً (خطر موت)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('high')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    urgency === 'high'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-amber-700 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  ⚠️ عاجل (خلال ساعات)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('medium')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    urgency === 'medium'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-indigo-700 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  🟡 متوسط (يحتاج رعاية)
                </button>
              </div>
            </div>
          )}

          {/* If Marketplace: Category Selector */}
          {subreddit === 'r/PetMarketplace' && (
            <div className="bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 p-4 rounded-xl">
              <label className="block text-xs font-bold text-orange-900 dark:text-orange-300 mb-2">
                🍲 نوع المساعدة أو الخدمة المصغرة
              </label>
              <select
                value={marketplaceType}
                onChange={(e) => setMarketplaceType(e.target.value as MarketplaceType)}
                className="w-full p-2.5 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-800 text-sm font-medium"
              >
                {MARKETPLACE_CATEGORIES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Anonymous Posting Toggle (الهوية المجهولة أو المستعارة) */}
          <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-lg">
                🕵️
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  النشر بهوية مجهولة / مستعارة (Anonymous Rescuer)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  لن يظهر اسمك أو بريدك الحقيقي للمستخدمين لحمايتك وتشجيع الإبلاغ عن الحالات الحساسة.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
              عنوان المنشور (Title)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اكتب عنواناً معبراً (مثلاً: قط مصاب قرب محطة القطار / قبل وبعد: تحول الكلب ريكس بعد التبني)"
              className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Animal Type */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
              نوع الحيوان
            </label>
            <select
              required
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="Dog">كلب (Dog)</option>
              <option value="Cat">قطة (Cat)</option>
              <option value="Bird">طائر (Bird)</option>
              <option value="Other">حيوان آخر (Other)</option>
            </select>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                الدولة (Country)
              </label>
              <select
                required
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setRegionCode('');
                }}
                className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">اختر الدولة...</option>
                {countries.map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                الولاية / المنطقة (Region)
              </label>
              <select
                required
                disabled={!countryCode || states.length === 0}
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
              >
                <option value="">اختر الولاية / المقاطعة...</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
              الحي / الشارع بالتفصيل (Exact Area)
            </label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="مثلاً: بجانب مسجد النور، حي السلام، شارع الجمهورية..."
              className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
              التفاصيل والوصف (Description)
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب شرحاً دقيقاً عن الحالة، نوع المساعدة المطلوبة، أو قصة الإنقاذ..."
              className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          {/* Photos Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
              {subreddit === 'r/SuccessStories'
                ? 'الصورة الأساسية (صورة الحيوان قبل الإنقاذ) - حتى 5 صور'
                : `الصور (Photos) - ${imageFiles.length}/5`}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imageFiles.map((file, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-sm hover:bg-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {imageFiles.length < 5 && (
                <>
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 cursor-pointer transition">
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs font-semibold text-gray-500">معرض الصور</span>
                    <input type="file" multiple accept="image/*" className="sr-only" onChange={handleImageChange} />
                  </label>

                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 cursor-pointer transition">
                    <Camera className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs font-semibold text-gray-500">الكاميرا</span>
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageChange} />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Success Stories: After Photo Upload (Before & After) */}
          {subreddit === 'r/SuccessStories' && (
            <div className="bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40 p-4 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-pink-900 dark:text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span>صورة ما بعد التعافي أو التبني (After Photo) لخاصية المقارنة التفاعلية</span>
              </label>
              <div className="flex items-center gap-4">
                {afterImageFile ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-pink-400">
                    <img src={URL.createObjectURL(afterImageFile)} alt="After" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAfterImageFile(null)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full py-4 border-2 border-dashed border-pink-300 dark:border-pink-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-pink-100/40 transition">
                    <Sparkles className="w-6 h-6 text-pink-500 mb-1" />
                    <span className="text-xs font-bold text-pink-700 dark:text-pink-300">
                      اضغط هنا لرفع صورة "ما بعد الإنقاذ / التبني"
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleAfterImageChange} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="py-2.5 px-5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'جاري النشر...' : 'نشر في المجتمع (Publish)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
