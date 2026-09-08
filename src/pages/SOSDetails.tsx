import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnimalSOS, SOSComment } from '../types';
import { useAuth } from '../components/AuthProvider';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';

export default function SOSDetails() {
  const { id } = useParams<{ id: string }>();
  const [sos, setSos] = useState<AnimalSOS | null>(null);
  const [comments, setComments] = useState<SOSComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSOSDetails();
  }, [id]);

  const fetchSOSDetails = async () => {
    if (!supabase || !id) return;
    
    // Fetch SOS
    const { data: sosData } = await supabase
      .from('animal_sos')
      .select('*, profiles(email)')
      .eq('id', id)
      .single();

    if (sosData) {
      setSos(sosData as AnimalSOS);
    }

    // Fetch comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('sos_comments')
      .select('*, profiles(email)')
      .eq('sos_id', id)
      .order('created_at', { ascending: true });

    if (!commentsError && commentsData) {
      setComments(commentsData as SOSComment[]);
    } else if (commentsError && commentsError.code === '42P01') {
       // Table doesn't exist yet, ignore gracefully
    }
    
    setLoading(false);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!newComment.trim() || !id || !supabase) return;

    try {
      const { error } = await supabase
        .from('sos_comments')
        .insert([
          {
            sos_id: id,
            user_id: user.id,
            content: newComment,
            parent_id: replyingTo
          }
        ]);

      if (error) {
         if (error.code === '42P01') {
            alert("The commenting system is not initialized in the database yet. Please run the SQL script.");
         } else {
            throw error;
         }
      } else {
         setNewComment('');
         setReplyingTo(null);
         fetchSOSDetails();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!sos) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">SOS Call Not Found</h3>
      </div>
    );
  }

  // Organize comments into a tree
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 font-medium"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Feed
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
         <h1 className="text-2xl font-bold mb-4">{sos.animal_type ? `${sos.animal_type} SOS in ${sos.region}` : `SOS in ${sos.region}`}</h1>
         <p className="text-gray-800 whitespace-pre-wrap">{sos.description}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold mb-6">Comments ({comments.length})</h2>

        <div className="space-y-6 mb-8">
          {rootComments.length === 0 ? (
             <p className="text-gray-500 text-center italic py-4">No comments yet. Be the first to reply!</p>
          ) : (
            rootComments.map(comment => (
              <div key={comment.id} className="border-b border-gray-50 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {comment.profiles?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium text-sm">{comment.profiles?.email?.split('@')[0] || 'User'}</span>
                  <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700 pl-10 mb-2 text-sm">{comment.content}</p>
                
                <button 
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 pl-10"
                >
                  Reply
                </button>

                {/* Replies */}
                {getReplies(comment.id).length > 0 && (
                  <div className="pl-10 mt-3 space-y-4 border-l-2 border-gray-100 ml-4">
                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-700">{reply.profiles?.email?.split('@')[0] || 'User'}</span>
                          <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 text-sm">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        <form onSubmit={handlePostComment} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
          {replyingTo && (
            <div className="flex justify-between items-center mb-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded text-xs font-medium">
              <span>Replying to a comment...</span>
              <button type="button" onClick={() => setReplyingTo(null)} className="hover:text-indigo-900">Cancel</button>
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "Write a comment..." : "Please sign in to comment"}
            className="w-full bg-transparent border-0 focus:ring-0 resize-none outline-none text-sm p-2"
            rows={3}
            disabled={!user}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!user || !newComment.trim()}
              className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
