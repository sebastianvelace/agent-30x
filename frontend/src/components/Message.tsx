"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types/chat";
import type { Components } from "react-markdown";

gsap.registerPlugin(useGSAP);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// #2: Chief of Staff contact — reads from env var with a safe fallback
const CHIEF_OF_STAFF_EMAIL =
  process.env.NEXT_PUBLIC_CHIEF_OF_STAFF_EMAIL ?? "chief-of-staff@30x.com";

interface Props {
  message: Message;
  /** The user message that immediately preceded this assistant message (for feedback and escalation) */
  precedingQuestion?: string;
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

type FeedbackRating = "up" | "down" | null;

function FeedbackButtons({
  question,
  escalated,
  sources,
}: {
  question: string;
  escalated: boolean;
  sources: string[];
}) {
  const [rating, setRating] = useState<FeedbackRating>(null);

  const postFeedback = async (r: FeedbackRating) => {
    try {
      await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          rating: r,
          escalated,
          sources,
        }),
      });
    } catch {
      // Silently ignore network errors
    }
  };

  const handleRating = (r: "up" | "down") => {
    const next = rating === r ? null : r;
    setRating(next);
    postFeedback(next);
  };

  return (
    <div
      className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
      aria-label="¿Te sirvió?"
      title="¿Te sirvió?"
    >
      <button
        onClick={() => handleRating("up")}
        aria-label="Útil"
        title="Útil"
        className="rounded p-1 transition-colors"
        style={{ color: rating === "up" ? "var(--accent)" : "var(--muted)" }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={rating === "up" ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>
      <button
        onClick={() => handleRating("down")}
        aria-label="No útil"
        title="No útil"
        className="rounded p-1 transition-colors"
        style={{ color: rating === "down" ? "#ff6b6b" : "var(--muted)" }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={rating === "down" ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      </button>
    </div>
  );
}

/** Posts escalation feedback once; guards via a ref so it only fires once per mount. */
function useAutoEscalationFeedback(
  message: Message,
  precedingQuestion: string
) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!message.escalate || sentRef.current) return;
    sentRef.current = true;

    fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: precedingQuestion,
        rating: null,
        escalated: true,
        sources: message.sources ?? [],
      }),
    }).catch(() => {
      // Silently ignore
    });
  }, [message, precedingQuestion]);
}

// ── EscalationCTA ───────────────────────────────────────────────────────────
// Shown when escalate === true on an assistant message — #2.
// Provides a mailto: button and a clipboard fallback.
function EscalationCTA({ question }: { question: string }) {
  const [messageCopied, setMessageCopied] = useState(false);

  const subject = encodeURIComponent("Pregunta de onboarding");
  const body = encodeURIComponent(
    `Hola,\n\nTengo una pregunta sobre el onboarding que el agente no pudo responder completamente:\n\n"${question}"\n\n¿Me podés ayudar?\n\nGracias.`
  );
  const mailtoHref = `mailto:${CHIEF_OF_STAFF_EMAIL}?subject=${subject}&body=${body}`;

  const prefillText = `Para: ${CHIEF_OF_STAFF_EMAIL}\nAsunto: Pregunta de onboarding\n\nHola,\n\nTengo una pregunta sobre el onboarding que el agente no pudo responder completamente:\n\n"${question}"\n\n¿Me podés ayudar?\n\nGracias.`;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(prefillText);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail
    }
  };

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-xl"
      style={{
        backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
      }}
      role="region"
      aria-label="Escalación al Chief of Staff"
    >
      <p className="text-xs leading-snug" style={{ color: "var(--text)" }}>
        Esta pregunta puede requerir atención directa del equipo.
      </p>
      <div className="flex flex-wrap gap-2">
        {/* Primary: mailto link — #2 */}
        <a
          href={mailtoHref}
          aria-label={`Escribir al Chief of Staff sobre tu pregunta de onboarding — abre tu cliente de correo`}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] hover:opacity-90"
          style={{
            backgroundColor: "var(--accent)",
            color: "#0a0a0a",
            textDecoration: "none",
          }}
        >
          {/* Mail icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Escribir al Chief of Staff
        </a>

        {/* Fallback: copy prefilled text — #2 */}
        <button
          onClick={handleCopyMessage}
          aria-label={messageCopied ? "Mensaje copiado al portapapeles" : "Copiar mensaje prefabricado para enviarlo manualmente"}
          title="Copiar mensaje (por si no abre el correo automáticamente)"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          {messageCopied ? (
            <>
              <svg
                width="12"
                height="12"
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
              ¡Copiado!
            </>
          ) : (
            <>
              <svg
                width="12"
                height="12"
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
              Copiar mensaje
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function MessageBubble({ message, precedingQuestion = "" }: Props) {
  const isUser = message.role === "user";
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-post escalation feedback once when escalate === true
  useAutoEscalationFeedback(message, precedingQuestion);

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

          {/* Action buttons — visible on hover/focus, for assistant messages only */}
          {!isUser && (
            <div className="flex-shrink-0 mt-1 flex flex-col gap-0.5">
              <CopyButton text={message.content} />
              <FeedbackButtons
                question={precedingQuestion}
                escalated={message.escalate ?? false}
                sources={message.sources ?? []}
              />
            </div>
          )}
        </div>

        {/* #2: Escalation CTA — replaces the plain "Escalated" badge */}
        {message.escalate && (
          <EscalationCTA question={precedingQuestion} />
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
