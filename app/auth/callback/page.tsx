'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/auth';
import { Flame } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (session) {
        await getOrCreateProfile(session.user.id, session.user.email || '');
        router.replace('/onboarding');
      } else {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              await getOrCreateProfile(session.user.id, session.user.email || '');
              subscription.unsubscribe();
              router.replace('/onboarding');
            }
          }
        );

        setTimeout(() => {
          subscription.unsubscribe();
          setError('Login timed out. Please try again.');
        }, 10000);
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => router.push('/auth')}
          className="text-spark-400 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <Flame className="w-8 h-8 text-spark-500 animate-pulse mb-4" />
      <p className="text-neutral-400 text-sm">Signing you in...</p>
    </div>
  );
}