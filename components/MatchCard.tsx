'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';

interface MatchCardProps {
  match: any;
  currentUserId: string;
  onChat: () => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  lifestyle: 'Lifestyle',
  values: 'Values',
  interests: 'Interests',
  social_energy: 'Social energy',
  communication: 'Communication',
};

const DIMENSION_EMOJIS: Record<string, string> = {
  lifestyle: '🏠',
  values: '💎',
  interests: '🎯',
  social_energy: '⚡',
  communication: '💬',
};

export default function MatchCard({ match, currentUserId, onChat }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const profile = match.matched_profile;
  const score = match.compatibility_score;
  const photoUnlocked = match.photo_unlocked_at !== null;

  // Calculate age
  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : null;

  // Score color
  const scoreColor =
    score >= 80
      ? 'text-green-400'
      : score >= 60
        ? 'text-spark-400'
        : 'text-yellow-400';

  return (
    <div className="bg-surface-raised border border-[#2A2A3E] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar / locked photo */}
            <div className="relative">
              {photoUnlocked && profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-spark-500/30 to-spark-700/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-spark-400/60" />
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-lg">{profile.name}</h3>
              <p className="text-sm text-neutral-400">
                {age && `${age}`}
                {profile.relationship_goal && ` · ${profile.relationship_goal}`}
              </p>
            </div>
          </div>

          {/* Score badge */}
          <div className="flex flex-col items-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>
              {score}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">
              match
            </span>
          </div>
        </div>

        {/* Photo lock notice */}
        {!photoUnlocked && (
          <div className="flex items-center gap-2 bg-surface-raised/50 rounded-lg px-3 py-2 mb-3">
            {match.status === 'both_liked' ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400">
                  Photos unlock in 24 hours — get to know each other first
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-400">
                  Photos unlock 24h after you both like the match
                </span>
              </>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-neutral-300 mb-3">"{profile.bio}"</p>
        )}

        {/* Shared interests */}
        {match.shared_interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {match.shared_interests.map((interest: string) => (
              <span
                key={interest}
                className="text-xs bg-spark-500/10 text-spark-400 px-2.5 py-1 rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Spark prompt */}
        {match.spark_prompt && (
          <div className="bg-surface-overlay rounded-xl p-3.5 mb-3">
            <p className="text-xs text-spark-400 font-medium mb-1">
              💬 Conversation starter
            </p>
            <p className="text-sm text-neutral-300">{match.spark_prompt}</p>
          </div>
        )}

        {/* Expand/collapse breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-400"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Hide breakdown
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> See why you matched
            </>
          )}
        </button>
      </div>

      {/* Score breakdown */}
      {expanded && match.score_breakdown && (
        <div className="px-5 pb-4 space-y-2.5">
          {Object.entries(match.score_breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm w-6">
                {DIMENSION_EMOJIS[key] || '·'}
              </span>
              <span className="text-xs text-neutral-400 w-28">
                {DIMENSION_LABELS[key] || key}
              </span>
              <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className="h-full bg-spark-500 rounded-full transition-all duration-700"
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs text-neutral-400 w-8 text-right">
                {String(value)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex border-t border-[#2A2A3E]">
        <button className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-neutral-400 hover:text-red-400 hover:bg-red-400/5 transition-colors border-r border-[#2A2A3E]">
          <Heart className="w-4 h-4" /> Like
        </button>
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-spark-400 hover:bg-spark-500/5 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> Chat
        </button>
      </div>
    </div>
  );
}
