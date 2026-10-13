'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace('/dashboard'), 2000);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="font-serif text-2xl mb-2">Password updated!</h2>
        <p className="text-neutral-400 text-sm">Redirecting you to the app...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-12 h-12 rounded-xl bg-spark-500/20 flex items-center justify-center mb-6">
        <Flame className="w-6 h-6 text-spark-500" />
      </div>

      <h1 className="font-serif text-3xl mb-2">Set new password</h1>
      <p className="text-neutral-400 text-sm mb-8">Choose a strong password for your account</p>

      <form onSubmit={handleReset} className="w-full max-w-xs space-y-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={6}
            className="w-full bg-surface-raised border border-neutral-800 rounded-xl py-3 pl-11 pr-11 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-spark-500/50 transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-400"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={6}
            className="w-full bg-surface-raised border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-spark-500/50 transition-colors"
            required
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-spark-500 hover:bg-spark-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
