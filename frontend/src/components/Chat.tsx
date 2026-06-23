"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Message } from "@/types/chat";
import MessageBubble from "./Message";
import ChatInput from "./Input";
import Logo from "./Logo";

gsap.registerPlugin(useGSAP);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Area selector data ──────────────────────────────────────────────────────
// Six real 30X operational areas, grounded in actual tools and roles from Doc3.
const AREAS = [
  "Comercial",
  "Programas",
  "Comunidad",
  "Contenido",
  "Tech/Ops",
  "Talento",
  "Prefiero no decir",
] as const;

type Area = (typeof AREAS)[number];

// Default questions shown when no area is selected
const DEFAULT_QUESTIONS = [
  "¿Qué es 30X y en qué países tiene presencia?",
  "¿Qué herramientas usa el equipo?",
  "¿Qué se espera de mí esta primera semana?",
  "¿Cómo funciona una cohorte de principio a fin?",
  "¿A quién le escribo si tengo un bloqueo técnico?",
];

// Area-specific suggested questions grounded in real tools/roles per Doc3.
// Each array has 2-4 area questions + 1 general question.
const AREA_QUESTIONS: Record<string, string[]> = {
  Comercial: [
    "¿Cómo gestiono el pipeline de ventas en HubSpot?",
    "¿Cuál es el proceso de seguimiento de leads en Airtable?",
    "¿Qué diferencia hay entre el rol de BDR y Closer en 30X?",
    "¿Cómo estructuro una llamada de cierre con un potencial cliente?",
    "¿Qué se espera de mí esta primera semana?",
  ],
  Programas: [
    "¿Cómo se estructura una cohorte de principio a fin?",
    "¿Qué herramientas usan para gestionar las sesiones en Zoom y Circle?",
    "¿Cuál es el rol del Program Coordinator en una cohorte activa?",
    "¿Cómo hago seguimiento al progreso de los participantes?",
    "¿Qué se espera de mí esta primera semana?",
  ],
  Comunidad: [
    "¿Cómo funciona la comunidad en Circle?",
    "¿Cuáles son las estrategias de activación de red que usa 30X?",
    "¿Cómo se organizan y promueven los eventos comunitarios?",
    "¿Cómo mido el engagement de la comunidad?",
    "¿Qué se espera de mí esta primera semana?",
  ],
  Contenido: [
    "¿Cómo es la estrategia de contenido de 30X?",
    "¿Qué herramientas usamos para diseñar en Canva y Figma?",
    "¿Cómo se arma la parrilla editorial?",
    "¿Qué formatos de contenido prioriza 30X?",
    "¿Qué se espera de mí esta primera semana?",
  ],
  "Tech/Ops": [
    "¿Qué automatizaciones tenemos en Make?",
    "¿Cómo están integradas las herramientas internas?",
    "¿Dónde documento los flujos de automatización?",
    "¿A quién le escribo si tengo un bloqueo técnico?",
    "¿Qué se espera de mí esta primera semana?",
  ],
  Talento: [
    "¿Cómo es el proceso de reclutamiento en 30X?",
    "¿Cómo se vive la cultura de la organización?",
    "¿Qué cubre el proceso de onboarding de nuevos colaboradores?",
    "¿Cómo se mide el desempeño del equipo?",
    "¿Qué se espera de mí esta primera semana?",
  ],
  "Prefiero no decir": DEFAULT_QUESTIONS,
};

// localStorage key for persisting the selected area across sessions
const AREA_STORAGE_KEY = "30x-selected-area-v1";

// Cycling status texts for loading state
const LOADING_TEXTS = [
  "Buscando en los documentos…",
  "Redactando respuesta…",
  "Verificando fuentes…",
];

// Static follow-up suggestions per assistant turn (cosmetic, not dynamic)
const FOLLOW_UPS = [
  "¿Podés darme más detalles?",
  "¿Quién es el responsable de esto?",
  "¿Qué herramientas se usan para esto?",
];

// Delay in ms before showing the cold-start warning message
const COLD_START_DELAY_MS = 4000;

interface Props {
  /** Imperative ref: calling it resets (clears active conversation). */
  onResetRef?: React.MutableRefObject<(() => void) | null>;
  /** Imperative ref: calling it sends a message programmatically. */
  onSendRef?: React.MutableRefObject<((msg: string) => void) | null>;

  // History hook interface (passed down from page)
  mounted: boolean;
  activeId: string | null;
  activeMessages: Message[];
  createConversation: () => string;
  updateMessages: (id: string, updater: (prev: Message[]) => Message[]) => void;
  clearActive: () => void;
}

// ── LoadingIndicator ────────────────────────────────────────────────────────
// Shows cycling status text + a branded warm-up hint after COLD_START_DELAY_MS.
function LoadingIndicator({ showColdStartHint }: { showColdStartHint: boolean }) {
  const [textIdx, setTextIdx] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIdx((i) => (i + 1) % LOADING_TEXTS.length);
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 200);
      return () => clearTimeout(t);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start flex-col gap-2">
      <div
        className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Pulsing lime dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: "var(--accent)",
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)",
            animation: "pulse-dot 1.2s ease-in-out infinite",
          }}
        />
        <span
          className="text-xs transition-opacity duration-200"
          style={{
            color: "var(--muted)",
            opacity: pulse ? 0.4 : 1,
          }}
        >
          {LOADING_TEXTS[textIdx]}
        </span>
      </div>

      {/* Cold-start hint: shown only after COLD_START_DELAY_MS — #7 */}
      {showColdStartHint && (
        <p
          className="text-xs px-1 leading-relaxed"
          style={{ color: "var(--muted)" }}
          role="status"
          aria-live="polite"
        >
          El agente se está despertando — la primera respuesta puede tardar unos segundos.
        </p>
      )}
    </div>
  );
}

// ── AreaSelector ────────────────────────────────────────────────────────────
// Chip-based area picker for the welcome screen — #8.
// Animates in with GSAP, respects prefers-reduced-motion.
function AreaSelector({
  selected,
  onSelect,
}: {
  selected: Area | null;
  onSelect: (area: Area) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          containerRef.current!.querySelectorAll(".area-chip"),
          { opacity: 0, scale: 0.92 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.3,
            ease: "back.out(1.4)",
            stagger: 0.04,
          }
        );
      });
      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div className="w-full max-w-md flex flex-col gap-2" ref={containerRef}>
      <p
        className="text-xs font-medium uppercase tracking-widest"
        style={{ color: "var(--muted)" }}
        id="area-selector-label"
      >
        ¿De qué área sos?
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-labelledby="area-selector-label"
      >
        {AREAS.map((area) => {
          const isSelected = selected === area;
          return (
            <button
              key={area}
              onClick={() => onSelect(area)}
              aria-pressed={isSelected}
              className="area-chip text-xs px-3 py-1.5 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                backgroundColor: isSelected ? "var(--accent)" : "var(--surface)",
                border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                color: isSelected ? "#0a0a0a" : "var(--text)",
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              {area}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ErrorBubble ─────────────────────────────────────────────────────────────
// Friendly branded error state for failed requests — #7.
// Distinguishes cold-start/network errors from generic failures.
function ErrorBubble({
  isColdStart,
  onRetry,
}: {
  isColdStart: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[80%] flex flex-col gap-3 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-2">
          {/* Warning icon */}
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
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--accent)" }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {isColdStart
              ? "El agente está despertando o no responde. Probá de nuevo en unos segundos."
              : "Hubo un error al conectar con el agente. Por favor, intentá de nuevo."}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="self-start text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            backgroundColor: "var(--accent)",
            color: "#0a0a0a",
          }}
          aria-label="Reintentar enviar el mensaje"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export default function Chat({
  onResetRef,
  onSendRef,
  mounted,
  activeId,
  activeMessages,
  createConversation,
  updateMessages,
  clearActive,
}: Props) {
  const [loading, setLoading] = useState(false);
  // #7: cold-start hint becomes visible after COLD_START_DELAY_MS of pending request
  const [showColdStartHint, setShowColdStartHint] = useState(false);
  // #7: tracks the last failed message for retry
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const [lastErrorWasColdStart, setLastErrorWasColdStart] = useState(false);

  // #8: area selector state — persisted in localStorage
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [areaLoaded, setAreaLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const coldStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use a ref to track the current activeId inside the async sendMessage
  // (avoids stale closure when conversation is created mid-flight)
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Same for activeMessages — capture latest before async call
  const activeMessagesRef = useRef<Message[]>(activeMessages);
  useEffect(() => {
    activeMessagesRef.current = activeMessages;
  }, [activeMessages]);

  // #8: Load persisted area from localStorage after mount (SSR-safe)
  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(AREA_STORAGE_KEY);
      if (stored && AREAS.includes(stored as Area)) {
        setSelectedArea(stored as Area);
      }
    } catch {
      // localStorage unavailable — ignore
    }
    setAreaLoaded(true);
  }, [mounted]);

  // #8: Persist area selection to localStorage whenever it changes
  const handleAreaSelect = useCallback((area: Area) => {
    setSelectedArea(area);
    try {
      localStorage.setItem(AREA_STORAGE_KEY, area);
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

  // Derive the current suggested questions based on selected area — #8
  const suggestedQuestions =
    selectedArea && selectedArea !== "Prefiero no decir"
      ? AREA_QUESTIONS[selectedArea]
      : DEFAULT_QUESTIONS;

  const sendMessage = useCallback(
    async (content: string) => {
      // Clear any previous retry state
      setPendingRetry(null);
      setLastErrorWasColdStart(false);

      // Ensure a conversation exists
      let convId = activeIdRef.current;
      if (!convId) {
        convId = createConversation();
        activeIdRef.current = convId;
      }

      // #8: When an area is selected and this is the first user message in a conversation,
      // prepend "Soy del área {area}. " to what the backend receives.
      // The displayed bubble still shows the natural content so it feels organic.
      const isFirstMessage = activeMessagesRef.current.length === 0;
      const storedArea = (() => {
        try {
          return localStorage.getItem(AREA_STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      const areaPrefix =
        isFirstMessage && storedArea && storedArea !== "Prefiero no decir"
          ? `Soy del área ${storedArea}. `
          : "";
      const backendContent = areaPrefix + content;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        // Display shows the plain question; backend receives area-prefixed version
        content,
        timestamp: new Date(),
      };

      // Snapshot history BEFORE appending the new user message
      const historySnapshot = activeMessagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      updateMessages(convId, (prev) => [...prev, userMsg]);
      setLoading(true);

      // #7: After COLD_START_DELAY_MS, show the warm-up hint while still loading
      coldStartTimerRef.current = setTimeout(() => {
        setShowColdStartHint(true);
      }, COLD_START_DELAY_MS);

      try {
        const res = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Send area-prefixed content to the backend for RF-02 memory
          body: JSON.stringify({ message: backendContent, history: historySnapshot }),
        });

        if (!res.ok) {
          // 5xx → likely cold-start or server-side failure
          const isColdStart = res.status >= 500;
          setLastErrorWasColdStart(isColdStart);
          setPendingRetry(content);
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          escalate: data.escalate,
          sources: data.sources,
          citations: data.citations ?? [],
          timestamp: new Date(),
        };

        updateMessages(convId, (prev) => [...prev, assistantMsg]);
        setPendingRetry(null);
      } catch (err) {
        // Network errors (abort, no connection) → likely cold-start
        const isNetworkError = !(err instanceof Error && err.message.startsWith("HTTP"));
        // Always set the retry content so the ErrorBubble renders.
        // isNetworkError → cold-start variant; HTTP 5xx was already set above in !res.ok block.
        if (isNetworkError) {
          setLastErrorWasColdStart(true);
        }
        // setPendingRetry always so the error bubble appears regardless of error type
        setPendingRetry(content);
      } finally {
        // Clear the cold-start timer and hide the hint once response is done
        if (coldStartTimerRef.current) {
          clearTimeout(coldStartTimerRef.current);
          coldStartTimerRef.current = null;
        }
        setShowColdStartHint(false);
        setLoading(false);
      }
    },
    [createConversation, updateMessages]
  );

  // Expose reset callback to parent (clears active conversation → shows welcome)
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        clearActive();
        setLoading(false);
        setPendingRetry(null);
        setShowColdStartHint(false);
      };
    }
    return () => {
      if (onResetRef) onResetRef.current = null;
    };
  }, [onResetRef, clearActive]);

  // Expose sendMessage to parent (for KB panel "ask about doc")
  useEffect(() => {
    if (onSendRef) {
      onSendRef.current = sendMessage;
    }
    return () => {
      if (onSendRef) onSendRef.current = null;
    };
  }, [onSendRef, sendMessage]);

  // Clean up cold-start timer on unmount
  useEffect(() => {
    return () => {
      if (coldStartTimerRef.current) clearTimeout(coldStartTimerRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, loading]);

  const messages = activeMessages;
  const isEmpty = messages.length === 0;

  // Welcome screen entrance animation
  useGSAP(
    () => {
      if (!welcomeRef.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const logo = welcomeRef.current!.querySelector(".welcome-logo");
        const heading = welcomeRef.current!.querySelector(".welcome-heading");
        const subtext = welcomeRef.current!.querySelector(".welcome-subtext");
        const label = welcomeRef.current!.querySelector(".welcome-label");
        const areaSection = welcomeRef.current!.querySelector(".area-selector-section");
        const buttons = welcomeRef.current!.querySelectorAll(".welcome-btn");

        const targets = [logo, heading, subtext, label, areaSection, ...Array.from(buttons)].filter(Boolean);

        gsap.fromTo(
          targets,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: "power2.out",
            stagger: 0.07,
            clearProps: "transform",
          }
        );
      });

      return () => mm.revert();
    },
    { scope: welcomeRef, dependencies: [isEmpty] }
  );

  // Animate suggested questions when selected area changes — #8
  const questionsRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!questionsRef.current || !selectedArea) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          questionsRef.current!.querySelectorAll(".welcome-btn"),
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
            stagger: 0.05,
            clearProps: "transform",
          }
        );
      });
      return () => mm.revert();
    },
    { scope: questionsRef, dependencies: [selectedArea] }
  );

  // Determine if the last message is from the assistant (to show follow-ups)
  const lastMsg = messages[messages.length - 1];
  const showFollowUps = !loading && !pendingRetry && lastMsg?.role === "assistant";

  // Don't render until localStorage has been read
  if (!mounted) {
    return <div className="flex flex-col h-full" />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {isEmpty ? (
            <div ref={welcomeRef} className="flex flex-col items-center gap-8 pt-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="welcome-logo">
                  <Logo height={56} />
                </div>
                <h1
                  className="welcome-heading text-2xl font-semibold tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  Hola, soy el agente de onboarding de 30X
                </h1>
                <p
                  className="welcome-subtext text-sm max-w-sm leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  Preguntame lo que quieras sobre la organización, los programas, el equipo o las
                  herramientas. Respondo con base en los documentos internos de 30X.
                </p>
              </div>

              {/* Area selector — #8: shown once localStorage is read to avoid flash */}
              {areaLoaded && (
                <div className="area-selector-section w-full max-w-md">
                  <AreaSelector selected={selectedArea} onSelect={handleAreaSelect} />
                </div>
              )}

              <div className="w-full max-w-md flex flex-col gap-2" ref={questionsRef}>
                <p
                  className="welcome-label text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: "var(--muted)" }}
                >
                  Preguntas frecuentes
                </p>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="welcome-btn text-left text-sm px-4 py-3 rounded-xl transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 4px 16px rgba(0,0,0,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 1px 3px rgba(0,0,0,0.2)";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              // Find the preceding user message for feedback context
              const precedingQuestion =
                msg.role === "assistant"
                  ? (messages.slice(0, idx).reverse().find((m) => m.role === "user")?.content ?? "")
                  : "";
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  precedingQuestion={precedingQuestion}
                />
              );
            })
          )}

          {loading && <LoadingIndicator showColdStartHint={showColdStartHint} />}

          {/* #7: Friendly error state with retry button — replaces generic error bubble */}
          {!loading && pendingRetry && (
            <ErrorBubble
              isColdStart={lastErrorWasColdStart}
              onRetry={() => sendMessage(pendingRetry)}
            />
          )}

          {/* Follow-up chips after last assistant answer */}
          {showFollowUps && (
            <div className="flex flex-wrap gap-2 pl-1">
              {FOLLOW_UPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-4 pb-6 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl transition-shadow duration-200 hover:shadow-lg"
            style={{
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            <ChatInput onSend={sendMessage} disabled={loading} />
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "var(--muted)" }}>
            Las respuestas se basan exclusivamente en los documentos internos de 30X.
          </p>
        </div>
      </div>
    </div>
  );
}
