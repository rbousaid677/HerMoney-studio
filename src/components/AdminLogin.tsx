import React, { useState } from 'react';
import { Lock, MailCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

interface AdminLoginProps {
  onNavigate: (path: string) => void;
}

export function AdminLogin({ onNavigate }: AdminLoginProps) {
  const {
    user,
    isAdmin,
    adminCheckPending,
    signInEmailPassword,
    signInGoogle,
    signOut,
    sendVerification,
    sendPasswordReset,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setError('Enter both your administrator email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInEmailPassword(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not enabled in Firebase Authentication yet. Enable it in Firebase Console -> Authentication -> Sign-in method.'
        );
      } else if (
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/wrong-password') ||
        msg.includes('auth/user-not-found')
      ) {
        setError('Invalid email or password. Verify your administrator credentials in Firebase Authentication.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await signInGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    setInfoMessage(null);
    if (!email.trim()) {
      setError('Enter your administrator email address first to send a password reset email.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setInfoMessage('Password reset instructions have been sent if that account exists.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendVerification() {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await sendVerification();
      setInfoMessage('Verification link sent. Check your inbox, confirm your email, then reload this page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification email.');
    } finally {
      setSubmitting(false);
    }
  }

  // Signed in, but email not verified yet
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#FCF9F6] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-[#E8E0DF] rounded-xl p-8 text-center">
          <MailCheck className="w-10 h-10 text-[#C59B43] mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-semibold text-[#1F1B1C] mb-2">
            Email Verification Required
          </h1>
          <p className="text-sm text-[#5C5355] leading-relaxed mb-6">
            You are signed in as <strong className="text-[#1F1B1C]">{user.email}</strong>, but
            administrative write access requires a verified email address.
          </p>
          {infoMessage && (
            <p className="text-xs text-[#1F1B1C] bg-[#F4EAD5] px-4 py-2.5 rounded-lg mb-4">
              {infoMessage}
            </p>
          )}
          {error && (
            <p className="text-xs text-[#9E2A3B] bg-[#F7EAEB] px-4 py-2.5 rounded-lg mb-4">
              {error}
            </p>
          )}
          <div className="space-y-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSendVerification}
              className="w-full py-2.5 px-4 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] disabled:opacity-60 cursor-pointer"
            >
              Send Verification Email
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 min-h-[44px] rounded-lg border border-[#E8E0DF] text-sm font-medium text-[#1F1B1C] hover:bg-[#F6F0EA] cursor-pointer"
            >
              I Have Verified — Refresh
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full py-2 text-xs text-[#5C5355] hover:text-[#1F1B1C] cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in & verified, but not authorized as administrator
  if (user && !adminCheckPending && !isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#FCF9F6] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-[#E8E0DF] rounded-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-[#8E3F4F] mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-semibold text-[#1F1B1C] mb-2">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[#5C5355] leading-relaxed mb-4">
            The account <strong className="text-[#1F1B1C]">{user.email}</strong> is not configured
            as an authorized HerMoney Studio administrator.
          </p>
          <div className="p-3.5 bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg text-left text-xs text-[#5C5355] mb-6 space-y-1">
            <p>
              <strong className="text-[#1F1B1C]">Account UID:</strong>{' '}
              <span className="font-mono break-all">{user.uid}</span>
            </p>
            <p>
              To authorize this account, create a document at{' '}
              <span className="font-mono">admins/{user.uid}</span> in Firestore Console or configure
              the administrator email in <span className="font-mono">firestore.rules</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full py-2.5 px-4 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] cursor-pointer"
            >
              Sign Out
            </button>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="text-xs text-[#5C5355] hover:text-[#1F1B1C] py-2"
            >
              Return to Public Magazine
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FCF9F6] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#E8E0DF] rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <BrandLogo />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-2">
            <Lock className="w-3.5 h-3.5 text-[#C59B43]" />
            <span>Administrator Sign In</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[#1F1B1C]">
            Editorial Management Desk
          </h1>
          <p className="text-xs text-[#5C5355] mt-2 leading-relaxed">
            Restricted to authorized administrators. Public visitors do not require accounts to read
            HerMoney Studio.
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="admin-email" className="block text-xs font-medium text-[#1F1B1C] mb-1.5">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="admin-password" className="block text-xs font-medium text-[#1F1B1C]">
                Password
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-[#8E3F4F] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-[#9E2A3B] bg-[#F7EAEB] px-3.5 py-2.5 rounded-lg leading-relaxed">
              {error}
            </p>
          )}

          {infoMessage && (
            <p className="text-xs text-[#1F1B1C] bg-[#F4EAD5] px-3.5 py-2.5 rounded-lg leading-relaxed">
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting ? 'Signing In...' : 'Sign In with Email & Password'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-[#5C5355]">
          <span className="h-px flex-1 bg-[#E8E0DF]" />
          <span>or</span>
          <span className="h-px flex-1 bg-[#E8E0DF]" />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 min-h-[44px] rounded-lg border border-[#E8E0DF] bg-white text-sm font-medium text-[#1F1B1C] hover:bg-[#FCF9F6] transition-colors cursor-pointer"
        >
          Sign In with Google
        </button>

        <div className="mt-6 text-center">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="text-xs text-[#5C5355] hover:text-[#8E3F4F] transition-colors"
          >
            Return to Public Website
          </a>
        </div>
      </div>
    </div>
  );
}
