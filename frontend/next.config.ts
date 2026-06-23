import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev tools indicator defaults to bottom-left, exactly where the
  // sidebar theme toggle lives — it overlapped and blocked the button in
  // dev. Disabled so the toggle is always clickable and the UI stays clean.
  devIndicators: false,
};

export default nextConfig;
