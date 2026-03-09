import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "SalesPulse | Quantum Scaling",
  description: "Advanced Sales Call Review & Coaching Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(
        inter.className,
        inter.variable,
        outfit.variable,
        "h-full bg-slate-50 text-slate-900 overflow-x-hidden antialiased flex"
      )}>
        <Sidebar aria-label="Main Sidebar" />
        <main className="flex-1 ml-[300px] min-h-screen flex flex-col relative">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
