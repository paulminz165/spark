'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { Flame, X, Heart, Sparkles } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  bio: string;
  gender: string;
  date_of_birth: string;
  relationship_goal: string;
  diet: string;
  program: string;
  department: string;
  shared_interests: string[];
}

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [userId, setUserId] = useState('');
  const [showMatch, setShowMatch] = useState(false);
  const [matchedName, setMatchedName] = useState('');

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/auth');
          return;
        }

        const uid = session.user.id;
        setUserId(uid);

        const { data: myProfile } = await supabase
          .from('profiles')
          .select('pref_gender, pref_age_min, pref_age_max, gender')
          .eq('id', uid)
          .single();

        const { data: swipedData } = await supabase
          .from('swipes')
          .select('swiped_id')
          .eq('swiper_id', uid);

        const swipedIds = swipedData?.map((s) => s.swiped_id) || [];
        swipedIds.push(uid);

        let query = supabase
          .from('profiles')
          .select('id, name, bio, gender, date_of_birth, relationship_goal, diet, program, department')
          .not('id', 'in', `(${swipedIds.join(',')})`)
          .limit(20);

        if (myProfile?.pref_gender && myProfile.pref_gender.length > 0) {
          query = query.in('gender', myProfile.pref_gender);
        }

        const { data: candidateProfiles, error: queryError } = await query;

        console.log('Discover candidates:', candidateProfiles?.length, 'Error:', queryError);

        if (candidateProfiles && candidateProfiles.length > 0) {
          const { data: myInterests } = await supabase
            .from('user_interests')
            .select('interest_id, interests(name)')
            .eq('user_id', uid);

          const myInterestNames = myInterests?.map((i: any) => i.interests?.name).filter(Boolean) || [];

          const enriched = await Promise.all(
            candidateProfiles.map(async (p) => {
              const { data: theirInterests } = await supabase
                .from('user_interests')
                .select('interest_id, interests(name)')
                .eq('user_id', p.id);

              const theirInterestNames = theirInterests?.map((i: any) => i.interests?.name).filter(Boolean) || [];
              const shared = myInterestNames.filter((name: string) => theirInterestNames.includes(name));

              return { ...p, shared_interests: shared };
            })
          );

          setProfiles(enriched);
        }
      } catch (err) {
        console.error('Discover init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const currentProfile = profiles[currentIndex];

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (swiping || !currentProfile) return;
    setSwiping(true);
    setSwipeDirection(direction === 'like' ? 'right' : 'left');

    // Wait for card exit animation
    await new Promise((r) => setTimeout(r, 300));

    try {
      await supabase.from('swipes').insert({
        swiper_id: userId,
        swiped_id: currentProfile.id,
        direction,
      });

      if (direction === 'like') {
        const { data: mutualCheck } = await supabase
          .from('swipes')
          .select('id')
          .eq('swiper_id', currentProfile.id)
          .eq('swiped_id', userId)
          .eq('direction', 'like')
          .maybeSingle();

        if (mutualCheck) {
          setMatchedName(currentProfile.name);
          setSwipeDirection(null);
          setDragX(0);
          setSwiping(false);
          setShowMatch(true);
          return; // Don't advance card — celebration is showing
        }
      }
    } catch (err) {
      console.error('Swipe error:', err);
    }

    setSwipeDirection(null);
    setDragX(0);
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(profiles.length);
    }
    setSwiping(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setDragX(e.touches[0].clientX - startX.current);
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragX > 100) handleSwipe('like');
    else if (dragX < -100) handleSwipe('pass');
    else setDragX(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (dragX > 100) handleSwipe('like');
    else if (dragX < -100) handleSwipe('pass');
    else setDragX(0);
  };

  const age = currentProfile?.date_of_birth
    ? new Date().getFullYear() - new Date(currentProfile.date_of_birth).getFullYear()
    : null;

  const cardRotation = dragX * 0.1;
  const cardOpacity = Math.max(0.5, 1 - Math.abs(dragX) / 400);

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
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-3xl italic text-spark-400">Wynked</h1>
          <div className="flex items-center gap-1 bg-spark-500/10 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-spark-400" />
            <span className="text-xs text-spark-400 font-medium">
              {Math.max(0, profiles.length - currentIndex)} left
            </span>
          </div>
        </div>
        <p className="text-sm text-neutral-400">
          Swipe right if you&apos;re interested, left to pass
        </p>
      </div>

      <div className="px-4 relative" style={{ minHeight: '420px' }}>
        {currentProfile ? (
          <div
            className="transition-transform duration-300 ease-out select-none cursor-grab active:cursor-grabbing"
            style={{
              transform: `translateX(${swipeDirection === 'right' ? 400 : swipeDirection === 'left' ? -400 : dragX}px) rotate(${swipeDirection === 'right' ? 20 : swipeDirection === 'left' ? -20 : cardRotation}deg)`,
              opacity: swipeDirection ? 0 : cardOpacity,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); } }}
          >
            {dragX > 50 && (
              <div className="absolute top-6 left-6 z-10 border-4 border-green-400 text-green-400 font-bold text-2xl px-4 py-1 rounded-xl rotate-[-15deg]">
                LIKE
              </div>
            )}
            {dragX < -50 && (
              <div className="absolute top-6 right-6 z-10 border-4 border-red-400 text-red-400 font-bold text-2xl px-4 py-1 rounded-xl rotate-[15deg]">
                PASS
              </div>
            )}

            <div className="bg-surface-raised border border-[#2A2A3E] rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-spark-500/20 to-spark-700/20 h-32 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-serif font-bold text-spark-400">
                    {currentProfile.name?.charAt(0)?.toUpperCase()}
                  </p>
                  <p className="text-xs text-spark-400/60 mt-1">Compatibility over looks</p>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3">
                  <h3 className="font-semibold text-xl">
                    {currentProfile.name}
                    {age && <span className="text-neutral-400 font-normal">, {age}</span>}
                  </h3>
                  <p className="text-sm text-neutral-400">
                    {[currentProfile.program, currentProfile.department].filter(Boolean).join(' · ') || 'IIT Delhi'}
                  </p>
                </div>

                {currentProfile.bio && (
                  <p className="text-sm text-neutral-300 mb-4">&quot;{currentProfile.bio}&quot;</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {currentProfile.relationship_goal && (
                    <span className="text-xs bg-surface-raised text-neutral-300 px-2.5 py-1 rounded-full">
                      {currentProfile.relationship_goal}
                    </span>
                  )}
                  {currentProfile.diet && (
                    <span className="text-xs bg-surface-raised text-neutral-300 px-2.5 py-1 rounded-full">
                      {currentProfile.diet}
                    </span>
                  )}
                </div>

                {currentProfile.shared_interests?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-neutral-400 mb-2">Shared interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.shared_interests.map((interest) => (
                        <span key={interest} className="text-xs bg-spark-500/10 text-spark-400 px-2.5 py-1 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentProfile.shared_interests?.length === 0 && (
                  <p className="text-xs text-neutral-600 mb-4">No shared interests yet — opposites attract?</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
              <Flame className="w-8 h-8 text-neutral-600" />
            </div>
            <h2 className="font-serif text-xl mb-2">You&apos;ve seen everyone</h2>
            <p className="text-sm text-neutral-400 max-w-xs">
              Check back later as more people join Spark. Meanwhile, check your matches!
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 bg-spark-500 hover:bg-spark-400 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
            >
              View Matches
            </button>
          </div>
        )}
      </div>

      {currentProfile && (
        <div className="flex items-center justify-center gap-6 mt-6">
          <button
            onClick={() => handleSwipe('pass')}
            disabled={swiping}
            className="w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center text-neutral-400 hover:border-red-400 hover:text-red-400 hover:bg-red-400/5 transition-all active:scale-90"
          >
            <X className="w-7 h-7" />
          </button>
          <button
            onClick={() => handleSwipe('like')}
            disabled={swiping}
            className="w-20 h-20 rounded-full bg-spark-500 flex items-center justify-center text-white hover:bg-spark-400 transition-all shadow-lg shadow-spark-500/20 active:scale-90"
          >
            <Heart className="w-8 h-8" />
          </button>
        </div>
      )}

      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F1A]/90 backdrop-blur-sm">
          <div className="text-center px-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="font-serif text-4xl italic text-spark-400 mb-2">It&apos;s a Match!</h2>
            <p className="text-neutral-400 mb-2">
              You and <span className="text-white font-semibold">{matchedName}</span> liked each other
            </p>
            <p className="text-sm text-neutral-400 mb-8">Start a conversation now!</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/chat')}
                className="bg-spark-500 hover:bg-spark-400 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
              >
                Say Hi 👋
              </button>
              <button
                onClick={() => {
                  setShowMatch(false);
                  if (currentIndex < profiles.length - 1) {
                    setCurrentIndex((i) => i + 1);
                  } else {
                    setCurrentIndex(profiles.length);
                  }
                }}
                className="border border-neutral-700 text-neutral-300 font-semibold py-3 px-8 rounded-xl hover:bg-surface-raised transition-colors"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="discover" />
    </div>
  );
}