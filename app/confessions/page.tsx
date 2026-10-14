'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Send, Trash2, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Confession {
  id: string;
  author_id: string;
  content: string;
  target_hint: string | null;
  likes_count: number;
  is_approved: boolean;
  is_hidden: boolean;
  created_at: string;
  initial: string;
  comments_count: number;
  has_liked: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  initial: string;
}

export default function ConfessionsPage() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newConfession, setNewConfession] = useState('');
  const [targetHint, setTargetHint] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    const uid = session.user.id;
    setUserId(uid);

    const { data: adminData } = await supabase
      .from('app_admins')
      .select('user_id')
      .eq('user_id', uid)
      .single();
    setIsAdmin(!!adminData);

    await fetchConfessions(uid);
  }

  async function fetchConfessions(uid: string) {
    setLoading(true);

    const { data: rows, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error || !rows) {
      setLoading(false);
      return;
    }

    const visibleRows = rows.filter((r: any) => !r.is_hidden);

    const authorIds = Array.from(new Set(visibleRows.map((c: any) => c.author_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      profileMap[p.id] = p.name ? p.name.charAt(0).toUpperCase() : '?';
    });

    const confessionIds = visibleRows.map((c: any) => c.id);
    const { data: allReactions } = await supabase
      .from('confession_reactions')
      .select('confession_id, user_id')
      .in('confession_id', confessionIds);

    const userLikesSet = new Set<string>();
    const likesCountMap: Record<string, number> = {};
    (allReactions || []).forEach((r: any) => {
      likesCountMap[r.confession_id] = (likesCountMap[r.confession_id] || 0) + 1;
      if (r.user_id === uid) userLikesSet.add(r.confession_id);
    });

    const { data: allComments } = await supabase
      .from('confession_comments')
      .select('confession_id')
      .eq('is_hidden', false)
      .in('confession_id', confessionIds);

    const commentsMap: Record<string, number> = {};
    (allComments || []).forEach((c: any) => {
      commentsMap[c.confession_id] = (commentsMap[c.confession_id] || 0) + 1;
    });

    const enriched: Confession[] = visibleRows.map((c: any) => ({
      id: c.id,
      author_id: c.author_id,
      content: c.content,
      target_hint: c.target_hint,
      likes_count: likesCountMap[c.id] || c.likes_count || 0,
      is_approved: c.is_approved,
      is_hidden: c.is_hidden || false,
      created_at: c.created_at,
      initial: profileMap[c.author_id] || '?',
      comments_count: commentsMap[c.id] || 0,
      has_liked: userLikesSet.has(c.id),
    }));

    setConfessions(enriched);
    setLoading(false);
  }

  async function postConfession() {
    if (!newConfession.trim() || !userId) return;
    setPosting(true);

    const { error } = await supabase.from('confessions').insert({
      author_id: userId,
      content: newConfession.trim(),
      target_hint: targetHint.trim() || null,
      likes_count: 0,
      is_approved: true,
    });

    if (!error) {
      setNewConfession('');
      setTargetHint('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      await fetchConfessions(userId);
    }
    setPosting(false);
  }

  async function toggleLike(confessionId: string, hasLiked: boolean) {
    if (!userId) return;

    if (hasLiked) {
      await supabase
        .from('confession_reactions')
        .delete()
        .eq('confession_id', confessionId)
        .eq('user_id', userId);
    } else {
      await supabase.from('confession_reactions').insert({
        confession_id: confessionId,
        user_id: userId,
      });
    }

    setConfessions((prev) =>
      prev.map((c) =>
        c.id === confessionId
          ? { ...c, has_liked: !hasLiked, likes_count: hasLiked ? c.likes_count - 1 : c.likes_count + 1 }
          : c
      )
    );
  }

  async function toggleComments(confessionId: string) {
    const next = new Set(expandedComments);
    if (next.has(confessionId)) {
      next.delete(confessionId);
      setExpandedComments(next);
      return;
    }
    next.add(confessionId);
    setExpandedComments(next);
    await fetchComments(confessionId);
  }

  async function fetchComments(confessionId: string) {
    setLoadingComments((prev) => new Set(prev).add(confessionId));

    const { data: commentRows } = await supabase
      .from('confession_comments')
      .select('*')
      .eq('confession_id', confessionId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (commentRows && commentRows.length > 0) {
      const userIds = Array.from(new Set(commentRows.map((c: any) => c.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = p.name ? p.name.charAt(0).toUpperCase() : '?';
      });

      setComments((prev) => ({
        ...prev,
        [confessionId]: commentRows.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          initial: profileMap[c.user_id] || '?',
        })),
      }));
    } else {
      setComments((prev) => ({ ...prev, [confessionId]: [] }));
    }

    setLoadingComments((prev) => {
      const next = new Set(prev);
      next.delete(confessionId);
      return next;
    });
  }

  async function postComment(confessionId: string) {
    const text = commentInputs[confessionId]?.trim();
    if (!text || !userId) return;

    const { error } = await supabase.from('confession_comments').insert({
      confession_id: confessionId,
      user_id: userId,
      content: text,
    });

    if (!error) {
      setCommentInputs((prev) => ({ ...prev, [confessionId]: '' }));
      await fetchComments(confessionId);
      setConfessions((prev) =>
        prev.map((c) =>
          c.id === confessionId ? { ...c, comments_count: c.comments_count + 1 } : c
        )
      );
    }
  }

  async function hideConfession(confessionId: string) {
    await supabase.from('confessions').update({ is_hidden: true }).eq('id', confessionId);
    setConfessions((prev) => prev.filter((c) => c.id !== confessionId));
  }

  async function deleteConfession(confessionId: string) {
    await supabase.from('confessions').delete().eq('id', confessionId);
    setConfessions((prev) => prev.filter((c) => c.id !== confessionId));
  }

  async function hideComment(confessionId: string, commentId: string) {
    await supabase.from('confession_comments').update({ is_hidden: true }).eq('id', commentId);
    setComments((prev) => ({
      ...prev,
      [confessionId]: (prev[confessionId] || []).filter((c) => c.id !== commentId),
    }));
    setConfessions((prev) =>
      prev.map((c) =>
        c.id === confessionId ? { ...c, comments_count: Math.max(0, c.comments_count - 1) } : c
      )
    );
  }

  async function deleteComment(confessionId: string, commentId: string) {
    await supabase.from('confession_comments').delete().eq('id', commentId);
    setComments((prev) => ({
      ...prev,
      [confessionId]: (prev[confessionId] || []).filter((c) => c.id !== commentId),
    }));
    setConfessions((prev) =>
      prev.map((c) =>
        c.id === confessionId ? { ...c, comments_count: Math.max(0, c.comments_count - 1) } : c
      )
    );
  }

  function timeAgo(dateStr: string) {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function handleTextareaResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    setNewConfession(e.target.value);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-spark-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-white">Confessions Wall</h1>
          <p className="text-sm text-white/40 mt-0.5">anonymous • IIT Delhi only</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* Post box */}
        <div className="bg-surface-800 rounded-2xl border border-white/5 p-4">
          <textarea
            ref={textareaRef}
            value={newConfession}
            onChange={handleTextareaResize}
            placeholder="spill the tea anonymously... ☕"
            rows={2}
            maxLength={500}
            className="w-full bg-transparent text-white placeholder-white/30 text-sm resize-none outline-none"
          />
          <input
            type="text"
            value={targetHint}
            onChange={(e) => setTargetHint(e.target.value)}
            placeholder="hint about who this is for (optional)"
            maxLength={50}
            className="w-full bg-transparent text-white/50 placeholder-white/15 text-xs mt-2 outline-none border-t border-white/5 pt-2"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-white/20">{newConfession.length}/500</span>
            <button
              onClick={postConfession}
              disabled={!newConfession.trim() || posting}
              className="px-4 py-1.5 bg-spark-500 hover:bg-spark-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-colors"
            >
              {posting ? 'Posting...' : 'Confess'}
            </button>
          </div>
        </div>

        {/* Feed */}
        {confessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/30 text-sm">No confessions yet. Be the first 👀</p>
          </div>
        ) : (
          confessions.map((confession) => (
            <div key={confession.id} className="bg-surface-800 rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-spark-500/20 flex items-center justify-center">
                    <span className="text-spark-400 text-sm font-semibold">{confession.initial}</span>
                  </div>
                  <div>
                    <span className="text-white/30 text-xs">{timeAgo(confession.created_at)}</span>
                    {confession.target_hint && (
                      <span className="text-peach-400/60 text-xs ml-2">→ {confession.target_hint}</span>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => hideConfession(confession.id)}
                      className="p-1.5 text-white/20 hover:text-yellow-400 transition-colors"
                      title="Hide"
                    >
                      <EyeOff size={14} />
                    </button>
                    <button
                      onClick={() => deleteConfession(confession.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{confession.content}</p>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => toggleLike(confession.id, confession.has_liked)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    confession.has_liked ? 'text-peach-400' : 'text-white/30 hover:text-peach-400'
                  }`}
                >
                  <Heart size={16} fill={confession.has_liked ? 'currentColor' : 'none'} />
                  <span>{confession.likes_count || ''}</span>
                </button>

                <button
                  onClick={() => toggleComments(confession.id)}
                  className="flex items-center gap-1.5 text-sm text-white/30 hover:text-spark-400 transition-colors"
                >
                  <MessageCircle size={16} />
                  <span>{confession.comments_count || ''}</span>
                  {expandedComments.has(confession.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {expandedComments.has(confession.id) && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                  {loadingComments.has(confession.id) ? (
                    <div className="flex justify-center py-2">
                      <div className="w-4 h-4 border-2 border-spark-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {(comments[confession.id] || []).map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-spark-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-spark-400 text-[10px] font-semibold">{comment.initial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/60 text-xs leading-relaxed">{comment.content}</p>
                            <span className="text-white/20 text-[10px]">{timeAgo(comment.created_at)}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-start gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => hideComment(confession.id, comment.id)}
                                className="p-1 text-white/15 hover:text-yellow-400 transition-colors"
                              >
                                <EyeOff size={11} />
                              </button>
                              <button
                                onClick={() => deleteComment(confession.id, comment.id)}
                                className="p-1 text-white/15 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentInputs[confession.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [confession.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              postComment(confession.id);
                            }
                          }}
                          placeholder="reply anonymously..."
                          maxLength={200}
                          className="flex-1 bg-surface-800 text-white text-xs placeholder-white/30 rounded-full px-3 py-2 outline-none border border-white/10 focus:border-spark-500/50"
                        />
                        <button
                          onClick={() => postComment(confession.id)}
                          disabled={!commentInputs[confession.id]?.trim()}
                          className="p-2 text-spark-400 disabled:text-white/10 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav active="confessions" />
    </div>
  );
}