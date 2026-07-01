"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Image from "next/image";
import { z } from "zod";
import { startAuthentikSocialLogin, getSupabaseClient, sendEmailOtp, sendMagicLinkEmail, verifyEmailOtp, type AuthentikSocialProvider } from "@cig/auth";
import { useCIGAuth } from "./AuthProvider";
import { PreferencesMenu } from "./PreferencesMenu";
import { useTranslation } from "@cig-technology/i18n/react";
import {
  clearPendingDashboardRedirect,
  cleanLandingAuthSearchParams,
  consumePendingDashboardRedirect,
  goToDashboard,
  persistPendingDashboardRedirect,
  resolveDashboardRedirectFromSearch,
} from "../lib/dashboardHandoff";

/* ─── Icons ───────────────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.06 12C3.2 7.94 7.03 5 12 5s8.8 2.94 9.94 7c-1.14 4.06-4.97 7-9.94 7s-8.8-2.94-9.94-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c4.97 0 8.8 2.94 9.94 7a10.96 10.96 0 0 1-4.3 5.53" />
      <path d="M6.61 6.61A10.95 10.95 0 0 0 2.06 12c1.14 4.06 4.97 7 9.94 7 1.68 0 3.27-.33 4.72-.92" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

/* ─── Email + Password — sign up / sign in ──────────────────────────── */

const emailSchema = z.string().trim().email();

function notifyLandingSessionChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("cig-session-changed"));
}

function EmailPasswordView({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleSubmit = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(t("auth.passwordClientNotConfigured"));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError(t("auth.passwordEmailRequired"));
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) {
          setError(t("auth.passwordMinLength"));
          return;
        }
        if (password !== password2) {
          setError(t("auth.passwordMismatch"));
          return;
        }
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${dashboardUrl}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data && (data as any).session) {
          notifyLandingSessionChanged();
          onSuccess();
        } else {
          setSubmittedEmail(trimmedEmail);
          setPassword("");
          setPassword2("");
          setShowPassword(false);
          setShowPassword2(false);
          setMessage(null);
          setResendCooldown(45);
          setResendError(null);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        notifyLandingSessionChanged();
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.passwordAuthFailed"));
    } finally {
      setLoading(false);
    }
  }, [email, password, password2, mode, onSuccess, t]);

  useEffect(() => {
    if (!submittedEmail || mode !== "signup" || resendCooldown <= 0) return;

    const id = window.setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [submittedEmail, mode, resendCooldown]);

  const handleResendConfirmation = useCallback(async () => {
    if (!submittedEmail || resendCooldown > 0 || resending) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      setResendError(t("auth.passwordClientNotConfigured"));
      return;
    }

    setResending(true);
    setResendError(null);

    try {
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: submittedEmail,
        options: {
          emailRedirectTo: `${dashboardUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      setResendCooldown(45);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : t("auth.resendError"));
    } finally {
      setResending(false);
    }
  }, [resendCooldown, resending, submittedEmail, t]);

  const isSignupSuccess = Boolean(submittedEmail && mode === "signup");

  return (
    <div className="flex flex-col gap-4">

      {!isSignupSuccess && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 dark:text-zinc-100">
              {mode === "signin" ? t("auth.passwordSignInTitle") : t("auth.passwordSignUpTitle")}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {mode === "signin" ? t("auth.passwordSignInHint") : t("auth.passwordSignUpHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setSubmittedEmail(null);
              setMessage(null);
              setError(null);
              setResendError(null);
              setResendCooldown(45);
            }}
            className="self-start text-xs font-medium leading-tight text-cyan-600 dark:text-cyan-400 hover:underline sm:text-right"
          >
            <span className="flex flex-col items-start sm:items-end">
              <span>
                {mode === "signin"
                  ? t("auth.passwordNoAccountQuestion")
                  : t("auth.passwordSwitchQuestion")}
              </span>
              <span>
                {mode === "signin"
                  ? t("auth.passwordSwitchToSignup")
                  : t("auth.passwordSwitchActionSignin")}
              </span>
            </span>
          </button>
        </div>
      )}

      {isSignupSuccess ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-4 text-emerald-950 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-inherit">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
                <CheckIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {t("auth.passwordVerifyEmailTitle")}
                </p>
                <p className="mt-1 break-words text-sm text-emerald-800 dark:text-emerald-100/80">
                  {t("auth.passwordVerifyEmailBody", { email: submittedEmail ?? "" })}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {resendError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                      {resendError}
                    </p>
                  )}

                  {resendCooldown > 0 ? (
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      {t("auth.resendIn", { seconds: resendCooldown })}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleResendConfirmation()}
                      disabled={resending}
                      className="inline-flex items-center gap-2 self-start text-xs font-medium text-cyan-700 hover:text-cyan-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-cyan-300 dark:hover:text-cyan-200"
                    >
                      {resending ? t("auth.sending") : t("auth.didntReceive")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-email-input" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("auth.email")}</label>
            <input
              id="pw-email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-password-input" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("auth.passwordLabel")}</label>
            <div className="relative">
              <input
                id="pw-password-input"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signin" ? t("auth.passwordPlaceholderSignin") : t("auth.passwordPlaceholderSignup")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 pr-12 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition hover:text-cyan-500"
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pw-password2-input" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("auth.passwordConfirmLabel")}</label>
              <div className="relative">
                <input
                  id="pw-password2-input"
                  type={showPassword2 ? "text" : "password"}
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder={t("auth.passwordConfirmPlaceholder")}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 pr-12 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition hover:text-cyan-500"
                  aria-label={showPassword2 ? t("auth.hidePassword") : t("auth.showPassword")}
                  title={showPassword2 ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword2 ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">{error}</p>
          )}
          {message && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">{message}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {loading
              ? mode === "signin"
                ? t("auth.passwordSigningIn")
                : t("auth.passwordCreatingAccount")
              : mode === "signin"
                ? t("common.signIn")
                : t("auth.passwordCreateAccount")}
          </button>
        </>
      )}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ─── Shared button style ─────────────────────────────────────────────── */

const methodBtnClass =
  "w-full flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 transition-all hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-40 disabled:pointer-events-none";

/* ─── Modal views ─────────────────────────────────────────────────────── */
type ModalView = "methods" | "cli-code" | "ssh-info" | "email-menu" | "email-otp" | "email-otp-verify" | "email-magic" | "email-password";

/* ─── Authentik config (from env) ─────────────────────────────────────── */

function getAuthentikConfig() {
  const issuerUrl = process.env.NEXT_PUBLIC_AUTHENTIK_URL ?? "https://auth.cig.technology";
  const clientId = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_AUTHENTIK_CLIENT_ID is required for Authentik social login");
  }
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
  return {
    issuerUrl,
    clientId,
    redirectUri: `${dashboardUrl}/auth/callback`,
  };
}

/* ─── Sign-in modal content ──────────────────────────────────────────── */

function SignInModal({
  onClose,
  onSSOSignIn,
  onAuthSuccess,
}: {
  onClose: () => void;
  onSSOSignIn: (provider: AuthentikSocialProvider) => void;
  onAuthSuccess: () => void;
}) {
  const t = useTranslation();
  const [view, setView] = useState<ModalView>("methods");
  const [otpEmail, setOtpEmail] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: ReactMouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose]
  );

  // Back button destination — email-otp-verify goes back to email-otp, others go to methods
  const handleBack = useCallback(() => {
    if (view === "email-otp-verify") setView("email-otp");
    else setView("methods");
  }, [view]);

  const headerTitle = (() => {
    if (view === "methods") return t("auth.signInTitle");
    if (view === "cli-code") return t("auth.cliAuthTitle");
    if (view === "ssh-info") return t("auth.sshAuthTitle");
    if (view === "email-menu") return t("auth.emailTitle");
    if (view === "email-otp" || view === "email-otp-verify") return t("auth.emailOtpViewTitle");
    if (view === "email-magic") return t("auth.emailMagicTitle");
    if (view === "email-password") return t("auth.emailPassword");
    return t("auth.signInTitle");
  })();

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in-fast p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            {view !== "methods" && (
              <button
                onClick={handleBack}
                className="mr-1 rounded-lg p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeftIcon />
              </button>
            )}
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {headerTitle}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <PreferencesMenu />
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {view === "methods" && (
            <MethodsView onSSOSignIn={onSSOSignIn} goTo={setView} />
          )}
          {view === "cli-code" && <CliCodeView />}
          {view === "ssh-info" && <SshInfoView />}
          {view === "email-menu" && (
            <EmailMenuView
              onPickOtp={() => setView("email-otp")}
              onPickMagic={() => setView("email-magic")}
              onPickPassword={() => setView("email-password")}
            />
          )}
          {view === "email-otp" && (
            <EmailOtpView
              initialEmail={otpEmail}
              onCodeSent={(email) => {
                setOtpEmail(email);
                setView("email-otp-verify");
              }}
            />
          )}
          {view === "email-magic" && (
            <EmailMagicLinkView
              initialEmail={magicEmail}
              onSent={(email) => setMagicEmail(email)}
            />
          )}
          {view === "email-otp-verify" && (
            <EmailOtpVerifyView
              email={otpEmail}
              onSuccess={onAuthSuccess}
            />
          )}
          {view === "email-password" && (
            <EmailPasswordView onSuccess={onAuthSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Methods list ────────────────────────────────────────────────────── */

function MethodsView({
  onSSOSignIn,
  goTo,
}: {
  onSSOSignIn: (provider: AuthentikSocialProvider) => void;
  goTo: (v: ModalView) => void;
}) {
  const t = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
        {t("auth.signInDesc")}
      </p>

      {/* ── Preferred: Email (opens menu with OTP or Magic Link) ─── */}
      <div className="flex flex-col gap-2">
        <button onClick={() => goTo("email-menu")} className={methodBtnClass}>
          <MailIcon />
          {t("auth.email")}
          <span className="ml-auto text-xs text-zinc-500">{t("auth.passwordAndPasswordless")}</span>
        </button>
      </div>

      {/* ── SSO — goes directly to Google / GitHub ─── */}
      <div className="flex flex-col gap-2">
        <button onClick={() => onSSOSignIn("google")} className={methodBtnClass}>
          <GoogleIcon />
          {t("auth.continueWithGoogle")}
        </button>
        <button onClick={() => onSSOSignIn("github")} className={methodBtnClass}>
          <GitHubIcon />
          {t("auth.continueWithGitHub")}
        </button>
      </div>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
        <span className="text-xs text-zinc-500 font-medium">{t("auth.or")}</span>
        <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
      </div>

      {/* ── Other methods ─── */}
      <div className="flex flex-col gap-2">
        <button onClick={() => goTo("cli-code")} className={methodBtnClass}>
          <TerminalIcon />
          {t("auth.cliCode")}
          <span className="ml-auto text-xs text-zinc-500">{t("auth.terminal")}</span>
        </button>
        <button onClick={() => goTo("ssh-info")} className={methodBtnClass}>
          <KeyIcon />
          {t("auth.sshKey")}
          <span className="ml-auto text-xs text-zinc-500">{t("auth.local")}</span>
        </button>
      </div>
    </div>
  );
}

/* ─── OTP 6-digit code input ─────────────────────────────────────────── */

function OtpCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const length = 6;
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (idx: number, raw: string) => {
      const digit = raw.replace(/\D/g, "");
      if (!digit) return;
      const chars = value.padEnd(length, " ").split("");
      chars[idx] = digit[0];
      onChange(chars.join("").trimEnd().slice(0, length));
      if (idx < length - 1) inputsRef.current[idx + 1]?.focus();
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const chars = value.padEnd(length, " ").split("");
        if ((chars[idx] ?? "").trim()) {
          chars[idx] = "";
          onChange(chars.join("").trimEnd());
        } else if (idx > 0) {
          const prev = inputsRef.current[idx - 1];
          prev?.focus();
          chars[idx - 1] = "";
          onChange(chars.join("").trimEnd());
        }
      } else if (e.key === "ArrowLeft" && idx > 0) {
        inputsRef.current[idx - 1]?.focus();
      } else if (e.key === "ArrowRight" && idx < length - 1) {
        inputsRef.current[idx + 1]?.focus();
      }
    },
    [value, onChange]
  );

  const handlePaste = useCallback(
    (e: ReactClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, length - 1);
      inputsRef.current[focusIdx]?.focus();
    },
    [onChange]
  );

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={(value[i] ?? "").trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="size-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-center text-xl font-mono font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-400 transition caret-transparent"
        />
      ))}
    </div>
  );
}

/* ─── Email Menu — pick OTP vs Magic ────────────────────────────────── */

function EmailMenuView({
  onPickOtp,
  onPickMagic,
  onPickPassword,
}: {
  onPickOtp: () => void;
  onPickMagic: () => void;
  onPickPassword: () => void;
}) {
  const t = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
        {t("auth.emailMenuDesc")}
      </p>
      <button onClick={onPickOtp} className={methodBtnClass + " items-start"}>
        <MailIcon />
        <div className="flex flex-col items-start">
          <span>{t("auth.emailOtp")}</span>
          <span className="text-xs text-zinc-500">{t("auth.emailOtpHint")}</span>
        </div>
      </button>
      <button onClick={onPickMagic} className={methodBtnClass + " items-start"}>
        <MailIcon />
        <div className="flex flex-col items-start">
          <span>{t("auth.emailMagic")}</span>
          <span className="text-xs text-zinc-500">{t("auth.emailMagicHint")}</span>
        </div>
      </button>
      <button onClick={onPickPassword} className={methodBtnClass + " items-start"}>
        <MailIcon />
        <div className="flex flex-col items-start">
          <span>{t("auth.emailPassword")}</span>
          <span className="text-xs text-zinc-500">{t("auth.emailPasswordHint")}</span>
        </div>
      </button>
    </div>
  );
}

/* ─── Email OTP — step 1: enter email ───────────────────────────────── */

function EmailOtpView({
  initialEmail,
  onCodeSent,
}: {
  initialEmail: string;
  onCodeSent: (email: string) => void;
}) {
  const t = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailParsable = emailSchema.safeParse(email.trim());
  const isEmailValid = email.trim().length > 0 && emailParsable.success;

  const handleSend = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!emailSchema.safeParse(trimmed).success) {
      setError(t("auth.invalidEmail") || "Invalid email address");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendEmailOtp(trimmed);
      onCodeSent(trimmed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.otpSendError"));
    } finally {
      setSending(false);
    }
  }, [email, onCodeSent, t]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("auth.emailOtpDesc")}
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="otp-email-input"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          Email
        </label>
        <input
          id="otp-email-input"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
          placeholder={t("auth.emailPlaceholder")}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-400 transition"
        />

        {email.trim().length > 0 && !isEmailValid && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {t("auth.invalidEmail") || "Please enter a valid email address."}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !isEmailValid}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        {sending ? t("auth.sending") : t("auth.sendOtp")}
      </button>
    </div>
  );
}

/* ─── Email OTP — step 2: enter 6-digit code ────────────────────────── */

function EmailOtpVerifyView({
  email,
  onSuccess,
}: {
  email: string;
  onSuccess: () => void;
}) {
  const t = useTranslation();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(45);
  const [resentOk, setResentOk] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const [verified, setVerified] = useState(false);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyEmailOtp(email, code);
      setVerified(true);
      onSuccess();

      // We intentionally avoid forcing an immediate dashboard redirect
      // so users can stay on the landing path and confirm auth state.
      // Dashboard navigation is handled by the explicit CTA in the
      // authenticated landing UI.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.otpVerifyError"));
      setCode("");
    } finally {
      setVerifying(false);
    }
  }, [code, email, onSuccess, t]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (code.length === 6) handleVerify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || verifying) return;
    setResentOk(false);
    setResendError(null);
    try {
      await sendEmailOtp(email);
      setCooldown(45);
      setResentOk(true);
      setCode("");
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : t("auth.resendError"));
    }
  }, [cooldown, verifying, email, t]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
        {t("auth.otpSentTo", { email })}
      </p>

      <OtpCodeInput value={code} onChange={setCode} />

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
        {t("auth.emailMagicSignInHint")}
      </p>

      {verified && !verifying && (
        <p className="text-xs text-emerald-500 dark:text-emerald-400 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-center">
          {t("auth.otpVerified") || "OTP verified. You are signed in."}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-center">
          {error}
        </p>
      )}

      {resentOk && (
        <p className="text-xs text-emerald-500 dark:text-emerald-400 text-center">
          {t("auth.codeResent")}
        </p>
      )}
      {resendError && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center">
          {resendError}
        </p>
      )}

      <button
        onClick={handleVerify}
        disabled={verifying || code.length !== 6}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        {verifying ? t("auth.verifying") : t("auth.verifySignIn")}
      </button>

      {cooldown > 0 ? (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center select-none">
          {t("auth.resendIn", { seconds: cooldown })}
        </div>
      ) : (
        <button
          onClick={handleResend}
          className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-center"
        >
          {t("auth.didntReceive")}
        </button>
      )}
    </div>
  );
}

/* ─── Email Magic Link — enter email, send link, cooldown/resend ─────── */

function EmailMagicLinkView({
  initialEmail,
  onSent,
}: {
  initialEmail: string;
  onSent: (email: string) => void;
}) {
  const t = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(45);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sent || cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [sent, cooldown]);

  const emailParsable = emailSchema.safeParse(email.trim());
  const isEmailValid = email.trim().length > 0 && emailParsable.success;

  const handleSend = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!isEmailValid) {
      setError(t("auth.invalidEmail") || "Invalid email address");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendMagicLinkEmail(trimmed);
      setSent(true);
      setCooldown(45);
      setOkMsg(t("auth.linkSentTo", { email: trimmed }));
      onSent(trimmed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.resendError"));
    } finally {
      setSending(false);
    }
  }, [email, isEmailValid, t, onSent]);

  const handleResend = useCallback(async () => {
    if (!sent || cooldown > 0) return;
    await handleSend();
  }, [sent, cooldown, handleSend]);

  return (
    <div className="flex flex-col gap-4">
      {!sent && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("auth.emailMagicDesc")}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="magic-email-input" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("auth.email")}</label>
            <input
              id="magic-email-input"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
              placeholder={t("auth.emailPlaceholder")}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 dark:focus:border-cyan-400 transition"
            />
            {email.trim().length > 0 && !isEmailValid && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {t("auth.invalidEmail") || "Please enter a valid email address."}
              </p>
            )}
          </div>
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">{error}</p>
          )}
          <button
            onClick={handleSend}
            disabled={sending || !isEmailValid}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {sending ? t("auth.linkSending") : t("auth.sendLink")}
          </button>
        </>
      )}

      {sent && (
        <div className="flex flex-col items-center gap-3 text-center">
          {okMsg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{okMsg}</p>}
          {cooldown > 0 ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t("auth.resendIn", { seconds: cooldown })}</div>
          ) : (
            <button onClick={handleResend} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
              {t("auth.didntReceive")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CLI Device Code flow ────────────────────────────────────────────── */

function CliCodeView() {
  const t = useTranslation();
  const [copied, setCopied] = useState(false);
  const loginCommand = "npx @cig-technology/cli login";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(loginCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [loginCommand]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("auth.cliDesc")}
      </p>
      <div className="relative group">
        <pre className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm font-mono text-cyan-600 dark:text-cyan-400 overflow-x-auto">
          <span className="text-zinc-400 dark:text-zinc-500 select-none">$ </span>
          {loginCommand}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {copied ? <CheckIcon /> : t("common.copy")}
        </button>
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
        <p className="font-medium text-zinc-800 dark:text-zinc-300">{t("auth.cliHowItWorks")}</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>{t("auth.cliStep1")}</li>
          <li>{t("auth.cliStep2")}</li>
          <li>{t("auth.cliStep3")}</li>
          <li>{t("auth.cliStep4")}</li>
        </ol>
      </div>
    </div>
  );
}

/* ─── SSH Key info ────────────────────────────────────────────────────── */

function SshInfoView() {
  const t = useTranslation();
  const [copied, setCopied] = useState(false);
  const sshCommand = "cig auth add-key ~/.ssh/id_ed25519.pub";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sshCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sshCommand]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("auth.sshDesc")}
      </p>
      <div className="relative group">
        <pre className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm font-mono text-cyan-600 dark:text-cyan-400 overflow-x-auto">
          <span className="text-zinc-400 dark:text-zinc-500 select-none">$ </span>
          {sshCommand}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {copied ? <CheckIcon /> : t("common.copy")}
        </button>
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
        <p className="font-medium text-zinc-800 dark:text-zinc-300">{t("auth.sshKeyTypes")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("auth.sshEd25519")}</li>
          <li>{t("auth.sshRsa")}</li>
          <li>{t("auth.sshEcdsa")}</li>
        </ul>
        <p className="pt-1 text-zinc-500">
          {t("auth.sshAfter")}
        </p>
      </div>
    </div>
  );
}

/* ─── Main AuthButton ─────────────────────────────────────────────────── */

export function AuthButton() {
  const t = useTranslation();
  const { user, signOut, authProvider } = useCIGAuth();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const search = window.location.search;
    if (!search) {
      return;
    }

    const params = new URLSearchParams(search);
    const dashboardRedirect = resolveDashboardRedirectFromSearch(search);
    const shouldOpenSignIn = params.get("auth") === "signin";
    const hasDashboardRedirect = params.has("dashboard_redirect");

    if (!shouldOpenSignIn && !hasDashboardRedirect) {
      return;
    }

    if (dashboardRedirect) {
      persistPendingDashboardRedirect(dashboardRedirect);
    }

    if (!user && shouldOpenSignIn) {
      setShowModal(true);
    }

    cleanLandingAuthSearchParams();
  }, [user]);

  const handlePostAuthSuccess = useCallback(() => {
    setShowModal(false);
    const dashboardRedirect = consumePendingDashboardRedirect() ?? "/";

    window.requestAnimationFrame(() => {
      void goToDashboard(dashboardRedirect).catch(() => {
        persistPendingDashboardRedirect(dashboardRedirect);
      });
    });
  }, []);

  const handleModalClose = useCallback(() => {
    clearPendingDashboardRedirect();
    setShowModal(false);
  }, []);

  const handleSSOSignIn = useCallback(async (provider: AuthentikSocialProvider) => {
    setShowModal(false);
    if (authProvider === "supabase") {
      // Supabase fallback: use Supabase OAuth
      const supabase = getSupabaseClient();
      if (supabase) {
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
        await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${dashboardUrl}/auth/callback` },
        });
      }
    } else {
      // Authentik: PKCE social login
      const config = getAuthentikConfig();
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
      await startAuthentikSocialLogin(config, provider, dashboardUrl);
    }
  }, [authProvider]);

  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
        >
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full border border-zinc-200 dark:border-zinc-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
              {(user.email?.[0] || "U").toUpperCase()}
            </div>
          )}
          <span className="text-sm text-zinc-700 dark:text-zinc-300 hidden sm:inline max-w-[140px] truncate">
            {user.email}
          </span>
          <svg className="size-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-fade-in-fast">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{user.email}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {t("auth.via", { provider: `CIG Auth: ${user.socialProvider.charAt(0).toUpperCase()}${user.socialProvider.slice(1)}` })}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setShowMenu(false); signOut(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                {t("common.signOut")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        {t("common.signIn")}
      </button>

      {showModal && (
        <SignInModal
          onClose={handleModalClose}
          onSSOSignIn={handleSSOSignIn}
          onAuthSuccess={handlePostAuthSuccess}
        />
      )}
    </>
  );
}
