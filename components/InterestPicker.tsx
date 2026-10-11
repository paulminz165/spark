'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface InterestPickerProps {
  userId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface Interest {
  id: string;
  name: string;
  category: string;
  emoji: string;
}

const MIN_INTERESTS = 5;
const MAX_INTERESTS = 15;

// Emoji map for interest categories
const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍕',
  sports: '⚡',
  entertainment: '🎬',
  lifestyle: '✨',
  creative: '🎨',
  intellectual: '📚',
  social: '🎉',
  tech: '💻',
};

export default function InterestPicker({ userId, onComplete, onBack }: InterestPickerProps) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data } = await supabase
        .from('interests')
        .select('*')
        .order('category');

      if (data) {
        setInterests(
          data.map((i: any) => ({
            ...i,
            emoji: CATEGORY_EMOJIS[i.category] || '⭐',
          }))
        );
      }
      setLoading(false);
    };

    fetchInterests();
  }, []);

  const toggleInterest = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_INTERESTS) {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size < MIN_INTERESTS) return;

    setSaving(true);

    // Delete existing interests, then insert new ones
    await supabase.from('user_interests').delete().eq('user_id', userId);

    const { error } = await supabase.from('user_interests').insert(
      Array.from(selected).map((interestId) => ({
        user_id: userId,
        interest_id: interestId,
      }))
    );

    setSaving(false);

    if (!error) {
      onComplete();
    }
  };

  // Group by category
  const grouped = interests.reduce(
    (acc, interest) => {
      if (!acc[interest.category]) acc[interest.category] = [];
      acc[interest.category].push(interest);
      return acc;
    },
    {} as Record<string, Interest[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-spark-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-300 mb-4 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-serif text-3xl mb-1">Your interests</h1>
        <p className="text-neutral-400 text-sm">
          Pick {MIN_INTERESTS}–{MAX_INTERESTS} things you're into. We'll use
          these to find your matches.
        </p>
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-between bg-surface-raised rounded-xl px-4 py-3">
        <span className="text-sm text-neutral-300">
          {selected.size} of {MIN_INTERESTS}–{MAX_INTERESTS} selected
        </span>
        <div className="h-2 w-24 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-spark-500 rounded-full transition-all"
            style={{
              width: `${Math.min(100, (selected.size / MIN_INTERESTS) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Interest chips by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
            {CATEGORY_EMOJIS[category]} {category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {items.map((interest) => {
              const isSelected = selected.has(interest.id);
              return (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`py-2 px-3.5 rounded-full text-sm border transition-all ${
                    isSelected
                      ? 'border-spark-500 bg-spark-500/15 text-spark-400'
                      : 'border-neutral-800 bg-surface-raised text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {interest.name}
                  {isSelected && <Check className="inline w-3 h-3 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={selected.size < MIN_INTERESTS || saving}
        className="w-full bg-spark-500 hover:bg-spark-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors sticky bottom-6"
      >
        {saving ? 'Saving...' : `Next: Compatibility quiz`}
        {!saving && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
