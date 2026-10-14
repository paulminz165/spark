import { supabase } from './supabase';

interface Profile {
  id: string;
  gender: string;
  date_of_birth: string;
  relationship_goal: string;
  diet?: string;
  quiz_answers?: Record<string, string>;
}

/**
 * Calculate compatibility score between two users (0-100)
 */
export async function calculateCompatibility(
  userId: string,
  otherUserId: string
): Promise<{
  score: number;
  sharedInterests: string[];
  breakdown: {
    interests: number;
    quiz: number;
    goals: number;
  };
}> {
  // 1. Fetch both profiles
  const [{ data: userProfile }, { data: otherProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('profiles').select('*').eq('id', otherUserId).single(),
  ]);

  // 2. Fetch both users' interests
  const [{ data: userInterests }, { data: otherInterests }] = await Promise.all([
    supabase.from('user_interests').select('interest_id, interests(name)').eq('user_id', userId),
    supabase.from('user_interests').select('interest_id, interests(name)').eq('user_id', otherUserId),
  ]);

  const userInterestIds = new Set(userInterests?.map((i: any) => i.interest_id) || []);
  const otherInterestIds = new Set(otherInterests?.map((i: any) => i.interest_id) || []);

  // Shared interests
  const sharedIds = Array.from(userInterestIds).filter((id) => otherInterestIds.has(id));
  const sharedInterests = (otherInterests || [])
    .filter((i: any) => sharedIds.includes(i.interest_id))
    .map((i: any) => i.interests?.name || '');

  // --- SCORING ---

  // A. Interest score (40% weight)
  // Jaccard similarity: shared / (total unique)
  const totalUnique = new Set([...userInterestIds, ...otherInterestIds]).size;
  const interestScore = totalUnique > 0 ? (sharedIds.length / totalUnique) * 100 : 0;

  // B. Quiz score (40% weight)
  let quizScore = 0;
  if (userProfile?.quiz_answers && otherProfile?.quiz_answers) {
    const userAnswers = userProfile.quiz_answers;
    const otherAnswers = otherProfile.quiz_answers;
    const allQuestions = Object.keys(userAnswers);
    const totalQuestions = allQuestions.length;

    if (totalQuestions > 0) {
      const matching = allQuestions.filter(
        (q) => otherAnswers[q] && userAnswers[q] === otherAnswers[q]
      ).length;
      quizScore = (matching / totalQuestions) * 100;
    }
  }

  // C. Goals alignment (20% weight)
  let goalsScore = 0;
  if (userProfile?.relationship_goal && otherProfile?.relationship_goal) {
    if (userProfile.relationship_goal === otherProfile.relationship_goal) {
      goalsScore = 100;
    } else {
      // Partial match for compatible goals
      const compatible: Record<string, string[]> = {
        long_term: ['long_term', 'marriage'],
        marriage: ['long_term', 'marriage'],
        casual: ['casual', 'figuring_out'],
        figuring_out: ['casual', 'figuring_out', 'long_term'],
      };
      const userGoal = userProfile.relationship_goal;
      if (compatible[userGoal]?.includes(otherProfile.relationship_goal)) {
        goalsScore = 60;
      }
    }
  }

  // Weighted final score
  const score = Math.round(
    interestScore * 0.4 +
    quizScore * 0.4 +
    goalsScore * 0.2
  );

  return {
    score: Math.max(score, 10), // minimum 10% so it never shows 0
    sharedInterests,
    breakdown: {
      interests: Math.round(interestScore),
      quiz: Math.round(quizScore),
      goals: Math.round(goalsScore),
    },
  };
}