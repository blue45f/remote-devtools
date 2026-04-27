import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SkipLink } from "@/components/a11y/SkipLink";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGlobalShortcuts } from "@/lib/keyboard";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Layout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const location = useLocation();

  useGlobalShortcuts();

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={400}>
      <SkipLink />
      <div className="flex h-screen overflow-hidden bg-bg text-fg">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
        </AnimatePresence>

        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex">
          <Sidebar />
        </aside>

        {/* Sidebar (mobile drawer) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 lg:hidden",
            "transform transition-transform duration-200 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar onItemClick={() => setSidebarOpen(false)} />
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
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
