"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types/chat";
import type { Components } from "react-markdown";

gsap.registerPlugin(useGSAP);

interface Props {
  message: Message;
}

// Custom components to inject brand-aware styles
const markdownComponents: Components = {
  // Wrap tables so they can scroll horizontally on narrow widths
  table: ({ children, ...props }) => (
    <div className="table-wrapper">
      <table {...props}>{children}</table>
    </div>
  ),
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — silent fail
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy message"}
      title={copied ? "¡Copiado!" : "Copiar mensaje"}
      className="opacity-0 group-hover/bubble:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 rounded p-1"
      style={{ color: "var(--muted)" }}
    >
      {copied ? (
        // Checkmark icon
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ color: "var(--accent)" }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        // Copy icon
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const containerRef = useRef<HTMLDivElement>(null);

  // Entrance animation — slide up + fade in
  useGSAP(
    () => {
      if (!containerRef.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`
          max-w-[80%] flex flex-col gap-2
          ${isUser ? "items-end" : "items-start"}
        `}
      >
        {!isUser && (
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "var(--accent)" }}
          >
            30X Agent
          </span>
        )}

        {/* Bubble wrapper with group for hover-reveal copy button */}
        <div className={`relative group/bubble flex items-start gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <div
            className={`
              rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${isUser
                ? "text-black font-medium rounded-br-sm"
                : "rounded-bl-sm"
              }
            `}
            style={
              isUser
                ? { backgroundColor: "var(--accent)" }
                : { backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }
            }
          >
            {isUser ? (
              // User messages: plain text (no markdown)
              message.content.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))
            ) : (
              // Assistant messages: render GFM markdown
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Copy button — visible on hover/focus, for assistant messages only */}
          {!isUser && (
            <div className="flex-shrink-0 mt-1">
              <CopyButton text={message.content} />
            </div>
          )}
        </div>

        {message.escalate && (
          <div
            className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: "#1a1a00", color: "var(--accent)", border: "1px solid #c8ff0040" }}
          >
            Escalated to Chief of Staff
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span
              className="text-xs font-medium mr-0.5"
              style={{ color: "var(--muted)" }}
            >
              Fuentes:
            </span>
            {message.sources.map((src) => (
              <SourceChip key={src} filename={src} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceChip({ filename }: { filename: string }) {
  const [open, setOpen] = useState(false);

  // Strip path prefix for display — show just the base filename
  const displayName = filename.split("/").pop() ?? filename;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Ver fuente: ${displayName}`}
        className="text-xs px-2 py-0.5 rounded transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
        style={{
          backgroundColor: "var(--border)",
          color: "var(--muted)",
          border: "1px solid transparent",
        }}
      >
        {displayName}
      </button>

      {open && (
        <>
          {/* Backdrop to close popover on outside click */}
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-full left-0 mb-1.5 z-20 px-3 py-2 rounded-lg text-xs shadow-lg max-w-xs break-all"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <p className="font-medium mb-0.5" style={{ color: "var(--accent)" }}>
              Fuente
            </p>
            <p>{filename}</p>
          </div>
        </>
      )}
    </div>
  );
}
