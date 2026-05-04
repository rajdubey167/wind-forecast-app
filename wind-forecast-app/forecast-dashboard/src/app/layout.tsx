import type { Metadata } from "next";
import "./globals.css";
import TerminalBootScreen from "@/components/ui/terminal-boot";
import FeatureTour from "@/components/ui/feature-tour";

export const metadata: Metadata = {
  title: "Wind Power Control Terminal",
  description: "Advanced Energy Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="font-sans antialiased bg-[#0B0D11] text-slate-200"
        suppressHydrationWarning
      >
        <TerminalBootScreen />
        <FeatureTour />
        {children}
      </body>
    </html>
  );
}
