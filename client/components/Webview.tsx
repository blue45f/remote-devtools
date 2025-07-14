"use client";

import axios from "axios";
import Script from "next/script";
import { useEffect, useState } from "react";

type WebviewPageProps = {
  useScriptSdk?: boolean;
};

export const WebviewPage = ({ useScriptSdk = false }: WebviewPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [node, setNode] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"explore" | "debug">("explore");
  const [searchQuery, setSearchQuery] = useState("");

  // --- SDK Test Functions (preserved) ---
  const handleApiRequest = () => {
    fetch("https://jsonplaceholder.typicode.com/todos/1?dd=1")
      .then((response) => {
        console.log("response.ok:", response.ok);
        return response.json();
      })
      .then((data) => console.log("Fetch Response:", data))
      .catch((error) => console.error("Fetch error:", error));
  };

  const handleXhrRequest = () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://jsonplaceholder.typicode.com/todos/2", true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        console.log("XHR Response:", JSON.parse(xhr.responseText));
      }
    };
    xhr.onerror = function () {
      console.error("XHR error");
    };
    xhr.send();
  };

  const handleAxiosRequest = async () => {
    try {
      console.log("Axios request starting...");
      const response = await axios.get(
        "https://jsonplaceholder.typicode.com/todos/3",
      );
      console.log("Axios Response:", response.data);
    } catch (error) {
      console.error("Axios error:", error);
    }
  };

  const handlePostRequest = async () => {
    try {
      const data = {
        title: "New Destination",
        body: "A beautiful place to explore.",
        userId: 1,
      };
      console.log("POST request:", data);
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      console.log("POST response:", await response.json());
    } catch (error) {
      console.error("POST error:", error);
    }
  };

  const handlePutRequest = async () => {
    try {
      const data = {
        id: 1,
        title: "Updated Destination",
        body: "Updated info.",
        userId: 1,
      };
      console.log("PUT request:", data);
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts/1",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      console.log("PUT response:", await response.json());
    } catch (error) {
      console.error("PUT error:", error);
    }
  };

  const handlePatchRequest = async () => {
    try {
      const data = { title: "Partially Updated" };
      console.log("PATCH request:", data);
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts/1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      console.log("PATCH response:", await response.json());
    } catch (error) {
      console.error("PATCH error:", error);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      console.log("DELETE request");
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts/1",
        { method: "DELETE" },
      );
      console.log("DELETE status:", response.status);
    } catch (error) {
      console.error("DELETE error:", error);
    }
  };

  const handleClickDomChange = () => {
    if (node.length >= 19) return;
    setNode([...node, getKoreanCharacterByConsonant(node.length)]);
  };

  const handleClickConsoleLog = () => {
    console.log("console click", { a: { b: { c: { d: 1 } } } });
    console.error("console error", new Error("error test"));
    console.warn("warn");
    throw new Error("error throw");
  };

  // --- SDK Init ---
  useEffect(() => {
    if (useScriptSdk) {
      if (window.RemoteDebugSdk) {
        window.RemoteDebugSdk.createDebugger();
      }
    } else {
      import("remote-debug-sdk").then(({ createDebugger }) => {
        createDebugger();
      });
    }
  }, [useScriptSdk]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // --- Data ---
  const destinations = [
    {
      id: 1,
      name: "Santorini, Greece",
      image: "https://picsum.photos/seed/santorini/400/260",
      rating: 4.9,
      reviews: 2847,
      price: "$1,240",
      tag: "Popular",
    },
    {
      id: 2,
      name: "Kyoto, Japan",
      image: "https://picsum.photos/seed/kyoto/400/260",
      rating: 4.8,
      reviews: 3156,
      price: "$890",
      tag: "Trending",
    },
    {
      id: 3,
      name: "Hallstatt, Austria",
      image: "https://picsum.photos/seed/hallstatt/400/260",
      rating: 4.7,
      reviews: 1923,
      price: "$720",
      tag: "Hidden Gem",
    },
    {
      id: 4,
      name: "Bali, Indonesia",
      image: "https://picsum.photos/seed/bali/400/260",
      rating: 4.6,
      reviews: 4201,
      price: "$650",
      tag: "Best Value",
    },
  ];

  const categories = [
    { icon: "🏔", label: "Mountains" },
    { icon: "🏖", label: "Beach" },
    { icon: "🏛", label: "Culture" },
    { icon: "🌿", label: "Nature" },
    { icon: "🎿", label: "Adventure" },
    { icon: "🍷", label: "Food & Wine" },
  ];

  return (
    <>
      {useScriptSdk && (
        <Script
          src="http://localhost:3001/sdk/index.umd.js"
          strategy="beforeInteractive"
          onLoad={() => console.log("SDK loaded")}
        />
      )}

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">V</span>
              </div>
              <span className="text-lg font-bold text-slate-900">Voyager</span>
            </div>

            <nav className="flex gap-1 bg-slate-100 rounded-full p-1">
              <button
                onClick={() => setActiveTab("explore")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "explore"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setActiveTab("debug")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "debug"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Debug Panel
              </button>
            </nav>

            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading...</span>
            </div>
          </div>
        ) : activeTab === "explore" ? (
          /* ===== EXPLORE TAB ===== */
          <main className="max-w-5xl mx-auto px-4 pb-32">
            {/* Hero */}
            <section className="pt-8 pb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Discover your next
                <br />
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  adventure
                </span>
              </h1>
              <p className="text-slate-500 text-sm">
                Curated destinations for unforgettable experiences
              </p>
            </section>

            {/* Search */}
            <div className="relative mb-6">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search destinations, experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  className="flex flex-col items-center gap-1.5 min-w-[72px] px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Destinations Grid */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Top Destinations
                </h2>
                <button className="text-sm text-violet-600 font-medium hover:text-violet-700">
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={dest.image}
                        alt={dest.name}
                        className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700">
                          {dest.tag}
                        </span>
                      </div>
                      <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          className="text-slate-600"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {dest.name}
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="text-sm font-medium text-slate-700">
                          {dest.rating}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({dest.reviews.toLocaleString()} reviews)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-slate-900">
                            {dest.price}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            / person
                          </span>
                        </div>
                        <button className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-xs font-semibold hover:bg-violet-100 transition-colors">
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* DOM Change Result */}
            {node.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6 p-3 bg-white rounded-xl border border-slate-200">
                {node.map((char, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-violet-50 text-violet-700 rounded-md text-sm font-mono"
                  >
                    {char}
                  </span>
                ))}
              </div>
            )}
          </main>
        ) : (
          /* ===== DEBUG TAB ===== */
          <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Debug Panel
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Test SDK features with network requests, DOM changes, and console
              output
            </p>

            <div className="space-y-4">
              {/* GET Requests */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-bold">
                    GET
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Read Requests
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DebugButton color="emerald" onClick={handleApiRequest}>
                    Fetch API
                  </DebugButton>
                  <DebugButton color="emerald" onClick={handleXhrRequest}>
                    XMLHttpRequest
                  </DebugButton>
                  <DebugButton color="emerald" onClick={handleAxiosRequest}>
                    Axios
                  </DebugButton>
                </div>
              </div>

              {/* Mutation Requests */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold">
                    WRITE
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Mutation Requests
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DebugButton color="blue" onClick={handlePostRequest}>
                    POST
                  </DebugButton>
                  <DebugButton color="amber" onClick={handlePutRequest}>
                    PUT
                  </DebugButton>
                  <DebugButton color="cyan" onClick={handlePatchRequest}>
                    PATCH
                  </DebugButton>
                  <DebugButton color="red" onClick={handleDeleteRequest}>
                    DELETE
                  </DebugButton>
                </div>
              </div>

              {/* DOM & Console */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded text-xs font-bold">
                    DOM
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    DOM & Console
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DebugButton color="violet" onClick={handleClickDomChange}>
                    Add DOM Node
                  </DebugButton>
                  <DebugButton color="orange" onClick={handleClickConsoleLog}>
                    Console Output
                  </DebugButton>
                  <DebugButton
                    color="slate"
                    onClick={() => setIsLoading(true)}
                  >
                    Toggle Loading
                  </DebugButton>
                </div>
              </div>
            </div>

            {/* DOM Change Result */}
            {node.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200/60">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  DOM Nodes ({node.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {node.map((char, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md text-sm font-mono"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </main>
        )}

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200/60 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  SDK Connected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Remote Debug Tools is active
              </p>
            </div>
            <button
              onClick={() => window.open("/devtools/index.html", "_blank")}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all"
            >
              Open DevTools
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Sub-components ---

type DebugButtonProps = {
  color: string;
  onClick: () => void;
  children: React.ReactNode;
};

const colorMap: Record<string, string> = {
  emerald:
    "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200",
  blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200",
  amber:
    "bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200",
  cyan: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 active:bg-cyan-200",
  red: "bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200",
  violet:
    "bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200",
  orange:
    "bg-orange-50 text-orange-700 hover:bg-orange-100 active:bg-orange-200",
  slate:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300",
};

function DebugButton({ color, onClick, children }: DebugButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${colorMap[color] || colorMap.slate}`}
    >
      {children}
    </button>
  );
}

function getKoreanCharacterByConsonant(offset: number) {
  const baseCode = 0xac00;
  const consonantInterval = 588;
  return String.fromCharCode(baseCode + consonantInterval * offset);
}
