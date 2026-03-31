import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SearchBar } from "@/components/search-bar";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Demand Planning Dashboard",
  description: "Weekly demand planning and forecast monitoring dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-slate-900 text-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight whitespace-nowrap">
              Demand Planning
            </Link>
            <SearchBar />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
