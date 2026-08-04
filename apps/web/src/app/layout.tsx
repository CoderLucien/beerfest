import type { Metadata } from "next";
import "./globals.css";
import { VisitorProvider } from "@/context/VisitorContext";

export const metadata: Metadata = {
  title: "青岛啤酒节 · 智能营促销系统",
  description: "青岛啤酒节智能营促销系统 Demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-beerfest-cream text-beerfest-navy antialiased">
        <VisitorProvider>{children}</VisitorProvider>
      </body>
    </html>
  );
}
