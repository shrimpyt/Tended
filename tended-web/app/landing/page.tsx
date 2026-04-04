'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ShoppingCart, DollarSign, Users } from 'lucide-react';

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
  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Image src="/icons/icon.svg" alt="Tended" width={28} height={28} />
          <span className="text-lg font-bold tracking-tight">Tended</span>
        </div>
        <Link
          href="/sign-in"
          className="text-sm text-primary-blue font-medium hover:underline"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 gap-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary-blue border border-primary-blue/30 bg-primary-blue/10 rounded-full px-3 py-1">
          Beta
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight max-w-xl">
          Your home,<br />tended to.
        </h1>
        <p className="text-text-secondary text-base sm:text-lg max-w-md leading-relaxed">
          Tended helps households track inventory, manage shopping, and stay on top of spending — together.
        </p>
        <Link
          href="/sign-up"
          className="mt-2 px-8 py-3.5 bg-primary-blue text-white rounded-xl font-semibold text-base shadow-md hover:opacity-90 transition-opacity"
        >
          Get started for free
        </Link>
      </section>

      {/* Features */}
      <section className="w-full max-w-2xl mx-auto px-6 pb-20 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col gap-2 bg-surface-elevated border border-border rounded-2xl p-5"
          >
            <div className="w-9 h-9 rounded-lg bg-primary-blue/10 flex items-center justify-center">
              <Icon size={18} className="text-primary-blue" />
            </div>
            <p className="font-semibold text-text-primary text-sm">{title}</p>
            <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border px-6 py-5 text-center text-xs text-text-secondary">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-primary-blue hover:underline font-medium">
          Sign in
        </Link>
      </footer>
    </div>
  );
}
