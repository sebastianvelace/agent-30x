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

const SUGGESTED_QUESTIONS = [
  "¿Qué es 30X y en qué países tiene presencia?",
  "¿Qué herramientas usa el equipo?",
  "¿Qué se espera de mí esta primera semana?",
  "¿Cómo funciona una cohorte de principio a fin?",
  "¿A quién le escribo si tengo un bloqueo técnico?",
];

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

interface Props {
  onResetRef?: React.MutableRefObject<(() => void) | null>;
  onSendRef?: React.MutableRefObject<((msg: string) => void) | null>;
}

function LoadingIndicator() {
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
    <div className="flex justify-start">
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
    </div>
  );
}

export default function Chat({ onResetRef, onSendRef }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        escalate: data.escalate,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Hubo un error al conectar con el agente. Por favor, intentá de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  // Expose reset callback to parent
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        setMessages([]);
        setLoading(false);
      };
    }
    return () => {
      if (onResetRef) onResetRef.current = null;
    };
  }, [onResetRef]);

  // Expose sendMessage to parent (for KB panel "ask about doc")
  useEffect(() => {
    if (onSendRef) {
      onSendRef.current = sendMessage;
    }
    return () => {
      if (onSendRef) onSendRef.current = null;
    };
  }, [onSendRef, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        const buttons = welcomeRef.current!.querySelectorAll(".welcome-btn");

        const targets = [logo, heading, subtext, label, ...Array.from(buttons)].filter(Boolean);

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
    { scope: welcomeRef, dependencies: [messages.length === 0] }
  );

  const isEmpty = messages.length === 0;

  // Determine if the last message is from the assistant (to show follow-ups)
  const lastMsg = messages[messages.length - 1];
  const showFollowUps = !loading && lastMsg?.role === "assistant";

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

              <div className="w-full max-w-md flex flex-col gap-2">
                <p
                  className="welcome-label text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: "var(--muted)" }}
                >
                  Preguntas frecuentes
                </p>
                {SUGGESTED_QUESTIONS.map((q) => (
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
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}

          {loading && <LoadingIndicator />}

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
