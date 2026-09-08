import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { Heart, PlusCircle, MessageCircle, LogOut, Archive, Search } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    navigate('/auth');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      navigate(`/?type=${val}`);
    } else {
      navigate(`/`);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 text-indigo-600 hover:text-indigo-500">
              <Heart className="h-6 w-6" />
              <span className="font-bold text-xl">StraySOS</span>
            </Link>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link to="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                SOS Feed (النداءات)
              </Link>
            </div>
          </div>
          
          <div className="hidden md:flex flex-1 justify-center px-6">
             <div className="relative w-full max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  onChange={handleSearch}
                  value={searchParams.get('type') || ""}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                >
                  <option value="">All Animals (كل الحيوانات)</option>
                  <option value="Dog">Dogs (كلاب)</option>
                  <option value="Cat">Cats (قطط)</option>
                  <option value="Bird">Birds (طيور)</option>
                  <option value="Other">Other (أخرى)</option>
                </select>
             </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/create-sos" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                  <PlusCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">Report SOS</span>
                </Link>
                <Link to="/messages" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                  <MessageCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">Messages</span>
                </Link>
                <Link to="/my-calls" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                  <Archive className="h-5 w-5" />
                  <span className="hidden sm:inline">My Record</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-red-600 flex items-center gap-1 ml-2"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
