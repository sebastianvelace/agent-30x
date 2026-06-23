"use client";

import { useRef } from "react";
import Chat from "@/components/Chat";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

export default function Home() {
  const chatResetRef = useRef<(() => void) | null>(null);

  const handleNewConversation = () => {
    chatResetRef.current?.();
  };

  return (
    <main className="flex flex-col" style={{ height: "100dvh" }}>
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Logo height={28} />
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Onboarding Agent
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--accent)" }}
            />
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Online
            </span>
          </div>

          {/* New conversation button */}
          <button
            onClick={handleNewConversation}
            aria-label="New conversation"
            title="Nueva conversación"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--muted)",
            }}
          >
            {/* Compose / new chat icon */}
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

      <div className="flex-1 overflow-hidden">
        <Chat onResetRef={chatResetRef} />
      </div>
    </main>
  );
}
