'use client';

import BottomNav from '@/components/BottomNav';
import { Globe } from 'lucide-react';

export default function ConfessionsPage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="px-6 pt-8 pb-4">
        <h1 className="font-serif text-3xl mb-1">Wall</h1>
        <p className="text-sm text-neutral-400">Anonymous confessions — coming soon</p>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-neutral-600" />
        </div>
        <h2 className="font-serif text-xl mb-2">Coming Soon</h2>
        <p className="text-sm text-neutral-400 max-w-xs">
          Anonymous confessions wall for IIT Delhi. Stay tuned!
        </p>
      </div>

      <BottomNav active="confessions" />
    </div>
  );
}