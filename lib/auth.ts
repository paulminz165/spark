import { supabase } from './supabase';

const ALLOWED_DOMAIN = 'iitd.ac.in';

/**
 * Validate that an email is an IIT Delhi email.
 */
// export function isIITDEmail(email: string): boolean {
//   return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
// }

/**
 * Sign in with email and password.
 * If email not confirmed, auto-resends OTP and flags needsVerification.
 */
export async function signInWithPassword(email: string, password: string, captchaToken?: string) {
  const options: any = {};
  if (captchaToken) {
    options.captchaToken = captchaToken;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
    options,
  });

  if (error?.message?.includes('Email not confirmed')) {
    await resendOtp(email);
    return { data, error, needsVerification: true };
  }

  return { data, error, needsVerification: false };
}

/**
 * Register a new account — sends OTP to email for verification.
 * Only @iitd.ac.in emails are accepted.
 */
export async function signUpWithPassword(email: string, password: string, captchaToken?: string) {
  // if (!isIITDEmail(email)) {
  //   return { error: { message: 'Only @iitd.ac.in emails are allowed' } };
  // }

  const options: any = {};
  if (captchaToken) {
    options.captchaToken = captchaToken;
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options,
  });

  return { data, error };
}

/**
 * Verify the 6-digit OTP sent to email during signup.
 */
export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.toLowerCase().trim(),
    token,
    type: 'signup',
  });

  return { data, error };
}

/**
 * Resend the OTP verification email.
 */
export async function resendOtp(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.toLowerCase().trim(),
  });

  return { error };
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string, captchaToken?: string) {
  const options: any = {
    redirectTo: `${window.location.origin}/auth/reset`,
  };
  if (captchaToken) {
    options.captchaToken = captchaToken;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.toLowerCase().trim(),
    options,
  );

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
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) return { profile, error: null };

  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      name: email.split('@')[0],
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
    .select('quiz_completed, name, bio, date_of_birth, gender, relationship_goal')
    .eq('id', userId)
    .single();

  if (!data) return { completed: false, step: 'profile' };

  if (!data.name || !data.bio || !data.date_of_birth || !data.gender || !data.relationship_goal) {
    return { completed: false, step: 'profile' };
  }

  // Check at least 3 interests selected
  const { count } = await supabase
    .from('user_interests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((count ?? 0) < 3) {
    return { completed: false, step: 'interests' };
  }

  if (!data.quiz_completed) {
    return { completed: false, step: 'quiz' };
  }

  return { completed: true, step: 'done' };
}