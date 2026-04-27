import { Heart, Search } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const destinations = [
  { id: 1, name: "Santorini, Greece", image: "https://picsum.photos/seed/santorini/640/360", rating: 4.9, reviews: 2847, price: "$1,240", tag: "Popular" },
  { id: 2, name: "Kyoto, Japan", image: "https://picsum.photos/seed/kyoto/640/360", rating: 4.8, reviews: 3156, price: "$890", tag: "Trending" },
  { id: 3, name: "Hallstatt, Austria", image: "https://picsum.photos/seed/hallstatt/640/360", rating: 4.7, reviews: 1923, price: "$720", tag: "Hidden Gem" },
  { id: 4, name: "Bali, Indonesia", image: "https://picsum.photos/seed/bali/640/360", rating: 4.6, reviews: 4201, price: "$650", tag: "Best Value" },
];

const categories = [
  { icon: "\u{1F3D4}", label: "Mountains" },
  { icon: "\u{1F3D6}", label: "Beach" },
  { icon: "\u{1F3DB}", label: "Culture" },
  { icon: "\u{1F33F}", label: "Nature" },
  { icon: "\u{1F3BF}", label: "Adventure" },
  { icon: "\u{1F377}", label: "Food & Wine" },
];

interface ExploreTabProps {
  domNodes: string[];
}

export default function ExploreTab({ domNodes }: ExploreTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">
          Discover your next
          <br />
          <span className="text-fg-subtle">adventure.</span>
        </h1>
        <p className="text-fg-subtle text-sm mt-2">
          Curated destinations for unforgettable experiences.
        </p>
      </section>

      <Input
        type="text"
        placeholder="Search destinations, experiences…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search destinations"
        leadingIcon={<Search />}
        className="h-11"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat.label}
            type="button"
            className="group flex flex-col items-center gap-1 min-w-[78px] px-3 py-2.5 rounded-lg bg-bg-subtle border border-border hover:border-border-strong transition-colors"
          >
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">
              {cat.icon}
            </span>
            <span className="text-[11px] font-medium text-fg-subtle">
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-fg">Top destinations</h2>
          <button
            type="button"
            className="text-xs font-medium text-fg-subtle hover:text-fg"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {destinations.map((dest) => (
            <Card
              key={dest.id}
              className="group overflow-hidden p-0 cursor-pointer transition-all hover:border-border-strong hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full aspect-[16/9] object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-bg/90 backdrop-blur-sm text-[11px] font-semibold text-fg">
                  {dest.tag}
                </span>
                <button
                  type="button"
                  aria-label={`Save ${dest.name}`}
                  className="absolute top-3 right-3 size-7 rounded-full bg-bg/90 backdrop-blur-sm flex items-center justify-center hover:bg-bg transition-colors"
                >
                  <Heart className="size-3.5 text-fg-subtle" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-sm text-fg mb-1">
                  {dest.name}
                </h3>
                <div className="flex items-center gap-1 mb-2 text-xs">
                  <span className="text-warning">★</span>
                  <span className="font-medium text-fg">{dest.rating}</span>
                  <span className="text-fg-faint">
                    ({dest.reviews.toLocaleString()})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-semibold text-fg">
                      {dest.price}
                    </span>
                    <span className="text-[11px] text-fg-faint">/ person</span>
                  </div>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-md bg-fg text-bg text-[11px] font-medium hover:bg-fg/90 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {domNodes.length > 0 && (
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-faint mb-2">
            Captured DOM nodes ({domNodes.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {domNodes.map((char, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded bg-bg-muted text-xs font-mono text-fg"
              >
                {char}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
