'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type Mode = 'choose' | 'create' | 'join';

export default function HouseholdPage() {
  const { user, fetchProfile } = useAuthStore();
  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewHousehold, setPreviewHousehold] = useState<{ id: string; name: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setError('Please enter a household name.');
      return;
    }
    setError(null);
    setLoading(true);

    const householdId = crypto.randomUUID();

    const { error: createError } = await supabase
      .from('households')
      .insert({ id: householdId, name: householdName.trim() });

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    const userId = user ? user.id : null;
    if (!userId) {
      setError('No authenticated user found.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ household_id: householdId })
      .eq('id', userId);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchProfile();
  };

  const handleLookup = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Invite code must be exactly 6 characters.');
      return;
    }
    setError(null);
    setLookupLoading(true);
    setPreviewHousehold(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('households')
        .select('id, name')
        .ilike('id', code + '%')
        .limit(1)
        .single();

      if (fetchError || !data) {
        setError('No household found with that code. Double-check and try again.');
      } else {
        setPreviewHousehold({ id: data.id, name: data.name });
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!previewHousehold) return;
    setError(null);
    setLoading(true);

    const userId = user ? user.id : null;
    if (!userId) {
      setError('No authenticated user found.');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ household_id: previewHousehold.id })
        .eq('id', userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await fetchProfile();
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Set up your household</h1>
            <p className="text-text-secondary">Create a new household or join one your partner already set up.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full text-left bg-surface border border-border rounded-xl p-6 hover:border-primary-blue transition-colors shadow-sm"
            >
              <h2 className="text-lg font-semibold text-text-primary mb-1">Create a household</h2>
              <p className="text-sm text-text-secondary">Start fresh — your partner can join with the 6-character invite code.</p>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full text-left bg-surface border border-border rounded-xl p-6 hover:border-primary-blue transition-colors shadow-sm"
            >
              <h2 className="text-lg font-semibold text-text-primary mb-1">Join a household</h2>
              <p className="text-sm text-text-secondary">Enter the 6-character invite code your partner shared with you.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => {
            setMode('choose');
            setError(null);
            setPreviewHousehold(null);
            setInviteCode('');
          }}
          className="text-primary-blue font-medium mb-6 hover:underline"
        >
          &larr; Back
        </button>

        <h1 className="text-3xl font-bold text-text-primary mb-6">
          {mode === 'create' ? 'Create a household' : 'Join a household'}
        </h1>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-light border border-red text-red text-sm">
            {error}
          </div>
        )}

        {mode === 'create' ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Household name (e.g. The Olivers)"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue-light focus:border-primary-blue"
            />

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3.5 bg-primary-blue hover:bg-opacity-90 text-white rounded-lg font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create household'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-2">
              Ask your household member for their 6-character invite code from the Profile screen.
            </p>

            <input
              type="text"
              placeholder="Invite code (e.g. A1B2C3)"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setPreviewHousehold(null);
                setError(null);
              }}
              maxLength={6}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-blue-light focus:border-primary-blue"
            />

            {previewHousehold && (
              <div className="p-4 rounded-lg border border-success-green bg-success-green-light bg-opacity-20 flex justify-between items-center">
                <span className="text-text-secondary text-sm">Household found:</span>
                <span className="text-success-green font-semibold text-lg">{previewHousehold.name}</span>
              </div>
            )}

            {!previewHousehold ? (
              <button
                onClick={handleLookup}
                disabled={lookupLoading}
                className="w-full py-3.5 bg-primary-blue hover:bg-opacity-90 text-white rounded-lg font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {lookupLoading ? 'Looking up...' : 'Find household'}
              </button>
            ) : (
              <button
                onClick={handleConfirmJoin}
                disabled={loading}
                className="w-full py-3.5 bg-primary-blue hover:bg-opacity-90 text-white rounded-lg font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Joining...' : 'Join this household'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
