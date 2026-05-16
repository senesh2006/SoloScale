"use client";

import { useState, useEffect } from "react";

/** Background loop — https://www.youtube.com/watch?v=10MrIjuFG-0 */
const VIDEO_ID = "10MrIjuFG-0";

type Props = {
  /** dark = login/signup panels; light = marketing landing with dark text */
  variant?: "dark" | "light";
};

export function AuthVideoBackground({ variant = "dark" }: Props) {
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Simple timer fallback in case the API event is blocked or slow
    const timer = setTimeout(() => setIsReady(true), 3000);
    
    // Listen for messages from the YouTube IFrame API
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        // 'infoDelivery' with state 1 means 'Playing'
        if (data.event === "infoDelivery" && data.info?.playerState === 1) {
          setIsReady(true);
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timer);
    };
  }, []);

  // Hydration fix: only render the full URL on the client
  const embedSrc = mounted 
    ? `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&origin=${window.location.origin}`
    : "";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-zinc-950"
    >
      {mounted && (
        <iframe
          src={embedSrc}
          title=""
          tabIndex={-1}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen={false}
          className={Object.entries({
            "absolute left-1/2 top-1/2 h-[56.25vw] min-h-[100svh] w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0 transition-all duration-1000 motion-reduce:hidden": true,
            "opacity-0 scale-110": !isReady,
            "opacity-100 scale-100": isReady,
          })
            .filter(([_, value]) => value)
            .map(([key]) => key)
            .join(" ")}
        />
      )}
      
      {/* Dynamic Overlays */}
      {variant === "light" ? (
        <>
          <div className="absolute inset-0 bg-white/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-white/40" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-zinc-950/25" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/15 via-zinc-950/05 to-indigo-950/15" />
        </>
      )}

      {/* Loading fallback state to keep it dark while buffering */}
      {!isReady && (
        <div className="absolute inset-0 bg-zinc-950 transition-opacity duration-1000" />
      )}
    </div>
  );
}
