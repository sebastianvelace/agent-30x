"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const STORAGE_KEY = "30x-first-week-v1";

interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistGroup {
  heading: string;
  items: ChecklistItem[];
}

const CHECKLIST: ChecklistGroup[] = [
  {
    heading: "Día 1",
    items: [
      { id: "d1-accesos", label: "Accesos a herramientas (Notion, Gmail, Circle, WhatsApp)" },
      { id: "d1-docs", label: "Leer los 3 documentos de onboarding" },
      { id: "d1-reunion", label: "Reunión de 30 min con tu líder de área" },
    ],
  },
  {
    heading: "Día 2–3",
    items: [
      { id: "d23-proyectos", label: "Explorar los proyectos activos" },
      { id: "d23-contribuir", label: "Identificar dónde puedes contribuir de inmediato" },
      { id: "d23-docs", label: "Leer la documentación existente antes de preguntar" },
    ],
  },
  {
    heading: "Día 4–5",
    items: [
      { id: "d45-tarea", label: "Entregar tu primera tarea concreta" },
      { id: "d45-output", label: "Dejar tu primer output documentado" },
      { id: "d45-feedback", label: "Feedback con tu líder de área" },
    ],
  },
  {
    heading: "Semana 2+",
    items: [
      { id: "s2-autonomia", label: "Ejecutar con autonomía creciente" },
      { id: "s2-bloqueos", label: "Comunicar bloqueos antes de que sean problemas" },
    ],
  },
];

const ALL_ITEM_IDS = CHECKLIST.flatMap((g) => g.items.map((i) => i.id));
const TOTAL = ALL_ITEM_IDS.length;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FirstWeekPanel({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // checked state — persisted to localStorage
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setChecked(new Set(parsed));
      }
    } catch {
      // localStorage unavailable or invalid JSON — ignore
    }
    setLoaded(true);
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // localStorage unavailable — ignore
      }
      return next;
    });
  };

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  // GSAP slide + backdrop (mirrors KnowledgePanel pattern)
  useGSAP(
    () => {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      if (!panel || !backdrop) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (open) {
        document.body.style.overflow = "hidden";
        panel.style.display = "flex";
        backdrop.style.display = "block";

        if (prefersReducedMotion) {
          gsap.set(panel, { x: 0, opacity: 1 });
          gsap.set(backdrop, { opacity: 1 });
        } else {
          gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out" });
          gsap.fromTo(panel, { x: "100%" }, { x: "0%", duration: 0.35, ease: "power3.out" });
        }
      } else {
        document.body.style.overflow = "";

        if (prefersReducedMotion) {
          panel.style.display = "none";
          backdrop.style.display = "none";
        } else {
          gsap.to(backdrop, {
            opacity: 0,
            duration: 0.2,
            ease: "power1.in",
            onComplete: () => {
              if (backdrop) backdrop.style.display = "none";
            },
          });
          gsap.to(panel, {
            x: "100%",
            duration: 0.3,
            ease: "power3.in",
            onComplete: () => {
              if (panel) panel.style.display = "none";
            },
          });
        }
      }
    },
    { dependencies: [open] }
  );

  const doneCount = ALL_ITEM_IDS.filter((id) => checked.has(id)).length;
  const progress = TOTAL > 0 ? Math.round((doneCount / TOTAL) * 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40"
        style={{ display: "none", backgroundColor: "rgba(0,0,0,0.5)" }}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mi primera semana"
        className="fixed top-0 right-0 h-full z-50 flex-col overflow-y-auto"
        style={{
          display: "none",
          width: "min(400px, 92vw)",
          backgroundColor: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 sticky top-0"
          style={{
            backgroundColor: "var(--bg)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            {/* Calendar/checklist icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ color: "var(--accent)" }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <polyline points="9 16 11 18 15 14" />
            </svg>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Mi primera semana
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            style={{ color: "var(--muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Progreso
            </p>
            <p
              className="text-xs font-semibold tabular-nums"
              style={{ color: doneCount === TOTAL ? "var(--accent)" : "var(--text)" }}
              aria-live="polite"
              aria-atomic="true"
            >
              {doneCount}/{TOTAL}
            </p>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--border)" }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% completado`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: "var(--accent)",
              }}
            />
          </div>
          {doneCount === TOTAL && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--accent)" }}>
              ¡Completaste toda la primera semana!
            </p>
          )}
        </div>

        {/* Checklist */}
        {loaded && (
          <ul className="flex flex-col gap-5 px-4 py-5 pb-8">
            {CHECKLIST.map((group) => (
              <li key={group.heading}>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2.5 px-1"
                  style={{ color: "var(--accent)" }}
                >
                  {group.heading}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const isChecked = checked.has(item.id);
                    return (
                      <li key={item.id}>
                        <label
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group"
                          style={{
                            backgroundColor: isChecked
                              ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                              : "var(--surface)",
                            border: `1px solid ${isChecked ? "color-mix(in srgb, var(--accent) 25%, transparent)" : "var(--border)"}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(item.id)}
                            aria-label={item.label}
                            className="sr-only"
                          />
                          {/* Custom checkbox */}
                          <span
                            className="flex-shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-colors"
                            aria-hidden="true"
                            style={{
                              backgroundColor: isChecked ? "var(--accent)" : "transparent",
                              border: `1.5px solid ${isChecked ? "var(--accent)" : "var(--border)"}`,
                            }}
                          >
                            {isChecked && (
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <span
                            className="text-xs leading-relaxed select-none"
                            style={{
                              color: isChecked ? "var(--muted)" : "var(--text)",
                              textDecoration: isChecked ? "line-through" : "none",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
