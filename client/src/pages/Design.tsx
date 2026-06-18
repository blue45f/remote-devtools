import {
  Bell,
  Boxes,
  Check,
  Circle,
  Command,
  Copy,
  Layers,
  Palette,
  Play,
  Plus,
  Ruler,
  Search,
  Square,
  Type as TypeIcon,
  Waves,
  Zap,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { BrandMark } from '@/components/Brand';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Stat } from '@/components/ui/stat';
import { StatusDot } from '@/components/ui/status-dot';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { applyTheme, useAppStore, type Theme } from '@/lib/store';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────
   /design — living style guide for THIS project's real tokens
   and components. Public route, outside the protected Layout, so
   it renders without auth (it provides its own TooltipProvider and
   drives the theme through the same Zustand store the app uses).

   Copy is intentionally in English (not i18n): it labels token
   names and component APIs verbatim, the way an engineer reads them
   in source — translating "bg-accent-soft" would be misleading.
   ───────────────────────────────────────────────────────── */

interface NavSection {
  id: string;
  label: string;
}

const SECTIONS: NavSection[] = [
  { id: 'color', label: 'Color' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'radii', label: 'Radii' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'motion', label: 'Motion' },
  { id: 'components', label: 'Components' },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

/* Real @theme color tokens, grouped exactly as they appear in index.css.
   `name` is the CSS variable; `util` is the Tailwind utility that maps to it. */
interface Swatch {
  name: string;
  util: string;
  /** Class that paints the swatch with the token. */
  paint: string;
  /** Whether the swatch needs a border to read against the page (near-white). */
  ring?: boolean;
}

const COLOR_GROUPS: { title: string; note: string; swatches: Swatch[] }[] = [
  {
    title: 'Surfaces',
    note: 'Background layers, from the page floor up to overlays.',
    swatches: [
      { name: '--bg', util: 'bg-bg', paint: 'bg-bg', ring: true },
      { name: '--bg-subtle', util: 'bg-bg-subtle', paint: 'bg-bg-subtle', ring: true },
      { name: '--bg-muted', util: 'bg-bg-muted', paint: 'bg-bg-muted', ring: true },
      { name: '--surface', util: 'bg-surface', paint: 'bg-surface', ring: true },
      {
        name: '--surface-overlay',
        util: 'bg-surface-overlay',
        paint: 'bg-surface-overlay',
        ring: true,
      },
    ],
  },
  {
    title: 'Foreground',
    note: 'Text ink, tuned for WCAG AA on the surfaces above.',
    swatches: [
      { name: '--fg', util: 'text-fg', paint: 'bg-fg' },
      { name: '--fg-muted', util: 'text-fg-muted', paint: 'bg-fg-muted' },
      { name: '--fg-subtle', util: 'text-fg-subtle', paint: 'bg-fg-subtle' },
      { name: '--fg-faint', util: 'text-fg-faint', paint: 'bg-fg-faint' },
    ],
  },
  {
    title: 'Accent',
    note: 'A single blue. Primary actions, selection, focus — never decoration.',
    swatches: [
      { name: '--accent', util: 'bg-accent', paint: 'bg-accent' },
      { name: '--accent-soft', util: 'bg-accent-soft', paint: 'bg-accent-soft', ring: true },
      { name: '--ring', util: 'ring-ring', paint: 'bg-ring' },
    ],
  },
  {
    title: 'Status',
    note: 'Semantic state, used sparingly. Soft variant for tinted fills.',
    swatches: [
      { name: '--success', util: 'text-success', paint: 'bg-success' },
      { name: '--warning', util: 'text-warning', paint: 'bg-warning' },
      { name: '--danger', util: 'text-danger', paint: 'bg-danger' },
      { name: '--info', util: 'text-info', paint: 'bg-info' },
      { name: '--live', util: 'text-live', paint: 'bg-live' },
    ],
  },
  {
    title: 'Borders',
    note: 'Hairlines and dividers.',
    swatches: [
      { name: '--border', util: 'border-border', paint: 'bg-border', ring: true },
      { name: '--border-strong', util: 'border-border-strong', paint: 'bg-border-strong' },
    ],
  },
];

const RADII = [
  { name: '--radius-xs', cls: 'rounded-xs' },
  { name: '--radius-sm', cls: 'rounded-sm' },
  { name: '--radius-md', cls: 'rounded-md' },
  { name: '--radius-lg', cls: 'rounded-lg' },
  { name: '--radius-xl', cls: 'rounded-xl' },
  { name: '--radius-2xl', cls: 'rounded-2xl' },
  { name: '--radius-3xl', cls: 'rounded-3xl' },
];

const SHADOWS = [
  { name: '--shadow-xs', cls: 'shadow-xs' },
  { name: '--shadow-sm', cls: 'shadow-sm' },
  { name: '--shadow-md', cls: 'shadow-md' },
  { name: '--shadow-lg', cls: 'shadow-lg' },
];

const SPACING = [
  { token: 'gap-1', rem: '0.25rem' },
  { token: 'gap-2', rem: '0.5rem' },
  { token: 'gap-3', rem: '0.75rem' },
  { token: 'gap-4', rem: '1rem' },
  { token: 'gap-6', rem: '1.5rem' },
  { token: 'gap-8', rem: '2rem' },
  { token: 'gap-12', rem: '3rem' },
];

const TYPE_SCALE = [
  { cls: 'text-3xl font-semibold tracking-tight', label: 'text-3xl / semibold', sample: 'Display' },
  { cls: 'text-2xl font-semibold tracking-tight', label: 'text-2xl / semibold', sample: 'Heading' },
  { cls: 'text-lg font-semibold', label: 'text-lg / semibold', sample: 'Subheading' },
  { cls: 'text-sm', label: 'text-sm / regular', sample: 'Body — the workhorse size' },
  { cls: 'text-xs text-fg-subtle', label: 'text-xs / subtle', sample: 'Caption and metadata' },
  {
    cls: 'text-[10px] font-semibold uppercase tracking-wider text-fg-faint',
    label: 'overline / faint',
    sample: 'Section label',
  },
];

const EASINGS = [
  { name: '--ease-out-quart', cls: 'ease-[cubic-bezier(0.25,1,0.5,1)]' },
  { name: '--ease-out-expo', cls: 'ease-[cubic-bezier(0.16,1,0.3,1)]' },
  { name: '--ease-spring', cls: 'ease-[cubic-bezier(0.34,1.56,0.64,1)]' },
];

/** Read a token's computed value once the document is painted. */
function useComputedTokens(names: string[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);

  useLayoutEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const next: Record<string, string> = {};
    for (const name of names) {
      const raw = style.getPropertyValue(name).trim();
      if (!raw) {
        next[name] = '—';
        continue;
      }
      // Surface/fg/border tokens are stored as bare HSL channels (e.g. "0 0% 9%");
      // wrap them so the browser resolves a real, copyable color string.
      const isHslChannels = /%/.test(raw) && !raw.startsWith('hsl');
      if (isHslChannels) {
        probe.style.color = `hsl(${raw})`;
        next[name] = getComputedStyle(probe).color;
      } else {
        next[name] = raw;
      }
    }
    probe.remove();
    setValues(next);
    // resolvedTheme is a dependency so values refresh when the user toggles theme.
  }, [names, resolvedTheme]);

  return values;
}

function CopyToken({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => {},
        );
      }}
      className={cn(
        'group inline-flex items-center gap-1 font-mono text-[11px] text-fg-subtle',
        'rounded transition-colors hover:text-fg focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
      )}
      aria-label={`Copy ${text}`}
    >
      {text}
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
    </button>
  );
}

/* ───────── Header ───────── */

const THEME_ORDER: Theme[] = ['light', 'dark', 'system'];

function DesignHeader({ activeId }: { activeId: string }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const cycle = () => setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]);
  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Back to Remote DevTools">
            <BrandMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight text-fg">Remote DevTools</span>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-fg-subtle">Design System</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" size="sm" className="hidden sm:inline-flex">
              Living
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={cycle}
              aria-label={`Theme: ${themeLabel}. Click to change.`}
            >
              {themeLabel}
            </Button>
          </div>
        </div>
        <p className="max-w-[68ch] text-sm leading-relaxed text-fg-muted">
          The actual tokens and components that build the Remote DevTools client — resolved live
          from <span className="font-mono text-xs text-fg-subtle">index.css</span>, rendered in
          every state. Toggle the theme to verify both palettes.
        </p>
        <nav aria-label="Design sections" className="scroll-rail -mx-1 flex gap-1 px-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={activeId === s.id ? 'true' : undefined}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeId === s.id
                  ? 'bg-bg-muted text-fg'
                  : 'text-fg-subtle hover:bg-bg-muted hover:text-fg',
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ───────── Section scaffolding ───────── */

function Section({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof Palette;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-muted text-fg-subtle">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg text-balance">{title}</h2>
          <p className="mt-0.5 max-w-[60ch] text-sm text-fg-subtle text-pretty">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
      {children}
    </span>
  );
}

/* ───────── Foundations: Color ───────── */

// Hoisted so the reference is stable across renders — useComputedTokens reads
// this in a layout effect keyed on the array, so a fresh array each render
// would re-run the probe needlessly.
const COLOR_TOKEN_NAMES = COLOR_GROUPS.flatMap((g) => g.swatches.map((s) => s.name));

function ColorSection() {
  const values = useComputedTokens(COLOR_TOKEN_NAMES);

  return (
    <Section
      id="color"
      title="Color"
      description="A Vercel/Linear-style monochrome system: one accent blue, semantic status used sparingly. Each swatch shows the CSS variable, its Tailwind utility, and the live computed value."
      icon={Palette}
    >
      <div className="space-y-8">
        {COLOR_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-sm font-semibold text-fg">{group.title}</h3>
              <p className="text-xs text-fg-subtle">{group.note}</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {group.swatches.map((sw) => (
                <div
                  key={sw.name}
                  className="overflow-hidden rounded-lg border border-border bg-surface"
                >
                  <div
                    className={cn('h-16 w-full', sw.paint, sw.ring && 'border-b border-border')}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-1 p-2.5">
                    <CopyToken text={sw.name} />
                    <span className="font-mono text-[10px] text-fg-faint">{sw.util}</span>
                    <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                      {values[sw.name] ?? '…'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────── Foundations: Typography ───────── */

function TypographySection() {
  return (
    <Section
      id="typography"
      title="Typography"
      description="Inter Variable for UI, JetBrains Mono Variable for machine data. Product UI runs a tight rem scale — fixed, not fluid — so density stays predictable."
      icon={TypeIcon}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <Card>
          <CardHeader>
            <CardTitle>Type scale</CardTitle>
            <CardDescription>Each row is labelled with its utility classes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TYPE_SCALE.map((t) => (
              <div
                key={t.label}
                className="flex flex-col gap-1 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span className={cn('truncate text-fg', t.cls)}>{t.sample}</span>
                <span className="shrink-0 font-mono text-[10px] text-fg-faint">{t.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Families</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Caption>--font-sans</Caption>
                <p className="font-sans text-base text-fg">Inter Variable 0123456789</p>
              </div>
              <Separator />
              <div>
                <Caption>--font-mono</Caption>
                <p className="font-mono text-sm text-fg">JetBrains Mono 0O1lI</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prose measure</CardTitle>
              <CardDescription>Body text capped at a readable line length.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="max-w-[68ch] text-sm leading-relaxed text-fg-muted text-pretty">
                Long-form copy is constrained to roughly 65–75 characters per line so the eye can
                track from the end of one line to the start of the next without losing its place.
                This paragraph sits at that measure.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ───────── Foundations: Spacing / Radii / Elevation ───────── */

function SpacingSection() {
  return (
    <Section
      id="spacing"
      title="Spacing"
      description="A 4px-based scale. Vary it intentionally — tight inside controls, generous between sections."
      icon={Ruler}
    >
      <Card>
        <CardContent className="space-y-2.5 pt-5">
          {SPACING.map((s) => (
            <div key={s.token} className="flex items-center gap-3">
              <span className="w-16 shrink-0 font-mono text-[11px] text-fg-subtle">{s.token}</span>
              <div className="h-3 rounded-sm bg-accent-soft" style={{ width: s.rem }} aria-hidden />
              <span className="font-mono text-[10px] text-fg-faint">{s.rem}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Section>
  );
}

function RadiiSection() {
  return (
    <Section
      id="radii"
      title="Radii"
      description="Corner radii run slightly tighter than Tailwind defaults to read as precise rather than soft."
      icon={Square}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {RADII.map((r) => (
          <div key={r.name} className="flex flex-col items-center gap-2">
            <div
              className={cn('size-16 border border-border-strong bg-bg-muted', r.cls)}
              aria-hidden
            />
            <span className="font-mono text-[10px] text-fg-subtle">{r.name}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ElevationSection() {
  return (
    <Section
      id="elevation"
      title="Elevation"
      description="Four shadow steps. Elevation signals layering — overlays and popovers, not decoration."
      icon={Layers}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {SHADOWS.map((s) => (
          <div
            key={s.name}
            className={cn(
              'flex h-24 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface',
              s.cls,
            )}
          >
            <span className="font-mono text-[11px] text-fg">{s.name}</span>
            <span className="font-mono text-[10px] text-fg-faint">{s.cls}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────── Foundations: Motion ───────── */

function EasingTrack({ easeCls, replayKey }: { easeCls: string; replayKey: number }) {
  // Mount at the start, then flip to the end on the next frame so the
  // transition runs. Re-mounting via `key` on the parent replays it.
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAtEnd(true));
    return () => cancelAnimationFrame(raf);
  }, [replayKey]);
  return (
    <div className="relative h-2 rounded-full bg-bg-muted">
      <span
        className={cn(
          'absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-accent',
          'transition-[left] duration-700',
          easeCls,
        )}
        style={{ left: atEnd ? 'calc(100% - 0.75rem)' : '0' }}
        aria-hidden
      />
    </div>
  );
}

function MotionSection() {
  const [tick, setTick] = useState(0);
  return (
    <Section
      id="motion"
      title="Motion"
      description="Easing tokens for state changes. 150–250ms, ease-out, no bounce on UI. Every transition honours prefers-reduced-motion (see the global rule in index.css)."
      icon={Waves}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Easing curves</CardTitle>
            <CardDescription>Re-run to watch each curve travel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {EASINGS.map((e) => (
              <div key={e.name}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-fg-subtle">{e.name}</span>
                </div>
                <EasingTrack easeCls={e.cls} replayKey={tick} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
              <Play className="size-3.5" />
              Replay
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Named animations</CardTitle>
            <CardDescription>
              Keyframe utilities defined in index.css. Hover or focus to feel the transition.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="animate-pulse-dot inline-flex size-3 rounded-full bg-live" />
              <Caption>animate-pulse-dot</Caption>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-6 w-24" />
              <Caption>animate-shimmer</Caption>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-accent" />
              </span>
              <Caption>animate-ping</Caption>
            </div>
            <div
              className={cn(
                'rounded-md border border-border bg-bg-subtle px-3 py-2 text-xs text-fg-muted',
                'transition-transform duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5',
              )}
            >
              Hover lift
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

/* ───────── Components gallery ───────── */

const BUTTON_VARIANTS = [
  'primary',
  'accent',
  'secondary',
  'outline',
  'ghost',
  'soft',
  'danger',
  'link',
] as const;

function ComponentsSection() {
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [segment, setSegment] = useState<'table' | 'grid'>('table');
  const [selectVal, setSelectVal] = useState('all');

  return (
    <Section
      id="components"
      title="Components"
      description="The real primitives from src/components/ui, rendered across their variants and states. Triggers below are live — open the menus, tooltips, and dialog."
      icon={Boxes}
    >
      <div className="space-y-8">
        {/* Buttons */}
        <GalleryBlock title="Button" subtitle="8 variants × 3 sizes, plus disabled and loading.">
          <div className="space-y-4">
            <div>
              <Caption>Variants</Caption>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUTTON_VARIANTS.map((v) => (
                  <Button key={v} variant={v}>
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Caption>Sizes</Caption>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="accent" size="sm">
                  Small
                </Button>
                <Button variant="accent" size="md">
                  Medium
                </Button>
                <Button variant="accent" size="lg">
                  Large
                </Button>
                <Button variant="outline" size="icon" aria-label="Add">
                  <Plus />
                </Button>
                <Button variant="outline" size="icon-sm" aria-label="Add">
                  <Plus />
                </Button>
              </div>
            </div>
            <div>
              <Caption>States</Caption>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="primary">Default</Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="primary" disabled>
                  <Spinner className="size-4" />
                  Loading
                </Button>
              </div>
            </div>
          </div>
        </GalleryBlock>

        {/* Form controls */}
        <GalleryBlock
          title="Inputs & Fields"
          subtitle="Field wires label, hint, and error around any control."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default" hint="With a helper hint." htmlFor="d-default">
              <Input id="d-default" placeholder="you@example.com" />
            </Field>
            <Field label="With icon" htmlFor="d-icon">
              <Input id="d-icon" placeholder="Search sessions…" leadingIcon={<Search />} />
            </Field>
            <Field label="Error" error="This field is required." htmlFor="d-error">
              <Input
                id="d-error"
                aria-invalid
                defaultValue="not-an-email"
                className="border-danger focus-visible:ring-danger/20"
              />
            </Field>
            <Field label="Disabled" htmlFor="d-disabled">
              <Input id="d-disabled" disabled placeholder="Unavailable" />
            </Field>
            <Field label="Select" htmlFor="d-select" className="sm:col-span-1">
              <Select value={selectVal} onValueChange={setSelectVal}>
                <SelectTrigger id="d-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sessions</SelectItem>
                  <SelectItem value="live">Live only</SelectItem>
                  <SelectItem value="recorded">Recorded only</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Textarea" htmlFor="d-textarea" className="sm:col-span-1">
              <Textarea id="d-textarea" placeholder="Notes about this session…" rows={2} />
            </Field>
          </div>
        </GalleryBlock>

        {/* Toggles */}
        <GalleryBlock title="Toggles & selection" subtitle="Switch, Checkbox, Segmented.">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <label className="flex items-center gap-2.5 text-sm text-fg">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              {switchOn ? 'On' : 'Off'}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-fg">
              <Checkbox checked={checked} onCheckedChange={setChecked} />
              {checked ? 'Checked' : 'Unchecked'}
            </label>
            <Segmented
              value={segment}
              onValueChange={setSegment}
              aria-label="View"
              options={[
                { value: 'table', label: 'Table' },
                { value: 'grid', label: 'Grid' },
              ]}
            />
          </div>
        </GalleryBlock>

        {/* Tabs */}
        <GalleryBlock title="Tabs" subtitle="Matches the Session Detail tab vocabulary.">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="replay">Replay</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-sm text-fg-muted">Session metadata and summary live here.</p>
            </TabsContent>
            <TabsContent value="replay">
              <p className="text-sm text-fg-muted">The rrweb player mounts here.</p>
            </TabsContent>
            <TabsContent value="timeline">
              <p className="text-sm text-fg-muted">A scrubbable event timeline.</p>
            </TabsContent>
          </Tabs>
        </GalleryBlock>

        {/* Badges & status */}
        <GalleryBlock
          title="Badge & Status"
          subtitle="Status conveyed by colour + label — never colour alone."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">neutral</Badge>
              <Badge variant="outline">outline</Badge>
              <Badge variant="accent">accent</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="danger">danger</Badge>
              <Badge variant="live">live</Badge>
              <Badge variant="solid">solid</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <StatusDot tone="success" label="Healthy" />
              <StatusDot tone="warning" label="Degraded" />
              <StatusDot tone="danger" label="Down" />
              <StatusDot tone="live" label="Recording" pulse />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
              Shortcut
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              opens the command palette.
            </div>
          </div>
        </GalleryBlock>

        {/* Stat + Alert */}
        <GalleryBlock title="Stat & Alert" subtitle="KPI cards and inline messaging.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat
              label="Sessions today"
              value="1,284"
              delta={12.4}
              hint="vs. yesterday"
              icon={<Bell />}
            />
            <Stat label="Live now" value="7" delta={-3.1} hint="active streams" icon={<Circle />} />
          </div>
          <div className="mt-3 space-y-2">
            <Alert tone="info" title="Heads up">
              A new SDK version is available.
            </Alert>
            <Alert tone="success" title="Connected">
              The gateway WebSocket is live.
            </Alert>
            <Alert tone="danger" title="Capture failed">
              Could not reach the collection endpoint.
            </Alert>
          </div>
        </GalleryBlock>

        {/* Cards */}
        <GalleryBlock title="Card" subtitle="The base container. Never nested.">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Session #4821</CardTitle>
              <CardDescription>Recorded · 2m 14s · Chrome 121</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-fg-muted">
                A composed card: header, content, and a footer with actions.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="accent" size="sm">
                Open replay
              </Button>
              <Button variant="ghost" size="sm">
                Share
              </Button>
            </CardFooter>
          </Card>
        </GalleryBlock>

        {/* Overlays — portal-escaping triggers */}
        <GalleryBlock
          title="Overlays"
          subtitle="Dialog, Dropdown, and Tooltip — all portal to escape overflow."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete session?</DialogTitle>
                  <DialogDescription>
                    This permanently removes the recording and its events.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger">Delete</Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Command className="size-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Session</DropdownMenuLabel>
                <DropdownMenuItem>Open replay</DropdownMenuItem>
                <DropdownMenuItem>Copy share link</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger focus:text-danger">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More info">
                  <Zap />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tooltips portal out of overflow</TooltipContent>
            </Tooltip>
          </div>
        </GalleryBlock>

        {/* Loading & empty */}
        <GalleryBlock
          title="Loading & empty"
          subtitle="Skeletons for content, teaching empty states."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 pt-5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex items-center gap-2 pt-1">
                  <Spinner label="Loading…" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <EmptyState
                icon={Search}
                title="No sessions match"
                description="Try clearing the filter or widening the date range."
                action={
                  <Button variant="outline" size="sm">
                    Clear filters
                  </Button>
                }
              />
            </Card>
          </div>
        </GalleryBlock>
      </div>
    </Section>
  );
}

function GalleryBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="text-xs text-fg-subtle">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/* ───────── Scroll spy ───────── */

function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? '');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return activeId;
}

/* ───────── Page ───────── */

export default function DesignPage() {
  const theme = useAppStore((s) => s.theme);
  const activeId = useScrollSpy(SECTION_IDS);

  useDocumentTitle('Design System');

  // /design is public and renders outside the app shell, so keep the .dark
  // class in sync with the saved theme the same way the Landing page does.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={400}>
      <div className="min-h-screen bg-bg text-fg">
        <DesignHeader activeId={activeId} />
        <main className="mx-auto max-w-6xl space-y-16 px-4 py-10 lg:px-6 lg:py-14">
          <ColorSection />
          <TypographySection />
          <SpacingSection />
          <RadiiSection />
          <ElevationSection />
          <MotionSection />
          <ComponentsSection />
        </main>
        <footer className="border-t border-border py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 text-xs text-fg-faint lg:px-6">
            <div className="flex items-center gap-2">
              <BrandMark className="size-5" />
              <span>Remote DevTools — Design System</span>
            </div>
            <Link to="/" className="hover:text-fg-subtle">
              Home
            </Link>
            <span className="ml-auto">Rendered from live tokens</span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
