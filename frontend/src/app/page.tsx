"use client";

import { useRef, useState, useEffect } from "react";
import Chat from "@/components/Chat";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import IntroHero from "@/components/IntroHero";
import KnowledgePanel from "@/components/KnowledgePanel";
import FirstWeekPanel from "@/components/FirstWeekPanel";
import { useChatHistory } from "@/hooks/useChatHistory";

const SESSION_KEY = "30x-intro-seen";

export default function Home() {
  const chatResetRef = useRef<(() => void) | null>(null);
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);
  const [showIntro, setShowIntro] = useState<boolean | null>(null); // null = not yet checked
  const [kbOpen, setKbOpen] = useState(false);
  const [firstWeekOpen, setFirstWeekOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    mounted,
    conversations,
    activeId,
    activeMessages,
    createConversation,
    updateMessages,
    deleteConversation,
    loadConversation,
    clearActive,
  } = useChatHistory();

  // Check sessionStorage after mount (SSR-safe)
  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY);
    setShowIntro(!seen);
  }, []);

  const handleNewConversation = () => {
    clearActive();
    setSidebarOpen(false);
  };

  const handleAsk = (question: string) => {
    sendMessageRef.current?.(question);
    setSidebarOpen(false);
  };

  const handleLoadConversation = (id: string) => {
    loadConversation(id);
    setSidebarOpen(false);
  };

  // Don't render until we've checked sessionStorage (avoids flicker)
  if (showIntro === null) {
    return (
      <main
        className="flex"
        style={{ height: "100dvh", backgroundColor: "var(--bg)" }}
      />
    );
  }

  // Sort conversations newest-first
  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      {showIntro && (
        <IntroHero onDone={() => setShowIntro(false)} />
      )}

      {/* Mobile hamburger — only visible <768px */}
      <button
        className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--muted)",
        }}
        aria-label="Abrir menú"
        onClick={() => setSidebarOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex" style={{ height: "100dvh" }}>
        {/* ── LEFT SIDEBAR ── */}
        <aside
          className={`
            flex-shrink-0 flex flex-col
            fixed md:relative inset-y-0 left-0 z-40 md:z-auto
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{
            width: 260,
            backgroundColor: "var(--surface)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Sidebar header: Logo + close button (mobile) */}
          <div
            className="flex items-center justify-between px-4 pt-5 pb-4 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Logo height={24} />
            {/* Close button — mobile only */}
            <button
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ color: "var(--muted)" }}
              aria-label="Cerrar menú"
              onClick={() => setSidebarOpen(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Sidebar body */}
          <div className="flex flex-col flex-1 overflow-hidden px-3 py-3 gap-2">
            {/* Nueva conversación */}
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              style={{
                backgroundColor: "var(--accent)",
                color: "#000",
              }}
              aria-label="Nueva conversación"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva conversación
            </button>

            {/* Base de conocimiento */}
            <button
              onClick={() => { setKbOpen(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--muted)",
              }}
              aria-label="Abrir base de conocimiento"
            >
              {/* Book icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Base de conocimiento
            </button>

            {/* Mi primera semana */}
            <button
              onClick={() => { setFirstWeekOpen(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--muted)",
              }}
              aria-label="Mi primera semana — checklist de onboarding"
            >
              {/* Calendar checklist icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <polyline points="9 16 11 18 15 14" />
              </svg>
              Mi primera semana
            </button>

            {/* Recientes */}
            {mounted && sortedConversations.length > 0 && (
              <div className="flex flex-col gap-1 flex-1 overflow-hidden mt-2">
                <p
                  className="text-xs font-medium uppercase tracking-widest px-1 mb-1"
                  style={{ color: "var(--muted)" }}
                >
                  Recientes
                </p>
                <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
                  {sortedConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        backgroundColor:
                          conv.id === activeId
                            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                            : "transparent",
                        border:
                          conv.id === activeId
                            ? "1px solid color-mix(in srgb, var(--accent) 25%, transparent)"
                            : "1px solid transparent",
                      }}
                      onClick={() => handleLoadConversation(conv.id)}
                      onMouseEnter={(e) => {
                        if (conv.id !== activeId) {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor =
                            "color-mix(in srgb, var(--border) 50%, transparent)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (conv.id !== activeId) {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <span
                        className="flex-1 text-xs truncate"
                        style={{
                          color: conv.id === activeId ? "var(--text)" : "var(--muted)",
                        }}
                      >
                        {conv.title}
                      </span>
                      {/* Delete button — appears on hover */}
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded flex-shrink-0"
                        style={{ color: "var(--muted)" }}
                        aria-label={`Eliminar conversación: ${conv.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar footer: ThemeToggle */}
          <div
            className="flex items-center px-4 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <ThemeToggle />
          </div>
        </aside>

        {/* ── MAIN CHAT AREA ── */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
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
              mounted={mounted}
              activeId={activeId}
              activeMessages={activeMessages}
              createConversation={createConversation}
              updateMessages={updateMessages}
              clearActive={clearActive}
            />
          </div>
        </main>
      </div>

      {/* Knowledge panel drawer */}
      <KnowledgePanel
        open={kbOpen}
        onClose={() => setKbOpen(false)}
        onAsk={handleAsk}
      />

      {/* First week checklist drawer */}
      <FirstWeekPanel
        open={firstWeekOpen}
        onClose={() => setFirstWeekOpen(false)}
      />
    </>
  );
}
