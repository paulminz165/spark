/**
 * SPARK — Compatibility Matching Algorithm
 *
 * Computes a 0-100 compatibility score between two users
 * based on quiz scores, shared interests, and dealbreaker filters.
 */

// Dimension weights (must sum to 1.0)
const WEIGHTS = {
  lifestyle: 0.30,
  values: 0.25,
  interests: 0.20,
  social_energy: 0.15,
  communication: 0.10,
};

/**
 * Check if two users pass each other's dealbreaker filters.
 * Returns false if ANY dealbreaker is violated — no exceptions.
 */
export function passesDealbreakers(userA, userB) {
  // Gender preference
  if (userA.pref_gender?.length && !userA.pref_gender.includes(userB.gender)) return false;
  if (userB.pref_gender?.length && !userB.pref_gender.includes(userA.gender)) return false;

  // Age preference
  const ageA = getAge(userA.date_of_birth);
  const ageB = getAge(userB.date_of_birth);
  if (ageB < userA.pref_age_min || ageB > userA.pref_age_max) return false;
  if (ageA < userB.pref_age_min || ageA > userB.pref_age_max) return false;

  // Diet preference
  if (userA.pref_diet?.length && !userA.pref_diet.includes(userB.diet)) return false;
  if (userB.pref_diet?.length && !userB.pref_diet.includes(userA.diet)) return false;

  // Smoker preference
  if (userA.pref_smoker === false && userB.smoker === true) return false;
  if (userB.pref_smoker === false && userA.smoker === true) return false;

  return true;
}

/**
 * Compute compatibility score between two users.
 * Returns { total, breakdown, sharedInterests }
 */
export function computeCompatibility(userA, userB, scoresA, scoresB, interestsA, interestsB) {
  // 1. Lifestyle similarity (cosine-like proximity)
  const lifestyleSim = proximityScore(scoresA.lifestyle_score, scoresB.lifestyle_score, 5);

  // 2. Values alignment
  const valuesSim = proximityScore(scoresA.values_score, scoresB.values_score, 5);

  // 3. Interest overlap (Jaccard index with niche bonus)
  const interestScore = interestOverlap(interestsA, interestsB);

  // 4. Social energy proximity
  const socialSim = proximityScore(scoresA.social_energy_score, scoresB.social_energy_score, 5);

  // 5. Communication compatibility (allows some complementarity)
  const commSim = complementaryScore(scoresA.communication_score, scoresB.communication_score, 5);

  // Weighted total
  const total = Math.round(
    lifestyleSim * WEIGHTS.lifestyle * 100 +
    valuesSim * WEIGHTS.values * 100 +
    interestScore.score * WEIGHTS.interests * 100 +
    socialSim * WEIGHTS.social_energy * 100 +
    commSim * WEIGHTS.communication * 100
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      lifestyle: Math.round(lifestyleSim * 100),
      values: Math.round(valuesSim * 100),
      interests: Math.round(interestScore.score * 100),
      social_energy: Math.round(socialSim * 100),
      communication: Math.round(commSim * 100),
    },
    sharedInterests: interestScore.shared,
  };
}

/**
 * Proximity score: how close two values are on a 1-maxVal scale.
 * Returns 0-1 where 1 = identical.
 */
function proximityScore(a, b, maxVal) {
  const diff = Math.abs(a - b);
  return 1 - (diff / maxVal);
}

/**
 * Complementary score: allows some difference to score well.
 * A talker + a listener can be a good match.
 * Scores highest when difference is 0-1, still decent at 2.
 */
function complementaryScore(a, b, maxVal) {
  const diff = Math.abs(a - b);
  if (diff <= 1) return 1.0;
  if (diff <= 2) return 0.8;
  return 1 - (diff / maxVal);
}

/**
 * Interest overlap using Jaccard index with niche bonus.
 * Rare shared interests (picked by <10% of users) get 2x weight.
 */
function interestOverlap(interestsA, interestsB) {
  const setA = new Set(interestsA.map(i => i.name));
  const setB = new Set(interestsB.map(i => i.name));

  const shared = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return { score: 0.5, shared: [] };

  // Base Jaccard
  let score = shared.length / union.size;

  // Niche bonus: if they share a rare interest, boost score
  // (In production, you'd check global popularity of each interest)
  if (shared.length >= 3) score = Math.min(1, score * 1.2);

  return { score, shared };
}

/**
 * Generate a conversation starter based on shared interests.
 */
export function generateSparkPrompt(sharedInterests, userAName, userBName) {
  const prompts = {
    'Street Food': `You both picked "Street Food" — serious question: Dolma Aunty momos or GTB Nagar chaat?`,
    'Chai Lover': `Two chai lovers matched! What's the order — cutting chai, masala chai, or sulaimani?`,
    'Night Owl': `Fellow night owls! What's keeping you up — Netflix, coding, or existential thoughts?`,
    'Anime': `Anime fans unite! Top 3 — go. No wrong answers (unless you say Boruto).`,
    'Gaming': `Gamers matched! What are you playing right now?`,
    'Gym': `Two gym people — do you even lift? What's your split?`,
    'Cricket': `Cricket fans! T20 or Test? This answer matters.`,
    'Startups': `Both interested in startups — what's the idea you keep coming back to?`,
    'Photography': `Two photographers! Show each other your last 3 photos from your gallery.`,
    'Theatre': `Theatre people! Best play you've seen (or been in) — go.`,
    'Trekking': `Fellow trekkers! Best trek you've done, and the one on your bucket list?`,
    'Reading': `Readers matched! What are you reading right now?`,
    'Stand-up Comedy': `Comedy fans! Who's your favourite Indian stand-up? Choose wisely.`,
    'Cooking': `Two people who cook! What's your signature dish?`,
    'Travel': `Travel buddies! Mountains or beach — and why are mountains the right answer?`,
  };

  // Find a shared interest with a prompt
  for (const interest of sharedInterests) {
    if (prompts[interest]) {
      return prompts[interest];
    }
  }

  // Fallback: generic prompt using the shared interests
  if (sharedInterests.length >= 2) {
    return `You both picked "${sharedInterests[0]}" and "${sharedInterests[1]}" — clearly on the same wavelength. So what's the thing you're most into right now?`;
  }

  if (sharedInterests.length === 1) {
    return `You both picked "${sharedInterests[0]}" — tell each other why.`;
  }

  return `You're matched! Here's an icebreaker: what's something you've been nerding out about lately?`;
}

/**
 * Generate weekly matches for all active users.
 * Called by a cron job / Supabase Edge Function every Monday.
 */
export async function generateWeeklyMatches(supabase, matchesPerUser = 5) {
  const weekOf = getMonday(new Date()).toISOString().split('T')[0];

  // Fetch all active, quiz-completed users with their scores and interests
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      *,
      user_scores (*),
      user_interests (
        interests (name, category)
      )
    `)
    .eq('is_active', true)
    .eq('quiz_completed', true);

  if (!users || users.length < 2) return [];

  const allMatches = [];

  for (const userA of users) {
    // Get users already matched with this person (all time)
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user_a, user_b')
      .or(`user_a.eq.${userA.id},user_b.eq.${userA.id}`);

    const alreadyMatched = new Set();
    existingMatches?.forEach(m => {
      alreadyMatched.add(m.user_a === userA.id ? m.user_b : m.user_a);
    });

    // Score all potential matches
    const candidates = [];
    for (const userB of users) {
      if (userB.id === userA.id) continue;
      if (alreadyMatched.has(userB.id)) continue;
      if (!passesDealbreakers(userA, userB)) continue;

      const interestsA = userA.user_interests?.map(ui => ui.interests) || [];
      const interestsB = userB.user_interests?.map(ui => ui.interests) || [];

      const result = computeCompatibility(
        userA, userB,
        userA.user_scores, userB.user_scores,
        interestsA, interestsB
      );

      candidates.push({
        userId: userB.id,
        ...result,
      });
    }

    // Sort by score, take top N
    candidates.sort((a, b) => b.total - a.total);
    const topMatches = candidates.slice(0, matchesPerUser);

    for (const match of topMatches) {
      // Avoid duplicate pairs (A->B and B->A)
      const pairKey = [userA.id, match.userId].sort().join('-');
      if (allMatches.find(m => m.pairKey === pairKey)) continue;

      const sparkPrompt = generateSparkPrompt(match.sharedInterests, userA.name, '');

      allMatches.push({
        pairKey,
        data: {
          user_a: userA.id,
          user_b: match.userId,
          compatibility_score: match.total,
          score_breakdown: match.breakdown,
          shared_interests: match.sharedInterests,
          spark_prompt: sparkPrompt,
          week_of: weekOf,
          status: 'pending',
        },
      });
    }
  }

  // Insert all matches
  if (allMatches.length > 0) {
    const { error } = await supabase
      .from('matches')
      .upsert(allMatches.map(m => m.data), {
        onConflict: 'user_a,user_b,week_of',
      });

    if (error) console.error('Match generation error:', error);
  }

  return allMatches;
}

// Helpers
function getAge(dateOfBirth) {
  if (!dateOfBirth) return 22; // default assumption
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
