'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingCart, Trash2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/',              icon: Home,         label: 'Dashboard' },
  { href: '/inventory',     icon: Package,      label: 'Inventory'  },
  { href: '/shopping-list', icon: ShoppingCart, label: 'Shopping'   },
  { href: '/graveyard',     icon: Trash2,       label: 'Graveyard'  },
] as const;

// Routes that should not render the navigation shell
const AUTH_ROUTES = new Set(['/sign-in', '/sign-up', '/household']);

export default function NavShell() {
  const pathname = usePathname();

  if (AUTH_ROUTES.has(pathname)) return null;

  return (
    <>
      {/* ── Desktop: fixed icon-only sidebar ─────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex fixed left-0 top-0 h-full w-14 flex-col items-center py-4 gap-1 z-40 border-r"
        style={{
          background: 'rgba(10, 10, 11, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo mark */}
        <div className="w-9 h-9 rounded-xl bg-blue/15 flex items-center justify-center mb-5 flex-shrink-0">
          <Sparkles size={15} className="text-blue" />
        </div>

        <div className="flex flex-col items-center gap-1 w-full px-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={clsx(
                  'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150',
                  active
                    ? 'bg-blue/20 text-blue'
                    : 'text-text-secondary hover:text-foreground hover:bg-white/5'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile: floating bottom bar ──────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 px-2 py-2 rounded-2xl"
        style={{
          background: 'rgba(14, 14, 17, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-all duration-150',
                active
                  ? 'text-blue'
                  : 'text-text-secondary hover:text-foreground'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
