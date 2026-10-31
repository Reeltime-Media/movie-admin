import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { DevToolsGuard } from "./components/DevToolsGuard";
import { QueryProvider } from "./components/QueryProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastProvider";
import { UploadProgressProvider } from "./components/UploadProgressContext";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Reeltime Admin",
  description: "Admin console for managing Reeltime content, users, and revenue.",
};

const themeBootScript = `
(function(){
  try {
    var t = localStorage.getItem('reeltime-admin-theme');
    if (t === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-text">
        <DevToolsGuard />
        <ThemeProvider>
          <QueryProvider>
            <UploadProgressProvider>{children}</UploadProgressProvider>
          </QueryProvider>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
