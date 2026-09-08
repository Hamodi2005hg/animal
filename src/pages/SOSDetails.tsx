import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnimalSOS, SOSComment } from '../types';
import { useAuth } from '../components/AuthProvider';
import {
  ArrowLeft,
  Send,
  AlertCircle,
  MapPin,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  Share2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { extractPostMetadata, SUBREDDITS, MARKETPLACE_CATEGORIES } from '../utils/postHelpers';
import { getProfileBadge } from '../utils/karmaHelpers';

export default function SOSDetails() {
  const { id } = useParams<{ id: string }>();
  const [sos, setSos] = useState<AnimalSOS | null>(null);
  const [comments, setComments] = useState<SOSComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSOSDetails();
  }, [id]);

  const fetchSOSDetails = async () => {
    if (!supabase || !id) return;

    try {
      // Fetch SOS with votes
      const { data: sosData } = await supabase
        .from('animal_sos')
        .select('*, profiles(id, email, username, avatar_url, karma, rescue_badge), sos_votes(user_id, vote_value)')
        .eq('id', id)
        .single();

      if (sosData) {
        const votes = sosData.sos_votes || [];
        const upvotes = votes.filter((v: any) => v.vote_value === 1).length;
        const downvotes = votes.filter((v: any) => v.vote_value === -1).length;
        const userVote = user ? votes.find((v: any) => v.user_id === user.id)?.vote_value : 0;
        setSos(
          extractPostMetadata({
            ...sosData,
            upvotes,
            downvotes,
            user_vote: userVote
          })
        );
      }

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('sos_comments')
        .select('*, profiles(id, email, username, avatar_url, karma, rescue_badge)')
        .eq('sos_id', id)
        .order('created_at', { ascending: true });

      if (!commentsError && commentsData) {
        setComments(commentsData as SOSComment[]);
      }
    } catch (err) {
      console.error('Error loading post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (value: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!supabase || !sos) return;

    const previousVote = sos.user_vote || 0;
    const isRemoving = previousVote === value;

    let newUpvotes = sos.upvotes || 0;
    let newDownvotes = sos.downvotes || 0;

    if (isRemoving) {
      if (value === 1) newUpvotes = Math.max(0, newUpvotes - 1);
      if (value === -1) newDownvotes = Math.max(0, newDownvotes - 1);
      setSos({
        ...sos,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        user_vote: 0
      });
    } else {
      if (previousVote === 1) newUpvotes = Math.max(0, newUpvotes - 1);
      if (previousVote === -1) newDownvotes = Math.max(0, newDownvotes - 1);
      if (value === 1) newUpvotes += 1;
      if (value === -1) newDownvotes += 1;
      setSos({
        ...sos,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        user_vote: value
      });
    }

    try {
      if (isRemoving) {
        await supabase
          .from('sos_votes')
          .delete()
          .eq('sos_id', sos.id)
          .eq('user_id', user.id);
      } else {
        await supabase.from('sos_votes').upsert(
          {
            sos_id: sos.id,
            user_id: user.id,
            vote_value: value
          },
          { onConflict: 'sos_id, user_id' }
        );

        if (sos.user_id !== user.id) {
          try {
            await supabase.from('notifications').insert({
              user_id: sos.user_id,
              actor_id: user.id,
              type: 'vote',
              post_id: sos.id
            });
          } catch (e) {
            console.warn('Notification error:', e);
          }
        }
      }
    } catch (err) {
      console.error('Vote error:', err);
      fetchSOSDetails();
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!newComment.trim() || !id || !supabase) return;

    try {
      const commentPayload: any = {
        sos_id: id,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyingTo
      };

      if (isAnonymousComment) {
        commentPayload.is_anonymous = true;
      }

      let { error } = await supabase.from('sos_comments').insert([commentPayload]);

      if (error && error.code === '42703') {
        delete commentPayload.is_anonymous;
        commentPayload.content = `[Anonymous] ${commentPayload.content}`;
        const fallbackRes = await supabase.from('sos_comments').insert([commentPayload]);
        error = fallbackRes.error;
      }

      if (error) {
        if (error.code === '42P01') {
          alert('Comments table is not created yet in database.');
        } else {
          throw error;
        }
      } else {
        if (sos && sos.user_id !== user.id && !replyingTo) {
          try {
            await supabase.from('notifications').insert({
              user_id: sos.user_id,
              actor_id: user.id,
              type: 'comment',
              post_id: sos.id
            });
          } catch (e) {
            console.warn('Notification error:', e);
          }
        }

        setNewComment('');
        setReplyingTo(null);
        fetchSOSDetails();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
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
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Post Not Found
        </h3>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-xs font-bold text-indigo-600 underline"
        >
          Return to Feeds
        </button>
      </div>
    );
  }

  const subredditInfo = SUBREDDITS.find((s) => s.id === sos.subreddit);
  const marketplaceInfo = MARKETPLACE_CATEGORIES.find((m) => m.id === sos.marketplace_type);
  const { badge, karma } = getProfileBadge(sos.profiles);
  const images = sos.image_url ? sos.image_url.split(',') : [];

  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-1.5 rounded-full font-bold text-xs transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feeds</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{showCopied ? 'Link Copied! ✓' : 'Share Post'}</span>
        </button>
      </div>

      {/* Main Post Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-6 mb-8">
        {/* Header Tags */}
        <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
          <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full">
            <span>{subredditInfo?.icon || '🐾'}</span>
            <span>{sos.subreddit || 'r/RescueEmergency'}</span>
          </span>

          {sos.urgency === 'critical' && (
            <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold px-2.5 py-1 rounded-full animate-pulse border border-red-200 dark:border-red-800">
              🚨 Critical SOS
            </span>
          )}

          {marketplaceInfo && (
            <span className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
              {marketplaceInfo.icon} {marketplaceInfo.label}
            </span>
          )}

          {sos.status === 'resolved' && (
            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Rescued Successfully ✓
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
          {sos.title || `${sos.animal_type || 'Animal'} in ${sos.region}`}
        </h1>

        {/* Author / Anonymity Line */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          {sos.is_anonymous ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                🕵️
              </span>
              <span className="font-bold">Anonymous Guardian</span>
              <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">
                Protected Identity
              </span>
            </div>
          ) : (
            <Link
              to={`/user/${sos.user_id}`}
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                {sos.profiles?.avatar_url ? (
                  <img src={sos.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (sos.profiles?.username || sos.profiles?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {sos.profiles?.username || sos.profiles?.email?.split('@')[0]}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-md ${badge.bgColor} ${badge.textColor} border ${badge.border}`}
              >
                <span>{badge.icon}</span>
                <span>{badge.nameEn || badge.name}</span>
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                ⭐ {karma}
              </span>
            </Link>
          )}

          <span className="text-gray-400">•</span>
          <span className="text-gray-500">
            {new Date(sos.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>

        {/* Location Box */}
        <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mb-5">
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="font-bold">Location:</span>
          <span>
            {sos.area ? `${sos.area}, ` : ''}
            {sos.region}, {sos.country}
          </span>
        </div>

        {/* Description */}
        <p className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed mb-6">
          {sos.description}
        </p>

        {/* Success Stories: Before and After Showcase */}
        {sos.subreddit === 'r/SuccessStories' && sos.before_after_image_url && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border border-pink-200 dark:border-pink-900/40">
            <h3 className="font-bold text-sm text-pink-900 dark:text-pink-200 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Transformation Story (Before & After)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => images[0] && setSelectedImage(images[0])}
                className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden cursor-pointer shadow-xs group"
              >
                {images[0] && <img src={images[0]} alt="Before" className="w-full h-full object-cover" />}
                <span className="absolute bottom-3 left-3 bg-red-600/90 text-white text-xs font-bold px-3 py-1 rounded-md">
                  Before Rescue
                </span>
              </div>
              <div
                onClick={() => setSelectedImage(sos.before_after_image_url!)}
                className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden cursor-pointer shadow-xs group border-2 border-emerald-400"
              >
                <img src={sos.before_after_image_url} alt="After" className="w-full h-full object-cover" />
                <span className="absolute bottom-3 left-3 bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-md">
                  After Adoption & Recovery ✨
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Standard Images Grid */}
        {images.length > 0 && !(sos.subreddit === 'r/SuccessStories' && sos.before_after_image_url) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => setSelectedImage(img)}
                className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-700"
              >
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
              </div>
            ))}
          </div>
        )}

        {/* Bottom Actions Bar: Separate Upvote & Downvote buttons adjacent to comments and contact */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Separate Upvote Button */}
            <button
              onClick={() => handleVote(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${
                sos.user_vote === 1
                  ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600'
              }`}
              title="Upvote"
              aria-label="Upvote"
            >
              <ArrowUp className="w-4 h-4" />
              <span className="font-mono">{sos.upvotes || 0}</span>
            </button>

            {/* Separate Downvote Button */}
            <button
              onClick={() => handleVote(-1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${
                sos.user_vote === -1
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600'
              }`}
              title="Downvote"
              aria-label="Downvote"
            >
              <ArrowDown className="w-4 h-4" />
              <span className="font-mono">{sos.downvotes || 0}</span>
            </button>

            <span className="text-xs text-gray-500 flex items-center gap-1 px-2">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} Comments</span>
            </span>
          </div>

          {/* Contact Rescuer Button */}
          {user && user.id !== sos.user_id && (
            <button
              onClick={() => navigate(`/messages?user=${sos.user_id}&sos=${sos.id}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-xs"
            >
              Message Post Author Directly
            </button>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <span>Comments & Discussions ({comments.length})</span>
        </h2>

        {/* Comment Input Box */}
        <form onSubmit={handlePostComment} className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-8">
          {replyingTo && (
            <div className="flex justify-between items-center mb-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold">
              <span>Replying to comment...</span>
              <button type="button" onClick={() => setReplyingTo(null)} className="hover:underline">
                Cancel
              </button>
            </div>
          )}

          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "Write a comment, advice, or assistance offer..." : "Sign in to leave a comment"}
            className="w-full bg-transparent border-0 focus:ring-0 resize-none outline-none text-sm p-2 text-gray-900 dark:text-white"
            rows={3}
            disabled={!user}
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
            {/* Anonymous Comment Toggle */}
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymousComment}
                onChange={(e) => setIsAnonymousComment(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>🕵️ Comment Anonymously</span>
            </label>

            <button
              type="submit"
              disabled={!user || !newComment.trim()}
              className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Post Comment</span>
            </button>
          </div>
        </form>

        {/* Comments Tree */}
        <div className="space-y-4">
          {rootComments.length === 0 ? (
            <p className="text-gray-400 text-center text-xs py-6">
              No comments yet. Be the first to join the conversation!
            </p>
          ) : (
            rootComments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-100 dark:border-gray-700/60 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {comment.is_anonymous || comment.content.startsWith('[Anonymous]') || comment.content.startsWith('[مجهول]') ? (
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        🕵️ Anonymous Guardian
                      </span>
                    ) : (
                      <Link to={`/user/${comment.user_id}`} className="flex items-center gap-2 text-xs font-bold hover:underline">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px]">
                          {(comment.profiles?.username || comment.profiles?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span>{comment.profiles?.username || comment.profiles?.email?.split('@')[0]}</span>
                      </Link>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString('en-US')}
                  </span>
                </div>

                <p className="text-sm text-gray-800 dark:text-gray-200 pl-8 whitespace-pre-line mb-2">
                  {comment.content.replace(/^(\[Anonymous\]|\[مجهول\])\s*/, '')}
                </p>

                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold pl-8 hover:underline"
                >
                  Reply
                </button>

                {/* Sub-replies */}
                {getReplies(comment.id).length > 0 && (
                  <div className="pl-8 mt-3 space-y-3 border-l-2 border-gray-100 dark:border-gray-700 ml-2">
                    {getReplies(comment.id).map((reply) => (
                      <div key={reply.id} className="pl-4">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className="font-bold">
                            {reply.profiles?.username || reply.profiles?.email?.split('@')[0]}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(reply.created_at).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 cursor-pointer"
        >
          <img src={selectedImage} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
