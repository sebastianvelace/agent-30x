"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

interface Document {
  filename: string;
  title: string;
  description: string;
  question: string;
}

const DOCS: Document[] = [
  {
    filename: "30X_Doc1_Organizacion.pdf",
    title: "Organización",
    description:
      "Qué es 30X, presencia, propuesta de valor, principios de cultura y decisión.",
    question: "¿Qué es 30X, en qué países tiene presencia y cuáles son sus principios de cultura?",
  },
  {
    filename: "30X_Doc2_Programas_Operacion.pdf",
    title: "Programas y Operación",
    description:
      "Portafolio de programas, cómo funciona una cohorte, plataformas y métricas.",
    question: "¿Cómo funciona una cohorte de principio a fin y qué plataformas se usan?",
  },
  {
    filename: "30X_Doc3_Equipo_Herramientas.pdf",
    title: "Equipo y Herramientas",
    description:
      "Estructura del equipo, roles, stack de herramientas, cultura y primera semana.",
    question: "¿Qué herramientas usa el equipo y para qué sirve cada una?",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAsk: (question: string) => void;
}

export default function KnowledgePanel({ open, onClose, onAsk }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // GSAP slide + backdrop animations
  useGSAP(
    () => {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      if (!panel || !backdrop) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (open) {
        // Prevent scroll on body
        document.body.style.overflow = "hidden";
        panel.style.display = "flex";
        backdrop.style.display = "block";

        if (prefersReducedMotion) {
          gsap.set(panel, { x: 0, opacity: 1 });
          gsap.set(backdrop, { opacity: 1 });
        } else {
          gsap.fromTo(
            backdrop,
            { opacity: 0 },
            { opacity: 1, duration: 0.25, ease: "power1.out" }
          );
          gsap.fromTo(
            panel,
            { x: "100%" },
            { x: "0%", duration: 0.35, ease: "power3.out" }
          );
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

  const handleAsk = (question: string) => {
    onClose();
    onAsk(question);
  };

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
        aria-label="Base de conocimiento"
        className="fixed top-0 right-0 h-full z-50 flex-col overflow-y-auto"
        style={{
          display: "none",
          width: "min(380px, 92vw)",
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
            {/* Book icon */}
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Base de conocimiento
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="px-5 py-3 text-xs" style={{ color: "var(--muted)" }}>
          El agente responde exclusivamente desde estos tres documentos internos de 30X.
        </p>

        {/* Document list */}
        <ul className="flex flex-col gap-3 px-4 pb-6">
          {DOCS.map((doc) => (
            <li
              key={doc.filename}
              className="flex flex-col gap-3 rounded-xl p-4"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Doc header */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {/* PDF icon */}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ color: "var(--accent)", flexShrink: 0 }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                    {doc.filename}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  {doc.description}
                </p>
              </div>

              {/* Ask action */}
              <button
                onClick={() => handleAsk(doc.question)}
                className="text-xs px-3 py-1.5 rounded-lg text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  color: "var(--accent)",
                }}
              >
                Preguntar sobre este documento →
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
