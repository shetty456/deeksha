import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict Mode double-invokes useEffect in dev, which breaks the audio
  // pipeline (WebSocket, MediaRecorder, AudioContext). Disable it globally.
  reactStrictMode: false,
};

export default nextConfig;
