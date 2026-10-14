'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import ProfileCard from '@/components/ProfileCard';
import { calculateCompatibility } from '@/lib/compatibility';
import { Flame, Heart, X } from 'lucide-react';

interface LikedByProfile {
  swipeId: string;
  swiperId: string;
  profile: {
    id: string;
    name: string;
    bio: string;
    gender: string;
    date_of_birth: string;
    relationship_goal: string;
    diet: string;
  };
  shared_interests: string[];
  all_interests: string[];
  compatibility: number;
  compatibilityBreakdown: {
    interests: number;
    quiz: number;
    goals: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [likedByProfiles, setLikedByProfiles] = useState<LikedByProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedName, setMatchedName] = useState('');

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  useEffect(() => {
    let channel: any;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/auth');
          return;
        }

        const uid = session.user.id;
        setUserId(uid);

        await loadLikes(uid);

        // Real-time: new likes appear instantly
        channel = supabase
          .channel('liked-you')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'swipes', filter: `swiped_id=eq.${uid}` },
            async (payload) => {
              const newSwipe = payload.new as any;
              if (newSwipe.direction !== 'like') return;

              const enriched = await enrichProfile(uid, newSwipe.swiper_id, newSwipe.id);
              if (enriched) {
                setLikedByProfiles((prev) => [...prev, enriched]);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Dashboard init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const enrichProfile = async (myId: string, theirId: string, swipeId: string): Promise<LikedByProfile | null> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, bio, gender, date_of_birth, relationship_goal, diet')
      .eq('id', theirId)
      .single();

    if (!profile) return null;

    // Fetch my interests for shared calculation
    const { data: myInterests } = await supabase
      .from('user_interests')
      .select('interest_id, interests(name)')
      .eq('user_id', myId);

    const myInterestNames = myInterests?.map((i: any) => i.interests?.name).filter(Boolean) || [];

    const { data: theirInterests } = await supabase
      .from('user_interests')
      .select('interest_id, interests(name)')
      .eq('user_id', theirId);

    const theirInterestNames = theirInterests?.map((i: any) => i.interests?.name).filter(Boolean) || [];
    const shared = myInterestNames.filter((n: string) => theirInterestNames.includes(n));

    // calculateCompatibility is async — takes two user IDs
    const result = await calculateCompatibility(myId, theirId);

    return {
      swipeId,
      swiperId: theirId,
      profile,
      shared_interests: shared,
      all_interests: theirInterestNames,
      compatibility: result.score,
      compatibilityBreakdown: result.breakdown,
    };
  };

  const loadLikes = async (uid: string) => {
    const { data: incomingLikes } = await supabase
      .from('swipes')
      .select('id, swiper_id')
      .eq('swiped_id', uid)
      .eq('direction', 'like');

    if (!incomingLikes || incomingLikes.length === 0) return;

    const { data: mySwipes } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', uid);

    const mySwipedIds = new Set(mySwipes?.map((s) => s.swiped_id) || []);
    const pendingLikes = incomingLikes.filter((s) => !mySwipedIds.has(s.swiper_id));

    if (pendingLikes.length === 0) return;

    const enriched: LikedByProfile[] = [];
    for (const like of pendingLikes) {
      const profile = await enrichProfile(uid, like.swiper_id, like.id);
      if (profile) enriched.push(profile);
    }

    enriched.sort((a, b) => b.compatibility - a.compatibility);
    setLikedByProfiles(enriched);
  };

  const currentProfile = likedByProfiles[currentIndex];

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (swiping || !currentProfile) return;
    setSwiping(true);
    setSwipeDirection(direction === 'like' ? 'right' : 'left');

    await new Promise((r) => setTimeout(r, 300));

    try {
      await supabase.from('swipes').insert({
        swiper_id: userId,
        swiped_id: currentProfile.swiperId,
        direction,
      });

      if (direction === 'like') {
        setMatchedName(currentProfile.profile.name?.charAt(0)?.toUpperCase() || '?');
        setSwipeDirection(null);
        setDragX(0);
        setSwiping(false);
        setShowMatch(true);
        return;
      }
    } catch (err) {
      console.error('Swipe error:', err);
    }

    setSwipeDirection(null);
    setDragX(0);
    if (currentIndex < likedByProfiles.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(likedByProfiles.length);
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
          <h1 className="font-serif text-3xl italic text-spark-400">Liked You</h1>
          {likedByProfiles.length > 0 && currentIndex < likedByProfiles.length && (
            <div className="flex items-center gap-1 bg-spark-500/10 px-3 py-1 rounded-full">
              <Heart className="w-3.5 h-3.5 text-spark-400" />
              <span className="text-xs text-spark-400 font-medium">
                {likedByProfiles.length - currentIndex} pending
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-neutral-400">People who are interested in you</p>
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

            <ProfileCard
              profile={currentProfile.profile}
              compatibilityScore={currentProfile.compatibility}
              compatibilityBreakdown={currentProfile.compatibilityBreakdown}
              badge="liked-you"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-neutral-600" />
            </div>
            <h2 className="font-serif text-xl mb-2">No pending likes</h2>
            <p className="text-sm text-neutral-400 max-w-xs">
              When someone likes you, they&apos;ll show up here. Keep discovering!
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="mt-6 bg-spark-500 hover:bg-spark-400 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
            >
              Discover People
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
                  if (currentIndex < likedByProfiles.length - 1) {
                    setCurrentIndex((i) => i + 1);
                  } else {
                    setCurrentIndex(likedByProfiles.length);
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

      <BottomNav active="matches" />
    </div>
  );
}