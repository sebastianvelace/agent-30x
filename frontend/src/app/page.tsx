"use client";

import { useRef, useState, useEffect } from "react";
import Chat from "@/components/Chat";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import IntroHero from "@/components/IntroHero";
import KnowledgePanel from "@/components/KnowledgePanel";

const SESSION_KEY = "30x-intro-seen";

export default function Home() {
  const chatResetRef = useRef<(() => void) | null>(null);
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);
  const [showIntro, setShowIntro] = useState<boolean | null>(null); // null = not yet checked
  const [kbOpen, setKbOpen] = useState(false);

  // Check sessionStorage after mount (SSR-safe)
  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY);
    setShowIntro(!seen);
  }, []);

  const handleNewConversation = () => {
    chatResetRef.current?.();
  };

  const handleAsk = (question: string) => {
    sendMessageRef.current?.(question);
  };

  // Don't render until we've checked sessionStorage (avoids flicker)
  if (showIntro === null) {
    return (
      <main
        className="flex flex-col"
        style={{ height: "100dvh", backgroundColor: "var(--bg)" }}
      />
    );
  }

  return (
    <>
      {showIntro && (
        <IntroHero onDone={() => setShowIntro(false)} />
      )}

      <main className="flex flex-col" style={{ height: "100dvh" }}>
        {/* Header */}
        <header
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Left: logo + tagline */}
          <div className="flex items-center gap-3">
            <Logo height={28} />
            <span
              className="hidden sm:block text-xs font-medium"
              style={{ color: "var(--muted)" }}
            >
              Tu copiloto de onboarding
            </span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Knowledge base */}
            <button
              onClick={() => setKbOpen(true)}
              aria-label="Abrir base de conocimiento"
              title="Base de conocimiento"
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--muted)",
              }}
            >
              {/* Book icon */}
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
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="hidden sm:inline">Base de conocimiento</span>
            </button>

            {/* New conversation */}
            <button
              onClick={handleNewConversation}
              aria-label="Nueva conversación"
              title="Nueva conversación"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--muted)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>

            <ThemeToggle />
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Subtle radial glow behind chat */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 100%, color-mix(in srgb, var(--accent) 5%, transparent), transparent)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">
            <Chat
              onResetRef={chatResetRef}
              onSendRef={sendMessageRef}
            />
          </div>
        </div>
      </main>

      {/* Knowledge panel drawer */}
      <KnowledgePanel
        open={kbOpen}
        onClose={() => setKbOpen(false)}
        onAsk={handleAsk}
      />
    </>
  );
}
