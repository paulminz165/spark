'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MatchCard from '@/components/MatchCard';
import BottomNav from '@/components/BottomNav';
import { Flame, Sparkles } from 'lucide-react';

interface Match {
  id: string;
  user_a: string;
  user_b: string;
  compatibility_score: number;
  score_breakdown: Record<string, number>;
  shared_interests: string[];
  spark_prompt: string;
  photo_unlocked_at: string | null;
  status: string;
  week_of: string;
  matched_profile: {
    id: string;
    name: string;
    bio: string;
    photo_url: string | null;
    gender: string;
    date_of_birth: string;
    relationship_goal: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      setUserId(session.user.id);

      // Fetch this week's matches
      //const monday = getMonday(new Date()).toISOString().split('T')[0];

            const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`)
        .order('compatibility_score', { ascending: false });
      if (matchesData) {
        // Fetch matched profiles
        const otherIds = matchesData.map((m) =>
          m.user_a === session.user.id ? m.user_b : m.user_a
        );

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, bio, photo_url, gender, date_of_birth, relationship_goal')
          .in('id', otherIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const enriched = matchesData.map((m) => ({
          ...m,
          matched_profile: profileMap.get(
            m.user_a === session.user.id ? m.user_b : m.user_a
          ),
        }));

        setMatches(enriched.filter((m) => m.matched_profile));
      }

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
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-3xl italic text-spark-400">Spark</h1>
          <div className="flex items-center gap-1 bg-spark-500/10 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-spark-400" />
            <span className="text-xs text-spark-400 font-medium">
              This week's matches
            </span>
          </div>
        </div>
        <p className="text-sm text-neutral-500">
          {matches.length > 0
            ? `${matches.length} people who might be your person`
            : 'Your matches will appear here every Monday'}
        </p>
      </div>

      {/* Match cards */}
      {matches.length > 0 ? (
        <div className="px-4 space-y-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              currentUserId={userId}
              onChat={() => router.push(`/chat/${match.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <Flame className="w-8 h-8 text-neutral-600" />
          </div>
          <h2 className="font-serif text-xl mb-2">No matches yet</h2>
          <p className="text-sm text-neutral-500 max-w-xs">
            New matches drop every Monday at midnight. We're finding people
            who'd actually get you.
          </p>
        </div>
      )}

      <BottomNav active="matches" />
    </div>
  );
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
