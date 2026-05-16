import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MovieCatalogProvider } from "./components/MovieCatalogProvider";
import { ToastProvider } from "./components/ToastProvider";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-text font-sans">
        <MovieCatalogProvider>{children}</MovieCatalogProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
