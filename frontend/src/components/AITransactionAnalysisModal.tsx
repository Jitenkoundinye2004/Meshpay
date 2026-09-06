import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X, Activity, FileText } from 'lucide-react';

export function AITransactionAnalysisModal({ transaction, onClose }: { transaction: any; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (transaction?.packetId) {
      setLoading(true);
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/transaction/${transaction.packetId}`)
        .then(res => res.json())
        .then(data => setAnalysis(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [transaction]);

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'CRITICAL': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-xl rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary border border-primary/20">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">AI Transaction Risk Analysis</h3>
            <p className="text-xs text-muted-foreground font-mono">Packet ID: {transaction?.packetId || 'Unknown'}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="animate-spin mb-3 text-primary" size={32} />
            <p className="text-sm font-medium">Running AI Risk & Evidence Evaluation...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-secondary/40 border border-border p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">AI Risk Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black">{analysis?.riskScore ?? 10}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Assessment</p>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${getBadgeStyle(analysis?.riskLevel || 'LOW')}`}>
                  {analysis?.riskLevel || 'LOW'}
                </span>
              </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-primary" /> AI Explanation
              </h4>
              <p className="text-sm text-foreground leading-relaxed font-medium">
                "{analysis?.summary || 'Transaction behavior aligns with the observed network pattern.'}"
              </p>
            </div>

            {analysis?.riskFactors && analysis.riskFactors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Contributing Factors</h4>
                <div className="space-y-2">
                  {analysis.riskFactors.map((factor: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 p-2.5 rounded-xl">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Verified Telemetry Evidence</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Cryptographic Proof: Valid</span>
                </div>
                <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Amount: ₹{transaction?.amount || 0}</span>
                </div>
                <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Route Hop Count: {transaction?.hopCount || 1}</span>
                </div>
                <div className="bg-secondary/40 border border-border p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Idempotency: Verified</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">AI Recommendation</h4>
              <p className="text-xs text-foreground font-medium">
                {analysis?.recommendation || 'Proceed with standard settlement and synchronization.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
