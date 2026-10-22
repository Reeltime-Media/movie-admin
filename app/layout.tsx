import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { DevToolsGuard } from "./components/DevToolsGuard";
import { QueryProvider } from "./components/QueryProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastProvider";
import { UploadProgressProvider } from "./components/UploadProgressContext";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
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
