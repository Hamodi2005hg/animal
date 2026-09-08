import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Message, Profile, AnimalSOS } from '../types';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, Clock, MapPin, ExternalLink, User as UserIcon } from 'lucide-react';

interface ConversationSummary {
  otherUserId: string;
  sosId: string;
  otherUser: Profile | null;
  sosDetails: AnimalSOS | null;
  lastMessage: Message;
  totalMessages: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const otherUserId = searchParams.get('user');
  const sosId = searchParams.get('sos');

  // State for active chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [sosDetails, setSosDetails] = useState<AnimalSOS | null>(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for inbox conversations list
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Load Inbox or Chat depending on search params
  useEffect(() => {
    if (!user) return;

    if (otherUserId && sosId) {
      // Active chat mode
      setLoadingChat(true);
      fetchChatData();

      // Polling fallback every 3 seconds for instant updates without manual refresh
      const chatInterval = setInterval(fetchChatData, 3000);

      // Realtime subscription for messages
      const channel = supabase?.channel(`chat_${sosId}_${[user.id, otherUserId].sort().join('_')}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sos_id=eq.${sosId}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (
              (newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId) ||
              (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id)
            ) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        )
        .subscribe();

      return () => {
        clearInterval(chatInterval);
        channel?.unsubscribe();
      };
    } else {
      // Inbox mode
      setLoadingConversations(true);
      fetchConversations();

      const inboxInterval = setInterval(fetchConversations, 5000);

      const inboxChannel = supabase?.channel(`inbox_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        clearInterval(inboxInterval);
        inboxChannel?.unsubscribe();
      };
    }
  }, [user, otherUserId, sosId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (otherUserId && sosId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, otherUserId, sosId]);

  // ============================
  // Fetch Inbox Conversations
  // ============================
  const fetchConversations = async () => {
    if (!supabase || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setLoadingConversations(false);
        return;
      }

      if (!data || data.length === 0) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      // Group messages by conversation: key = `${otherId}_${sosId}`
      const convMap = new Map<string, { otherId: string; sosId: string; lastMsg: Message; count: number }>();
      const otherUserIds = new Set<string>();
      const sosIds = new Set<string>();

      for (const msg of data as Message[]) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!partnerId) continue;

        const currentSosId = msg.sos_id;
        const convKey = `${partnerId}_${currentSosId}`;

        otherUserIds.add(partnerId);
        if (currentSosId) sosIds.add(currentSosId);

        if (!convMap.has(convKey)) {
          convMap.set(convKey, {
            otherId: partnerId,
            sosId: currentSosId,
            lastMsg: msg,
            count: 1
          });
        } else {
          const current = convMap.get(convKey)!;
          current.count += 1;
        }
      }

      // Fetch profiles of participants
      let profileMap: Record<string, Profile> = {};
      if (otherUserIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(otherUserIds));

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profileMap[p.id] = p;
          });
        }
      }

      // Fetch SOS details
      let sosMap: Record<string, AnimalSOS> = {};
      if (sosIds.size > 0) {
        const { data: sosData } = await supabase
          .from('animal_sos')
          .select('*')
          .in('id', Array.from(sosIds));

        if (sosData) {
          sosData.forEach((s: any) => {
            sosMap[s.id] = s;
          });
        }
      }

      // Build summaries array
      const summaries: ConversationSummary[] = Array.from(convMap.values()).map(c => ({
        otherUserId: c.otherId,
        sosId: c.sosId,
        otherUser: profileMap[c.otherId] || null,
        sosDetails: sosMap[c.sosId] || null,
        lastMessage: c.lastMsg,
        totalMessages: c.count
      }));

      // Sort by newest last message
      summaries.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
      setConversations(summaries);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // ============================
  // Fetch Single Chat Data
  // ============================
  const fetchChatData = async () => {
    if (!supabase || !user || !otherUserId || !sosId) return;

    try {
      // 1. Fetch other user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();
      if (profileData) setOtherUser(profileData as Profile);

      // 2. Fetch SOS details
      const { data: sosData } = await supabase
        .from('animal_sos')
        .select('*')
        .eq('id', sosId)
        .single();
      if (sosData) setSosDetails(sosData as AnimalSOS);

      // 3. Fetch messages between these two users regarding this SOS
      const { data: msgsData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sos_id', sosId)
        .order('created_at', { ascending: true });

      if (!error && msgsData) {
        // Filter messages for this specific 2-party chat
        const filtered = (msgsData as Message[]).filter(m => 
          (m.sender_id === user.id && m.receiver_id === otherUserId) ||
          (m.sender_id === otherUserId && m.receiver_id === user.id) ||
          (!m.receiver_id && (m.sender_id === user.id || m.sender_id === otherUserId))
        );
        setMessages(filtered);
      }
    } catch (err) {
      console.error('Error fetching chat data:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  // ============================
  // Send Message
  // ============================
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !user || !otherUserId || !sosId || !supabase || isSending) return;

    setIsSending(true);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: otherUserId,
            sos_id: sosId,
            content: content
          }
        ])
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. ' + error.message);
        setNewMessage(content); // restore typed text
        setIsSending(false);
        return;
      }

      // Optimistically add message to state
      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
      }

      // Create notification for receiver
      if (otherUserId !== user.id) {
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: otherUserId,
              actor_id: user.id,
              type: 'message',
              post_id: sosId,
              is_read: false
            });
        } catch (notifErr) {
          console.warn('Could not create notification:', notifErr);
        }
      }
    } catch (err: any) {
      console.error('Error in handleSendMessage:', err);
      alert('Error sending message: ' + (err.message || 'Unknown error'));
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  // ==========================================
  // VIEW 1: Inbox / Conversations List
  // ==========================================
  if (!otherUserId || !sosId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Conversations (المحادثات والرسائل)
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              All messages received and sent regarding animal rescue calls
            </p>
          </div>
        </div>

        {loadingConversations ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              No conversations yet (لا توجد محادثات بعد)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              When another user contacts you regarding an SOS call, or when you click "Message" on an animal SOS report, your chats will appear here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              Explore SOS Calls (تصفح نداءات الإنقاذ)
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const displayName = conv.otherUser?.username || conv.otherUser?.email?.split('@')[0] || 'User';
              const isSentByMe = conv.lastMessage.sender_id === user?.id;
              const sosTitle = conv.sosDetails?.animal_type 
                ? `${conv.sosDetails.animal_type} SOS in ${conv.sosDetails.region || conv.sosDetails.country}`
                : `SOS Call in ${conv.sosDetails?.region || conv.sosDetails?.country || 'Unknown location'}`;

              return (
                <div
                  key={`${conv.otherUserId}_${conv.sosId}`}
                  onClick={() => navigate(`/messages?user=${conv.otherUserId}&sos=${conv.sosId}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      {conv.otherUser?.avatar_url ? (
                        <img
                          src={conv.otherUser.avatar_url}
                          alt={displayName}
                          className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-base">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Content preview */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {displayName}
                        </h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(conv.lastMessage.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Related SOS Post Info */}
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {sosTitle}
                      </p>

                      {/* Last Message Preview */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1">
                          {isSentByMe ? 'You: ' : `${displayName}: `}
                        </span>
                        {conv.lastMessage.content}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 flex-shrink-0">
                    Open Chat &rarr;
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: Active Chat View
  // ==========================================
  if (loadingChat) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const otherDisplayName = otherUser?.username || otherUser?.email?.split('@')[0] || 'User';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Top navigation & back button */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/messages')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all conversations
        </button>

        {sosDetails && (
          <Link
            to={`/sos/${sosId}`}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>View SOS Post</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Chat Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 border-b-0 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/user/${otherUserId}`} className="flex-shrink-0 hover:opacity-85 transition">
            {otherUser?.avatar_url ? (
              <img
                src={otherUser.avatar_url}
                alt={otherDisplayName}
                className="w-11 h-11 rounded-full object-cover bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                {otherDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>

          <div>
            <Link
              to={`/user/${otherUserId}`}
              className="text-base font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5"
            >
              {otherDisplayName}
              <UserIcon className="h-3.5 w-3.5 text-gray-400" />
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-indigo-500" />
              {sosDetails ? (
                <span>
                  Regarding {sosDetails.animal_type ? `${sosDetails.animal_type} in ` : ''}
                  {sosDetails.region}, {sosDetails.country}
                </span>
              ) : (
                <span>Regarding SOS Call</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 border-l border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 dark:text-gray-400">
            <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="font-semibold text-sm">No messages yet</p>
            <p className="text-xs mt-1 max-w-xs">
              Say hello to {otherDisplayName} to discuss helping this animal!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div
                    className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                      isMe ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="bg-white dark:bg-gray-800 rounded-b-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition"
            placeholder={`Message ${otherDisplayName}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-indigo-600 text-white rounded-full p-3 h-11 w-11 flex items-center justify-center hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition shadow-sm flex-shrink-0"
            title="Send Message"
          >
            {isSending ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
