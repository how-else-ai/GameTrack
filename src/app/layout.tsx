import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const pressStart2P = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Game Time Tracker",
  description: "Track your kids' gaming time with tickets and timers",
  keywords: ["Game Time", "Kids", "Timer", "Tickets", "Gaming"],
  authors: [{ name: "Game Time Tracker" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${pressStart2P.variable} antialiased bg-background text-foreground font-pixel`}
        style={{ fontFamily: "'Press Start 2P', cursive" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
