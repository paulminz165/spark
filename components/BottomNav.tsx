'use client';

import Link from 'next/link';
import { Heart, MessageCircle, User, Globe, Compass } from 'lucide-react';

interface BottomNavProps {
  active: 'discover' | 'matches' | 'chat' | 'confessions' | 'profile';
}

const NAV_ITEMS = [
  { key: 'discover', label: 'Discover', icon: Compass, href: '/discover' },
  { key: 'matches', label: 'Liked You', icon: Heart, href: '/dashboard' },
  { key: 'chat', label: 'Chat', icon: MessageCircle, href: '/chat' },
  { key: 'confessions', label: 'Wall', icon: Globe, href: '/confessions' },
  { key: 'profile', label: 'Profile', icon: User, href: '/profile' },
] as const;

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-[#2A2A3E] z-50">
      <div className="mx-auto max-w-md flex">
        {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
              active === key
                ? 'text-spark-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}