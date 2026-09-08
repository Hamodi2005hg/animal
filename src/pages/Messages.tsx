import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../components/AuthProvider';
import { fetchApi } from '../lib/api';
import { Message, AnimalSOS } from '../types';
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
  const [otherUserEmail, setOtherUserEmail] = useState('');
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
      const interval = setInterval(fetchMessages, 3000); // Poll for new messages every 3s
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user, otherUserId, sosId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatData = async () => {
    try {
      const [userRes, sosRes] = await Promise.all([
        fetchApi(`/users/${otherUserId}`),
        fetchApi(`/sos/${sosId}`)
      ]);
      if (userRes.email) setOtherUserEmail(userRes.email);
      if (sosRes.id) setSosDetails(sosRes as AnimalSOS);
      
      await fetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await fetchApi(`/messages?sos_id=${sosId}`);
      if (Array.isArray(data)) setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUserId || !sosId) return;

    const messageContent = newMessage;
    setNewMessage('');

    try {
      await fetchApi('/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiver_id: otherUserId,
          sos_id: sosId,
          content: messageContent
        })
      });
      // Fetch immediately after sending
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!otherUserId || !sosId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Your Conversations</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
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
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-4 transition w-fit">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>

      <div className="bg-white rounded-t-xl shadow-sm border border-gray-100 p-4 border-b-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Chat with {otherUserEmail?.split('@')[0] || 'User'}
          </h2>
          <p className="text-xs text-gray-500">
            Regarding SOS in {sosDetails?.region}, {sosDetails?.country}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 border-l border-r border-gray-100 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg p-3 ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'}`}>
                <p className="text-sm">{msg.content}</p>
                <span className={`text-[10px] mt-1 block ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-full border-gray-300 border px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
