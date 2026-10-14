'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { checkOnboardingStatus } from '@/lib/auth';

const PUBLIC_ROUTES = ['/auth', '/auth/reset', '/'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const guard = async () => {
      // Skip guard for public routes
      if (PUBLIC_ROUTES.includes(pathname)) {
        setReady(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/auth');
        return;
      }

      const { completed } = await checkOnboardingStatus(session.user.id);

      if (!completed && pathname !== '/onboarding') {
        router.replace('/onboarding');
        return;
      }

      setReady(true);
    };

    setReady(false);
    guard();
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-spark-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}