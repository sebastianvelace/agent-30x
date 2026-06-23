"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="w-8 h-8 flex items-center justify-center rounded-lg opacity-0"
        style={{ border: "1px solid var(--border)" }}
        disabled
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !buttonRef.current || !overlayRef.current) {
      setTheme(isDark ? "light" : "dark");
      return;
    }

    // Get button position for the radial origin
    const btn = buttonRef.current;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Compute max radius to cover the entire viewport from the button center
    const maxR = Math.ceil(
      Math.max(
        Math.hypot(cx, cy),
        Math.hypot(window.innerWidth - cx, cy),
        Math.hypot(cx, window.innerHeight - cy),
        Math.hypot(window.innerWidth - cx, window.innerHeight - cy)
      )
    );

    const overlay = overlayRef.current;

    // Set overlay background to the NEW theme color
    const newBg = isDark ? "#f7f7f7" : "#0a0a0a";
    overlay.style.backgroundColor = newBg;

    // KEY FIX: use gsap.set to apply clip-path BEFORE making it visible.
    // This ensures the circle starts at radius=0 in the same frame as display:block,
    // so the browser never paints a full-screen overlay — eliminating the flash.
    const startClip = `circle(0px at ${cx}px ${cy}px)`;
    const endClip = `circle(${maxR}px at ${cx}px ${cy}px)`;

    gsap.set(overlay, { clipPath: startClip, display: "block", opacity: 1 });

    gsap.to(overlay, {
      clipPath: endClip,
      duration: 0.5,
      ease: "power2.inOut",
      onStart: () => {
        // Switch the actual theme once the circle has grown enough to cover it.
        // We wait until partway through so the underlying DOM switch
        // happens while the overlay already hides it.
        setTimeout(() => setTheme(isDark ? "light" : "dark"), 150);
      },
      onComplete: () => {
        // Hide the overlay; clear clip-path so it's ready for next toggle
        gsap.set(overlay, { display: "none", clipPath: "" });
      },
    });
  };

  return (
    <>
      {/* Full-screen overlay for the clip-path reveal */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      <button
        ref={buttonRef}
        onClick={handleToggle}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--muted)",
        }}
      >
        {isDark ? (
          /* Sun icon */
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
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          /* Moon icon */
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
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </>
  );
}
