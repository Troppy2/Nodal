import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { DemoStoreProvider } from "@/lib/store";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Nodal",
  description: "Where software, hardware, and creative projects find the people they need.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${jetbrains.variable} bg-white font-sans text-ink antialiased`}>
        <DemoStoreProvider>
          <AppShell>{children}</AppShell>
        </DemoStoreProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
