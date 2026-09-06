import { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';

export function IncidentIntelligenceView() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/incidents`);
      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Incident Intelligence</h2>
          <p className="text-sm text-muted-foreground">Automated systemic telemetry investigation and incident diagnostics.</p>
        </div>
        <button onClick={fetchIncidents} className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Scanning system telemetry for anomalies...</div>
      ) : incidents.length === 0 ? (
        <div className="bg-card border border-border p-8 rounded-3xl text-center text-muted-foreground">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500 opacity-80" />
          <h3 className="font-bold text-lg text-foreground">Zero Active System Incidents</h3>
          <p className="text-sm mt-1">Mesh routing, bridge synchronization, and cryptographic ledger verification operating normally.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc: any, idx: number) => (
            <div key={idx} className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-500 border border-amber-500/30">
                    <AlertOctagon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{inc.incidentCode || '#INC-102'}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        {inc.severity || 'HIGH'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mt-0.5">{inc.title || 'Bridge Node Latency Spike'}</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-secondary/40 border border-border p-4 rounded-2xl">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Probable Cause</p>
                  <p className="text-sm text-foreground font-medium">{inc.probableCause}</p>
                </div>

                <div className="bg-secondary/40 border border-border p-4 rounded-2xl">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Affected Scope</p>
                  <p className="text-sm text-foreground font-medium">
                    Nodes: {Array.isArray(inc.affectedNodes) && inc.affectedNodes.length > 0 ? inc.affectedNodes.join(', ') : 'node-mesh-relay'} | Transactions: {inc.affectedTransactionsCount || 1}
                  </p>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">AI Recommendation</p>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  "{inc.recommendedAction || 'Reroute offline packets through available healthy neighbor nodes.'}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
