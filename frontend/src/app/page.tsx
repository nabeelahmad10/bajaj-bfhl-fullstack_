"use client";

import { useState } from "react";
import { AlertCircle, ChevronRight, Activity, GitCommit, Search, RefreshCw, Network } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const dataArray = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${API_BASE_URL}/bfhl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataArray }),
      });

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <Network size={20} />
            </div>
            <h1 className="font-semibold text-lg tracking-tight text-slate-900">
              BFHL Edge Processor
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Engineering Challenge
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Input Data</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter directed graph edges to process and analyze their structure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="edges" className="text-sm font-medium text-slate-700 block">
                  Relationships <span className="text-slate-400 font-normal">(comma-separated)</span>
                </label>
                <div className="relative">
                  <textarea
                    id="edges"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="A->B, A->C, B->D, X->Y, Y->Z, Z->X"
                    className="w-full min-h-[160px] p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
                    spellCheck={false}
                  />
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <GitCommit size={12} /> Format: Parent-&gt;Child (e.g. A-&gt;B)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Analyze Graph <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Analysis Results</h2>

            {!result && !loading && (
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-4">
                  <Search size={32} />
                </div>
                <h3 className="text-slate-900 font-medium mb-1">No data to display</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Enter your graph relationships on the left and click Analyze Graph to see the parsed hierarchies, trees, and cycles.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center animate-pulse shadow-sm">
                <Activity size={32} className="text-indigo-400 mb-4 animate-bounce" />
                <h3 className="text-slate-700 font-medium">Processing your graph...</h3>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Network size={64} />
                    </div>
                    <div className="text-sm font-medium text-slate-500 mb-1">Total Trees</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {result.summary?.total_trees ?? 0}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <RefreshCw size={64} />
                    </div>
                    <div className="text-sm font-medium text-slate-500 mb-1">Total Cycles</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {result.summary?.total_cycles ?? 0}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Activity size={64} />
                    </div>
                    <div className="text-sm font-medium text-slate-500 mb-1">Largest Root</div>
                    <div className="text-3xl font-bold text-indigo-600">
                      {result.summary?.largest_tree_root || "—"}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Response Payload
                    </div>
                    <div className="text-xs text-slate-500 font-mono">application/json</div>
                  </div>
                  <div className="p-4 overflow-x-auto bg-[#fafafa]">
                    <pre className="text-sm font-mono text-slate-800 leading-relaxed">
                      {syntaxHighlight(JSON.stringify(result, null, 2))}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function syntaxHighlight(json: string) {
  if (!json) return null;
  const lines = json.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/("[^"]*"\s*:|\btrue\b|\bfalse\b|\bnull\b|"[^"]*"|\b\d+\b)/);
        
        return (
          <div key={i} className="whitespace-pre">
            {parts.map((part, j) => {
              if (part.match(/"[^"]*"\s*:/)) {
                return <span key={j} className="text-slate-900 font-medium">{part}</span>;
              } else if (part.match(/"[^"]*"/)) {
                return <span key={j} className="text-emerald-600">{part}</span>;
              } else if (part.match(/\b\d+\b/)) {
                return <span key={j} className="text-amber-600">{part}</span>;
              } else if (part.match(/\b(true|false)\b/)) {
                return <span key={j} className="text-indigo-600">{part}</span>;
              } else if (part.match(/\bnull\b/)) {
                return <span key={j} className="text-rose-500">{part}</span>;
              }
              return <span key={j} className="text-slate-500">{part}</span>;
            })}
          </div>
        );
      })}
    </>
  );
}
