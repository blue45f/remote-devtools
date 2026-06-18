import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { RouteAnnouncer } from '@/components/a11y/RouteAnnouncer';
import { SkipLink } from '@/components/a11y/SkipLink';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutsDialog } from '@/components/ShortcutsDialog';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useGlobalShortcuts } from '@/lib/keyboard';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function Layout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const location = useLocation();
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useGlobalShortcuts();

  // The mobile drawer is a hand-rolled overlay (not Radix), so manage focus
  // like a modal: capture the trigger and move focus inside on open, restore
  // focus to the trigger on close.
  useEffect(() => {
    if (sidebarOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      drawerRef.current
        ?.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    } else {
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [sidebarOpen]);

  // Escape closes the drawer (standard overlay affordance).
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen, setSidebarOpen]);

  // Route-change focus + scroll + SR announcement live in <RouteAnnouncer />
  // below (it targets the same #main-content landmark as the skip link).

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={400}>
      <SkipLink />
      <RouteAnnouncer />
      <div className="flex h-screen overflow-hidden bg-bg text-fg">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-fg/40 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
        </AnimatePresence>

        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex">
          <Sidebar />
        </aside>

        {/* Sidebar (mobile drawer) — picks up safe-area top inset and is
            slightly wider than the desktop rail for thumb-friendly nav. */}
        <aside
          ref={drawerRef}
          className={cn(
            'fixed inset-y-0 left-0 z-50 lg:hidden',
            'w-[280px] max-w-[85vw] safe-pt',
            'transform transition-transform duration-200 ease-out',
            'shadow-lg',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-hidden={!sidebarOpen}
          // When closed the drawer is off-canvas; `inert` takes its nav links
          // out of the tab order so keyboard focus can't land in hidden content
          // (aria-hidden alone leaves them focusable — an a11y trap).
          inert={!sidebarOpen}
        >
          <Sidebar
            onItemClick={() => setSidebarOpen(false)}
            onClose={() => setSidebarOpen(false)}
            mobile
          />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto focus:outline-none"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <CommandPalette />
        <ShortcutsDialog />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
