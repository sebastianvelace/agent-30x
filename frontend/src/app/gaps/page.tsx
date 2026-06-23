"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SESSION_KEY = "30x-gaps-key";

interface GapRow {
  question: string;
  times_asked: number;
  times_escalated: number;
  thumbs_down: number;
  last_asked: string;
}

type ViewState =
  | { kind: "prompt" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "data"; rows: GapRow[] };

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

export default function GapsPage() {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(SESSION_KEY) ?? "";
    }
    return "";
  });
  const [view, setView] = useState<ViewState>({ kind: "prompt" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setView({ kind: "loading" });

    try {
      const res = await fetch(`${API_URL}/admin/gaps`, {
        headers: { "X-Api-Key": apiKey.trim() },
      });

      if (res.status === 401) {
        setView({ kind: "error", message: "clave incorrecta" });
        return;
      }

      if (!res.ok) {
        setView({ kind: "error", message: `Error del servidor (${res.status})` });
        return;
      }

      const rows: GapRow[] = await res.json();

      // Persist key in sessionStorage for convenience
      try {
        sessionStorage.setItem(SESSION_KEY, apiKey.trim());
      } catch {
        // sessionStorage unavailable — ignore
      }

      setView({ kind: "data", rows });
    } catch {
      setView({ kind: "error", message: "No se pudo conectar con el servidor." });
    }
  };

  const handleReset = () => {
    setView({ kind: "prompt" });
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0 sticky top-0 z-10"
        style={{
          backgroundColor: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <Logo height={24} />
          <span
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            /
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            Reporte de gaps
          </span>
        </div>
        <div className="flex items-center gap-3">
          {view.kind === "data" && (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              Cambiar clave
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Auth prompt */}
          {(view.kind === "prompt" || view.kind === "error") && (
            <div className="flex flex-col items-center gap-6 pt-8">
              <div className="flex flex-col items-center gap-2 text-center">
                {/* Lock icon */}
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ color: "var(--accent)" }}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                  Acceso restringido
                </h1>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Ingresá la clave de administrador para ver el reporte de gaps.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm flex flex-col gap-3"
                aria-label="Formulario de acceso"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="api-key"
                    className="text-xs font-medium"
                    style={{ color: "var(--muted)" }}
                  >
                    Clave de administrador
                  </label>
                  <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-shadow focus:ring-1 focus:ring-[var(--accent)]"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                    aria-describedby={view.kind === "error" ? "auth-error" : undefined}
                    aria-invalid={view.kind === "error"}
                  />
                </div>

                {view.kind === "error" && (
                  <p
                    id="auth-error"
                    className="text-xs font-medium"
                    style={{ color: "#ff6b6b" }}
                    role="alert"
                    aria-live="assertive"
                  >
                    {view.message}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#0a0a0a",
                  }}
                >
                  Acceder
                </button>
              </form>
            </div>
          )}

          {/* Loading */}
          {view.kind === "loading" && (
            <div className="flex items-center justify-center py-20" aria-live="polite" aria-label="Cargando reporte">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                role="status"
                aria-label="Cargando"
              />
            </div>
          )}

          {/* Data table */}
          {view.kind === "data" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                  Gaps del agente
                </h1>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                  }}
                >
                  {view.rows.length} {view.rows.length === 1 ? "gap" : "gaps"}
                </span>
              </div>

              {view.rows.length === 0 ? (
                <div
                  className="text-center py-16 rounded-2xl"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Todavía no hay gaps registrados — buena señal.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-sm"
                      aria-label="Reporte de gaps del agente"
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "var(--surface)",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: "var(--muted)" }}
                          >
                            Pregunta
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "var(--muted)" }}
                          >
                            Veces preguntada
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "var(--muted)" }}
                          >
                            Veces escaladas
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                            style={{ color: "var(--muted)" }}
                            aria-label="Thumbs down"
                          >
                            👎
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: "var(--muted)" }}
                          >
                            Última vez
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.rows.map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                i < view.rows.length - 1
                                  ? "1px solid var(--border)"
                                  : undefined,
                              backgroundColor:
                                i % 2 === 1
                                  ? "color-mix(in srgb, var(--surface) 40%, transparent)"
                                  : "transparent",
                            }}
                          >
                            <td
                              className="px-4 py-3 text-sm leading-relaxed max-w-xs"
                              style={{ color: "var(--text)" }}
                            >
                              {row.question}
                            </td>
                            <td
                              className="px-4 py-3 text-center font-semibold tabular-nums"
                              style={{ color: "var(--text)" }}
                            >
                              {row.times_asked}
                            </td>
                            <td
                              className="px-4 py-3 text-center font-semibold tabular-nums"
                              style={{
                                color:
                                  row.times_escalated > 0 ? "var(--accent)" : "var(--muted)",
                              }}
                            >
                              {row.times_escalated}
                            </td>
                            <td
                              className="px-4 py-3 text-center font-semibold tabular-nums"
                              style={{
                                color: row.thumbs_down > 0 ? "#ff6b6b" : "var(--muted)",
                              }}
                            >
                              {row.thumbs_down}
                            </td>
                            <td
                              className="px-4 py-3 text-xs whitespace-nowrap"
                              style={{ color: "var(--muted)" }}
                            >
                              {formatDate(row.last_asked)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
