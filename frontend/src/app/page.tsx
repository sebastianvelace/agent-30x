import Chat from "@/components/Chat";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="flex flex-col" style={{ height: "100dvh" }}>
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-bold text-xs"
            style={{ backgroundColor: "var(--accent)" }}
          >
            30
          </div>
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
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>
    </main>
  );
}
