"use client";

import { useEffect, useState } from "react";

const LINES = [
  "INITIALIZING TERMINAL...",
  "ESTABLISHING SECURE CONNECTION...",
  "BYPASSING PROXY...",
  "CONNECTING TO BMRS SECURE RELAY...",
  "DECRYPTING PAYLOAD...",
  "ACCESS GRANTED."
];

export default function TerminalBootScreen() {
  const [lines, setLines] = useState<string[]>([]);
  const [booted, setBooted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Only run this sequence once per browser session
    const hasBooted = sessionStorage.getItem("terminal_booted");
    if (hasBooted) {
      setVisible(false);
      return;
    }

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < LINES.length) {
        setLines((prev) => [...prev, LINES[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setBooted(true);
          sessionStorage.setItem("terminal_booted", "true");
          setTimeout(() => setVisible(false), 800); // Wait for fade out transition
        }, 1500); // Hold for 1.5 seconds so user can read
      }
    }, 250); // Speed of text lines appearing

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-center items-center p-8 bg-black font-mono text-emerald-500 transition-opacity duration-700 ease-in-out ${
        booted ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black pointer-events-none"></div>
      
      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-3 border border-emerald-900/30 bg-black/50 p-8 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-sm">
        <div className="text-emerald-500/50 text-xs mb-2 border-b border-emerald-900/50 pb-2 flex justify-between">
          <span>SECURE_BOOT_v2.4.1</span>
          <span>SYSTEM_READY</span>
        </div>
        {lines.map((line, i) => (
          <div 
            key={i} 
            className="text-sm md:text-base lg:text-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <span className="text-emerald-400 mr-4 font-bold opacity-80">&gt;</span> 
            {line}
          </div>
        ))}
        {!booted && (
          <div className="animate-pulse w-3 h-5 bg-emerald-500 mt-2 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
        )}
      </div>
    </div>
  );
}
