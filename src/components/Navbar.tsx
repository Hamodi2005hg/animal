import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { Heart, PlusCircle, MessageCircle, LogOut, Archive, Search, Bell, Settings, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AppNotification } from '../types';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && supabase) {
      fetchNotifications();
      fetchProfile();
      
      const interval = setInterval(fetchNotifications, 8000); // Check every 8s

      const notifSubscription = supabase
        .channel(`user_notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        notifSubscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProfile = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  };

  const fetchNotifications = async () => {
    if (!supabase || !user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (data && data.length > 0) {
        const actorIds = Array.from(new Set(data.map((n: any) => n.actor_id).filter(Boolean)));
        let profileMap: Record<string, any> = {};

        if (actorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, email')
            .in('id', actorIds);

          if (profilesData) {
            profilesData.forEach((p: any) => {
              profileMap[p.id] = p;
            });
          }
        }

        const enrichedNotifications = data.map((n: any) => ({
          ...n,
          actor: profileMap[n.actor_id] || null
        }));

        setNotifications(enrichedNotifications as any);
        setUnreadCount(enrichedNotifications.filter((n: any) => !n.is_read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markNotificationsRead = async () => {
    if (!supabase || !user || unreadCount === 0) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const toggleDarkMode = () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    setIsDark(isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  };

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

  const getNotificationText = (n: AppNotification) => {
    const actorName = n.actor?.username || n.actor?.email?.split('@')[0] || 'Someone';
    if (n.type === 'vote') return `${actorName} voted on your SOS call`;
    if (n.type === 'comment') return `${actorName} commented on your SOS call`;
    if (n.type === 'reply') return `${actorName} replied to your comment`;
    if (n.type === 'message') return `${actorName} sent you a message`;
    return 'New notification';
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              <Heart className="h-6 w-6" />
              <span className="font-bold text-xl hidden sm:block text-gray-900 dark:text-white">StraySOS</span>
            </Link>
          </div>
          
          <div className="flex-1 max-w-md mx-4">
             <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  onChange={handleSearch}
                  value={searchParams.get('type') || ""}
                  className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                >
                  <option value="">All Animals (كل الحيوانات)</option>
                  <option value="Dog">Dogs (كلاب)</option>
                  <option value="Cat">Cats (قطط)</option>
                  <option value="Bird">Birds (طيور)</option>
                  <option value="Other">Other (أخرى)</option>
                </select>
             </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                <Link to="/create-sos" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 p-2">
                  <PlusCircle className="h-5 w-5" />
                </Link>
                <Link to="/messages" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 p-2 hidden sm:flex">
                  <MessageCircle className="h-5 w-5" />
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) markNotificationsRead();
                    }}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-sm dark:text-white">
                        Notifications
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No new notifications</div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => {
                                setShowNotifications(false);
                                if (n.type === 'message') {
                                  navigate(`/messages?user=${n.actor_id}&sos=${n.post_id}`);
                                } else {
                                  navigate(`/sos/${n.post_id}`);
                                }
                              }}
                              className={`p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex gap-3 ${!n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                            >
                              <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                {n.actor?.avatar_url ? (
                                  <img src={n.actor.avatar_url} className="h-full w-full object-cover" alt="avatar" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                    {(n.actor?.username || n.actor?.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-gray-800 dark:text-gray-200">{getNotificationText(n)}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Avatar" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile?.username || user.email?.split('@')[0]}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                      
                      <Link to="/my-calls" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Archive className="h-4 w-4" /> My Record
                      </Link>
                      
                      <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>

                      <button onClick={toggleDarkMode} className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                        <div className="flex items-center gap-2">
                          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                          Dark Mode
                        </div>
                        <div className={`w-8 h-4 rounded-full flex items-center p-0.5 ${isDark ? 'bg-indigo-600 justify-end' : 'bg-gray-300 justify-start'}`}>
                          <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                        </div>
                      </button>

                      <div className="border-t border-gray-100 dark:border-gray-700 mt-1">
                        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left">
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
