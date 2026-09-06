import { useState, useEffect, Fragment } from 'react';
import { Navigation, ArrowRight, Zap, RefreshCw } from 'lucide-react';

export function RouteIntelligenceCard() {
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      // First fetch active nodes dynamically
      const netRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/network`);
      const netData = await netRes.json();
      const nodesList = netData?.nodes || [];
      const offlineNodes = nodesList.filter((n: any) => !n.hasInternet);
      const bridgeNodes = nodesList.filter((n: any) => n.hasInternet);
      const sourceId = offlineNodes.length > 0 ? offlineNodes[0].nodeId : 'node-client';
      const destId = bridgeNodes.length > 0 ? bridgeNodes[0].nodeId : 'gateway-bridge-node';

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceNode: sourceId, 
          destinationNode: destId,
          nodes: nodesList
        })
      });
      const data = await res.json();
      setRouteData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  return (
    <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col gap-5 w-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-2xl text-primary border border-primary/20">
            <Navigation size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg tracking-tight">AI Smart Route Recommendation</h3>
            <p className="text-xs text-muted-foreground">Optimal gossip forwarding paths based on node latency & queue load.</p>
          </div>
        </div>

        <button onClick={fetchRoute} className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Evaluating optimal mesh node path...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                <Zap size={14} /> Recommended Path
              </span>
              <span className="text-xs font-mono font-bold text-emerald-500">
                {((routeData?.reliabilityScore || 0.96) * 100).toFixed(0)}% Reliability
              </span>
            </div>

            <div className="flex items-center gap-2 my-3 overflow-x-auto py-1">
              {(routeData?.recommendedRoute || []).map((node: string, idx: number) => (
                <Fragment key={idx}>
                  <div className="bg-background px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs font-mono font-bold shrink-0">
                    {node}
                  </div>
                  {idx < (routeData?.recommendedRoute?.length || 0) - 1 && (
                    <ArrowRight size={14} className="text-emerald-500 shrink-0" />
                  )}
                </Fragment>
              ))}
            </div>

            <p className="text-xs text-foreground/90 font-medium leading-relaxed mt-2">
              "{routeData?.reasoning || 'Selected path optimized based on active mesh node congestion.'}"
            </p>
          </div>

          {routeData?.alternativeRoute && routeData.alternativeRoute.length > 0 && (
            <div className="bg-secondary/40 border border-border p-4 rounded-2xl">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Alternative Path</span>
              <div className="flex items-center gap-2 overflow-x-auto">
                {routeData.alternativeRoute.map((node: string, idx: number) => (
                  <Fragment key={idx}>
                    <div className="bg-card px-2.5 py-1 rounded-lg border border-border text-xs font-mono text-muted-foreground shrink-0">
                      {node}
                    </div>
                    {idx < routeData.alternativeRoute.length - 1 && (
                      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
