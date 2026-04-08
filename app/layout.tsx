import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";
import NavShell from "@/components/NavShell";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tended",
  description: "Household Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", outfit.variable, inter.variable)}>
      <body className="bg-background text-foreground antialiased">
        {/*
          NavShell is a client component that reads usePathname() to decide
          whether to render and which item to mark active.
          It renders nothing on auth / setup routes.
        */}
        <NavShell />

        <ClientProvider>
          {/*
            md:pl-14  → offset for the 56 px (w-14) fixed sidebar on desktop
            pb-24     → space for the floating bottom bar on mobile
            md:pb-0   → no bottom padding needed on desktop
          */}
          <div className="md:pl-14 pb-24 md:pb-0">
            {children}
          </div>
        </ClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
