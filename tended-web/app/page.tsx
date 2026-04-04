'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Package, ShoppingCart, DollarSign, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const FEATURES = [
  {
    icon: Package,
    title: 'Track your inventory',
    desc: 'Know exactly what you have at home — no more buying duplicates or running out.',
  },
  {
    icon: ShoppingCart,
    title: 'Smart shopping lists',
    desc: 'Items go on your list automatically when stock runs low.',
  },
  {
    icon: DollarSign,
    title: 'Watch your spending',
    desc: 'See where your household budget goes, week by week.',
  },
  {
    icon: Users,
    title: 'Share with your household',
    desc: 'Everyone stays in sync — partners, roommates, family.',
  },
];

export default function LandingPage() {
  const { profile, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) {
      router.push('/dashboard');
    }
  }, [profile, loading, router]);

  if (loading) return null;
  if (profile) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B10] text-white overflow-hidden relative">
      {/* Background Gradients (matching the deep space/blue vibe) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <Image src="/icons/icon.svg" alt="Tended" width={32} height={32} />
          <span className="text-xl font-bold tracking-tight text-white">Tended</span>
        </div>
        <div className="flex items-center gap-6">
           <Link
             href="/sign-in"
             className="text-sm text-text-secondary hover:text-white font-medium transition-colors"
           >
             Sign in
           </Link>
           <Link
             href="/sign-up"
             className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
           >
             Get Started
           </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 gap-6 flex-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
          Welcome to Beta
        </span>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-tight max-w-3xl">
          Your home,<br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">beautifully tended.</span>
        </h1>
        <p className="text-text-secondary text-lg sm:text-xl max-w-2xl leading-relaxed mt-2">
          Experience the ultimate command center for your household. Track inventory, manage shopping, and monitor spending with elegance.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
           <Link
             href="/sign-up"
             className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-500 transition-all hover:scale-105 active:scale-95"
           >
             Start Your Dashboard
           </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 gap-6">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col gap-4 bg-[#11131A]/60 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-2xl p-8 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon size={24} className="text-blue-400" />
            </div>
            <div>
               <h3 className="font-bold text-white text-xl mb-2">{title}</h3>
               <p className="text-text-secondary text-base leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-white/5 px-6 py-8 text-center text-sm text-text-secondary">
        <p>Already have an account?{' '}
        <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 font-medium">
          Sign in
        </Link>
        </p>
      </footer>
    </div>
  );
}
