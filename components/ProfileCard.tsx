'use client';

import { Heart, Target, Utensils } from 'lucide-react';

interface ProfileCardProps {
  profile: {
    name: string;
    bio: string;
    gender: string;
    date_of_birth: string;
    relationship_goal: string;
    diet: string;
    shared_interests?: string[];
    all_interests?: string[];
  };
  compatibilityScore: number;
  compatibilityBreakdown?: {
    interests: number;
    quiz: number;
    goals: number;
  };
  badge?: 'liked-you';
}

export default function ProfileCard({ profile, compatibilityScore, compatibilityBreakdown, badge }: ProfileCardProps) {
  const initial = profile.name?.charAt(0)?.toUpperCase() || '?';
  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : null;

  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (compatibilityScore / 100) * ringCircumference;

  const scoreColor =
    compatibilityScore >= 70 ? 'text-green-400' :
    compatibilityScore >= 40 ? 'text-yellow-400' :
    'text-red-400';

  const strokeColor =
    compatibilityScore >= 70 ? '#4ade80' :
    compatibilityScore >= 40 ? '#facc15' :
    '#f87171';

  return (
    <div className="relative rounded-2xl p-[2px] animate-gradient-spin"
      style={{
        background: 'linear-gradient(135deg, #8b5cf6, #f472b6, #8b5cf6, #f472b6)',
        backgroundSize: '200% 200%',
      }}
    >
      <div className="bg-[#1A1A2E] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-spark-500/20 to-spark-700/20 p-6 flex items-center gap-5 relative">
          {badge === 'liked-you' && (
            <div className="absolute top-3 right-3 bg-peach-400/20 border border-peach-400/30 px-2.5 py-1 rounded-full z-10">
              <span className="text-xs text-peach-400 font-medium flex items-center gap-1">
                <Heart className="w-3 h-3 fill-current" /> Liked you
              </span>
            </div>
          )}

          <div className="w-20 h-20 rounded-full bg-spark-500/20 border-2 border-spark-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-serif font-bold text-spark-400">{initial}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xl">
              {initial}.
              {age && <span className="text-neutral-400 font-normal ml-1">{age}</span>}
            </h3>
            {profile.gender && (
              <p className="text-sm text-neutral-400 capitalize">{profile.gender}</p>
            )}
            {profile.relationship_goal && (
              <span className="inline-flex items-center gap-1 text-xs bg-spark-500/10 text-spark-400 px-2 py-0.5 rounded-full mt-1">
                <Heart className="w-3 h-3" />
                {profile.relationship_goal}
              </span>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <svg width="68" height="68" className="-rotate-90">
              <circle cx="34" cy="34" r={ringRadius} fill="none" stroke="#2A2A3E" strokeWidth="4" />
              <circle
                cx="34" cy="34" r={ringRadius}
                fill="none"
                stroke={strokeColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${scoreColor}`}>{compatibilityScore}%</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="px-5 pt-4 pb-3">
            <p className="text-sm text-neutral-300 italic">&quot;{profile.bio}&quot;</p>
          </div>
        )}

        {/* Shared interests */}
        {(profile.shared_interests?.length ?? 0) > 0 ? (
          <div className="px-5 pb-3">
            <p className="text-xs text-neutral-500 mb-2">Shared interests</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.shared_interests!.map((interest) => (
                <span key={interest} className="text-xs bg-spark-500/15 text-spark-400 px-2.5 py-1 rounded-full">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-5 pb-3">
            <p className="text-xs text-neutral-600">No shared interests yet — opposites attract?</p>
          </div>
        )}

        {/* All interests */}
        {(profile.all_interests?.length ?? 0) > 0 && (
          <div className="px-5 pb-3 border-t border-[#2A2A3E] pt-3">
            <p className="text-xs text-neutral-500 mb-2">All interests</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.all_interests!.map((interest) => {
                const isShared = profile.shared_interests?.includes(interest);
                return (
                  <span
                    key={interest}
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      isShared
                        ? 'bg-spark-500/15 text-spark-400'
                        : 'bg-surface-raised text-neutral-400'
                    }`}
                  >
                    {interest}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick facts */}
        {(profile.diet || profile.relationship_goal) && (
          <div className="px-5 pb-3 border-t border-[#2A2A3E] pt-3">
            <p className="text-xs text-neutral-500 mb-2">Quick facts</p>
            <div className="grid grid-cols-2 gap-2">
              {profile.diet && (
                <div className="flex items-center gap-2 bg-surface-raised rounded-lg px-3 py-2">
                  <Utensils className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-xs text-neutral-300">{profile.diet}</span>
                </div>
              )}
              {profile.relationship_goal && (
                <div className="flex items-center gap-2 bg-surface-raised rounded-lg px-3 py-2">
                  <Target className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-xs text-neutral-300">{profile.relationship_goal}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compatibility breakdown */}
        {compatibilityBreakdown && (
          <div className="px-5 pb-5 border-t border-[#2A2A3E] pt-3">
            <p className="text-xs text-neutral-500 mb-2">Why you match</p>
            <div className="space-y-2">
              <BreakdownBar label="Shared Interests" value={compatibilityBreakdown.interests} />
              <BreakdownBar label="Quiz Compatibility" value={compatibilityBreakdown.quiz} />
              <BreakdownBar label="Relationship Goals" value={compatibilityBreakdown.goals} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value ?? 0) ;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-neutral-400">{label}</span>
        <span className="text-neutral-300">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-spark-500 to-peach-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}