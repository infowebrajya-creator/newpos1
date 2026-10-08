'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getCurrentUserProfile } from '@/services/auth/authService';
import { isDevBypassAllowed, enableTestBypassCookie } from '@/services/auth/testAuthHelper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, AlertCircle, UtensilsCrossed, FlaskConical } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const showDevBypass = isDevBypassAllowed();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Authenticate with Supabase Auth via authService
      await signIn(email.trim(), password);

      // 2. Retrieve authenticated user's profile from public.users
      const profile = await getCurrentUserProfile();

      // 3. Verify user profile exists
      if (!profile) {
        setError('User profile not found in system. Please contact the administrator.');
        setIsLoading(false);
        return;
      }

      // 4. Verify account is active
      if (!profile.is_active) {
        setError('Your account has been deactivated. Please contact management.');
        setIsLoading(false);
        return;
      }

      // 5. Successful login -> redirect to POS shell
      router.push('/pos');
      router.refresh();
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';

      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError('Unable to sign in. Please verify your connection or credentials.');
      }
    }
  };

  const handleDevBypassClick = () => {
    enableTestBypassCookie();
    router.push('/pos');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src="/logo.png"
              alt="WebRajya Logo"
              className="w-20 h-20 object-contain rounded-full bg-white p-1 border-2 border-indigo-500/50 shadow-xl shadow-indigo-600/30"
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                WebRajya POS
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
                Restaurant Management System
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start space-x-3 text-rose-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. owner@webrajya.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In to Counter
            </Button>
          </form>

          {/* Dev Test Bypass Button (Non-Production Only) */}
          {showDevBypass && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Development Testing
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[9px] font-bold text-amber-300">
                  DEV ONLY
                </span>
              </div>

              <button
                type="button"
                onClick={handleDevBypassClick}
                className="w-full py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold text-xs rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 group"
              >
                <span>Temporary Test Bypass</span>
                <span className="text-[10px] font-medium text-amber-400/80 group-hover:text-amber-300">
                  (Development Only)
                </span>
              </button>
            </div>
          )}

          {/* Footer Info */}
          <div className="pt-2 border-t border-slate-800/80 text-center text-xs text-slate-500">
            <p>Authorized personnel only. Contact owner for access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
