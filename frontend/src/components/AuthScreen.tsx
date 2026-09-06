import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Zap, Lock, User, Eye, EyeOff, Mail, KeyRound, ArrowLeft, AtSign } from 'lucide-react';
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '../lib/crypto';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

type AuthView = 'LOGIN' | 'REGISTER' | 'REGISTER_OTP' | 'FORGOT_PASSWORD' | 'FORGOT_PASSWORD_OTP';

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [useOtpVerification, setUseOtpVerification] = useState(false);
  const [formData, setFormData] = useState({ 
    email: '', 
    holderName: '', 
    password: '', 
    pin: '',
    vpa: '',
    otp: '' 
  });
  const [isVpaCustomized, setIsVpaCustomized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Use relative path for seamless Vite proxy and Express serving
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleNameChange = (nameVal: string) => {
    const updated = { ...formData, holderName: nameVal };
    if (!isVpaCustomized) {
      const cleanName = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      updated.vpa = `${cleanName}@upi`;
    }
    setFormData(updated);
  };

  const handleSendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    if (!formData.holderName) {
      setError('Please provide your full name');
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('Offline transaction PIN must be exactly 4 digits');
      setIsLoading(false);
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please provide a valid email address');
      setIsLoading(false);
      return;
    }

    const finalVpa = formData.vpa || `${formData.holderName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@upi`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, vpa: finalVpa })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      
      if (data.devOtp) {
        setFormData(prev => ({ ...prev, otp: String(data.devOtp), vpa: finalVpa }));
        setSuccessMsg(`Verification code: ${data.devOtp} (Pre-filled for fast testing)`);
      } else {
        setFormData(prev => ({ ...prev, vpa: finalVpa }));
        setSuccessMsg('Verification code sent to your email address!');
      }
      
      setView('REGISTER_OTP');
    } catch (err: any) {
      console.error('Registration OTP error:', err);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If OTP verification mode is enabled and we are on initial REGISTER step, send OTP first
    if (useOtpVerification && view === 'REGISTER') {
      return handleSendRegisterOtp(e);
    }

    clearMessages();
    setIsLoading(true);

    if (!formData.holderName) {
      setError('Please provide your full name');
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('Offline transaction PIN must be exactly 4 digits');
      setIsLoading(false);
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please provide a valid email address');
      setIsLoading(false);
      return;
    }

    if (view === 'REGISTER_OTP' && !formData.otp) {
      setError('Please enter the 6-digit verification code');
      setIsLoading(false);
      return;
    }

    try {
      const keyPair = await generateKeyPair();
      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);

      let finalVpa = formData.vpa.trim();
      if (!finalVpa) {
        const cleanName = formData.holderName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
        finalVpa = `${cleanName}@upi`;
      }
      if (!finalVpa.includes('@')) {
        finalVpa = `${finalVpa}@upi`;
      }

      const payload: any = {
        vpa: finalVpa,
        email: formData.email,
        holderName: formData.holderName,
        password: formData.password,
        pin: formData.pin,
        publicKey: publicKeyBase64
      };

      if (formData.otp) {
        payload.otp = formData.otp;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      if (privateKeyBase64) {
        localStorage.setItem(`meshpay_private_key_${data.vpa}`, privateKeyBase64);
      }
      onLoginSuccess(data.token, data);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    if (!validateEmail(formData.email)) {
      setError('Please provide a valid email address');
      setIsLoading(false);
      return;
    }
    if (!formData.password) {
      setError('Please provide your password');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      onLoginSuccess(data.token, data);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    if (!validateEmail(formData.email)) {
      setError('Please provide a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      if (data.devOtp) {
        setFormData(prev => ({ ...prev, otp: String(data.devOtp) }));
        setSuccessMsg(`Reset code generated: ${data.devOtp} (Pre-filled for fast testing)`);
      } else {
        setSuccessMsg('If your email exists, an OTP has been sent.');
      }
      
      setView('FORGOT_PASSWORD_OTP');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    if (!formData.otp || !formData.password) {
      setError('Please provide OTP and new password');
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: formData.otp, newPassword: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccessMsg('Password reset successfully. You can now login.');
      setView('LOGIN');
      setFormData({ ...formData, password: '', otp: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    name: string,
    label: string,
    type: string,
    placeholder: string,
    icon: React.ReactNode,
    value: string,
    onChange: (e: any) => void,
    extraAction?: React.ReactNode,
    helpText?: string
  ) => (
    <div key={name} className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">{label}</label>
      <div className="relative mt-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        <div className="w-full">
          <input 
            type={type} 
            name={name}
            placeholder={placeholder}
            className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground text-sm"
            value={value}
            onChange={onChange}
            autoComplete="off"
          />
        </div>
        {extraAction && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            {extraAction}
          </div>
        )}
      </div>
      {helpText && <p className="text-[10px] text-muted-foreground ml-1 mt-1">{helpText}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden dark text-foreground">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/30 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex bg-primary/20 p-3 rounded-2xl text-primary mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            <Zap size={32} />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">MeshPay</h1>
          <p className="text-muted-foreground font-medium">The True P2P Offline Ledger</p>
        </div>

        <div className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 md:p-8 rounded-3xl shadow-2xl">
          
          {(view === 'LOGIN' || view === 'REGISTER') && (
            <div className="flex bg-secondary/50 p-1 rounded-xl mb-6">
              <button 
                type="button"
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${view === 'LOGIN' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                onClick={() => { setView('LOGIN'); clearMessages(); }}
              >
                Login
              </button>
              <button 
                type="button"
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${view === 'REGISTER' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                onClick={() => { setView('REGISTER'); clearMessages(); }}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 mb-6 text-center font-medium">
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-primary/10 text-primary text-sm p-3 rounded-lg border border-primary/20 mb-6 text-center font-medium break-words">
              {successMsg}
            </motion.div>
          )}

          <form 
            onSubmit={
              view === 'LOGIN' ? handleLogin :
              (view === 'REGISTER' || view === 'REGISTER_OTP') ? handleRegisterUser :
              view === 'FORGOT_PASSWORD' ? handleForgotPassword :
              handleResetPassword
            } 
            className="space-y-4"
            translate="no"
          >

            {(view === 'REGISTER_OTP' || view === 'FORGOT_PASSWORD' || view === 'FORGOT_PASSWORD_OTP') && (
              <button 
                type="button"
                onClick={() => {
                  setView(view === 'REGISTER_OTP' ? 'REGISTER' : 'LOGIN');
                  clearMessages();
                }}
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" /> Back
              </button>
            )}
            
            <div className="space-y-4">
                
                <div className={view === 'REGISTER' ? 'block' : 'hidden'}>
                  {renderInput(
                    'name', 'Full Name', 'text', 'e.g. Alex Morgan', <User size={18} className="text-muted-foreground" />,
                    formData.holderName, (e) => handleNameChange(e.target.value)
                  )}
                </div>

                <div className={view === 'REGISTER' ? 'block' : 'hidden'}>
                  {renderInput(
                    'vpa', 'UPI VPA Handle', 'text', 'e.g. alex@upi', <AtSign size={18} className="text-muted-foreground" />,
                    formData.vpa, (e) => {
                      setIsVpaCustomized(true);
                      setFormData({ ...formData, vpa: e.target.value.toLowerCase().replace(/\s/g, '') });
                    },
                    undefined,
                    "Dynamic UPI handle for sending & receiving payments."
                  )}
                </div>

                <div className={(view === 'LOGIN' || view === 'REGISTER' || view === 'FORGOT_PASSWORD') ? 'block' : 'hidden'}>
                  {renderInput(
                    'email', 'Email Address', 'email', 'e.g. alex@example.com', <Mail size={18} className="text-muted-foreground" />,
                    formData.email, (e) => setFormData({...formData, email: e.target.value.toLowerCase()})
                  )}
                </div>

                <div className={view === 'REGISTER' ? 'block' : 'hidden'}>
                  <div className="space-y-4">
                    {renderInput(
                      'register-password', 'Password', showPassword ? 'text' : 'password', '••••••••', <Lock size={18} className="text-muted-foreground" />,
                      formData.password, (e) => setFormData({...formData, password: e.target.value}),
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground p-1">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                    {renderInput(
                      'pin', 'Offline Transaction PIN', showPin ? 'text' : 'password', '4-Digit PIN', <ShieldCheck size={18} className="text-muted-foreground" />,
                      formData.pin, (e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')}),
                      <button type="button" onClick={() => setShowPin(!showPin)} className="text-muted-foreground hover:text-foreground p-1">
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>,
                      "This 4-digit PIN signs offline transactions."
                    )}

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Verify via Email OTP</span>
                      <button
                        type="button"
                        onClick={() => setUseOtpVerification(!useOtpVerification)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useOtpVerification ? 'bg-primary' : 'bg-secondary'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useOtpVerification ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className={view === 'LOGIN' ? 'block' : 'hidden'}>
                  <div className="space-y-4">
                    {renderInput(
                      'login-password', 'Password', showPassword ? 'text' : 'password', '••••••••', <Lock size={18} className="text-muted-foreground" />,
                      formData.password, (e) => setFormData({...formData, password: e.target.value}),
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground p-1">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                    <div className="flex justify-end">
                      <button type="button" onClick={() => { setView('FORGOT_PASSWORD'); clearMessages(); }} className="text-xs text-primary font-medium hover:underline">
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                </div>

                <div className={(view === 'REGISTER_OTP' || view === 'FORGOT_PASSWORD_OTP') ? 'block' : 'hidden'}>
                  <div className="space-y-4">
                    <p className="text-sm text-center text-muted-foreground mb-4">
                      Enter 6-digit code sent to <span className="font-bold text-foreground">{formData.email || 'your email'}</span>
                    </p>
                    {renderInput(
                      'otp', 'Verification Code (OTP)', 'text', '123456', <KeyRound size={18} className="text-muted-foreground" />,
                      formData.otp, (e) => setFormData({...formData, otp: e.target.value.replace(/\D/g, '').substring(0, 6)})
                    )}
                    {view === 'FORGOT_PASSWORD_OTP' && renderInput(
                      'reset-password', 'New Password', showPassword ? 'text' : 'password', '••••••••', <Lock size={18} className="text-muted-foreground" />,
                      formData.password, (e) => setFormData({...formData, password: e.target.value}),
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground p-1">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>

            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              translate="no"
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-4 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <span translate="no">
                  {view === 'LOGIN' && 'Sign In to Wallet'}
                  {view === 'REGISTER' && (useOtpVerification ? 'Send Verification Code' : 'Create Account & Wallet')}
                  {view === 'REGISTER_OTP' && 'Verify Code & Create Wallet'}
                  {view === 'FORGOT_PASSWORD' && 'Send Reset Code'}
                  {view === 'FORGOT_PASSWORD_OTP' && 'Confirm New Password'}
                </span>
              )}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by Asymmetric Cryptography & P2P Mesh Routing
        </p>
      </motion.div>
    </div>
  );
}
