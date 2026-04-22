import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";
import NavShell from "@/components/NavShell";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tended — Home Inventory",
  description: "Manage your home inventory, shopping list, and household spending in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(dmSans.variable, playfair.variable)}>
      <body className="bg-background text-foreground antialiased font-sans">
        {/*
          NavShell renders a 220 px fixed sidebar on md+ and a bottom bar on mobile.
          It returns null on auth/setup routes.
        */}
        <NavShell />

        <ClientProvider>
          {/*
            md:pl-[220px]  → offset for the 220 px fixed sidebar on desktop
            pb-20 md:pb-0  → space for the floating bottom bar on mobile
          */}
          <div className="md:pl-[220px] pb-20 md:pb-0">
            {children}
          </div>
        </ClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
