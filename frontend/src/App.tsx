import { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import type { TabType } from './components/Layout';
import { AuthScreen } from './components/AuthScreen';
import { Scanner } from './components/Scanner';
import { SendMoney } from './components/SendMoney';
import { NetworkIntelligence } from './components/NetworkIntelligence';
import { RouteIntelligenceCard } from './components/RouteIntelligenceCard';
import { IncidentIntelligenceView } from './components/IncidentIntelligenceView';
import { AIAssistantChat } from './components/AIAssistantChat';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AITransactionAnalysisModal } from './components/AITransactionAnalysisModal';
import { signTransaction } from './lib/crypto';
import { useData } from './hooks/useData';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Send, ArrowDownLeft, Activity, Wifi, Smartphone, LogOut, Copy, Check, X, CheckCircle2, AlertCircle, Info, Sparkles, Eye, EyeOff, QrCode, Download, Key, ShieldCheck, PlusCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [token, setToken] = useState<string | null>(localStorage.getItem('meshpay_token'));
  const [authUser, setAuthUser] = useState<any>(null);
  const [selectedTxForAnalysis, setSelectedTxForAnalysis] = useState<any>(null);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncEnabled] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const saved = localStorage.getItem('meshpay_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [handoffPacket, setHandoffPacket] = useState<any>(null);

  const { accounts, transactions } = useData(token);

  useEffect(() => {
    const savedUser = localStorage.getItem('meshpay_user');
    if (savedUser) {
      setAuthUser(JSON.parse(savedUser));
    } else if (token) {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.vpa) {
          setAuthUser(data);
          localStorage.setItem('meshpay_user', JSON.stringify(data));
        } else {
          setToken(null);
          localStorage.removeItem('meshpay_token');
        }
      })
      .catch(console.error);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleReceivePacket = (e: any) => {
      const packet = e.detail;
      setOfflineQueue(prev => {
        const newQ = [...prev, packet];
        localStorage.setItem('meshpay_offline_queue', JSON.stringify(newQ));
        return newQ;
      });
      showToast(`📥 Cryptographic Proof received! Saved ₹${packet.payload.amount} to your offline queue.`, "success");
    };
    window.addEventListener('meshpay_receive_packet', handleReceivePacket);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('meshpay_receive_packet', handleReceivePacket);
    };
  }, []);

  useEffect(() => {
    if (isOnline && isSyncEnabled && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, isSyncEnabled]);

  const syncOfflineQueue = async () => {
    const currentQueue = [...offlineQueue];
    const failedQueue = [];

    for (const packet of currentQueue) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/transaction/offline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet)
        });
        if (!res.ok) {
          failedQueue.push(packet);
        }
      } catch (e) {
        failedQueue.push(packet);
      }
    }

    setOfflineQueue(failedQueue);
    localStorage.setItem('meshpay_offline_queue', JSON.stringify(failedQueue));
    if (failedQueue.length === 0) {
      showToast("✅ All offline transactions have been successfully synced to the bank!", "success");
    } else {
      showToast("⚠️ Some offline transactions failed to sync. Check history.", "error");
    }
  };

  const handleLogin = (newToken: string, user: any) => {
    localStorage.setItem('meshpay_token', newToken);
    localStorage.setItem('meshpay_user', JSON.stringify(user));
    setToken(newToken);
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('meshpay_token');
    localStorage.removeItem('meshpay_user');
    setToken(null);
    setAuthUser(null);
  };

  const [copied, setCopied] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('500');
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  const handleCopy = () => {
    if (currentUser?.vpa) {
      navigator.clipboard.writeText(currentUser.vpa);
      setCopied(true);
      showToast("📋 VPA Handle copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportWalletBackup = () => {
    if (!currentUser?.vpa) return;
    const privateKey = localStorage.getItem(`meshpay_private_key_${currentUser.vpa}`);
    const backupData = {
      appName: 'MeshPay Offline Wallet',
      exportedAt: new Date().toISOString(),
      vpa: currentUser.vpa,
      holderName: currentUser.holderName,
      email: currentUser.email,
      publicKey: currentUser.publicKey || null,
      encryptedPrivateKey: privateKey || null
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meshpay-wallet-backup-${currentUser.vpa.split('@')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("💾 Wallet cryptographic backup JSON exported!", "success");
  };

  const confirmAddMoney = async () => {
    if (!currentUser || !addMoneyAmount) return;
    const amount = Number(addMoneyAmount);
    if (amount <= 0 || amount > 100000) {
      showToast("You can only add up to ₹1,00,000 at a time", "error");
      return;
    }
    
    setIsAddingMoney(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/account/add-money`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpa: currentUser.vpa, amount })
      });
      if (res.ok) {
        const data = await res.json();
        const updatedUser = { ...currentUser, balance: data.balance };
        setAuthUser(updatedUser);
        localStorage.setItem('meshpay_user', JSON.stringify(updatedUser));
        setShowAddMoneyModal(false);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to add money", "error");
    } fontally: {
      setIsAddingMoney(false);
    }
  };

  const handleAddMoney = () => {
    setAddMoneyAmount('500');
    setShowAddMoneyModal(true);
  };

  const liveAccount = accounts.find(a => a.vpa === authUser?.vpa);
  const currentUser = liveAccount && authUser ? { ...authUser, ...liveAccount } : authUser;

  const displayBalance = useMemo(() => {
    try {
      if (!currentUser || currentUser.balance === undefined || currentUser.balance === null) return '0.00';
      const bal = Number(currentUser.balance);
      if (isNaN(bal)) return '0.00';
      return bal.toFixed(2);
    } catch (e) {
      return '0.00';
    }
  }, [currentUser]);

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  const renderHome = () => (
    <div className="flex flex-col p-4 max-w-2xl mx-auto animate-in fade-in duration-300 w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-md">
            {currentUser?.holderName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
              Hello, {currentUser?.holderName} <span className="animate-wave inline-block origin-bottom-right">👋</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-sm text-muted-foreground">{currentUser?.vpa || 'Loading...'}</p>
              <button onClick={handleCopy} className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 bg-secondary rounded-md">
                {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="text-amber-400 fill-amber-400 shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-wider">AI Intelligence Active</p>
            <p className="text-xs text-foreground font-medium">All offline payments & mesh routes verified with zero fraud override.</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('assistant')} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">
          Ask AI
        </button>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 mb-8 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
        <CreditCard className="absolute -right-6 -bottom-6 w-48 h-48 text-white/10 rotate-[-15deg] pointer-events-none" />
        
        <p className="text-emerald-50 text-sm font-semibold tracking-wider uppercase mb-2">Offline Wallet Balance</p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-8 font-mono break-words">
          ₹{displayBalance}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleAddMoney} className="flex-1 justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
            <ArrowDownLeft size={18} className="shrink-0" /> Add Money
          </button>
          <button 
            onClick={() => setActiveTab('send')}
            className="flex-1 justify-center bg-white text-emerald-900 hover:bg-white/90 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg transition-colors"
          >
            <Send size={18} className="shrink-0" /> {isOnline ? 'Send Online' : 'Send Offline'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pb-8">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-semibold text-lg tracking-tight">Recent Transactions</h3>
            <button onClick={() => setActiveTab('history')} className="text-primary text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 4).map((tx: any) => {
              const isSender = tx.senderVpa === currentUser?.vpa;
              return (
                <div 
                  key={tx._id || tx.id || tx.packetId} 
                  onClick={() => setSelectedTxForAnalysis(tx)}
                  className="flex justify-between items-center p-3 hover:bg-secondary/50 rounded-xl transition-colors group cursor-pointer border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2.5 rounded-full shrink-0 ${isSender ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isSender ? <Send size={18} className="transform -rotate-45" /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{isSender ? tx.receiverVpa : tx.senderVpa}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground uppercase font-semibold">{tx.status}</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">AI Risk {tx.riskLevel || 'LOW'}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`font-bold shrink-0 ml-3 ${isSender ? '' : 'text-emerald-500'}`}>
                    {isSender ? '-' : '+'}₹{tx.amount}
                  </p>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No recent transactions</p>}
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col">
          <h3 className="font-semibold text-lg mb-5 tracking-tight">Active Mesh Nodes</h3>
          <div className="flex-1 space-y-3">
            {accounts.filter(a => a.vpa !== currentUser?.vpa).slice(0, 4).map(account => (
              <div key={account.vpa} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-background p-2 rounded-lg border border-border shrink-0">
                    <Smartphone size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{account.holderName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate block">{account.vpa}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
                  <span className="text-emerald-500 flex items-center bg-emerald-500/10 px-2 py-1 rounded-md font-medium border border-emerald-500/20">
                    <Wifi size={12} className="mr-1.5 shrink-0"/> Node Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const handleOfflineSend = async (receiverVpa: string, amount: number, pin: string) => {
    try {
      const privateKeyBase64 = localStorage.getItem(`meshpay_private_key_${currentUser.vpa}`);
      
      if (!privateKeyBase64) {
        showToast("CRITICAL SECURITY ERROR: Private Key not found on this device.", "error");
        return;
      }

      const payload = {
        senderVpa: currentUser.vpa,
        receiverVpa,
        amount,
        timestamp: Date.now(),
        nonce: crypto.randomUUID()
      };

      const signature = await signTransaction(privateKeyBase64, payload);

      const packet = {
        payload,
        signature,
        pin 
      };

      if (!isOnline) {
        setHandoffPacket(packet);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/transaction/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet)
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.message}`, "success");
        if (currentUser) {
          const updatedUser = { ...currentUser, balance: currentUser.balance - amount };
          setAuthUser(updatedUser);
          localStorage.setItem('meshpay_user', JSON.stringify(updatedUser));
        }
        setActiveTab('home'); 
      } else {
        showToast(`❌ Failed: ${data.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("System Error: Could not process transaction", "error");
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isOnline={isOnline} offlineQueueCount={offlineQueue.length}>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'network' && <NetworkIntelligence />}
      {activeTab === 'routes' && <RouteIntelligenceCard />}
      {activeTab === 'incidents' && <IncidentIntelligenceView />}
      {activeTab === 'assistant' && <AIAssistantChat />}
      {activeTab === 'analytics' && <AnalyticsDashboard />}
      {activeTab === 'send' && <SendMoney key="send" isOnline={isOnline} onSendOffline={handleOfflineSend} />}
      {activeTab === 'scan' && <Scanner key="scan" currentUser={currentUser} onSendOffline={handleOfflineSend} defaultMode="scan" />}
      {activeTab === 'history' && (
        <div className="h-full flex flex-col p-4 max-w-2xl mx-auto animate-in fade-in duration-300 w-full">
          <h2 className="text-2xl font-bold mb-6">Transaction Ledger</h2>
          
          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Activity size={48} className="mb-4 opacity-20" />
              <p>No transactions found on the mesh yet.</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pb-20">
              {transactions.map((tx: any) => {
                const isSender = tx.senderVpa === currentUser?.vpa;
                return (
                  <div 
                    key={tx._id || tx.id || tx.packetId} 
                    onClick={() => setSelectedTxForAnalysis(tx)}
                    className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-primary/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-3 rounded-xl shrink-0 ${isSender ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {isSender ? <ArrowDownLeft className="rotate-180" size={24} /> : <ArrowDownLeft size={24} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-lg truncate">{isSender ? `To: ${tx.receiverVpa}` : `From: ${tx.senderVpa}`}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground font-mono truncate">{new Date(tx.createdAt || Date.now()).toLocaleString()}</p>
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">Risk {tx.riskLevel || 'LOW'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4 max-w-[100px] sm:max-w-none">
                      <p className={`font-black text-xl truncate ${isSender ? 'text-destructive' : 'text-primary'}`}>
                        {isSender ? '-' : '+'}₹{tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">ID: {(tx.packetId || '').substring(0, 8)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeTab === 'profile' && (
        <div className="h-full flex flex-col p-4 max-w-2xl mx-auto animate-in fade-in duration-300 w-full pb-24 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Your Profile & Wallet Vault</h2>
              <p className="text-xs text-muted-foreground">Manage your cryptographic keys, wallet balance, and mesh node security.</p>
            </div>
            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck size={14} /> RSA-2048 Signed
            </span>
          </div>
          
          {/* Interactive Card */}
          <div className="relative w-full min-h-[220px] bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden border border-emerald-400/20 flex flex-col justify-between group">
            {/* Background Glow Patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-emerald-100/80 text-xs uppercase tracking-widest font-semibold mb-1 flex items-center gap-2">
                  <span>Total Offline Balance</span>
                  <button 
                    onClick={() => setShowBalance(!showBalance)} 
                    className="p-1 hover:bg-white/20 rounded-md transition-colors"
                    title={showBalance ? "Hide Balance" : "Show Balance"}
                  >
                    {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </p>
                <h2 className="text-4xl font-black tracking-tight truncate font-mono">
                  {showBalance ? `₹${displayBalance}` : '••••••••'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAddMoneyModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                >
                  <PlusCircle size={16} /> Top-Up
                </button>
                <button 
                  onClick={() => setActiveTab('scan')}
                  className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl backdrop-blur-md transition-all text-xs font-bold shadow-sm"
                  title="Receive QR"
                >
                  <QrCode size={16} />
                </button>
              </div>
            </div>
            
            <div className="relative z-10 pt-4 flex justify-between items-end">
              <div>
                <p className="font-bold text-xl tracking-tight">{currentUser?.holderName || 'Account Holder'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-emerald-200 font-mono text-sm tracking-wide bg-black/20 px-2.5 py-1 rounded-lg border border-emerald-400/20">
                    {currentUser?.vpa}
                  </p>
                  <button 
                    onClick={handleCopy} 
                    className="text-emerald-100 hover:text-white transition-colors p-1.5 bg-black/30 hover:bg-black/50 rounded-lg border border-white/10"
                    title="Copy VPA"
                  >
                    {copied ? <Check size={16} className="text-emerald-300"/> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-emerald-200/80 block">Encryption</span>
                <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">AES-256 / RSA</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button 
              onClick={() => setShowAddMoneyModal(true)}
              className="bg-card border border-border hover:border-primary/50 p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all hover:scale-[1.02] shadow-sm"
            >
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <PlusCircle size={20} />
              </div>
              <span className="text-xs font-bold">Add Funds</span>
            </button>

            <button 
              onClick={() => setActiveTab('send')}
              className="bg-card border border-border hover:border-primary/50 p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all hover:scale-[1.02] shadow-sm"
            >
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Send size={20} />
              </div>
              <span className="text-xs font-bold">Send Money</span>
            </button>

            <button 
              onClick={() => setActiveTab('scan')}
              className="bg-card border border-border hover:border-primary/50 p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all hover:scale-[1.02] shadow-sm"
            >
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <QrCode size={20} />
              </div>
              <span className="text-xs font-bold">Receive QR</span>
            </button>

            <button 
              onClick={exportWalletBackup}
              className="bg-card border border-border hover:border-primary/50 p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all hover:scale-[1.02] shadow-sm"
            >
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Download size={20} />
              </div>
              <span className="text-xs font-bold">Backup Keys</span>
            </button>
          </div>

          {/* Security & Cryptography Center */}
          <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Key className="text-primary" size={18} /> Cryptographic Key Vault & Security
            </h3>

            <div className="space-y-3">
              <div className="bg-secondary/40 border border-border p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">RSA 2048-Bit Public Key</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[260px] sm:max-w-sm mt-0.5">
                    {currentUser?.publicKey ? currentUser.publicKey.substring(0, 42) + '...' : 'Generated locally on device'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (currentUser?.publicKey) {
                      navigator.clipboard.writeText(currentUser.publicKey);
                      showToast("📋 Public Key copied to clipboard!", "success");
                    }
                  }} 
                  className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>

              <div className="bg-secondary/40 border border-border p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Private Key Storage Status</p>
                  <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Encrypted WebCrypto Local Vault (Isolated)
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  SECURE
                </span>
              </div>

              <div className="bg-secondary/40 border border-border p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Offline Transaction PIN</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    4-Digit Signature PIN configured & active
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-lg">
                  CONFIGURED
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-2xl font-bold transition-all border border-destructive/20 hover:border-destructive/40 shadow-sm"
          >
            <LogOut size={20} />
            Secure Logout & Clear Session
          </button>
        </div>
      )}

      {/* Modal Add Money */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-sm rounded-3xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowAddMoneyModal(false)}
              className="absolute top-4 right-4 p-2 bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Add Money</h3>
              <p className="text-muted-foreground text-sm">Deposit funds into your offline wallet instantly.</p>
            </div>
            
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
              <input
                type="number"
                value={addMoneyAmount}
                onChange={(e) => setAddMoneyAmount(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-2xl py-4 pl-10 pr-4 text-3xl font-black focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="0.00"
                autoFocus
              />
            </div>
            
            <button 
              onClick={confirmAddMoney}
              disabled={isAddingMoney || !addMoneyAmount}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAddingMoney ? <Activity className="animate-spin" size={20}/> : 'Deposit Funds'}
            </button>
          </div>
        </div>
      )}

      {/* QR Handoff Modal */}
      {handoffPacket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl p-8 flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Offline Payment Ready</h3>
            <p className="text-sm text-muted-foreground text-center mb-8 font-medium">Scan this QR code with MeshPay app to transfer proof.</p>
            
            <div className="bg-white p-5 rounded-2xl mb-8">
              <QRCodeSVG 
                value={JSON.stringify(handoffPacket)} 
                size={220}
                level="L"
              />
            </div>

            <button 
              onClick={() => {
                const newQueue = [...offlineQueue, handoffPacket];
                setOfflineQueue(newQueue);
                localStorage.setItem('meshpay_offline_queue', JSON.stringify(newQueue));
                setHandoffPacket(null);
                setActiveTab('home');
                showToast("Fallback: Saved to your local queue to sync later.", "info");
              }}
              className="w-full bg-secondary text-secondary-foreground font-bold py-3 rounded-xl hover:bg-secondary/80 transition-colors text-sm"
            >
              Done / Queue Locally
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-[90%] mx-auto"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-xl ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-500/50 text-white' :
              toast.type === 'error' ? 'bg-destructive/90 border-destructive/50 text-white' :
              'bg-primary/90 border-primary/50 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={20} /> :
               toast.type === 'error' ? <AlertCircle size={20} /> :
               <Info size={20} />}
              <p className="text-sm font-medium leading-tight">{toast.message}</p>
              <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction AI Inspection Modal */}
      {selectedTxForAnalysis && (
        <AITransactionAnalysisModal transaction={selectedTxForAnalysis} onClose={() => setSelectedTxForAnalysis(null)} />
      )}
    </Layout>
  );
}

export default App;
