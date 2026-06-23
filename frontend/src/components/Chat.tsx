"use client";

import { useState, useRef, useEffect } from "react";
import type { Message } from "@/types/chat";
import MessageBubble from "./Message";
import ChatInput from "./Input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SUGGESTED_QUESTIONS = [
  "¿Qué es 30X y en qué países tiene presencia?",
  "¿Qué herramientas usa el equipo?",
  "¿Qué se espera de mí esta primera semana?",
  "¿Cómo funciona una cohorte de principio a fin?",
  "¿A quién le escribo si tengo un bloqueo técnico?",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
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
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-8 pt-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold text-lg"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  30
                </div>
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                  Hola, soy el agente de onboarding de 30X
                </h1>
                <p className="text-sm max-w-sm" style={{ color: "var(--muted)" }}>
                  Preguntame lo que quieras sobre la organización, los programas, el equipo o las herramientas.
                  Respondo con base en los documentos internos de 30X.
                </p>
              </div>

              <div className="w-full max-w-md flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
                  Preguntas frecuentes
                </p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm px-4 py-3 rounded-xl transition-colors hover:border-[var(--accent)]"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
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

          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      backgroundColor: "var(--accent)",
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <ChatInput onSend={sendMessage} disabled={loading} />
          <p className="text-center text-xs mt-2" style={{ color: "var(--muted)" }}>
            Las respuestas se basan exclusivamente en los documentos internos de 30X.
          </p>
        </div>
      </div>
    </div>
  );
}
