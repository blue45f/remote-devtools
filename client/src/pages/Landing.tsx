import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CircuitBoard,
  Code2,
  PlayCircle,
  Radio,
  ServerCog,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";

/** GitHub mark — kept as inline SVG since lucide-react v1+ dropped brand icons. */
function Github({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.21c0 .31.21.68.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
import { Link, useNavigate } from "react-router-dom";

import { BrandMark } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { applyTheme, useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/blue45f/remote-devtools";

export default function LandingPage() {
  const navigate = useNavigate();
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Landing is the only public route — make sure the dark class follows the
  // saved theme even before the rest of the app shell mounts.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const enterDemo = () => {
    setDemoMode(true);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <TopNav onTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />

      <main className="flex-1">
        <Hero onEnterDemo={enterDemo} />
        <DashboardMockup />
        <StatsStrip />
        <Features />
        <QuickStart />
        <ClosingCta onEnterDemo={enterDemo} />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ───────── Top nav ───────── */

function TopNav({ onTheme }: { onTheme: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto h-14 flex items-center gap-4 px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <BrandMark className="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">
            Remote DevTools
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 ml-2 text-sm text-fg-subtle">
          <a href="#features" className="hover:text-fg transition-colors">
            Features
          </a>
          <a href="#quickstart" className="hover:text-fg transition-colors">
            Quick start
          </a>
          <Link to="/pricing" className="hover:text-fg transition-colors">
            Pricing
          </Link>
          <a href={GITHUB_URL} className="hover:text-fg transition-colors">
            GitHub
          </a>
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onTheme}
          className="hidden sm:inline text-xs text-fg-subtle hover:text-fg px-2 py-1"
        >
          Theme
        </button>

        <Button asChild variant="ghost" size="sm">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Github />
            GitHub
          </a>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link to="/dashboard">
            Open app
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </header>
  );
}

/* ───────── Hero ───────── */

function Hero({ onEnterDemo }: { onEnterDemo: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <BackgroundGrid />

      <div className="relative max-w-5xl mx-auto px-4 lg:px-6 pt-20 pb-16 lg:pt-32 lg:pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge
            variant="accent"
            size="lg"
            className="mb-5 gap-1.5 inline-flex"
          >
            <Sparkles className="size-3" />
            v0.1 · Open source
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.025em] leading-[1.05] mb-5 text-balance"
        >
          Debug any web page,
          <br />
          <span className="text-fg-subtle">remotely.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg text-fg-subtle max-w-2xl mx-auto mb-8 text-balance"
        >
          Capture, replay, and inspect customer sessions with the real Chrome
          DevTools — across teams, devices, and environments. Open-source and
          self-hostable.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button variant="primary" size="lg" onClick={onEnterDemo}>
            <PlayCircle />
            Try the live demo
            <ArrowRight />
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github />
              View on GitHub
            </a>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-xs text-fg-faint"
        >
          The demo runs entirely in your browser with seed data — no signup, no
          backend.
        </motion.p>
      </div>
    </section>
  );
}

function BackgroundGrid() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 dark:opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 50%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 50%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[480px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--accent) / 0.18), transparent 70%)",
        }}
      />
    </>
  );
}

/* ───────── Dashboard mockup (under hero) ───────── */

/**
 * A miniature, statically-rendered version of the live Dashboard, scaled and
 * elevated to look like a captured screenshot. Pure SVG-ish HTML so it scales
 * cleanly on any DPI without shipping a real screenshot file.
 */
function DashboardMockup() {
  return (
    <section className="relative -mt-4 lg:-mt-8 pb-16 lg:pb-24 px-4 lg:px-6">
      <div
        aria-hidden
        className="absolute inset-x-0 -top-12 -z-10 h-64 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, hsl(var(--accent) / 0.10), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-5xl mx-auto"
      >
        <div className="rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
          {/* macOS-style traffic lights bar */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-bg-subtle">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] font-mono text-fg-faint">
              remote-devtools.vercel.app/dashboard
            </span>
            <span className="ml-auto text-[10px] text-fg-faint">
              demo mode
            </span>
          </div>

          {/* Mock UI body */}
          <div className="grid grid-cols-[148px_1fr] min-h-[360px]">
            {/* Mini sidebar */}
            <aside className="border-r border-border bg-bg-subtle p-3 hidden sm:block">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-5 rounded-md bg-fg" />
                <span className="text-xs font-semibold">Remote DevTools</span>
              </div>
              <div className="space-y-1">
                <div className="h-6 rounded-md bg-bg-muted px-2 flex items-center text-[11px] font-medium">
                  Dashboard
                </div>
                <div className="h-6 rounded-md px-2 flex items-center text-[11px] text-fg-subtle">
                  Sessions
                </div>
                <div className="h-6 rounded-md px-2 flex items-center text-[11px] text-fg-subtle">
                  Module SDK
                </div>
                <div className="h-6 rounded-md px-2 flex items-center text-[11px] text-fg-subtle">
                  Script SDK
                </div>
              </div>
            </aside>

            {/* Mini main content */}
            <div className="p-4 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold mb-3">
                Dashboard
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <MockTile label="LIVE NOW" value="2" tone="live" />
                <MockTile label="SESSIONS TODAY" value="142" tone="up" />
                <MockTile label="TICKETS TODAY" value="23" tone="up" />
              </div>
              {/* Tiny faux chart */}
              <div className="rounded-lg border border-border p-3 mb-3 bg-bg-subtle">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-semibold">
                    Sessions over time
                  </span>
                  <span className="text-[10px] text-fg-faint">Daily</span>
                </div>
                <svg
                  viewBox="0 0 280 60"
                  className="w-full h-12"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="mockg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--fg))"
                        stopOpacity="0.16"
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--fg))"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,42 L20,38 L40,40 L60,30 L80,28 L100,22 L120,30 L140,18 L160,24 L180,16 L200,12 L220,16 L240,8 L260,14 L280,4 L280,60 L0,60 Z"
                    fill="url(#mockg)"
                  />
                  <path
                    d="M0,42 L20,38 L40,40 L60,30 L80,28 L100,22 L120,30 L140,18 L160,24 L180,16 L200,12 L220,16 L240,8 L260,14 L280,4"
                    stroke="hsl(var(--fg))"
                    strokeWidth="1.4"
                    fill="none"
                  />
                </svg>
              </div>
              {/* Activity feed mini */}
              <div className="rounded-lg border border-border p-3 bg-bg-subtle">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold">
                    Recent activity
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 animate-ping" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                    </span>
                    LIVE
                  </span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { kind: "Recorded session", t: "12s" },
                    { kind: "Ticket created", t: "37s" },
                    { kind: "Console error", t: "1m" },
                  ].map((row) => (
                    <div
                      key={row.kind}
                      className="flex items-center gap-2 text-[10px]"
                    >
                      <span className="size-1.5 rounded-full bg-fg-faint" />
                      <span className="font-medium truncate">{row.kind}</span>
                      <span className="text-fg-faint ml-auto">{row.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function MockTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "live" | "up";
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-2.5">
      <div className="text-[9px] uppercase tracking-wider font-semibold text-fg-faint mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        {tone === "live" && (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1 rounded bg-danger-soft text-danger">
            <span className="size-1 rounded-full bg-danger animate-pulse-dot" />
            REC
          </span>
        )}
        {tone === "up" && (
          <span className="text-[9px] font-semibold text-success">↑ 20%</span>
        )}
      </div>
    </div>
  );
}

/* ───────── Stats stripe ───────── */

function StatsStrip() {
  const stats = [
    { value: "8.4k+", label: "sessions captured in seed dataset" },
    { value: "rrweb v2", label: "DOM replay engine" },
    { value: "MIT", label: "license · self-host friendly" },
    { value: "0 DB", label: "demo mode · runs in your browser" },
  ];
  return (
    <section className="border-y border-border bg-bg-subtle">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
          >
            <div className="text-2xl lg:text-3xl font-semibold tracking-[-0.02em] tabular-nums">
              {s.value}
            </div>
            <div className="mt-1 text-[11px] text-fg-faint leading-tight">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Features ───────── */

const FEATURES: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    icon: Radio,
    title: "Live capture",
    body: "Stream Chrome DevTools Protocol events from any page in real time over WebSocket — no installs.",
  },
  {
    icon: PlayCircle,
    title: "Pixel-perfect replay",
    body: "rrweb-powered DOM replay with mouse trails, console output, and scrubbable timelines.",
  },
  {
    icon: Activity,
    title: "Activity feed",
    body: "Sessions, tickets, errors, and joins flow into a chronological feed engineers actually read.",
  },
  {
    icon: Code2,
    title: "SDK in two flavors",
    body: "Drop in the UMD script tag or ESM import — bundle-size aware, zero runtime dependencies.",
  },
  {
    icon: TerminalSquare,
    title: "Real DevTools UI",
    body: "Connect to the same Chromium DevTools you already know — Network, Console, Elements, all of it.",
  },
  {
    icon: ServerCog,
    title: "Self-hostable",
    body: "MIT licensed. Bring your own Postgres, S3, Jira, Slack — or run it offline behind a VPN.",
  },
];

function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <div className="max-w-2xl mb-10 lg:mb-14">
          <Badge variant="neutral" size="sm" className="mb-3 uppercase tracking-wider">
            What you get
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
            Everything in one open-source kit.
          </h2>
          <p className="text-fg-subtle">
            Replay sessions, debug live tabs, and ship fixes faster — with the
            real Chrome DevTools, not a cut-down imitation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.04 }}
            >
              <Card className="p-5 h-full">
                <div className="size-9 rounded-lg bg-bg-muted border border-border flex items-center justify-center mb-3">
                  <f.icon className="size-4 text-fg-subtle" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-fg-subtle leading-relaxed">{f.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Quick start ───────── */

const SNIPPETS: Record<string, string> = {
  Module: `import { createDebugger } from "remote-debug-sdk";

createDebugger();
// SDK now mirrors DOM, network, and console traffic
// to ws://localhost:3001 (configurable)`,
  Script: `<script
  src="https://cdn.your-domain/sdk/index.umd.js"
  onload="window.RemoteDebugSdk.createDebugger()"
></script>`,
  Docker: `git clone https://github.com/blue45f/remote-devtools
cd remote-devtools
docker-compose up

# UI:           http://localhost:8080
# Internal API: http://localhost:3000
# External API: http://localhost:3001`,
};

function QuickStart() {
  const [active, setActive] = useState<keyof typeof SNIPPETS>("Module");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[active]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      id="quickstart"
      className="py-20 lg:py-28 border-y border-border bg-bg-subtle"
    >
      <div className="max-w-5xl mx-auto px-4 lg:px-6">
        <div className="max-w-2xl mb-8">
          <Badge variant="neutral" size="sm" className="mb-3 uppercase tracking-wider">
            Quick start
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
            Three lines to start capturing.
          </h2>
          <p className="text-fg-subtle">
            Pick the surface that fits — module import, script tag, or the
            full Docker stack.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border bg-surface-raised px-2 py-1.5">
            <div className="flex">
              {Object.keys(SNIPPETS).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setActive(key as keyof typeof SNIPPETS)}
                  className={cn(
                    "px-3 h-7 rounded-sm text-xs font-medium transition-colors",
                    key === active
                      ? "bg-bg text-fg shadow-xs"
                      : "text-fg-subtle hover:text-fg",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              className="text-xs text-fg-subtle hover:text-fg px-2 py-1 rounded"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="font-mono text-[12.5px] leading-relaxed p-5 text-fg-subtle overflow-x-auto">
            {SNIPPETS[active]}
          </pre>
        </Card>

        <div className="mt-5 flex items-center gap-2 text-xs text-fg-faint">
          <CircuitBoard className="size-3.5" />
          Need the full guide?{" "}
          <a
            href={GITHUB_URL + "/blob/main/README.md"}
            className="underline-offset-2 hover:underline text-fg-subtle"
            target="_blank"
            rel="noreferrer"
          >
            README →
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────── Closing CTA ───────── */

function ClosingCta({ onEnterDemo }: { onEnterDemo: () => void }) {
  return (
    <section className="py-24 lg:py-32 text-center relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 50%, hsl(var(--accent) / 0.12), transparent 70%)",
        }}
      />
      <div className="max-w-3xl mx-auto px-4 lg:px-6">
        <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
          Ready to inspect a real session?
        </h2>
        <p className="text-fg-subtle mb-7 max-w-xl mx-auto">
          The demo is one click away. Or clone the repo and ship it on your own
          infrastructure today.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={onEnterDemo}>
            <PlayCircle />
            Open the demo
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github />
              GitHub
            </a>
          </Button>
        </div>
        <ShortcutHints />
      </div>
    </section>
  );
}

function ShortcutHints() {
  return (
    <div className="mt-10 inline-flex items-center gap-3 text-[11px] text-fg-faint">
      <span className="inline-flex items-center gap-1.5">
        <Kbd>G</Kbd>
        <Kbd>D</Kbd>
        <span>Dashboard</span>
      </span>
      <span className="text-border-strong">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd>G</Kbd>
        <Kbd>S</Kbd>
        <span>Sessions</span>
      </span>
      <span className="text-border-strong">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
        <span>Command palette</span>
      </span>
    </div>
  );
}

/* ───────── Footer ───────── */

function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 flex flex-wrap items-center gap-4 text-xs text-fg-faint">
        <div className="flex items-center gap-2">
          <BrandMark className="size-5" />
          <span>Remote DevTools</span>
        </div>
        <span>MIT</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-fg-subtle"
        >
          GitHub
        </a>
        <a
          href={GITHUB_URL + "/blob/main/README.md"}
          target="_blank"
          rel="noreferrer"
          className="hover:text-fg-subtle"
        >
          Docs
        </a>
        <span className="ml-auto">Built with Chrome DevTools Protocol</span>
      </div>
    </footer>
  );
}

