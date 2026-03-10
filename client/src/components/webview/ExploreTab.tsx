import { useState } from "react";

const destinations = [
  { id: 1, name: "Santorini, Greece", image: "https://picsum.photos/seed/santorini/400/260", rating: 4.9, reviews: 2847, price: "$1,240", tag: "Popular" },
  { id: 2, name: "Kyoto, Japan", image: "https://picsum.photos/seed/kyoto/400/260", rating: 4.8, reviews: 3156, price: "$890", tag: "Trending" },
  { id: 3, name: "Hallstatt, Austria", image: "https://picsum.photos/seed/hallstatt/400/260", rating: 4.7, reviews: 1923, price: "$720", tag: "Hidden Gem" },
  { id: 4, name: "Bali, Indonesia", image: "https://picsum.photos/seed/bali/400/260", rating: 4.6, reviews: 4201, price: "$650", tag: "Best Value" },
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
    <main className="max-w-5xl mx-auto px-4 pb-32">
      {/* Hero */}
      <section className="pt-8 pb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Discover your next
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            adventure
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Curated destinations for unforgettable experiences
        </p>
      </section>

      {/* Search */}
      <div className="relative mb-6">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search destinations, experiences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search destinations"
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.label}
            className="flex flex-col items-center gap-1.5 min-w-[72px] px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{cat.icon}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Destinations Grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Top Destinations</h2>
          <button className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:text-violet-700">View all</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {destinations.map((dest) => (
            <div key={dest.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
              <div className="relative overflow-hidden">
                <img src={dest.image} alt={dest.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700">{dest.tag}</span>
                </div>
                <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors" aria-label={`Save ${dest.name}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-slate-600">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{dest.name}</h3>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-amber-400 text-sm">★</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{dest.rating}</span>
                  <span className="text-xs text-slate-400">({dest.reviews.toLocaleString()} reviews)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{dest.price}</span>
                    <span className="text-xs text-slate-400 ml-1">/ person</span>
                  </div>
                  <button className="px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-100 transition-colors">Book Now</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DOM Nodes */}
      {domNodes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {domNodes.map((char, index) => (
            <span key={index} className="px-2 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-md text-sm font-mono">{char}</span>
          ))}
        </div>
      )}
    </main>
  );
}
