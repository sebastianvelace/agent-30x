"use client";

import type { Message } from "@/types/chat";

interface Props {
  message: Message;
}

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
          {message.content.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split("\n").length - 1 && <br />}
            </span>
          ))}
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
