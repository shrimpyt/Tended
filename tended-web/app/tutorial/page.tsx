'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Share, PlusSquare, MoreVertical, MonitorDown } from 'lucide-react';

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Link href="/settings" className="p-2 -ml-2 text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="ml-2 text-lg font-bold text-text-primary">App Installation Guide</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-12">

        {/* Intro */}
        <section className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-primary-blue">Get Tended on Your Phone!</h2>
          <p className="text-text-secondary text-lg">
            You don&apos;t need the App Store or Google Play. Just follow these quick steps to add Tended right to your home screen!
          </p>
        </section>

        {/* iPhone Instructions */}
        <section className="bg-surface-elevated border border-border rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Share size={120} />
          </div>

          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            🍎 For iPhone (Safari)
          </h3>

          <div className="space-y-6 relative z-10">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary-blue/20 text-primary-blue flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <p className="text-lg font-medium">Tap the Share Button</p>
                <p className="text-text-secondary mt-1">Look at the bottom of your screen for the share icon (a square with an arrow pointing up).</p>
                <div className="mt-3 inline-flex items-center justify-center p-3 bg-background rounded-xl border border-border">
                  <Share className="text-primary-blue" size={24} />
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary-blue/20 text-primary-blue flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <p className="text-lg font-medium">Find &quot;Add to Home Screen&quot;</p>
                <p className="text-text-secondary mt-1">Scroll down the list until you see it, and tap it!</p>
                <div className="mt-3 inline-flex items-center justify-center p-3 bg-background rounded-xl border border-border gap-2">
                  <PlusSquare className="text-primary-blue" size={24} />
                  <span className="font-medium">Add to Home Screen</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary-blue/20 text-primary-blue flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <p className="text-lg font-medium">Tap &quot;Add&quot;</p>
                <p className="text-text-secondary mt-1">Tap &quot;Add&quot; in the top right corner. You&apos;re done!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Android Instructions */}
        <section className="bg-surface-elevated border border-border rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <MoreVertical size={120} />
          </div>

          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-green">
            🤖 For Android (Chrome)
          </h3>

          <div className="space-y-6 relative z-10">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green/20 text-green flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <p className="text-lg font-medium">Tap the Menu</p>
                <p className="text-text-secondary mt-1">Look at the top right corner for the three dots menu and tap it.</p>
                <div className="mt-3 inline-flex items-center justify-center p-3 bg-background rounded-xl border border-border">
                  <MoreVertical className="text-green" size={24} />
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green/20 text-green flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <p className="text-lg font-medium">Find &quot;Install app&quot; or &quot;Add to Home Screen&quot;</p>
                <p className="text-text-secondary mt-1">Look through the list for one of those options and tap it.</p>
                <div className="mt-3 inline-flex items-center justify-center p-3 bg-background rounded-xl border border-border gap-2">
                  <MonitorDown className="text-green" size={24} />
                  <span className="font-medium">Install app</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green/20 text-green flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <p className="text-lg font-medium">Confirm the Install</p>
                <p className="text-text-secondary mt-1">Follow the quick prompts on screen to finish adding it!</p>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
