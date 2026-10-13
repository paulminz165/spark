'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { Flame, MessageCircle } from 'lucide-react';

interface ChatPreview {
  matchId: string;
  matchedUser: {
    id: string;
    name: string;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

export default function ChatListPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      const uid = session.user.id;

      // Get all mutual matches (status: mutual, accepted, or both_liked)
      const { data: matches } = await supabase
        .from('matches')
        .select('id, user_a, user_b')
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .in('status', ['both_liked', 'mutual', 'accepted']);

      if (!matches || matches.length === 0) {
        setLoading(false);
        return;
      }

      // Get matched user profiles
      const otherIds = matches.map((m) =>
        m.user_a === uid ? m.user_b : m.user_a
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', otherIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Get last message for each match
      const chatPreviews: ChatPreview[] = [];
      for (const match of matches) {
        const otherId = match.user_a === uid ? match.user_b : match.user_a;
        const profile = profileMap.get(otherId);
        if (!profile) continue;

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, is_read')
          .eq('match_id', match.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        chatPreviews.push({
          matchId: match.id,
          matchedUser: profile,
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || null,
          unread: lastMsg ? !lastMsg.is_read && lastMsg.sender_id !== uid : false,
        });
      }

      // Sort: unread first, then by last message time
      chatPreviews.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setChats(chatPreviews);
      setLoading(false);
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Flame className="w-8 h-8 text-spark-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="px-6 pt-8 pb-4">
        <h1 className="font-serif text-3xl mb-1">Chats</h1>
        <p className="text-sm text-neutral-400">
          {chats.length > 0 ? `${chats.length} matches` : 'No matches yet — start swiping!'}
        </p>
      </div>

      {chats.length > 0 ? (
        <div className="px-4 space-y-1.5">
          {chats.map((chat) => (
            <button
              key={chat.matchId}
              onClick={() => router.push(`/chat/${chat.matchId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-raised transition-colors text-left"
            >
              {/* Avatar circle */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-spark-500/30 to-spark-700/30 flex items-center justify-center flex-shrink-0">
                <span className="text-spark-400 font-serif text-base">
                  {chat.matchedUser.name[0]}
                </span>
              </div>

              {/* Name and last message */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${chat.unread ? 'text-white' : 'text-neutral-300'}`}>
                    {chat.matchedUser.name}
                  </span>
                  {chat.lastMessageAt && (
                    <span className="text-[10px] text-neutral-600 flex-shrink-0">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${chat.unread ? 'text-neutral-300 font-medium' : 'text-neutral-600'}`}>
                  {chat.lastMessage || 'Say hi! 👋'}
                </p>
              </div>

              {/* Unread dot */}
              {chat.unread && (
                <div className="w-2 h-2 rounded-full bg-spark-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-neutral-600" />
          </div>
          <h2 className="font-serif text-xl mb-2">No conversations yet</h2>
          <p className="text-sm text-neutral-400 max-w-xs">
            When you and someone both like each other, they'll appear here to chat.
          </p>
        </div>
      )}

      <BottomNav active="chat" />
    </div>
  );
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (hours < 168) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
