import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider }   from "@/components/providers/theme-provider";
import { InactivityLogoutProvider } from "@/components/providers/inactivity-logout-provider";
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
  const themeScript = `
    try {
      const stored = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = stored || (prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.dataset.theme = theme;
    } catch {}
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <InactivityLogoutProvider>
            {children}
          </InactivityLogoutProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
