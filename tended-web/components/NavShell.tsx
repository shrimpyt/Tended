'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingCart, Trash2, ChefHat, Settings } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';

// Routes that should not render the navigation shell
const HIDDEN_ROUTES = new Set([
  '/sign-in', '/sign-up', '/forgot-password',
  '/household', '/onboarding', '/landing', '/design-lab',
]);

export default function NavShell() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const isRestricted = profile?.role === 'restricted';

  if (HIDDEN_ROUTES.has(pathname)) return null;

  const NAV_ITEMS = [
    { href: '/',              icon: Home,         label: 'Dashboard' },
    { href: '/inventory',     icon: Package,      label: 'Inventory'  },
    { href: '/shopping-list', icon: ShoppingCart, label: 'Shopping'   },
    ...(!isRestricted ? [
      { href: '/meals',     icon: ChefHat, label: 'Meals'     },
      { href: '/graveyard', icon: Trash2,  label: 'Graveyard' },
    ] : []),
    { href: '/settings', icon: Settings, label: 'Settings' },
  ] as const;

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
        <div className="w-10 h-10 mb-6 flex items-center justify-center flex-shrink-0">
          <Image
            src="/icons/icon.svg"
            alt="Tended Logo"
            width={32}
            height={32}
            className="w-8 h-8 select-none"
          />
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
                    ? 'bg-primary/20 text-primary'
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
                'flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-150',
                active
                  ? 'text-primary'
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
