"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Logo from "./Logo";

gsap.registerPlugin(useGSAP);

const SESSION_KEY = "30x-intro-seen";

const VALUE_PROPS = [
  "Respondo desde los documentos internos",
  "Recuerdo el contexto de la conversación",
  "Te digo a quién acudir si no lo sé",
];

interface Props {
  onDone: () => void;
}

export default function IntroHero({ onDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");

    if (reducedMotion || !containerRef.current) {
      onDone();
      return;
    }

    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 0.97,
      duration: 0.45,
      ease: "power2.in",
      onComplete: onDone,
    });
  };

  useGSAP(
    () => {
      if (!containerRef.current || reducedMotion) return;

      const logo = containerRef.current.querySelector(".intro-logo");
      const tagline = containerRef.current.querySelector(".intro-tagline");
      const props = containerRef.current.querySelectorAll(".intro-prop");
      const cta = containerRef.current.querySelector(".intro-cta");
      const skip = containerRef.current.querySelector(".intro-skip");

      const tl = gsap.timeline();

      tl.fromTo(logo, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" })
        .fromTo(tagline, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.2")
        .fromTo(props, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", stagger: 0.12 }, "-=0.1")
        .fromTo(
          [cta, skip],
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.08 },
          "-=0.1"
        );
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--bg)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a 30X Onboarding Agent"
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, color-mix(in srgb, var(--accent) 8%, transparent), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-10 text-center max-w-lg w-full">
        {/* Logo */}
        <div className={`intro-logo ${reducedMotion ? "" : "opacity-0"}`}>
          <Logo height={52} />
        </div>

        {/* Tagline */}
        <div className={`intro-tagline flex flex-col gap-2 ${reducedMotion ? "" : "opacity-0"}`}>
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Tu copiloto de onboarding
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Todo lo que necesitás saber sobre 30X, en un solo lugar.
          </p>
        </div>

        {/* Value props */}
        <ul className="flex flex-col gap-3 w-full max-w-sm" aria-label="Lo que puedo hacer">
          {VALUE_PROPS.map((prop) => (
            <li
              key={prop}
              className={`intro-prop flex items-center gap-3 text-sm text-left px-4 py-3 rounded-xl ${reducedMotion ? "" : "opacity-0"}`}
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--accent)" }}
                aria-hidden="true"
              />
              {prop}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={dismiss}
            className={`intro-cta px-8 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${reducedMotion ? "" : "opacity-0"}`}
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
            autoFocus
          >
            Empezar →
          </button>
          <button
            onClick={dismiss}
            className={`intro-skip text-xs underline underline-offset-2 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded ${reducedMotion ? "" : "opacity-0"}`}
            style={{ color: "var(--muted)" }}
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}
