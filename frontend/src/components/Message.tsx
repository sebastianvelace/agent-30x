"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types/chat";
import type { Components } from "react-markdown";

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

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[80%] flex flex-col gap-2
          ${isUser ? "items-end" : "items-start"}
        `}
      >
        {!isUser && (
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--accent)" }}>
            30X Agent
          </span>
        )}

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

        {message.escalate && (
          <div
            className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: "#1a1a00", color: "var(--accent)", border: "1px solid #c8ff0040" }}
          >
            Escalated to Chief of Staff
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.sources.map((src) => (
              <span
                key={src}
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: "var(--border)", color: "var(--muted)" }}
              >
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
