'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText('');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    setLoading(false);
    if (error) {
      setErrorText(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-surface-elevated rounded-2xl shadow-lg border border-border p-8">
        {sent ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-text-primary">Check your email</h1>
            <p className="text-text-secondary text-sm">
              We sent a password reset link to <span className="text-text-primary font-medium">{email}</span>.
            </p>
            <Link
              href="/sign-in"
              className="inline-block mt-4 text-sm text-primary-blue font-medium hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-text-primary mb-2">Reset your password</h1>
              <p className="text-text-secondary text-sm">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {errorText && (
              <div className="mb-5 p-4 rounded-lg bg-red-light border border-red text-red text-sm">
                {errorText}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary-blue hover:bg-opacity-90 text-white rounded-xl font-medium tracking-wide transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/sign-in" className="text-sm text-primary-blue font-medium hover:underline">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
