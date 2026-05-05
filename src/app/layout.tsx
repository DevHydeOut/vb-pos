import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider }   from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pigaro",
  description: "This is pos app name pigaro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ThemeProvider>
        {children}
        <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
