import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "./components/Navigation";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

const appFullName = process.env.APP_FULL_NAME || "attonews";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: appFullName,
    description: "AI-powered newsroom with automated reporting and editing",
    icons: {
      icon: "/icon.png"
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased tui-theme`}
      >
        <AuthProvider>
          <Navigation appFullName={appFullName} />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
