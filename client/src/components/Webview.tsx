import axios from "axios";
import { CircuitBoard, ExternalLink, Terminal, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DebugPanel from "./webview/DebugPanel";
import ExploreTab from "./webview/ExploreTab";

export type SdkKind = "module" | "script";

interface WebviewPageProps {
  /**
   * Which SDK distribution to load.
   * - `module` (default): import via ESM dynamic import
   * - `script`: load the UMD bundle from the external server
   */
  kind?: SdkKind;
}

export const WebviewPage = ({ kind = "module" }: WebviewPageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [node, setNode] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"explore" | "debug">("explore");

  // SDK init
  useEffect(() => {
    if (kind === "script") {
      const script = document.createElement("script");
      // Same-origin path (Vite dev proxy forwards /sdk → external in dev;
      // production usually serves both apps behind the same reverse proxy).
      script.src = "/sdk/index.umd.js";
      script.onload = () => {
        if (window.RemoteDebugSdk) {
          window.RemoteDebugSdk.createDebugger();
        }
      };
      document.head.appendChild(script);
      return () => {
        if (script.parentNode === document.head) {
          document.head.removeChild(script);
        }
      };
    }
    void import("remote-debug-sdk").then(({ createDebugger }) => {
      createDebugger();
    });
  }, [kind]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Test handlers
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
      if (xhr.status === 200)
        console.log("XHR Response:", JSON.parse(xhr.responseText));
    };
    xhr.onerror = () => console.error("XHR error");
    xhr.send();
  };

  const handleAxiosRequest = async () => {
    try {
      const response = await axios.get(
        "https://jsonplaceholder.typicode.com/todos/3",
      );
      console.log("Axios Response:", response.data);
    } catch (error) {
      console.error("Axios error:", error);
    }
  };

  const makeRequest = async (
    method: string,
    url: string,
    data?: object,
  ) => {
    try {
      const response = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      console.log(
        `${method} response:`,
        method === "DELETE" ? response.status : await response.json(),
      );
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
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto pb-24">
      <SdkBanner kind={kind} />

      <div className="mt-5">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "explore" | "debug")}
        >
          <TabsList>
            <TabsTrigger value="explore" className="gap-1.5">
              <CircuitBoard className="size-3.5" />
              Customer page
            </TabsTrigger>
            <TabsTrigger value="debug" className="gap-1.5">
              <Terminal className="size-3.5" />
              Debug actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="mt-6">
            {isLoading ? (
              <LoadingPanel />
            ) : (
              <ExploreTab domNodes={node} />
            )}
          </TabsContent>

          <TabsContent value="debug" className="mt-6">
            <DebugPanel
              domNodes={node}
              onDomChange={handleDomChange}
              onConsoleLog={handleConsoleLog}
              onToggleLoading={() => setIsLoading(true)}
              onFetchRequest={handleApiRequest}
              onXhrRequest={handleXhrRequest}
              onAxiosRequest={handleAxiosRequest}
              onPostRequest={() =>
                makeRequest("POST", "https://jsonplaceholder.typicode.com/posts", {
                  title: "New",
                  body: "Test",
                  userId: 1,
                })
              }
              onPutRequest={() =>
                makeRequest(
                  "PUT",
                  "https://jsonplaceholder.typicode.com/posts/1",
                  { id: 1, title: "Updated", body: "Test", userId: 1 },
                )
              }
              onPatchRequest={() =>
                makeRequest(
                  "PATCH",
                  "https://jsonplaceholder.typicode.com/posts/1",
                  { title: "Patched" },
                )
              }
              onDeleteRequest={() =>
                makeRequest(
                  "DELETE",
                  "https://jsonplaceholder.typicode.com/posts/1",
                )
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <BottomCta />
    </div>
  );
};

function SdkBanner({ kind }: { kind: SdkKind }) {
  const label = kind === "module" ? "Module SDK" : "Script SDK (UMD)";
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg-subtle">
      <span className="size-8 rounded-md bg-accent-soft text-accent-soft-fg flex items-center justify-center shrink-0">
        <Wifi className="size-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg">SDK Playground</span>
          <Badge variant="accent" size="sm">
            {label}
          </Badge>
          <span className="size-1.5 rounded-full bg-success animate-pulse-dot" />
          <span className="text-[11px] text-fg-faint">connected</span>
        </div>
        <p className="text-xs text-fg-subtle mt-0.5">
          A demo customer page that loads the Remote DevTools SDK and lets you
          trigger sample events.
        </p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center h-[40vh]">
      <div className="flex flex-col items-center gap-2.5">
        <div className="size-8 rounded-full border-2 border-border border-t-fg animate-spin" />
        <span className="text-sm text-fg-subtle">Loading…</span>
      </div>
    </div>
  );
}

function BottomCta() {
  return (
    <div className="fixed bottom-4 right-4 z-20">
      <Button
        variant="primary"
        onClick={() =>
          window.open("http://localhost:3000/devtools/index.html", "_blank")
        }
        className="shadow-lg"
      >
        <ExternalLink />
        Open DevTools
      </Button>
    </div>
  );
}

function getKoreanCharacterByConsonant(offset: number) {
  const baseCode = 0xac00;
  const consonantInterval = 588;
  return String.fromCharCode(baseCode + consonantInterval * offset);
}
