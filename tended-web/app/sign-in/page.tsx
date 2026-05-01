'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-surface-elevated rounded-2xl shadow-lg border border-border p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Welcome Back</h1>
          <p className="text-text-secondary text-sm">Sign in to your Tended account</p>
        </div>

        {errorText && (
          <div className="mb-6 p-4 rounded-lg bg-red-light border border-red text-red text-sm">
            {errorText}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue-light focus:border-primary-blue transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue-light focus:border-primary-blue transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex justify-center items-center gap-2 w-full py-3.5 bg-primary-blue hover:bg-opacity-90 text-white rounded-xl font-medium tracking-wide transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-text-secondary">
            <Link href="/forgot-password" className="text-primary-blue font-medium hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-sm text-text-secondary">
            Don&#39;t have an account?{' '}
            <Link href="/sign-up" className="text-primary-blue font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
