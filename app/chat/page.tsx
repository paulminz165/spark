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
    avatar_url: string | null;
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

      // Get all matches where both users liked
      const { data: matches } = await supabase
        .from('matches')
        .select('id, user_a, user_b')
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .eq('status', 'both_liked');

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
        .select('id, name, avatar_url')
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

      // Sort by last message time
      chatPreviews.sort((a, b) => {
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
        <p className="text-sm text-neutral-500">
          {chats.length > 0 ? 'Your conversations' : 'No chats yet — like a match to start'}
        </p>
      </div>

      {chats.length > 0 ? (
        <div className="divide-y divide-neutral-800">
          {chats.map((chat) => (
            <button
              key={chat.matchId}
              onClick={() => router.push(`/chat/${chat.matchId}`)}
              className="w-full flex items-center gap-3 px-6 py-4 hover:bg-surface-raised transition-colors text-left"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-spark-500/30 to-spark-700/30 flex items-center justify-center flex-shrink-0">
                {chat.matchedUser.avatar_url ? (
                  <img
                    src={chat.matchedUser.avatar_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-spark-400 font-serif text-lg">
                    {chat.matchedUser.name[0]}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{chat.matchedUser.name}</span>
                  {chat.lastMessageAt && (
                    <span className="text-xs text-neutral-600">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 truncate">
                  {chat.lastMessage || 'Say hi! 👋'}
                </p>
              </div>

              {chat.unread && (
                <div className="w-2.5 h-2.5 rounded-full bg-spark-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-neutral-600" />
          </div>
          <h2 className="font-serif text-xl mb-2">No conversations yet</h2>
          <p className="text-sm text-neutral-500 max-w-xs">
            When you and a match both like each other, you can start chatting here.
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
