'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore, ProfileRole } from '@/store/authStore';

const DIETARY_OPTIONS = [
  'Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free',
  'Nut-free', 'Halal', 'Kosher', 'Low-sodium',
];

const ITEM_CATEGORIES = ['Kitchen', 'Cleaning', 'Pantry', 'Bathroom'];

const ROLE_LABELS: Record<ProfileRole, string> = {
  creator: 'Creator',
  admin: 'Admin',
  member: 'Member',
  restricted: 'Restricted',
};

const ROLE_COLORS: Record<ProfileRole, string> = {
  creator: '#4A90E2',
  admin: '#4CAF50',
  member: '#888',
  restricted: '#F5A623',
};

interface HouseholdMember {
  id: string;
  display_name: string;
  email: string;
  role: ProfileRole;
  restricted_categories: string[] | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { profile, fetchProfile, signOut } = useAuthStore();

  // --- Profile ---
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Dietary ---
  const [dietary, setDietary] = useState<string[]>(profile?.dietary_restrictions ?? []);
  const [savingDietary, setSavingDietary] = useState(false);
  const [dietarySuccess, setDietarySuccess] = useState(false);
  const dietaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Security ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const passwordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Household ---
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // --- Sign out ---
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    return () => {
      if (nameTimer.current) clearTimeout(nameTimer.current);
      if (dietaryTimer.current) clearTimeout(dietaryTimer.current);
      if (passwordTimer.current) clearTimeout(passwordTimer.current);
    };
  }, []);

  const inviteCode = profile?.household_id
    ? profile.household_id.replace(/-/g, '').slice(0, 6).toUpperCase()
    : null;

  const isAdmin = profile?.role === 'creator' || profile?.role === 'admin';

  const fetchMembers = useCallback(async () => {
    const hid = profile?.household_id;
    if (!hid || !isAdmin) return;
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, role, restricted_categories')
        .eq('household_id', hid);
      if (!error && data) setMembers(data as HouseholdMember[]);
    } finally {
      setMembersLoading(false);
    }
  }, [profile?.household_id, isAdmin]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Profile handlers
  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) { setNameError('Name cannot be empty.'); return; }
    if (!profile) return;
    setNameError(null);
    setNameSuccess(false);
    setSavingName(true);
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', profile.id);
    setSavingName(false);
    if (error) {
      setNameError(error.message);
    } else {
      setNameSuccess(true);
      await fetchProfile();
      nameTimer.current = setTimeout(() => setNameSuccess(false), 2000);
    }
  };

  const handleSaveDietary = async () => {
    if (!profile) return;
    setSavingDietary(true);
    await supabase.from('profiles').update({ dietary_restrictions: dietary }).eq('id', profile.id);
    setSavingDietary(false);
    await fetchProfile();
    setDietarySuccess(true);
    dietaryTimer.current = setTimeout(() => setDietarySuccess(false), 2000);
  };

  // Password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setPasswordError('Enter a new password.'); return; }
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setPasswordError(null);
    setPasswordSuccess(false);
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      passwordTimer.current = setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  // Role handlers
  const handleChangeRole = async (member: HouseholdMember, newRole: ProfileRole) => {
    if (member.id === profile?.id) return;
    setUpdatingRole(member.id);
    const update: Record<string, unknown> = { role: newRole };
    if (newRole !== 'restricted') update.restricted_categories = null;
    const { error } = await supabase.from('profiles').update(update).eq('id', member.id);
    setUpdatingRole(null);
    if (!error) await fetchMembers();
  };

  const toggleMemberCategory = async (member: HouseholdMember, category: string) => {
    const current = member.restricted_categories ?? [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    setUpdatingRole(member.id);
    await supabase.from('profiles')
      .update({ restricted_categories: updated.length > 0 ? updated : null })
      .eq('id', member.id);
    setUpdatingRole(null);
    await fetchMembers();
  };

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    await signOut();
  };

  const availableRoles = (profile?.role === 'creator'
    ? ['admin', 'member', 'restricted']
    : ['member', 'restricted']) as ProfileRole[];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface-elevated border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-primary-blue hover:underline text-sm font-medium">
          ← Back
        </button>
        <h1 className="font-bold text-xl text-text-primary tracking-tight">Settings</h1>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── PROFILE ── */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Profile</p>
          <div className="bg-surface-elevated border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {/* Display name */}
            <div className="p-4 space-y-3">
              <label className="block text-sm font-medium text-text-primary">Display name</label>
              <div className="flex gap-2">
                <input
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setNameError(null); setNameSuccess(false); }}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </div>
              {nameError && <p className="text-red text-xs">{nameError}</p>}
              {nameSuccess && <p className="text-success-green text-xs">Name updated!</p>}
            </div>

            {/* Dietary */}
            <div className="p-4 space-y-3">
              <label className="block text-sm font-medium text-text-primary">Dietary preferences</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => {
                  const active = dietary.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => setDietary(prev => active ? prev.filter(d => d !== opt) : [...prev, opt])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'border-primary-blue bg-primary-blue/10 text-primary-blue'
                          : 'border-border text-text-secondary hover:border-text-secondary'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleSaveDietary}
                disabled={savingDietary}
                className="text-sm text-primary-blue font-medium hover:underline disabled:opacity-50"
              >
                {savingDietary ? 'Saving…' : dietarySuccess ? 'Saved!' : 'Save preferences'}
              </button>
            </div>
          </div>
        </section>

        {/* ── SECURITY ── */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Security</p>
          <div className="bg-surface-elevated border border-border rounded-2xl p-4">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <label className="block text-sm font-medium text-text-primary">Change password</label>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                autoComplete="new-password"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
              {passwordError && <p className="text-red text-xs">{passwordError}</p>}
              {passwordSuccess && <p className="text-success-green text-xs">Password updated!</p>}
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 border border-primary-blue text-primary-blue rounded-lg text-sm font-medium hover:bg-primary-blue/10 disabled:opacity-50 transition-colors"
              >
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </section>

        {/* ── HOUSEHOLD ── */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Household</p>

          {/* Invite code */}
          {inviteCode && (
            <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-2">
              <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">Invite code</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-semibold tracking-[0.3em] text-text-primary">{inviteCode}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteCode)}
                  className="px-3 py-1.5 border border-primary-blue text-primary-blue rounded-lg text-xs font-medium hover:bg-primary-blue/10 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-text-secondary">Share this code with a household member to let them join.</p>
            </div>
          )}

          {/* Members (admin/creator only) */}
          {isAdmin && (
            <div className="bg-surface-elevated border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">Members</p>
                {membersLoading && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary-blue" />}
              </div>

              {members.map((member, idx) => {
                const isMe = member.id === profile?.id;
                const isUpdating = updatingRole === member.id;
                const color = ROLE_COLORS[member.role];

                return (
                  <div key={member.id} className={idx > 0 ? 'border-t border-border' : ''}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-border flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-text-primary">
                          {(member.display_name || member.email)[0].toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {member.display_name || member.email}{isMe ? '  (you)' : ''}
                        </p>
                        <p className="text-xs text-text-secondary truncate">{member.email}</p>
                      </div>

                      {/* Role badge / selector */}
                      {isMe ? (
                        <span
                          className="px-2.5 py-1 rounded-lg border text-xs font-medium"
                          style={{ borderColor: color, color }}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          disabled={isUpdating}
                          onChange={e => handleChangeRole(member, e.target.value as ProfileRole)}
                          className="px-2 py-1 rounded-lg border text-xs font-medium bg-background focus:outline-none focus:ring-1 focus:ring-primary-blue disabled:opacity-50"
                          style={{ borderColor: color, color }}
                        >
                          {availableRoles.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                          {/* Always include current role even if not in availableRoles */}
                          {!availableRoles.includes(member.role) && (
                            <option value={member.role}>{ROLE_LABELS[member.role]}</option>
                          )}
                        </select>
                      )}
                    </div>

                    {/* Category restrictions for restricted members */}
                    {member.role === 'restricted' && !isMe && (
                      <div className="px-4 pb-3 space-y-2 bg-background/40">
                        <p className="text-xs text-text-secondary uppercase tracking-wider font-medium pt-2">
                          Allowed categories
                          {!member.restricted_categories || member.restricted_categories.length === 0 ? '  (all)' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ITEM_CATEGORIES.map(cat => {
                            const allowed = !member.restricted_categories ||
                              member.restricted_categories.length === 0 ||
                              member.restricted_categories.includes(cat);
                            return (
                              <button
                                key={cat}
                                onClick={() => toggleMemberCategory(member, cat)}
                                disabled={isUpdating}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                                  allowed
                                    ? 'border-primary-blue bg-primary-blue/10 text-primary-blue'
                                    : 'border-border text-text-secondary'
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-text-secondary">Tap to toggle. Empty = unrestricted.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SIGN OUT ── */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-3 border border-red rounded-xl text-red font-medium hover:bg-red/5 disabled:opacity-50 transition-colors"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>

        <div className="h-8" />
      </main>
    </div>
  );
}
