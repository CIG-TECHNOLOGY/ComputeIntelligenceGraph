"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useCIGAuth } from "./AuthProvider";
import { useTranslation } from "@cig-technology/i18n/react";
import { SpaceBackground } from "./SpaceBackground";
import { ElectricWavesBackground } from "./ElectricWavesBackground";
import { FallingPattern } from "./FallingPattern";
import { AuthButton } from "./AuthButton";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useTheme } from "../app/providers";
import { FooterBar } from "@cig/ui/components";
import { useResolvedDashboardUrl, useResolvedDocsUrl } from "@cig/ui/siteUrl.client";
import { goToDashboard } from "../lib/dashboardHandoff";
import { BackToTop } from "./BackToTop";
import { useRuntimeVersion } from "./useRuntimeVersion";

/* ─── Icons ───────────────────────────────────────────────────────────── */

const GraphIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const ResourcesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const CostIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const SecurityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const ConsoleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const DiscoveryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

/* ─── Preview elements ────────────────────────────────────────────────── */

function BarViz({ color }: { color: string }) {
  const heights = [45, 72, 55, 90, 60, 82, 40, 75];
  return (
    <div className="flex gap-1 items-end h-9">
      {heights.map((h, i) => (
        <div key={i} style={{ height: `${h}%`, backgroundColor: color, animationDelay: `${i * 0.18}s` }}
          className="flex-1 rounded-sm animate-pulse opacity-70" />
      ))}
    </div>
  );
}

function NodeGraph({ color }: { color: string }) {
  return (
    <svg width="100%" height="38" viewBox="0 0 120 38">
      <line x1="20" y1="19" x2="60" y2="9"  stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="20" y1="19" x2="60" y2="29" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="60" y1="9"  x2="100" y2="19" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="60" y1="29" x2="100" y2="19" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="20" cy="19" r="5" fill={color} fillOpacity="0.9" />
      <circle cx="60" cy="9"  r="4" fill={color} fillOpacity="0.6" />
      <circle cx="60" cy="29" r="4" fill={color} fillOpacity="0.6" />
      <circle cx="100" cy="19" r="5" fill={color} fillOpacity="0.9" />
    </svg>
  );
}

function ShieldViz({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="32" viewBox="0 0 24 24" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div className="flex flex-col gap-1 flex-1">
        {([ ["Critical", 0.9], ["High", 0.55], ["Medium", 0.3] ] as [string, number][]).map(([label, w]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-1 rounded-full" style={{ width: `${w * 100}%`, backgroundColor: color, opacity: 0.85 }} />
            <span className="text-[9px] opacity-40" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostViz({ color }: { color: string }) {
  return (
    <div className="font-mono" style={{ color }}>
      <span className="text-base font-bold opacity-60">$</span>
      <span className="text-2xl font-bold">2,847</span>
      <span className="text-xs opacity-50 ml-1">/mo</span>
    </div>
  );
}

function ConsoleLine({ color }: { color: string }) {
  return (
    <div className="font-mono text-xs space-y-1" style={{ color }}>
      <div className="opacity-50">{">"} Which resources cost the most?</div>
      <div className="flex items-center gap-1 opacity-90">
        <span className="opacity-40">◆</span>
        <span>Analyzing 142 resources</span>
        <span className="inline-block w-1.5 h-3 bg-current ml-0.5 animate-pulse" />
      </div>
    </div>
  );
}

function RadarViz({ color }: { color: string }) {
  return (
    <svg width="100%" height="38" viewBox="0 0 100 38">
      <ellipse cx="50" cy="19" rx="45" ry="14" stroke={color} strokeWidth="0.5" strokeOpacity="0.25" fill="none" />
      <ellipse cx="50" cy="19" rx="30" ry="9"  stroke={color} strokeWidth="0.5" strokeOpacity="0.25" fill="none" />
      <ellipse cx="50" cy="19" rx="15" ry="4"  stroke={color} strokeWidth="0.5" strokeOpacity="0.25" fill="none" />
      <circle cx="62" cy="15" r="2.5" fill={color} fillOpacity="0.9">
        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="35" cy="24" r="1.8" fill={color} fillOpacity="0.7">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="72" cy="22" r="1.5" fill={color} fillOpacity="0.6">
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ─── Feature definitions ─────────────────────────────────────────────── */

interface Feature {
  id: string;
  titleKey: string;
  descKey: string;
  tagKey: string;
  path: string;
  icon: ReactNode;
  color: string;
  preview: ReactNode;
}

const FEATURES: Feature[] = [
  { id: "graph",     titleKey: "authed.graph.title",     descKey: "authed.graph.desc",     tagKey: "authed.graph.tag",     path: "/graph",     icon: <GraphIcon />,     color: "#06b6d4", preview: <NodeGraph color="#06b6d4" /> },
  { id: "resources", titleKey: "authed.resources.title", descKey: "authed.resources.desc", tagKey: "authed.resources.tag", path: "/resources", icon: <ResourcesIcon />, color: "#3b82f6", preview: <BarViz color="#3b82f6" /> },
  { id: "costs",     titleKey: "authed.costs.title",     descKey: "authed.costs.desc",     tagKey: "authed.costs.tag",     path: "/costs",     icon: <CostIcon />,      color: "#a855f7", preview: <CostViz color="#a855f7" /> },
  { id: "security",  titleKey: "authed.security.title",  descKey: "authed.security.desc",  tagKey: "authed.security.tag",  path: "/security",  icon: <SecurityIcon />,  color: "#10b981", preview: <ShieldViz color="#10b981" /> },
  { id: "console",   titleKey: "authed.console.title",   descKey: "authed.console.desc",   tagKey: "authed.console.tag",   path: "/",          icon: <ConsoleIcon />,   color: "#f59e0b", preview: <ConsoleLine color="#f59e0b" /> },
  { id: "discovery", titleKey: "authed.discovery.title", descKey: "authed.discovery.desc", tagKey: "authed.discovery.tag", path: "/resources", icon: <DiscoveryIcon />, color: "#ef4444", preview: <RadarViz color="#ef4444" /> },
];

function withAlpha(color: string, alpha: number) {
  const normalized = color.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => value + value)
          .join("")
      : normalized;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─── Feature detail modal ───────────────────────────────────────────── */

const FEATURE_HIGHLIGHTS_COUNT = 5;
const FEATURE_USE_CASES_COUNT = 3;

interface FeatureModalProps {
  feature: Feature | null;
  onClose: () => void;
  onOpen: (path: string) => void;
}

function FeatureModal({ feature, onClose, onOpen }: FeatureModalProps) {
  const t = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Close on Escape
  useEffect(() => {
    if (!feature) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feature, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (feature) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [feature]);

  const visible = !!feature;
  const c = feature?.color ?? "#06b6d4";

  const highlights = Array.from({ length: FEATURE_HIGHLIGHTS_COUNT }, (_, i) =>
    t(`authed.${feature?.id}.detail.highlights.${i}`)
  ).filter((v) => v && !v.startsWith("authed."));

  const useCases = Array.from({ length: FEATURE_USE_CASES_COUNT }, (_, i) =>
    t(`authed.${feature?.id}.detail.useCases.${i}`)
  ).filter((v) => v && !v.startsWith("authed."));

  const headline = feature ? t(`authed.${feature.id}.detail.headline`) : "";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50"
        style={{
          backdropFilter: visible ? "blur(12px)" : "none",
          backgroundColor: visible
            ? isDark ? "rgba(0,0,0,0.72)" : "rgba(15,23,42,0.48)"
            : "transparent",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 0.3s ease, backdrop-filter 0.3s ease",
        }}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl overflow-hidden"
          style={{
            pointerEvents: visible ? "auto" : "none",
            background: isDark
              ? `radial-gradient(circle at top right, ${withAlpha(c, 0.22)} 0%, transparent 50%), linear-gradient(180deg, rgba(14,20,35,0.98) 0%, rgba(3,7,18,0.99) 100%)`
              : `radial-gradient(circle at top right, ${withAlpha(c, 0.16)} 0%, transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(241,245,249,0.99) 100%)`,
            border: `1px solid ${withAlpha(c, isDark ? 0.3 : 0.2)}`,
            boxShadow: isDark
              ? `0 0 0 1px ${withAlpha(c, 0.14)}, 0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${withAlpha(c, 0.16)}`
              : `0 0 0 1px ${withAlpha(c, 0.1)}, 0 32px 80px rgba(15,23,42,0.24), 0 0 40px ${withAlpha(c, 0.08)}`,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(24px)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* Scan line */}
          <div
            className="absolute left-0 right-0 h-px pointer-events-none z-10"
            style={{
              background: `linear-gradient(90deg, transparent, ${c}80, transparent)`,
              animation: visible ? "cig-scan 2s ease-in-out infinite" : "none",
              top: 0,
            }}
          />

          {/* Corner glow */}
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${c}35 0%, transparent 70%)` }} />

          {/* Header */}
          <div className="relative flex items-start justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center size-10 rounded-xl flex-shrink-0"
                style={{
                  backgroundColor: withAlpha(c, isDark ? 0.14 : 0.1),
                  color: c,
                  border: `1px solid ${withAlpha(c, 0.22)}`,
                  boxShadow: `0 0 20px ${withAlpha(c, 0.16)}`,
                }}
              >
                <div style={{ transform: "scale(1.4)", transformOrigin: "center" }}>
                  {feature?.icon}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: c }}>
                  {feature ? t(feature.tagKey) : ""}
                </p>
                <h2 className={`text-lg font-bold leading-tight ${isDark ? "text-zinc-50" : "text-slate-900"}`}>
                  {feature ? t(feature.titleKey) : ""}
                </h2>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-xl transition-colors flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
              aria-label={t("authed.modal.close")}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Headline */}
          <div className="px-6 pb-4">
            <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-300" : "text-slate-600"}`}>
              {headline}
            </p>
          </div>

          {/* Preview viz */}
          <div className="px-6 pb-4">
            <div
              className="rounded-2xl p-4 flex items-center justify-center"
              style={{
                background: isDark ? withAlpha(c, 0.08) : withAlpha(c, 0.06),
                border: `1px solid ${withAlpha(c, isDark ? 0.16 : 0.12)}`,
                minHeight: 80,
              }}
            >
              <div style={{ transform: "scale(1.5)", transformOrigin: "center" }}>
                {feature?.preview}
              </div>
            </div>
          </div>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="px-6 pb-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: c }}>
                {t("authed.modal.highlights")}
              </p>
              <ul className="flex flex-col gap-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 size-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c }}
                    />
                    <span className={`text-xs leading-relaxed ${isDark ? "text-zinc-300" : "text-slate-600"}`}>
                      {h}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Use cases */}
          {useCases.length > 0 && (
            <div className="px-6 pb-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: c }}>
                {t("authed.modal.useCases")}
              </p>
              <div className="flex flex-col gap-2">
                {useCases.map((uc, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
                    style={{
                      background: isDark ? withAlpha(c, 0.08) : withAlpha(c, 0.06),
                      border: `1px solid ${withAlpha(c, isDark ? 0.14 : 0.1)}`,
                      color: isDark ? "#cbd5e1" : "#475569",
                      fontStyle: uc.startsWith('"') ? "italic" : "normal",
                    }}
                  >
                    {uc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div className="px-6 pb-6 pt-2">
            <button
              onClick={() => { onClose(); onOpen(feature?.path ?? "/"); }}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${c}, ${withAlpha(c, 0.7)})`,
                color: isDark ? "#030712" : "#030712",
                boxShadow: `0 8px 28px ${withAlpha(c, 0.35)}`,
              }}
            >
              {t("authed.modal.open", { title: feature ? t(feature.titleKey) : "" })}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Holographic card ────────────────────────────────────────────────── */

interface HoloCardProps {
  feature: Feature;
  onOpen: () => void;
  onRevealChange: (revealed: boolean) => void;
}

/** Typewriter hook — types `text` character by character when `active` is true. */
function useTypewriter(text: string, active: boolean, delay = 260, speed = 14) {
  const [typed, setTyped] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!active) { setTyped(""); return; }

    let i = 0;
    const tick = () => {
      i++;
      setTyped(text.slice(0, i));
      if (i < text.length) timer.current = setTimeout(tick, speed);
    };
    timer.current = setTimeout(tick, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [active, text, delay, speed]);

  return { typed, done: typed.length === text.length };
}

function HoloCard({ feature, onOpen, onRevealChange }: HoloCardProps) {
  const t = useTranslation();
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const revealed = hovered;

  // Notify the parent row whenever revealed state changes so it can pause
  // the scroll animation while the card is being hovered.
  const prevRevealed = useRef(false);
  useEffect(() => {
    if (revealed !== prevRevealed.current) {
      prevRevealed.current = revealed;
      onRevealChange(revealed);
    }
  }, [revealed, onRevealChange]);

  const title = t(feature.titleKey);
  const tag = t(feature.tagKey);
  const { typed, done } = useTypewriter(t(feature.descKey), revealed);
  const isDark = theme === "dark";

  const c = feature.color;
  const cardBackground = isDark
    ? `radial-gradient(circle at top right, ${withAlpha(c, revealed ? 0.24 : 0.14)} 0%, transparent 40%), linear-gradient(180deg, ${withAlpha(c, revealed ? 0.14 : 0.07)} 0%, rgba(14, 20, 35, 0.96) 42%, rgba(3, 7, 18, 0.98) 100%)`
    : `radial-gradient(circle at top right, ${withAlpha(c, revealed ? 0.2 : 0.12)} 0%, transparent 42%), linear-gradient(180deg, ${withAlpha(c, revealed ? 0.12 : 0.05)} 0%, rgba(255, 255, 255, 0.98) 38%, rgba(241, 245, 249, 0.96) 100%)`;
  const cardBorder = isDark
    ? withAlpha(c, revealed ? 0.34 : 0.16)
    : withAlpha(c, revealed ? 0.28 : 0.14);
  const cardShadow = isDark
    ? revealed
      ? `0 0 0 1px ${withAlpha(c, 0.2)}, 0 22px 52px rgba(2, 6, 23, 0.72), 0 0 38px ${withAlpha(c, 0.18)}`
      : `0 14px 34px rgba(2, 6, 23, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.03)`
    : revealed
      ? `0 0 0 1px ${withAlpha(c, 0.14)}, 0 24px 48px rgba(15, 23, 42, 0.16), 0 0 28px ${withAlpha(c, 0.1)}`
      : `0 14px 34px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72)`;
  const tagBackground = isDark ? withAlpha(c, 0.18) : withAlpha(c, 0.14);
  const tagBorder = isDark ? withAlpha(c, 0.18) : withAlpha(c, 0.16);
  const iconBackground = isDark ? withAlpha(c, 0.12) : withAlpha(c, 0.08);
  const iconShadow = isDark
    ? `0 0 0 1px ${withAlpha(c, 0.24)}, 0 0 32px ${withAlpha(c, 0.2)}, inset 0 0 20px ${withAlpha(c, 0.08)}`
    : `0 0 0 1px ${withAlpha(c, 0.18)}, 0 10px 28px ${withAlpha(c, 0.12)}, inset 0 1px 10px rgba(255, 255, 255, 0.78)`;
  const titleClassName = isDark ? "text-zinc-50" : "text-slate-900";
  const descriptionClassName = isDark ? "text-zinc-300" : "text-slate-700";

  return (
    <article
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cig-holocard relative flex-shrink-0 w-[min(18rem,78vw)] sm:w-64 rounded-2xl cursor-pointer select-none overflow-hidden"
      style={{
        height: revealed ? "auto" : 220,
        minHeight: 220,
        border: `1px solid ${cardBorder}`,
        background: cardBackground,
        boxShadow: cardShadow,
        transition: "box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease",
        backdropFilter: "blur(18px) saturate(145%)",
      }}
    >
      {/* Animated scan line — always present, speeds up on hover */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${c}90, transparent)`,
          animation: `cig-scan ${revealed ? "1.2s" : "3s"} ease-in-out infinite`,
          top: 0,
        }}
      />

      {/* Corner accent glow */}
      <div
        className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${c}${revealed ? "40" : "18"} 0%, transparent 70%)`,
          transition: "background 0.4s ease",
        }}
      />

      {/* ── FRONT FACE – icon + title only ─────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
        style={{
          opacity: revealed ? 0 : 1,
          transform: revealed ? "scale(0.8) translateY(-12px)" : "scale(1) translateY(0)",
          transition: "opacity 0.3s ease, transform 0.35s ease",
          pointerEvents: "none",
          visibility: revealed ? "hidden" : "visible",
          height: 220,
        }}
      >
        {/* Large glowing icon */}
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: 72, height: 72,
            backgroundColor: iconBackground,
            color: c,
            boxShadow: iconShadow,
            animation: "cig-glow-pulse 2.5s ease-in-out infinite",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Scale the icon SVG up */}
          <div style={{ transform: "scale(2)", transformOrigin: "center" }}>
            {feature.icon}
          </div>
        </div>

        <div className="text-center">
          <h3 className={`text-sm font-bold ${titleClassName}`}>{title}</h3>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block tracking-wide border"
            style={{ backgroundColor: tagBackground, borderColor: tagBorder, color: c }}
          >
            {tag}
          </span>
        </div>

        {/* Subtle dot grid decoration */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${c} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            opacity: isDark ? 0.05 : 0.08,
          }}
        />
      </div>

      {/* ── REVEALED FACE – full info ──────────────────────── */}
      {/* Use relative positioning when revealed so the card height grows to fit content */}
      <div
        className={`${revealed ? "relative" : "absolute inset-0"} flex flex-col p-5 gap-2`}
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.35s ease 0.05s, transform 0.35s ease 0.05s",
          pointerEvents: revealed ? "auto" : "none",
          overflow: "visible",
        }}
      >
        {/* Header row: icon + tag — slides in from top */}
        <div
          className="flex items-center justify-between"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.3s ease 0.08s, transform 0.3s ease 0.08s",
          }}
        >
          <div className="flex items-center justify-center size-8 rounded-xl"
            style={{ backgroundColor: tagBackground, color: c, border: `1px solid ${tagBorder}` }}>
            {feature.icon}
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
            style={{ backgroundColor: tagBackground, color: c, border: `1px solid ${tagBorder}` }}>
            {tag}
          </span>
        </div>

        {/* Title — fades up */}
        <h3
          className={`text-sm font-bold leading-snug ${titleClassName}`}
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.3s ease 0.15s, transform 0.3s ease 0.15s",
          }}
        >
          {title}
        </h3>

        {/* Description — typed out */}
        <p className={`text-[11px] leading-relaxed ${descriptionClassName}`} style={{ minHeight: 40 }}>
          {typed}
          {revealed && !done && (
            <span
              className="inline-block w-px ml-px animate-pulse"
              style={{ height: 11, backgroundColor: c, verticalAlign: "middle" }}
            />
          )}
        </p>

        {/* Preview viz + tap hint */}
        <div className="flex flex-col gap-2 mt-1">
          <div
            className="pt-2 border-t"
            style={{
              borderColor: withAlpha(c, isDark ? 0.2 : 0.16),
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.4s ease 0.22s, transform 0.4s ease 0.22s",
            }}
          >
            {feature.preview}
          </div>

          {/* Tap-to-open hint */}
          <div
            className="flex items-center justify-center gap-1 pt-1"
            style={{
              opacity: revealed ? 0.55 : 0,
              transition: "opacity 0.35s ease 0.32s",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z" />
            </svg>
            <span className="text-[10px] font-medium tracking-wide" style={{ color: c }}>
              {t("authed.knowMore")}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom glow bloom — only in collapsed state (absolute positioning works with fixed height) */}
      {!revealed && (
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${withAlpha(c, isDark ? 0.08 : 0.05)}, transparent)`,
          }}
        />
      )}
    </article>
  );
}

/* ─── Draggable infinite scrolling row ───────────────────────────────── */

function ScrollingRow({
  features,
  direction,
  duration,
  onKnowMore,
}: {
  features: Feature[];
  direction: "left" | "right";
  duration: string;
  onKnowMore: (f: Feature) => void;
}) {
  const trackRef  = useRef<HTMLDivElement>(null);
  // null = CSS animation running; number = manual override while dragging
  const [manualOffset, setManualOffset] = useState<number | null>(null);
  // Count of cards currently hovered. When > 0 the animation pauses.
  const revealedCount = useRef(0);
  const [anyRevealed, setAnyRevealed]   = useState(false);
  const handleRevealChange = useCallback((revealed: boolean) => {
    revealedCount.current = Math.max(0, revealedCount.current + (revealed ? 1 : -1));
    setAnyRevealed(revealedCount.current > 0);
  }, []);

  const dragging   = useRef(false);
  const startX     = useRef(0);
  const startOff   = useRef(0);
  const totalDelta = useRef(0);

  const doubled = [...features, ...features];

  /** Read the current CSS-animated translateX from the live computed style. */
  const readTranslateX = () => {
    if (!trackRef.current) return 0;
    const mat = new DOMMatrix(window.getComputedStyle(trackRef.current).transform);
    return mat.m41;
  };

  /**
   * After a drag ends, set a negative animation-delay so the CSS animation
   * resumes seamlessly from wherever the drag left off.
   */
  const resumeFrom = (finalX: number) => {
    if (!trackRef.current) return;
    const halfWidth   = trackRef.current.scrollWidth / 2;
    const durationSec = parseFloat(duration);

    // Wrap into one [0, halfWidth) cycle
    const norm =
      direction === "left"
        ? ((-finalX % halfWidth) + halfWidth) % halfWidth       // 0 → halfWidth maps to start → end
        : ((finalX  % halfWidth) + halfWidth) % halfWidth;

    const progress       = norm / halfWidth;
    const negativeDelay  = -(progress * durationSec);
    trackRef.current.style.animationDelay = `${negativeDelay}s`;
  };

  const pointerIdRef = useRef<number | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    // Don't intercept clicks on interactive children (buttons, links).
    if ((e.target as HTMLElement).closest("button, a")) return;
    dragging.current   = false; // not yet dragging — wait for movement
    totalDelta.current = 0;
    startX.current     = e.clientX;
    startOff.current   = readTranslateX();
    pointerIdRef.current = e.pointerId;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (pointerIdRef.current === null) return;
    const delta = e.clientX - startX.current;
    totalDelta.current = delta;

    if (!dragging.current && Math.abs(delta) >= 5) {
      // Threshold crossed — commit to drag mode and capture
      dragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setManualOffset(startOff.current);
    }

    if (dragging.current) {
      setManualOffset(startOff.current + delta);
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointerIdRef.current = null;
    if (!dragging.current) return; // was a tap — let native click bubble
    dragging.current = false;

    // Resume CSS animation from the drag-end position
    resumeFrom(startOff.current + totalDelta.current);
    setManualOffset(null);
  };

  const trackStyle: CSSProperties =
    manualOffset !== null
      ? { transform: `translateX(${manualOffset}px)`, willChange: "transform" }
      : {
          animation: `cig-scroll-${direction} ${duration} linear infinite`,
          animationPlayState: anyRevealed ? "paused" : "running",
        };

  return (
    <div
      className="relative z-0 w-full overflow-x-clip py-4 sm:py-3 cursor-grab active:cursor-grabbing touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => { pointerIdRef.current = null; dragging.current = false; setManualOffset(null); }}
    >
      <div ref={trackRef} className="flex w-max gap-4 px-6 sm:px-7" style={trackStyle}>
        {doubled.map((f, i) => (
          <HoloCard
            key={`${f.id}-${i}`}
            feature={f}
            onOpen={() => onKnowMore(f)}
            onRevealChange={handleRevealChange}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Module status badges ────────────────────────────────────────────── */

const STATUS_BADGE_DEFS = [
  { key: "authed.badge.graph",     color: "#06b6d4" },
  { key: "authed.badge.resources", color: "#3b82f6" },
  { key: "authed.badge.costs",     color: "#a855f7" },
  { key: "authed.badge.security",  color: "#10b981" },
  { key: "authed.badge.ai",        color: "#f59e0b" },
];

/* ─── Main exported component ─────────────────────────────────────────── */

export function AuthenticatedLanding() {
  const t = useTranslation();
  const docsUrl = useResolvedDocsUrl();
  const dashboardUrl = useResolvedDashboardUrl();
  const { theme } = useTheme();
  useCIGAuth(); // keeps session alive; user data used in AuthButton
  const isDark = theme === "dark";
  const [modalFeature, setModalFeature] = useState<Feature | null>(null);
  const [isConnectingToDashboard, setIsConnectingToDashboard] = useState(false);
  const version = useRuntimeVersion();
  const build = process.env.NEXT_PUBLIC_APP_BUILD || "";
  const meta = [
    t("footer.licenseNotice", { year: new Date().getFullYear() }),
    version ? t("common.version", { version }) : "",
    build ? t("common.build", { build }) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const startDashboardTransition = useCallback((path = "/") => {
    if (isConnectingToDashboard) return;

    setIsConnectingToDashboard(true);
    window.requestAnimationFrame(() => {
      void goToDashboard(path).catch(() => setIsConnectingToDashboard(false));
    });
  }, [isConnectingToDashboard]);

  const handleEnterDashboard = useCallback(() => {
    startDashboardTransition("/");
  }, [startDashboardTransition]);

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden text-zinc-900 dark:text-white flex flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-transparent dark:via-transparent dark:to-transparent">
      {/* ── Keyframes ──────────────────────────────────────── */}
      <style>{`
        @keyframes cig-scroll-left  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
        @keyframes cig-scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); }    }
        @keyframes cig-float        { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes cig-glow-pulse   { 0%,100% { opacity: 0.35; } 50% { opacity: 0.75; } }
        @keyframes cig-scan         { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .cig-holocard:not([data-selected]) { transition: outline 0.15s ease; outline: 2px solid transparent; outline-offset: 2px; }
        .cig-holocard:hover:not([data-selected]) { outline: 2px solid rgba(255,255,255,0.12); }
      `}</style>

      {/* Auth button + theme toggle */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
        <AuthButton />
      </div>

      {isConnectingToDashboard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/70 px-6 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-zinc-950/80 px-8 py-7 text-center shadow-2xl shadow-cyan-950/30">
            <div className="relative size-12">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
            </div>
            <p className="text-sm font-medium tracking-wide text-cyan-300">
              {t("auth.connectingDashboard")}
            </p>
          </div>
        </div>
      )}

      {/* Falling pattern — light mode only, behind everything */}
      <div className="pointer-events-none fixed inset-0 z-0 dark:hidden">
        <FallingPattern color="rgba(6,182,212,0.18)" backgroundColor="transparent" duration={150} blurIntensity="0.5em" density={1} />
      </div>

      {/* WebGL electric waves — fullscreen behind everything */}
      <ElectricWavesBackground />

      {/* Small CIG particles layered above the shader, below content */}
      <SpaceBackground particleCount={80} particleColor="rgba(6,182,212,0.7)" />

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative z-30 px-4 pt-24 pb-14 text-center sm:px-6 sm:pt-28 sm:pb-16">
        <div key={theme} className="mx-auto flex max-w-4xl flex-col items-center rounded-[2rem] border border-cyan-500/10 bg-white/70 px-6 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/55 dark:shadow-[0_24px_90px_rgba(0,0,0,0.42)] sm:px-10 sm:py-11 md:py-12">
          {/* Headline */}
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              {t("authed.title.line1")}
            </span>
            <br />
            <span className="text-zinc-900 dark:text-zinc-100">{t("authed.title.line2")}</span>
          </h1>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            {t("authed.desc")}
          </p>

          {/* Status pills */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2.5">
            {STATUS_BADGE_DEFS.map(({ key, color }, idx) => (
              <div key={key} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: `${color}35`, backgroundColor: `${color}0e`, color }}>
                <div className="size-1.5 rounded-full"
                  style={{ backgroundColor: color, animation: "cig-glow-pulse 2s ease-in-out infinite", animationDelay: `${idx * 0.3}s` }} />
                {t(key)}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="w-full max-w-md pb-2 sm:max-w-none sm:pb-3">
            <button
              type="button"
              data-dashboard-cta="true"
              onClick={handleEnterDashboard}
              className="relative z-40 inline-flex w-full cursor-pointer touch-manipulation items-center justify-center gap-2.5 rounded-full px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400/60 sm:min-w-[20rem] sm:w-auto sm:px-10"
              style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)", boxShadow: "0 0 24px rgba(6,182,212,0.3), 0 4px 20px rgba(0,0,0,0.4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(6,182,212,0.5), 0 8px 32px rgba(0,0,0,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(6,182,212,0.3), 0 4px 20px rgba(0,0,0,0.4)"; }}
            >
              <DashboardIcon /> {t("authed.enterDashboard")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Feature carousels ────────────────────────────────── */}
      <div className="relative z-10 mt-2 flex flex-col gap-6 pb-12 pt-12 sm:mt-6 sm:gap-6 sm:pt-12 md:pt-14">
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10"
          style={{
            background: isDark
              ? "linear-gradient(to bottom, rgba(5, 11, 20, 0.92), transparent)"
              : "linear-gradient(to bottom, rgba(255, 255, 255, 0.96), transparent)",
          }}
        />

        <p className="mb-2 select-none px-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          {t("authed.carouselHint")}
        </p>

        <ScrollingRow features={FEATURES}                   direction="left"  duration="42s" onKnowMore={setModalFeature} />
        <ScrollingRow features={[...FEATURES].reverse()}   direction="right" duration="36s" onKnowMore={setModalFeature} />

        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10"
          style={{
            background: isDark
              ? "linear-gradient(to top, rgba(5, 11, 20, 0.94), transparent)"
              : "linear-gradient(to top, rgba(255, 255, 255, 0.98), transparent)",
          }}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer id="site-footer" className="relative z-10 mt-auto w-full border-t border-zinc-200 dark:border-zinc-800/50 px-4 py-4 sm:px-6">
        <div className="relative z-10">
        <FooterBar
          brandLabel={t("footer.brandTitle")}
          brandHref={dashboardUrl}
          subtitle={t("footer.rightsReserved")}
          links={[
            { label: t("nav.dashboard"), href: dashboardUrl },
            { label: t("footer.docs"), href: docsUrl, external: true },
            { label: t("footer.privacy"), href: "/privacy" },
            { label: t("footer.terms"), href: "/terms" },
          ]}
          meta={meta}
        />
        </div>
      </footer>

      <BackToTop />

      {/* ── Feature detail modal ─────────────────────────────── */}
      <FeatureModal
        feature={modalFeature}
        onClose={() => setModalFeature(null)}
        onOpen={(path) => startDashboardTransition(path)}
      />
    </div>
  );
}
