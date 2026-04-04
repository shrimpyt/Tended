'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Wind, 
  Zap, 
  Palette, 
  Layers, 
  Eye, 
  ChevronRight,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

// ─── Animation Physics ───────────────────────────────────────────

const SNAPPY = {
  type: 'spring',
  stiffness: 400,
  damping: 30
} as const

const FLUID = {
  type: 'spring',
  stiffness: 100,
  damping: 18,
  mass: 1
} as const

// ─── Design Lab Page ─────────────────────────────────────────────

export default function DesignLab() {
  const [theme, setTheme] = useState<'blue' | 'emerald' | 'iris'>('blue')
  const [showAuras, setShowAuras] = useState(true)
  const [showGrain, setShowGrain] = useState(true)
  const [physics, setPhysics] = useState<'snappy' | 'fluid'>('fluid')

  // Apply theme to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'blue' ? '' : theme)
  }, [theme])

  const currentPhysics = physics === 'snappy' ? SNAPPY : FLUID

  return (
    <div className="min-h-screen relative font-sans p-6 md:p-12 transition-colors duration-500 overflow-hidden">
      {/* ─── Background Effects ─────────────────────────────────── */}
      <AnimatePresence>
        {showAuras && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="aura aura-1" 
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="aura aura-2" 
            />
          </>
        )}
      </AnimatePresence>
      
      {showGrain && <div className="grain" />}

      {/* ─── Header ───────────────────────────────────────────── */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={currentPhysics}
        className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-foreground transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight mb-2">
            Design <span className="text-primary italic">Lab</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-xl">
            Experiment with the premium aesthetic layers proposed for the new Tended interface.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-surface rounded-full border border-border">
          {(['snappy', 'fluid'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPhysics(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                physics === p ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:text-foreground'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* ─── Left Sidebar: Controls ───────────────────────────── */}
        <motion.div 
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...currentPhysics, delay: 0.1 }}
          className="lg:col-span-4 space-y-6"
        >
          <div className="glass p-6 rounded-3xl space-y-8">
            {/* Theme Toggle */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-4 uppercase tracking-widest">
                <Palette className="w-4 h-4" /> Color Mood
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'blue', label: 'Deep Blue', color: '#3B82F6', desc: 'Trust, Clarity, Tech' },
                  { id: 'emerald', label: 'Emerald Sage', color: '#10B981', desc: 'Home, Health, Organic' },
                  { id: 'iris', label: 'Midnight Iris', color: '#8B5CF6', desc: 'Future, AI, Magic' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      theme === t.id 
                        ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,0,0,0.3)]' 
                        : 'border-border hover:bg-surface'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner" style={{ backgroundColor: t.color }} />
                    <div>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-text-secondary">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Effect Toggles */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-4 uppercase tracking-widest">
                <Layers className="w-4 h-4" /> Aesthetic Layers
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                  <span className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-primary" /> Ambient Auras</span>
                  <input type="checkbox" checked={showAuras} onChange={e => setShowAuras(e.target.checked)} className="accent-primary w-5 h-5" />
                </label>
                <label className="flex items-center justify-between p-4 rounded-2xl bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                  <span className="flex items-center gap-3"><Wind className="w-4 h-4 text-primary" /> Matte Grain</span>
                  <input type="checkbox" checked={showGrain} onChange={e => setShowGrain(e.target.checked)} className="accent-primary w-5 h-5" />
                </label>
              </div>
            </section>
          </div>
        </motion.div>

        {/* ─── Right: Showcase ──────────────────────────────────── */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...currentPhysics, delay: 0.2 }}
          className="lg:col-span-8 space-y-8"
        >
          {/* Main Card Demo */}
          <div className="glass p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden group">
            {/* Subtle glow effect */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-primary mb-6 animate-pulse">
                <Zap className="w-6 h-6 fill-current" />
                <span className="font-medium tracking-widest uppercase text-sm">Visual Showcase</span>
              </div>
              
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6 leading-tight">
                This is how the new <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-glow">Dimensional UI</span> feels.
              </h2>
              
              <p className="text-text-secondary text-lg mb-12 max-w-lg leading-relaxed">
                Notice the "Liquid" reflection on the card edges. Toggle the <strong>Auras</strong> to see the depth, and use the <strong>Grain</strong> to see the high-end matte finish.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 px-8 rounded-2xl font-medium shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Primary Action <ChevronRight className="w-4 h-4" />
                </button>
                <button className="flex items-center justify-center gap-2 bg-surface backdrop-blur-sm border border-white/10 py-4 px-8 rounded-2xl font-medium hover:bg-surface-elevated transition-all">
                  Secondary Action
                </button>
              </div>
            </div>
          </div>

          {/* Mini Cards: Dynamic Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              transition={currentPhysics}
              className="glass p-8 rounded-3xl"
            >
              <Eye className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Beveled Edges</h3>
              <p className="text-text-secondary text-sm">
                We've added a custom gradient-based border that simulates light catching the glass edge.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              transition={currentPhysics}
              className="glass p-8 rounded-3xl"
            >
              <Wind className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Organic Motion</h3>
              <p className="text-text-secondary text-sm">
                Switch to 'Fluid' physics to see Apple-inspired weight and momentum in every movement.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 pt-12 border-t border-border/30 text-center text-text-secondary text-sm">
        Tended Design Lab &copy; 2026 • Premium Aesthetics Phase
      </footer>
    </div>
  )
}
