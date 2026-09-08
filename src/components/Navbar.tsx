import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import {
  Heart,
  PlusCircle,
  MessageCircle,
  LogOut,
  Archive,
  Search,
  Bell,
  Settings,
  Moon,
  Sun,
  User as UserIcon,
  Trophy,
  Shield
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AppNotification } from '../types';
import { getProfileBadge } from '../utils/karmaHelpers';

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

      const interval = setInterval(fetchNotifications, 10000);

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
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
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
    const actorName = n.actor?.username || n.actor?.email?.split('@')[0] || 'مستخدم';
    if (n.type === 'vote') return `صوّت ${actorName} على بلاغك/منشورك`;
    if (n.type === 'comment') return `علّق ${actorName} على منشورك`;
    if (n.type === 'reply') return `رد ${actorName} على تعليقك`;
    if (n.type === 'message') return `أرسل لك ${actorName} رسالة جديدة`;
    return 'إشعار جديد';
  };

  const { badge, karma } = getProfileBadge(profile);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex-shrink-0 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <div>
                <span className="font-black text-lg text-gray-900 dark:text-white tracking-tight">
                  Pet Reddit
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block -mt-1 font-medium">
                  أنقذ وشارك
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Animal Filter in Search */}
          <div className="flex-1 max-w-xs sm:max-w-sm mx-3">
            <div className="relative w-full">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <select
                onChange={handleSearch}
                value={searchParams.get('type') || ''}
                className="block w-full pr-8 pl-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">كل الحيوانات (All)</option>
                <option value="Dog">كلاب (Dogs)</option>
                <option value="Cat">قطط (Cats)</option>
                <option value="Bird">طيور (Birds)</option>
                <option value="Other">حيوانات أخرى (Other)</option>
              </select>
            </div>
          </div>

          {/* Navigation Right Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
            {user ? (
              <>
                <Link
                  to="/create-sos"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold transition shadow-xs"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">نشر بلاغ / قصة</span>
                </Link>

                <Link
                  to="/messages"
                  className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  title="الرسائل"
                >
                  <MessageCircle className="h-5 w-5" />
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) markNotificationsRead();
                    }}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    title="الإشعارات"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-xs text-gray-900 dark:text-white flex items-center justify-between">
                        <span>الإشعارات</span>
                        <span className="text-[10px] text-gray-400">تحديث فوري</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-5 text-center text-gray-500 text-xs">
                            لا توجد إشعارات جديدة حالياً
                          </div>
                        ) : (
                          notifications.map((n) => (
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
                              className={`p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex gap-2.5 ${
                                !n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                              }`}
                            >
                              <div className="h-7 w-7 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                                {n.actor?.avatar_url ? (
                                  <img src={n.actor.avatar_url} className="h-full w-full object-cover" alt="" />
                                ) : (
                                  (n.actor?.username || n.actor?.email || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-gray-800 dark:text-gray-200">
                                  {getNotificationText(n)}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(n.created_at).toLocaleDateString('ar-EG')}
                                </p>
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
                    className="flex items-center gap-1.5 p-1 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        (profile?.username || user.email || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1">
                      {/* User details with Karma & Badge */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1 bg-gray-50 dark:bg-gray-750">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {profile?.username || user.email?.split('@')[0]}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            ⭐ {karma} كارما
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {badge.name}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/user/${user.id}`}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>ملفي الشخصي والشارات</span>
                      </Link>

                      <Link
                        to="/my-calls"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>سجل بلاغاتي ومشاركاتي</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>إعدادات الحساب</span>
                      </Link>

                      <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-right"
                      >
                        <div className="flex items-center gap-2">
                          {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                          <span>الوضع الليلي</span>
                        </div>
                        <div
                          className={`w-7 h-3.5 rounded-full flex items-center p-0.5 ${
                            isDark ? 'bg-indigo-600 justify-end' : 'bg-gray-300 justify-start'
                          }`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                        </div>
                      </button>

                      <div className="border-t border-gray-100 dark:border-gray-700 mt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-right font-bold"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>تسجيل الخروج</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-700 transition shadow-xs"
              >
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
