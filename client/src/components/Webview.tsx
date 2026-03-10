import axios from "axios";
import { useEffect, useState } from "react";

import ExploreTab from "./webview/ExploreTab";
import DebugPanel from "./webview/DebugPanel";

type WebviewPageProps = {
  useScriptSdk?: boolean;
};

export const WebviewPage = ({ useScriptSdk = false }: WebviewPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [node, setNode] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"explore" | "debug">("explore");

  // --- SDK Init ---
  useEffect(() => {
    if (useScriptSdk) {
      const script = document.createElement("script");
      script.src = "http://localhost:3001/sdk/index.umd.js";
      script.onload = () => {
        if (window.RemoteDebugSdk) {
          window.RemoteDebugSdk.createDebugger();
        }
      };
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
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

  // --- HTTP Test Handlers ---
  const handleApiRequest = () => {
    fetch("https://jsonplaceholder.typicode.com/todos/1?dd=1")
      .then((r) => r.json())
      .then((data) => console.log("Fetch Response:", data))
      .catch((e) => console.error("Fetch error:", e));
  };

  const handleXhrRequest = () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://jsonplaceholder.typicode.com/todos/2", true);
    xhr.onload = () => {
      if (xhr.status === 200) console.log("XHR Response:", JSON.parse(xhr.responseText));
    };
    xhr.onerror = () => console.error("XHR error");
    xhr.send();
  };

  const handleAxiosRequest = async () => {
    try {
      const response = await axios.get("https://jsonplaceholder.typicode.com/todos/3");
      console.log("Axios Response:", response.data);
    } catch (error) {
      console.error("Axios error:", error);
    }
  };

  const makeRequest = async (method: string, url: string, data?: object) => {
    try {
      const response = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      console.log(`${method} response:`, method === "DELETE" ? response.status : await response.json());
    } catch (error) {
      console.error(`${method} error:`, error);
    }
  };

  const handleDomChange = () => {
    if (node.length >= 19) return;
    setNode([...node, getKoreanCharacterByConsonant(node.length)]);
  };

  const handleConsoleLog = () => {
    console.log("console click", { a: { b: { c: { d: 1 } } } });
    console.error("console error", new Error("error test"));
    console.warn("warn");
    throw new Error("error throw");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Voyager</span>
          </div>

          <nav className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "explore"}
              onClick={() => setActiveTab("explore")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "explore"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Explore
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "debug"}
              onClick={() => setActiveTab("debug")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "debug"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
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
            <span className="text-sm text-slate-400" aria-live="polite">Loading...</span>
          </div>
        </div>
      ) : activeTab === "explore" ? (
        <ExploreTab domNodes={node} />
      ) : (
        <DebugPanel
          domNodes={node}
          onDomChange={handleDomChange}
          onConsoleLog={handleConsoleLog}
          onToggleLoading={() => setIsLoading(true)}
          onFetchRequest={handleApiRequest}
          onXhrRequest={handleXhrRequest}
          onAxiosRequest={handleAxiosRequest}
          onPostRequest={() => makeRequest("POST", "https://jsonplaceholder.typicode.com/posts", { title: "New", body: "Test", userId: 1 })}
          onPutRequest={() => makeRequest("PUT", "https://jsonplaceholder.typicode.com/posts/1", { id: 1, title: "Updated", body: "Test", userId: 1 })}
          onPatchRequest={() => makeRequest("PATCH", "https://jsonplaceholder.typicode.com/posts/1", { title: "Patched" })}
          onDeleteRequest={() => makeRequest("DELETE", "https://jsonplaceholder.typicode.com/posts/1")}
        />
      )}

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-700/60 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
              SDK Connected
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Remote Debug Tools is active</p>
          </div>
          <button
            onClick={() => window.open("http://localhost:3000/devtools/index.html", "_blank")}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all"
          >
            Open DevTools
          </button>
        </div>
      </div>
    </div>
  );
};

function getKoreanCharacterByConsonant(offset: number) {
  const baseCode = 0xac00;
  const consonantInterval = 588;
  return String.fromCharCode(baseCode + consonantInterval * offset);
}
