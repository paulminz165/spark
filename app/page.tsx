'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     if (session) {
  //       router.replace('/dashboard');
  //     } else {
  //       setChecking(false);
  //     }
  //   });
  // }, [router]);
    useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace('/onboarding');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Flame className="w-8 h-8 text-spark-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-20 h-20 rounded-2xl bg-spark-500/20 flex items-center justify-center mb-4 mx-auto">
          <Flame className="w-10 h-10 text-spark-500" />
        </div>
        <h1 className="font-serif text-5xl italic text-spark-400">Wynked</h1>
        <p className="text-sm text-neutral-400 mt-2">IIT Delhi</p>
      </div>

      {/* Tagline */}
      <p className="text-lg text-neutral-300 mb-2">
        Compatibility over looks.
      </p>
      <p className="text-sm text-neutral-400 mb-12 max-w-xs">
     Picked by who you actually are — not what you look like   .
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push('/auth')}
        className="w-full max-w-xs bg-spark-500 hover:bg-spark-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
      >
        Get Started with IITD Email
      </button>

      <p className="text-xs text-neutral-600 mt-4">
        Only @iitd.ac.in emails allowed
      </p>

      {/* Social proof placeholder */}
      <div className="mt-16 text-neutral-600 text-xs">
        <p>The connection is around the Campus</p>
      </div>
    </div>
  );
}
