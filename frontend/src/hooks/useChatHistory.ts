"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Message } from "@/types/chat";

const STORAGE_KEY = "30x-chats-v1";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Nueva conversación";
  return first.content.slice(0, 28).trim() + (first.content.length > 28 ? "…" : "");
}

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    // Rehydrate Date objects in messages
    return parsed.map((conv) => ({
      ...conv,
      messages: conv.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage quota exceeded or unavailable — silent fail
  }
}

export function useChatHistory() {
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SSR-safe mount: read localStorage only after mount
  useEffect(() => {
    setMounted(true);
    const stored = loadFromStorage();
    setConversations(stored);
  }, []);

  // Persist whenever conversations change (debounced 300ms)
  useEffect(() => {
    if (!mounted) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToStorage(conversations);
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [conversations, mounted]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeConversation?.messages ?? [];

  const createConversation = useCallback((): string => {
    const newConv: Conversation = {
      id: generateId(),
      title: "Nueva conversación",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, []);

  const updateMessages = useCallback(
    (id: string, updater: (prev: Message[]) => Message[]) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== id) return conv;
          const newMessages = updater(conv.messages);
          return {
            ...conv,
            messages: newMessages,
            title: deriveTitle(newMessages),
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
      }
    },
    [activeId]
  );

  const loadConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const clearActive = useCallback(() => {
    setActiveId(null);
  }, []);

  return {
    mounted,
    conversations,
    activeId,
    activeMessages,
    createConversation,
    updateMessages,
    deleteConversation,
    loadConversation,
    clearActive,
  };
}
