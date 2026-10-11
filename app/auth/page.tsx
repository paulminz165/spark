'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendMagicLink, isIITDEmail } from '@/lib/auth';
import { Flame, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

type AuthStep = 'email' | 'sent';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // if (!isIITDEmail(email)) {
    //   setError('Only @iitd.ac.in emails are allowed');
    //   return;
    // }

    setLoading(true);
    const { error: sendError } = await sendMagicLink(email);
    setLoading(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setStep('sent');
  };

  if (step === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="font-serif text-2xl mb-2">Check your email</h2>
        <p className="text-neutral-400 text-sm mb-2">
          We sent a login link to
        </p>
        <p className="text-spark-400 font-medium mb-8">{email}</p>
        <p className="text-neutral-500 text-xs max-w-xs">
          Click the link in the email to sign in. Check your spam folder if you
          don't see it within a minute.
        </p>
        <button
          onClick={() => setStep('email')}
          className="mt-8 text-neutral-400 text-sm flex items-center gap-1 hover:text-neutral-300"
        >
          <ArrowLeft className="w-4 h-4" /> Use a different email
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

      <h1 className="font-serif text-3xl mb-2">Sign in to Spark</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Use your IIT Delhi email to get started
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@iitd.ac.in"
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
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      <p className="text-xs text-neutral-600 mt-6 text-center max-w-xs">
        We'll email you a link to sign in — no password needed.
      </p>
    </div>
  );
}
