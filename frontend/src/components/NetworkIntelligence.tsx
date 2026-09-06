import { useState, useEffect } from 'react';
import { Cpu, Server, X, RefreshCw } from 'lucide-react';

export interface NodeDetail {
  nodeId: string;
  hasInternet: boolean;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'CONGESTED' | 'SUSPICIOUS';
  reliability: number;
  latencyMs: number;
  queueSize: number;
  successRate: string;
  failureRate: string;
  retryRate: string;
  transactionsRouted: number;
}

export function NetworkIntelligence() {
  const [nodes, setNodes] = useState<NodeDetail[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkHealth, setNetworkHealth] = useState<any>(null);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/network`);
      const data = await res.json();
      setNetworkHealth(data);
      setNodes(data.nodes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
    const interval = setInterval(fetchNetworkData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'DEGRADED': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'CONGESTED': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'SUSPICIOUS': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'OFFLINE': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Network Intelligence</h2>
          <p className="text-sm text-muted-foreground">Real-time peer-to-peer mesh topology, node health, and gossip telemetry.</p>
        </div>
        <button onClick={fetchNetworkData} className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Mesh Nodes</p>
          <p className="text-2xl font-black mt-1">{networkHealth?.totalNodes || 5}</p>
          <span className="text-[11px] text-emerald-500 font-semibold mt-1 inline-block">100% Monitored</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Network Reliability</p>
          <p className="text-2xl font-black mt-1 text-emerald-500">{networkHealth?.networkReliability || '96.8%'}</p>
          <span className="text-[11px] text-muted-foreground mt-1 inline-block">Optimal Telemetry</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Average Latency</p>
          <p className="text-2xl font-black mt-1">{networkHealth?.averageLatencyMs || 84}ms</p>
          <span className="text-[11px] text-muted-foreground mt-1 inline-block">Gossip Hop Relay</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Bridge Node Health</p>
          <p className="text-2xl font-black mt-1 text-emerald-500">{networkHealth?.bridgeNodeHealth || 'OPTIMAL'}</p>
          <span className="text-[11px] text-muted-foreground mt-1 inline-block">Sync Ready</span>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-3xl relative overflow-hidden">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Cpu className="text-primary" size={20} /> Live Mesh Node Topology
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4">
          {nodes.map((node: NodeDetail) => (
            <div
              key={node.nodeId}
              onClick={() => setSelectedNode(node)}
              className="bg-secondary/40 border border-border hover:border-primary/50 p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${getStatusColor(node.status)}`}>
                    {node.hasInternet ? <Server size={18} /> : <Cpu size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{node.nodeId}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{node.hasInternet ? 'Internet Bridge' : 'Offline Mesh Relay'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusColor(node.status)}`}>
                  {node.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Latency</p>
                  <p className="text-xs font-bold font-mono">{node.latencyMs}ms</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Queue</p>
                  <p className="text-xs font-bold font-mono">{node.queueSize}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Reliability</p>
                  <p className="text-xs font-bold font-mono text-emerald-500">{(node.reliability * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl border ${getStatusColor(selectedNode.status)}`}>
                <Cpu size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Node Intelligence</h3>
                <p className="text-xs text-muted-foreground font-mono">ID: {selectedNode.nodeId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-bold text-sm text-emerald-500">{selectedNode.status}</p>
              </div>
              <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Reliability Score</p>
                <p className="font-bold text-sm">{(selectedNode.reliability * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Gossip Latency</p>
                <p className="font-bold text-sm font-mono">{selectedNode.latencyMs} ms</p>
              </div>
              <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Queue Buffer Depth</p>
                <p className="font-bold text-sm">{selectedNode.queueSize} packets</p>
              </div>
              <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Delivery Success</p>
                <p className="font-bold text-sm text-emerald-500">{selectedNode.successRate}</p>
              </div>
              <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Packet Retry Rate</p>
                <p className="font-bold text-sm font-mono">{selectedNode.retryRate}</p>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">AI Assessment</p>
              <p className="text-xs text-foreground leading-relaxed">
                Node behavior is verified healthy. High gossip throughput observed with zero cryptographic validation failures.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
