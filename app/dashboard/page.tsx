'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
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
    program: string;
    department: string;
  };
  shared_interests: string[];
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

              const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, bio, gender, date_of_birth, relationship_goal, diet, program, department')
                .eq('id', newSwipe.swiper_id)
                .single();

              if (!profile) return;

              const shared = await getSharedInterests(uid, newSwipe.swiper_id);

              setLikedByProfiles((prev) => [...prev, {
                swipeId: newSwipe.id,
                swiperId: newSwipe.swiper_id,
                profile,
                shared_interests: shared,
              }]);
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

    const likerIds = pendingLikes.map((s) => s.swiper_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, bio, gender, date_of_birth, relationship_goal, diet, program, department')
      .in('id', likerIds);

    if (!profiles) return;

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const enriched: LikedByProfile[] = [];
    for (const like of pendingLikes) {
      const profile = profileMap.get(like.swiper_id);
      if (!profile) continue;

      const shared = await getSharedInterests(uid, like.swiper_id);
      enriched.push({ swipeId: like.id, swiperId: like.swiper_id, profile, shared_interests: shared });
    }

    setLikedByProfiles(enriched);
  };

  const getSharedInterests = async (myId: string, theirId: string) => {
    const { data: myInterests } = await supabase
      .from('user_interests')
      .select('interest_id, interests(name)')
      .eq('user_id', myId);

    const myNames = myInterests?.map((i: any) => i.interests?.name).filter(Boolean) || [];

    const { data: theirInterests } = await supabase
      .from('user_interests')
      .select('interest_id, interests(name)')
      .eq('user_id', theirId);

    const theirNames = theirInterests?.map((i: any) => i.interests?.name).filter(Boolean) || [];
    return myNames.filter((n: string) => theirNames.includes(n));
  };

  const currentProfile = likedByProfiles[currentIndex];

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (swiping || !currentProfile) return;
    setSwiping(true);
    setSwipeDirection(direction === 'like' ? 'right' : 'left');

    await supabase.from('swipes').insert({
      swiper_id: userId,
      swiped_id: currentProfile.swiperId,
      direction,
    });

    // They already liked me, so if I like back → it's a match
    if (direction === 'like') {
      setMatchedName(currentProfile.profile.name);
      setTimeout(() => setShowMatch(true), 350);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setDragX(0);
      if (currentIndex < likedByProfiles.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setCurrentIndex(likedByProfiles.length);
      }
      setSwiping(false);
    }, 300);
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

  const age = currentProfile?.profile.date_of_birth
    ? new Date().getFullYear() - new Date(currentProfile.profile.date_of_birth).getFullYear()
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
        <p className="text-sm text-neutral-500">People who are interested in you</p>
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

            <div className="bg-surface-raised border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-pink-500/20 to-spark-700/20 h-32 flex items-center justify-center relative">
                <div className="absolute top-3 right-3 bg-pink-500/20 border border-pink-500/30 px-2.5 py-1 rounded-full">
                  <span className="text-xs text-pink-400 font-medium flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Liked you
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-serif font-bold text-spark-400">
                    {currentProfile.profile.name?.charAt(0)?.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3">
                  <h3 className="font-semibold text-xl">
                    {currentProfile.profile.name}
                    {age && <span className="text-neutral-500 font-normal">, {age}</span>}
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {[currentProfile.profile.program, currentProfile.profile.department]
                      .filter(Boolean).join(' · ') || 'IIT Delhi'}
                  </p>
                </div>

                {currentProfile.profile.bio && (
                  <p className="text-sm text-neutral-300 mb-4">"{currentProfile.profile.bio}"</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {currentProfile.profile.relationship_goal && (
                    <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                      {currentProfile.profile.relationship_goal}
                    </span>
                  )}
                  {currentProfile.profile.diet && (
                    <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                      {currentProfile.profile.diet}
                    </span>
                  )}
                </div>

                {currentProfile.shared_interests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-neutral-500 mb-2">Shared interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.shared_interests.map((interest) => (
                        <span key={interest} className="text-xs bg-spark-500/10 text-spark-400 px-2.5 py-1 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentProfile.shared_interests.length === 0 && (
                  <p className="text-xs text-neutral-600 mb-4">No shared interests yet — opposites attract?</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-neutral-600" />
            </div>
            <h2 className="font-serif text-xl mb-2">No pending likes</h2>
            <p className="text-sm text-neutral-500 max-w-xs">
              When someone likes you, they'll show up here. Keep discovering!
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

      {/* Match celebration overlay */}
      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center px-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="font-serif text-4xl italic text-spark-400 mb-2">It's a Match!</h2>
            <p className="text-neutral-400 mb-2">
              You and <span className="text-white font-semibold">{matchedName}</span> liked each other
            </p>
            <p className="text-sm text-neutral-500 mb-8">Start a conversation now!</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/chat')}
                className="bg-spark-500 hover:bg-spark-400 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
              >
                Say Hi 👋
              </button>
              <button
                onClick={() => setShowMatch(false)}
                className="border border-neutral-700 text-neutral-300 font-semibold py-3 px-8 rounded-xl hover:bg-neutral-800 transition-colors"
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