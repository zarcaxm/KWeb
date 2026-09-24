import type { Metadata } from "next";
import { DbProvider } from "@/lib/db/DbProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SearchProvider } from "@/components/layout/SearchContext";
import { CommandPalette } from "@/components/search/CommandPalette";
import "./globals.css";

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
    <html lang="en">
      <body className="font-sans antialiased">
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
