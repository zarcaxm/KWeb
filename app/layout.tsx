import type { Metadata } from "next";
import { Literata, Source_Sans_3 } from "next/font/google";
import { DbProvider } from "@/lib/db/DbProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SearchProvider } from "@/components/layout/SearchContext";
import { CommandPalette } from "@/components/search/CommandPalette";
import "./globals.css";

const uiSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const writingSerif = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KWeb",
  description: "Structured topic knowledge workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${uiSans.variable} ${writingSerif.variable}`}>
      <body className="font-sans antialiased text-[var(--color-ink)]">
        <DbProvider>
          <SearchProvider>
            <AppShell>{children}</AppShell>
            <CommandPalette />
          </SearchProvider>
        </DbProvider>
      </body>
    </html>
  );
}
