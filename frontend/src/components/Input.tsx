"use client";

import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200 focus-within:border-[var(--accent)]"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Preguntá lo que necesites sobre 30X..."
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--muted)] disabled:opacity-50"
        style={{ color: "var(--text)" }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-30"
        style={{ backgroundColor: "var(--accent)" }}
        aria-label="Send message"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L7 13M7 1L2 6M7 1L12 6"
            stroke="black"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
