'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Leaf, Moon, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';

const TRACK_CATEGORIES = [
  { id: 'kitchen', label: 'Kitchen & Pantry', icon: '🥫' },
  { id: 'cleaning', label: 'Cleaning Supplies', icon: '🧽' },
  { id: 'bathroom', label: 'Bathroom & Care', icon: '🧴' },
  { id: 'pets', label: 'Pet Supplies', icon: '🐾' },
];

const DIETARY_OPTIONS = [
  'Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free',
  'Nut-free', 'Halal', 'Kosher', 'Low-sodium',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();
  const { theme, setTheme } = useTheme();
  
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  
  // State for preferences
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['kitchen']);
  const [dietary, setDietary] = useState<string[]>([]);

  const handleNext = () => setStep(s => Math.min(4, s + 1));
  const handleBack = () => setStep(s => Math.max(0, s - 1));

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleDietary = (opt: string) => {
    setDietary(prev => 
      prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt]
    );
  };

  const handleFinish = async () => {
    if (!profile) return;
    setFinishing(true);
    
    // Save dietary and complete onboarding route
    await supabase.from('profiles').update({ 
      has_onboarded: true,
      dietary_restrictions: dietary,
    }).eq('id', profile.id);
    
    // We optionally save selectedCategories to localStorage if needed
    localStorage.setItem('@tended/onboarding_categories', JSON.stringify(selectedCategories));
    
    await fetchProfile();
    router.replace('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg bg-surface-elevated border border-border rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-border">
          <div 
            className="h-full bg-primary-blue transition-all duration-500 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 text-center pt-4">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-accent-terracotta/10 flex items-center justify-center mb-6">
              <Package size={40} className="text-accent-terracotta" />
            </div>
            <h1 className="text-3xl font-bold font-playfair text-text-primary tracking-tight">
              Welcome to Tended
            </h1>
            <p className="text-text-secondary text-base leading-relaxed max-w-sm mx-auto">
              Your household operations, finally simplified. Let's set up your preferences before we dive into the dashboard.
            </p>
          </div>
        )}

        {/* STEP 1: Categories */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold font-playfair text-text-primary">What will you track?</h2>
              <p className="text-text-secondary text-sm">Select the core categories you want to manage first.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TRACK_CATEGORIES.map(cat => {
                const active = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center p-4 rounded-xl border text-left transition-all ${
                      active ? 'border-primary-blue bg-primary-blue/5 ring-1 ring-primary-blue' : 'border-border bg-background hover:border-text-muted'
                    }`}
                  >
                    <span className="text-2xl mr-3">{cat.icon}</span>
                    <span className={`font-medium ${active ? 'text-primary-blue' : 'text-text-primary'}`}>
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Dietary */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-success-green/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <Leaf size={24} className="text-success-green" />
              </div>
              <h2 className="text-2xl font-bold font-playfair text-text-primary">Dietary Preferences</h2>
              <p className="text-text-secondary text-sm">Any food restrictions in your household? We'll use this for recipe recommendations.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(opt => {
                const active = dietary.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleDietary(opt)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'border-success-green bg-success-green/10 text-success-green'
                        : 'border-border text-text-secondary bg-background hover:border-text-secondary'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Theme */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-info-blue/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <Moon size={24} className="text-info-blue" />
              </div>
              <h2 className="text-2xl font-bold font-playfair text-text-primary">Choose your vibe</h2>
              <p className="text-text-secondary text-sm">You can always change this later in settings.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              {(['light', 'dark', 'system'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex items-center justify-between p-4 rounded-xl border capitalize transition-all ${
                    theme === t ? 'border-primary-blue bg-primary-blue/5 ring-1 ring-primary-blue' : 'border-border bg-background hover:border-text-muted'
                  }`}
                >
                  <span className={`font-medium ${theme === t ? 'text-primary-blue' : 'text-text-primary'}`}>{t}</span>
                  {theme === t && <CheckCircle size={20} className="text-primary-blue" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: All Set */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 text-center pt-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-success-green/10 flex items-center justify-center mb-6">
              <CheckCircle size={48} className="text-success-green" />
            </div>
            <h1 className="text-3xl font-bold font-playfair text-text-primary tracking-tight">
              You're all set!
            </h1>
            <p className="text-text-secondary text-base leading-relaxed max-w-sm mx-auto">
              Your household is configured. Ready to explore the dashboard?
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="mt-10 flex items-center justify-between pt-6 border-t border-border">
          {step > 0 ? (
            <button
              onClick={handleBack}
              disabled={finishing}
              className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          ) : (
            <div /> // Placeholder to keep spacing
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-text-primary text-background rounded-full font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="px-8 py-2.5 bg-primary-blue text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {finishing ? 'Saving...' : 'Enter Tended'}
              {!finishing && <ChevronRight size={18} />}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
