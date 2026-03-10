import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";
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
        "h-full bg-slate-50 text-slate-900 overflow-x-hidden antialiased"
      )}>
        <Shell>
          {children}
        </Shell>
      </body>
    </html>
  );
}
