import { supabase } from './supabase';

const ALLOWED_DOMAIN = 'iitd.ac.in';

/**
 * Validate that an email is an IIT Delhi email.
 */
export function isIITDEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

/**
 * Send a magic link to an @iitd.ac.in email.
 * Supabase handles the email delivery (free tier: 4 emails/hour).
 */
export async function sendMagicLink(email: string) {
  // Temporarily allow any email for testing
// if (!isIITDEmail(email)) {
//   return { error: { message: 'Only @iitd.ac.in emails are allowed' } };
// }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  return { error };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user's profile from Supabase.
 * Creates a skeleton profile if one doesn't exist yet.
 */
export async function getOrCreateProfile(userId: string, email: string) {
  // Try to get existing profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) return { profile, error: null };

  // Create new profile
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      name: email.split('@')[0], // Temporary name from email
    })
    .select()
    .single();

  return { profile: newProfile, error: createError };
}

/**
 * Check if user has completed onboarding.
 */
export async function checkOnboardingStatus(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('quiz_completed, name, date_of_birth, gender')
    .eq('id', userId)
    .single();

  if (!data) return { completed: false, step: 'profile' };

  if (!data.name || !data.date_of_birth || !data.gender) {
    return { completed: false, step: 'profile' };
  }

  if (!data.quiz_completed) {
    return { completed: false, step: 'quiz' };
  }

  return { completed: true, step: 'done' };
}
