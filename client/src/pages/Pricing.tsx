import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BillingStatus {
  enabled: boolean;
  plans?: Array<{ id: string; name: string; monthly: number }>;
}

const GITHUB_URL = "https://github.com/blue45f/remote-devtools";

interface Plan {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  cta: string;
  href: string;
  highlight?: boolean;
  features: string[];
  footnote?: string;
}

const PLANS: Plan[] = [
  {
    name: "Self-hosted",
    price: "$0",
    cadence: "forever",
    description:
      "MIT licensed. Bring your own infrastructure, keep all your data.",
    cta: "Read the docs",
    href: GITHUB_URL + "/blob/main/docs/SELF_HOSTING.md",
    features: [
      "Full source access (NestJS + React + SDK)",
      "Docker Compose stack included",
      "Postgres, S3, Jira, Slack integrations",
      "Optional admin token authentication",
      "Community support via GitHub issues",
    ],
    footnote: "Best for teams with existing platform engineering capacity.",
  },
  {
    name: "Starter",
    price: "$29",
    cadence: "team / month",
    description: "Hosted by us. For small teams getting started with replay.",
    cta: "Coming soon",
    href: "/sign-up?plan=starter",
    highlight: true,
    features: [
      "Up to 5,000 sessions / month",
      "30-day session retention",
      "Up to 5 team members",
      "Email support (24h response)",
      "Slack & Jira integrations",
      "All replay & timeline features",
    ],
    footnote: "Hosted SaaS — see roadmap below.",
  },
  {
    name: "Pro",
    price: "$99",
    cadence: "team / month",
    description: "For growing teams that need scale, retention, and SSO.",
    cta: "Coming soon",
    href: "/sign-up?plan=pro",
    features: [
      "Up to 50,000 sessions / month",
      "90-day session retention",
      "Unlimited seats",
      "SSO (SAML / OIDC)",
      "Audit log + role-based access",
      "Priority support (4h response)",
    ],
    footnote: "Hosted SaaS — see roadmap below.",
  },
];

export default function PricingPage() {
  // Probe the backend so we can adapt CTAs / show a status pill. The query
  // never throws — a missing/disabled backend just resolves to enabled:false.
  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () =>
      apiFetch<BillingStatus>("/api/billing/status").catch(
        () => ({ enabled: false }) as BillingStatus,
      ),
    staleTime: 60_000,
    retry: false,
  });
  const billingEnabled = billing?.enabled ?? false;

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <header className="border-b border-border bg-bg/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto h-14 flex items-center px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2 select-none">
            <Brand collapsed />
            <span className="text-[15px] font-semibold tracking-tight">
              Remote DevTools
            </span>
          </Link>
          <div className="flex-1" />
          <nav className="hidden md:flex items-center gap-5 text-sm text-fg-subtle mr-3">
            <Link to="/" className="hover:text-fg">
              Home
            </Link>
            <Link to="/pricing" className="text-fg">
              Pricing
            </Link>
            <a href={GITHUB_URL} className="hover:text-fg">
              GitHub
            </a>
          </nav>
          <Button asChild variant="primary" size="sm">
            <Link to="/dashboard">
              Open demo
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 lg:mb-16">
            <Badge variant="accent" size="md" className="mb-4">
              Pricing
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-[-0.02em] mb-4">
              Self-host free,
              <br />
              <span className="text-fg-subtle">or let us run it.</span>
            </h1>
            <p className="text-fg-subtle max-w-xl mx-auto">
              Use the open-source release on your own infrastructure forever,
              or join the hosted waiting list.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((rawPlan, i) => {
              // When billing is wired up, flip "Coming soon" to a real CTA.
              const plan =
                billingEnabled && rawPlan.cta === "Coming soon"
                  ? { ...rawPlan, cta: "Get started" }
                  : rawPlan;
              return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                className="h-full"
              >
                <Card
                  className={cn(
                    "p-6 h-full flex flex-col gap-5 relative",
                    plan.highlight && "border-fg shadow-md",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-fg text-bg text-[10px] font-semibold uppercase tracking-wider">
                      Most popular
                    </span>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-xs text-fg-subtle mt-1">
                      {plan.description}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    {plan.cadence && (
                      <span className="text-xs text-fg-subtle">
                        / {plan.cadence}
                      </span>
                    )}
                  </div>
                  <Button
                    asChild
                    variant={plan.highlight ? "primary" : "outline"}
                    className="w-full"
                  >
                    {plan.href.startsWith("/") ? (
                      <Link to={plan.href}>{plan.cta}</Link>
                    ) : (
                      <a href={plan.href} target="_blank" rel="noreferrer">
                        {plan.cta}
                      </a>
                    )}
                  </Button>
                  <ul className="flex flex-col gap-2 text-sm">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-fg-subtle"
                      >
                        <Check className="size-4 text-fg-faint mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.footnote && (
                    <p className="text-[11px] text-fg-faint mt-auto pt-2 border-t border-border">
                      {plan.footnote}
                    </p>
                  )}
                </Card>
              </motion.div>
              );
            })}
          </div>

          <Card className="mt-10 p-6 bg-bg-subtle">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[280px]">
                <h3 className="text-sm font-semibold mb-1">
                  About the hosted plans
                </h3>
                <p className="text-xs text-fg-subtle leading-relaxed">
                  The hosted Starter and Pro tiers are not yet live. The
                  open-source release is fully functional today — see{" "}
                  <a
                    href={
                      GITHUB_URL + "/blob/main/docs/LAUNCH.md"
                    }
                    className="underline-offset-2 hover:underline text-fg-subtle hover:text-fg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LAUNCH.md
                  </a>{" "}
                  for the SaaS roadmap.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-up">
                  Join the waitlist
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>

          <FAQ />
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 flex flex-wrap items-center gap-4 text-xs text-fg-faint">
          <Link to="/" className="hover:text-fg-subtle">
            Home
          </Link>
          <Link to="/pricing" className="hover:text-fg-subtle">
            Pricing
          </Link>
          <a href={GITHUB_URL} className="hover:text-fg-subtle">
            GitHub
          </a>
          <a
            href={GITHUB_URL + "/blob/main/docs/SELF_HOSTING.md"}
            className="hover:text-fg-subtle"
          >
            Self-host docs
          </a>
          <a
            href={GITHUB_URL + "/blob/main/docs/LAUNCH.md"}
            className="hover:text-fg-subtle"
          >
            Roadmap
          </a>
          <span className="ml-auto">MIT licensed · Built with CDP</span>
        </div>
      </footer>
    </div>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is the public demo really free?",
    a: "Yes — the demo at remote-devtools.vercel.app is fully free, no signup. It runs entirely in your browser with seed data; nothing leaves the page.",
  },
  {
    q: "What's the difference between self-hosted and Starter?",
    a: "Self-hosted is the full open-source release on your own infrastructure — Postgres, S3, Jira, Slack integrations all work. Starter is the same product hosted by us with managed Postgres and 30-day session retention.",
  },
  {
    q: "When will Starter and Pro launch?",
    a: "Hosted tiers are on the waitlist. The roadmap (LAUNCH.md) tracks the work needed to get there. Self-host is fully usable today.",
  },
  {
    q: "Can I switch from self-host to hosted later?",
    a: "Yes — sessions live in Postgres. Once we ship the hosted plans, an export/import path will be documented.",
  },
  {
    q: "Does it work behind a VPN / on-premise / air-gapped?",
    a: "Yes. Self-host has no external dependencies (S3, Jira, Slack, Google Sheets are all optional). Run docker compose on a single VM and you're done.",
  },
  {
    q: "What about data privacy?",
    a: "The SDK captures DOM and CDP events from the pages you opt into. Self-host means the data never leaves your servers. The hosted plan will include DPA, EU data residency, and per-org isolation.",
  },
];

function FAQ() {
  return (
    <section className="mt-16">
      <div className="mb-6">
        <Badge variant="neutral" size="sm" className="mb-3 uppercase tracking-wider">
          FAQ
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight">
          Common questions
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-lg border border-border bg-surface px-4 py-3 open:bg-bg-subtle transition-colors"
          >
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium list-none">
              <span>{item.q}</span>
              <span className="ml-3 text-fg-faint transition-transform group-open:rotate-180">
                ↓
              </span>
            </summary>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
