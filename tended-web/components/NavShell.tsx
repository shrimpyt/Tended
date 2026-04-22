'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ShoppingCart,
  DollarSign,
  ChefHat,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';

// Routes that should not render the navigation shell
const HIDDEN_ROUTES = new Set([
  '/', '/sign-in', '/sign-up', '/forgot-password',
  '/household', '/onboarding', '/landing',
]);

const NAV_ITEMS_BASE = [
  { href: '/dashboard',     icon: Home,         label: 'Dashboard' },
  { href: '/inventory',     icon: Package,      label: 'Inventory'  },
  { href: '/shopping-list', icon: ShoppingCart, label: 'Shopping'   },
  { href: '/spending',      icon: DollarSign,   label: 'Spending'   },
  { href: '/meals',         icon: ChefHat,      label: 'Meals'      },
  { href: '/settings',      icon: Settings,     label: 'Settings'   },
] as const;

export default function NavShell() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const isRestricted = profile?.role === 'restricted';

  if (HIDDEN_ROUTES.has(pathname)) return null;

  const NAV_ITEMS = isRestricted
    ? NAV_ITEMS_BASE.filter(i => i.href !== '/spending' && i.href !== '/meals')
    : NAV_ITEMS_BASE;

  const displayName = profile?.display_name ?? 'User';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* ── Desktop: 220px labeled sidebar ─────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex sidebar flex-col py-5 gap-1"
      >
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className="px-4 mb-6 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <span className="text-sm font-bold">T</span>
          </div>
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-playfair, serif)' }}
          >
            Tended
          </span>
        </div>

        {/* ── Nav ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5 px-3 flex-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx('sidebar-nav-item', active && 'active')}
              >
                <Icon
                  size={16}
                  strokeWidth={active ? 2.5 : 2}
                  style={{ flexShrink: 0 }}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* ── Bottom: avatar ─────────────────────────────────────── */}
        <div className="px-3 pb-2">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-surface-alt transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                border: '1.5px solid var(--accent)',
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {displayName}
              </p>
              <p
                className="text-[10px] truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                {profile?.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </div>
          </Link>
        </div>
      </nav>

      {/* ── Mobile: bottom bar ─────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-3"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-[10px] transition-colors',
                active ? 'text-accent' : 'text-text-muted',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
