'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { checkOnboardingStatus } from '@/lib/auth';
import ProfileSetup from '@/components/ProfileSetup';
import InterestPicker from '@/components/InterestPicker';
import QuizScreen from '@/components/QuizScreen';
import { Flame } from 'lucide-react';

type OnboardingStep = 'loading' | 'profile' | 'interests' | 'quiz' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('loading');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      setUserId(session.user.id);

      const status = await checkOnboardingStatus(session.user.id);
      if (status.completed) {
        router.replace('/dashboard');
        return;
      }

      setStep(status.step as OnboardingStep);
    };

    init();
  }, [router]);

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Flame className="w-8 h-8 text-spark-500 animate-pulse" />
      </div>
    );
  }

  if (step === 'done') {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen px-6 py-12">
      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {['profile', 'interests', 'quiz'].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              ['profile', 'interests', 'quiz'].indexOf(step) >= i
                ? 'bg-spark-500'
                : 'bg-surface-raised'
            }`}
          />
        ))}
      </div>

      {step === 'profile' && (
        <ProfileSetup
          userId={userId}
          onComplete={() => setStep('interests')}
        />
      )}

      {step === 'interests' && (
        <InterestPicker
          userId={userId}
          onComplete={() => setStep('quiz')}
          onBack={() => setStep('profile')}
        />
      )}

      {step === 'quiz' && (
        <QuizScreen
          userId={userId}
          onComplete={() => router.replace('/dashboard')}
          onBack={() => setStep('interests')}
        />
      )}
    </div>
  );
}
