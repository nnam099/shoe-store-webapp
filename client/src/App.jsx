import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState({ status: 'checking', message: 'Checking backend connection...' });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setHealth({ status: 'connected', message: data.status || 'ok' });
      })
      .catch((err) => {
        setHealth({ status: 'disconnected', message: err.message });
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl text-center space-y-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Shoe Store WebApp
        </h1>
        <p className="text-sm text-slate-400">
          Milestone 1: Project Foundation
        </p>

        <div className="pt-2 border-t border-slate-700/60">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-slate-400">Backend Health:</span>
            {health.status === 'checking' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Checking...
              </span>
            )}
            {health.status === 'connected' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Online ({health.message})
              </span>
            )}
            {health.status === 'disconnected' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Offline ({health.message})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
