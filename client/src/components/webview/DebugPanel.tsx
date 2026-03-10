interface DebugPanelProps {
  domNodes: string[];
  onDomChange: () => void;
  onConsoleLog: () => void;
  onToggleLoading: () => void;
  onFetchRequest: () => void;
  onXhrRequest: () => void;
  onAxiosRequest: () => void;
  onPostRequest: () => void;
  onPutRequest: () => void;
  onPatchRequest: () => void;
  onDeleteRequest: () => void;
}

export default function DebugPanel({
  domNodes,
  onDomChange,
  onConsoleLog,
  onToggleLoading,
  onFetchRequest,
  onXhrRequest,
  onAxiosRequest,
  onPostRequest,
  onPutRequest,
  onPatchRequest,
  onDeleteRequest,
}: DebugPanelProps) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Debug Panel</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Test SDK features with network requests, DOM changes, and console output
      </p>

      <div className="space-y-4">
        {/* GET Requests */}
        <DebugSection badge="GET" badgeColor="emerald" title="Read Requests">
          <DebugButton color="emerald" onClick={onFetchRequest}>Fetch API</DebugButton>
          <DebugButton color="emerald" onClick={onXhrRequest}>XMLHttpRequest</DebugButton>
          <DebugButton color="emerald" onClick={onAxiosRequest}>Axios</DebugButton>
        </DebugSection>

        {/* Mutation Requests */}
        <DebugSection badge="WRITE" badgeColor="blue" title="Mutation Requests">
          <DebugButton color="blue" onClick={onPostRequest}>POST</DebugButton>
          <DebugButton color="amber" onClick={onPutRequest}>PUT</DebugButton>
          <DebugButton color="cyan" onClick={onPatchRequest}>PATCH</DebugButton>
          <DebugButton color="red" onClick={onDeleteRequest}>DELETE</DebugButton>
        </DebugSection>

        {/* DOM & Console */}
        <DebugSection badge="DOM" badgeColor="violet" title="DOM & Console">
          <DebugButton color="violet" onClick={onDomChange}>Add DOM Node</DebugButton>
          <DebugButton color="orange" onClick={onConsoleLog}>Console Output</DebugButton>
          <DebugButton color="slate" onClick={onToggleLoading}>Toggle Loading</DebugButton>
        </DebugSection>
      </div>

      {/* DOM Nodes */}
      {domNodes.length > 0 && (
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            DOM Nodes ({domNodes.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {domNodes.map((char, index) => (
              <span key={index} className="px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-md text-sm font-mono">{char}</span>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function DebugSection({ badge, badgeColor, title, children }: { badge: string; badgeColor: string; title: string; children: React.ReactNode }) {
  const badgeColors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${badgeColors[badgeColor] || badgeColors.blue}`}>{badge}</span>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20",
  blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400",
  cyan: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400",
  red: "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400",
  violet: "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400",
  orange: "bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400",
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300",
};

function DebugButton({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${colorMap[color] || colorMap.slate}`}>
      {children}
    </button>
  );
}
