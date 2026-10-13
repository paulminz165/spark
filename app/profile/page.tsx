'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';
import { Flame, LogOut, Edit3, Shield, ChevronRight } from 'lucide-react';

interface Profile {
  name: string;
  email: string;
  bio: string;
  gender: string;
  date_of_birth: string;
  diet: string;
  relationship_goal: string;
  avatar_url: string | null;
}

interface UserScores {
  lifestyle_score: number;
  values_score: number;
  social_energy_score: number;
  communication_score: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<UserScores | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      const uid = session.user.id;

      // Fetch profile, scores, and interests in parallel
      const [profileRes, scoresRes, interestsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('user_scores').select('*').eq('user_id', uid).single(),
        supabase
          .from('user_interests')
          .select('interests (name)')
          .eq('user_id', uid),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (scoresRes.data) setScores(scoresRes.data);
      if (interestsRes.data) {
        setInterests(interestsRes.data.map((ui: any) => ui.interests.name));
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Flame className="w-8 h-8 text-spark-500 animate-pulse" />
      </div>
    );
  }

  if (!profile) return null;

  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : null;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl">Profile</h1>
          <button
            onClick={() => router.push('/onboarding')}
            className="text-spark-400 text-sm flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>

        {/* Avatar and name */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-spark-500/30 to-spark-700/30 flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              <span className="text-spark-400 font-serif text-3xl">
                {profile.name[0]}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm text-neutral-400">
              {age && `${age} · `}
              {profile.gender}
            </p>
            {profile.relationship_goal && (
              <p className="text-xs text-spark-400 mt-0.5">
                {profile.relationship_goal}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-neutral-300 mt-4 bg-surface-raised rounded-xl px-4 py-3">
            "{profile.bio}"
          </p>
        )}
      </div>

      {/* Your vibe scores */}
      {scores && (
        <div className="px-6 mb-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Your compatibility profile
          </h3>
          <div className="bg-surface-raised rounded-xl p-4 space-y-3">
            {[
              { label: 'Lifestyle', value: scores.lifestyle_score, emoji: '🏠' },
              { label: 'Values', value: scores.values_score, emoji: '💎' },
              { label: 'Social energy', value: scores.social_energy_score, emoji: '⚡' },
              { label: 'Communication', value: scores.communication_score, emoji: '💬' },
            ].map(({ label, value, emoji }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm w-6">{emoji}</span>
                <span className="text-xs text-neutral-400 w-28">{label}</span>
                <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-spark-500 rounded-full"
                    style={{ width: `${(value / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-400 w-8 text-right">
                  {value}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div className="px-6 mb-6">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Your interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span
                key={interest}
                className="text-xs bg-spark-500/10 text-spark-400 px-3 py-1.5 rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Settings links */}
      <div className="px-6 space-y-1">
        <button className="w-full flex items-center justify-between py-3.5 px-4 bg-surface-raised rounded-xl text-sm text-neutral-300 hover:bg-surface-overlay transition-colors">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-neutral-400" />
            <span>Privacy & Dealbreakers</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-600" />
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 py-3.5 px-4 bg-surface-raised rounded-xl text-sm text-red-400 hover:bg-red-400/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>

      {/* Version */}
      <p className="text-center text-[10px] text-neutral-700 mt-8">
        Spark v0.1.0 — IIT Delhi
      </p>

      <BottomNav active="profile" />
    </div>
  );
}
