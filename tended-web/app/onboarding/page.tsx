'use client';

import React, { useState } from 'react';
import { Package, DollarSign, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const STEPS = [
  {
    icon: Package,
    title: 'Track your inventory',
    desc: 'Add everything in your home — pantry, cleaning supplies, bathroom items. Tended watches your stock levels and alerts you when things run low.',
  },
  {
    icon: DollarSign,
    title: 'Watch your spending',
    desc: 'Log purchases and see where your household budget goes each week and month. No more mystery spending.',
  },
  {
    icon: Users,
    title: 'Share with your household',
    desc: 'Invite your partner, roommates, or family. Everyone stays in sync — changes show up for everyone in real time.',
  },
];

export default function OnboardingPage() {
  const { profile, fetchProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const isLast = step === STEPS.length - 1;
  const { icon: Icon, title, desc } = STEPS[step];

  const handleFinish = async () => {
    if (!profile) return;
    setFinishing(true);
    await supabase.from('profiles').update({ has_onboarded: true }).eq('id', profile.id);
    await fetchProfile();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-8">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary-blue/10 flex items-center justify-center">
          <Icon size={36} className="text-primary-blue" />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-text-secondary text-base leading-relaxed">{desc}</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary-blue' : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border border-border text-text-secondary font-medium hover:text-text-primary hover:border-text-secondary transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
            disabled={finishing}
            className="flex-1 py-3 bg-primary-blue text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {finishing ? 'Starting...' : isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
