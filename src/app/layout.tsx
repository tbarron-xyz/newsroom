import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "./components/Navigation";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";
import { ServiceContainer } from "./services/service-container";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export async function generateMetadata(): Promise<Metadata> {
  const configService = await ServiceContainer.getInstance().getConfigService();
  const fullName = await configService.getAppFullName();

  return {
    title: fullName,
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
  const configService = await ServiceContainer.getInstance().getConfigService();
  const appFullName = await configService.getAppFullName();

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
