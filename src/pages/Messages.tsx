import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { Message, Profile, AnimalSOS } from '../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const otherUserId = searchParams.get('user');
  const sosId = searchParams.get('sos');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [sosDetails, setSosDetails] = useState<AnimalSOS | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (otherUserId && sosId) {
      fetchChatData();
      subscribeToMessages();
    } else {
      setLoading(false);
    }
  }, [user, otherUserId, sosId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatData = async () => {
    if (!supabase || !user) return;
    
    // Fetch other user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .single();
    if (profileData) setOtherUser(profileData as Profile);

    // Fetch SOS details
    const { data: sosData } = await supabase
      .from('animal_sos')
      .select('*')
      .eq('id', sosId)
      .single();
    if (sosData) setSosDetails(sosData as AnimalSOS);

    // Fetch messages
    const { data: msgsData } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*)')
      .eq('sos_id', sosId)
      .order('created_at', { ascending: true });
      
    if (msgsData) setMessages(msgsData as Message[]);
    setLoading(false);
  };

  const subscribeToMessages = () => {
    if (!supabase) return;
    
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `sos_id=eq.${sosId}`
      }, (payload) => {
        // Fetch the sender profile for the new message
        fetchChatData(); // Quick way to refresh with relations
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUserId || !sosId || !supabase) return;

    const messageContent = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: user.id,
          receiver_id: otherUserId,
          sos_id: sosId,
          content: messageContent
        }
      ]);

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!otherUserId || !sosId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Your Conversations</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          Select an SOS call from the home page to start a conversation.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition w-fit">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 border-b-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Chat with {otherUser?.email?.split('@')[0] || 'User'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Regarding SOS in {sosDetails?.region}, {sosDetails?.country}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-gray-900 border-l border-r border-gray-100 dark:border-gray-700 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg p-3 ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                <p className="text-sm">{msg.content}</p>
                <span className={`text-[10px] mt-1 block ${isMe ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
