"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  height?: number;
  className?: string;
}

export default function Logo({ height = 32, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder to avoid layout shift before hydration
    return <div style={{ width: height * 2.5, height }} aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";
  const src = isDark ? "/30x-mark-on-dark.png" : "/30x-mark-on-light.png";

  // Approximate aspect ratio of the wordmark assets (~2.5:1 width:height)
  const width = Math.round(height * 2.5);

  return (
    <Image
      src={src}
      alt="30X"
      width={width}
      height={height}
      className={className}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}
