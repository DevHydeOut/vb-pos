import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider }   from "@/components/providers/theme-provider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
      <body
        className={`${sora.className} antialiased`}
      >
        <ThemeProvider>
        {children}
        <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
