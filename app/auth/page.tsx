'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPassword,
  signUpWithPassword,
  resetPassword,
  //isIITDEmail, //uncomment this later IIT delhi
  getOrCreateProfile,
  checkOnboardingStatus,
  verifyEmailOtp,
  resendOtp,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Flame, Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'sent' | 'otp';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    const renderWidget = () => {
      if (containerRef.current && (window as any).turnstile && !widgetId.current) {
        widgetId.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onToken(token),
          theme: 'dark',
          size: 'normal',
        });
      }
    };

    if (!(window as any).turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      if (widgetId.current && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [sentEmail, setSentEmail] = useState('');

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // take last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    // Focus last filled or the next empty
    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    const { data, error: verifyError } = await verifyEmailOtp(sentEmail, code);
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    if (data?.session) {
      await getOrCreateProfile(data.session.user.id, data.session.user.email || '');
      const { completed } = await checkOnboardingStatus(data.session.user.id);
      router.replace(completed ? '/dashboard' : '/onboarding');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    const { error: resendError } = await resendOtp(sentEmail);
    setLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setResendCooldown(60);
    setOtp(['', '', '', '', '', '']);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // if (!isIITDEmail(email)) {
    //   setError('Only @iitd.ac.in emails are allowed');
    //   return;
    // }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { data, error: loginError, needsVerification } = await signInWithPassword(
      email,
      password,
      captchaToken || undefined
    );
    setLoading(false);

    if (needsVerification) {
      setSentEmail(email.toLowerCase().trim());
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      setMode('otp');
      return;
    }

    if (loginError) {
      setError(loginError.message);
      return;
    }

    if (data?.session) {
      await getOrCreateProfile(data.session.user.id, data.session.user.email || '');
      const { completed } = await checkOnboardingStatus(data.session.user.id);
      router.replace(completed ? '/dashboard' : '/onboarding');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // if (!isIITDEmail(email)) {
    //   setError('Only @iitd.ac.in emails are allowed');
    //   return;
    // }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await signUpWithPassword(
      email,
      password,
      captchaToken || undefined
    );
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // After signup, go to OTP screen
    if (data?.user) {
      setSentEmail(email.toLowerCase().trim());
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      setMode('otp');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // if (!isIITDEmail(email)) {
    //   setError('Only @iitd.ac.in emails are allowed');
    //   return;
    // }

    setLoading(true);
    const { error: resetError } = await resetPassword(
      email,
      captchaToken || undefined
    );
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSentEmail(email);
    setMode('sent');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '', '', '']);
  };

  // OTP verification screen
  if (mode === 'otp') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-spark-500/20 flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-spark-400" />
        </div>
        <h2 className="font-serif text-2xl mb-2">Verify your email</h2>
        <p className="text-neutral-400 text-sm mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-spark-400 font-medium mb-8">{sentEmail}</p>

        <form onSubmit={handleVerifyOtp} className="w-full max-w-xs space-y-4">
          {/* OTP inputs */}
          <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-11 h-13 bg-surface-raised border border-[#2A2A3E] rounded-xl text-center text-lg font-semibold focus:outline-none focus:border-spark-500/50 transition-colors"
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-spark-500 hover:bg-spark-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-6 text-sm text-neutral-400">
          <p>
            Didn't receive the code?{' '}
            <button
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              className="text-spark-400 hover:text-spark-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </p>
        </div>

        <button
          onClick={() => switchMode('login')}
          className="mt-4 text-neutral-400 text-sm flex items-center gap-1 hover:text-neutral-300"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      </div>
    );
  }

  // "Email sent" confirmation screen (for forgot password only)
  if (mode === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="font-serif text-2xl mb-2">Check your email</h2>
        <p className="text-neutral-400 text-sm mb-2">
          We sent a password reset link to
        </p>
        <p className="text-spark-400 font-medium mb-8">{sentEmail}</p>
        <p className="text-neutral-400 text-xs max-w-xs">
          Click the link in the email to reset your password. Check your spam folder if you
          don't see it within a minute.
        </p>
        <button
          onClick={() => switchMode('login')}
          className="mt-8 text-neutral-400 text-sm flex items-center gap-1 hover:text-neutral-300"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 text-neutral-400 hover:text-neutral-300"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-12 h-12 rounded-xl bg-spark-500/20 flex items-center justify-center mb-6">
        <Flame className="w-6 h-6 text-spark-500" />
      </div>

      <h1 className="font-serif text-3xl mb-2">
        {mode === 'login' && 'Sign in to Wynked'}
        {mode === 'register' && 'Join Wynked'}
        {mode === 'forgot' && 'Reset password'}
      </h1>
      <p className="text-neutral-400 text-sm mb-8">
        {mode === 'login' && 'Welcome back — sign in with your IIT Delhi email'}
        {mode === 'register' && 'Create your account with your IIT Delhi email'}
        {mode === 'forgot' && "We'll send you a link to reset your password"}
      </p>

      <form
        onSubmit={
          mode === 'login'
            ? handleLogin
            : mode === 'register'
              ? handleRegister
              : handleForgotPassword
        }
        className="w-full max-w-xs space-y-3"
      >
        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@iitd.ac.in"
            className="w-full bg-surface-raised border border-[#2A2A3E] rounded-xl py-3 pl-11 pr-4 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-spark-500/50 transition-colors"
            required
          />
        </div>

        {/* Password (login & register) */}
        {mode !== 'forgot' && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              className="w-full bg-surface-raised border border-[#2A2A3E] rounded-xl py-3 pl-11 pr-11 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-spark-500/50 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Confirm password (register only) */}
        {mode === 'register' && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              minLength={6}
              className="w-full bg-surface-raised border border-[#2A2A3E] rounded-xl py-3 pl-11 pr-4 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-spark-500/50 transition-colors"
              required
            />
          </div>
        )}

        {/* Forgot password link (login only) */}
        {mode === 'login' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-xs text-spark-400 hover:text-spark-300"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* CAPTCHA */}
        <TurnstileWidget onToken={handleCaptchaToken} />

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-spark-500 hover:bg-spark-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading
            ? 'Please wait...'
            : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
        </button>
      </form>

      {/* Mode switch links */}
      <div className="mt-6 text-sm text-neutral-400">
        {mode === 'login' && (
          <p>
            New to Spark?{' '}
            <button
              onClick={() => switchMode('register')}
              className="text-spark-400 hover:text-spark-300"
            >
              Create an account
            </button>
          </p>
        )}
        {mode === 'register' && (
          <p>
            Already have an account?{' '}
            <button
              onClick={() => switchMode('login')}
              className="text-spark-400 hover:text-spark-300"
            >
              Sign in
            </button>
          </p>
        )}
        {mode === 'forgot' && (
          <p>
            Remember your password?{' '}
            <button
              onClick={() => switchMode('login')}
              className="text-spark-400 hover:text-spark-300"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}