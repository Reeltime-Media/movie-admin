import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { QueryProvider } from "./components/QueryProvider";
import { ToastProvider } from "./components/ToastProvider";
import { UploadProgressProvider } from "./components/UploadProgressContext";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Used for IDs, counts, and money — figures line up in tables.
const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Reeltime Admin",
  description: "Admin console for managing Reeltime content, users, and revenue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-text font-sans">
        <QueryProvider>
          <UploadProgressProvider>{children}</UploadProgressProvider>
        </QueryProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
