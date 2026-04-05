'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingCart, Trash2, ChefHat, Settings } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';

// Routes that should not render the navigation shell
const HIDDEN_ROUTES = new Set([
  '/', '/sign-in', '/sign-up', '/forgot-password',
  '/household', '/onboarding', '/landing', '/design-lab',
]);

export default function NavShell() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const isRestricted = profile?.role === 'restricted';

  if (HIDDEN_ROUTES.has(pathname)) return null;

  const NAV_ITEMS = [
    { href: '/dashboard',     icon: Home,         label: 'Dashboard' },
    { href: '/inventory',     icon: Package,      label: 'Inventory'  },
    { href: '/shopping-list', icon: ShoppingCart, label: 'Shopping'   },
    ...(!isRestricted ? [
      { href: '/meals',     icon: ChefHat, label: 'Meals'     },
      ] : []),
    { href: '/settings', icon: Settings, label: 'Settings' },
  ] as const;

  const displayName = profile?.display_name || 'User';

  return (
    <>
      {/* ── Desktop: expanded sidebar ────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col py-6 z-40 border-r"
        style={{
          background: '#1A1C23', // Matches the dark slate/blue background from the design
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Logo mark & Text */}
        <div className="flex items-center px-6 mb-10">
          <Image
            src="/icons/icon.svg"
            alt="Tended Logo"
            width={32}
            height={32}
            className="w-8 h-8 select-none"
          />
          <span className="ml-3 text-xl font-bold text-white tracking-tight">Tended</span>
        </div>

        <div className="flex flex-col gap-2 w-full px-4 flex-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center px-4 py-3 rounded-lg transition-all duration-150',
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="mr-3" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="mt-auto px-6 py-4 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
             {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm text-text-secondary font-medium truncate">
             {displayName}
          </div>
        </div>
      </nav>

      {/* ── Mobile: floating bottom bar ──────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-6 left-4 right-4 mx-auto z-40 flex items-center justify-between px-6 py-3 rounded-2xl max-w-sm"
        style={{
          background: 'rgba(24, 24, 27, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
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
              aria-label={label}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 transition-all duration-200 rounded-xl',
                active
                  ? 'text-blue-500'
                  : 'text-text-secondary'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
