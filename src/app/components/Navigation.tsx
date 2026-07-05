"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import Ticker from "../../components/Ticker";

interface NavigationProps {
  appFullName: string;
}

export default function Navigation({ appFullName }: NavigationProps) {
  const { user, isAdmin, setUser } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    router.push("/");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navigationItems = [
    { href: "/about", text: "About", condition: true },
    { href: "/forum", text: "Forum", condition: !!user },
    { href: "/reporters", text: "Reporters", condition: !!user },
    { href: "/articles", text: "Articles", condition: true },
    { href: "/editions", text: "Editions", condition: true },
    { href: "/account", text: "Account", condition: !!user },
    { href: "/events", text: "Events", condition: true }
  ];

  const adminItems = [
    { href: "/users", text: "Users" },
    { href: "/admin/bluesky-messages", text: "Bluesky Messages" },
    { href: "/logs", text: "Logs" },
    { href: "/editor", text: "Editor Settings", isEditorButton: true }
  ];

  const linkClasses = (isMobile: boolean) =>
    isMobile
      ? "text-white/60 hover:text-[var(--tui-primary)] block px-3 py-2 rounded-md text-base font-mono transition-colors"
      : "text-white/60 hover:text-[var(--tui-primary)] px-3 py-2 rounded-md text-sm font-mono transition-colors";

  const adminLinkClasses = (isMobile: boolean, isEditorButton?: boolean) => {
    if (isEditorButton) {
      return isMobile
        ? "bg-[var(--tui-primary)] text-black block px-3 py-2 rounded-md text-base font-mono font-medium hover:opacity-90 transition-colors"
        : "bg-[var(--tui-primary)] text-black px-4 py-2 rounded-lg text-xs font-mono font-medium hover:opacity-90 transition-colors";
    }
    return linkClasses(isMobile);
  };

  return (
    <>
      <nav className="bg-black border-b border-[var(--tui-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Image src="/icon.png" alt="App icon" width={32} height={32} />
                <span className="text-base font-bold text-[var(--tui-primary)] font-mono">
                  {appFullName}
                </span>
              </Link>
            </div>

            {/* Desktop Navigation — admin items intentionally mobile-only (shown in collapsed menu) */}
            <div className="hidden md:flex items-center space-x-4">
              {navigationItems
                .filter((item) => item.condition)
                .map((item) => {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={linkClasses(false)}
                    >
                      {item.text}
                    </Link>
                  );
                })}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-white/60 hover:text-[var(--tui-primary)] px-3 py-2 rounded-md text-sm font-mono transition-colors"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-white/60 hover:text-[var(--tui-primary)] px-3 py-2 rounded-md text-sm font-mono transition-colors"
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="text-white/60 hover:text-[var(--tui-primary)] p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--tui-primary)]"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <svg
                  className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMobileMenuOpen ? "block" : "hidden"}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black border-t border-[var(--tui-border)]">
            {navigationItems.map((item) => {
              if (!item.condition) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={linkClasses(true)}
                >
                  {item.text}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                {adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={adminLinkClasses(true, item.isEditorButton)}
                  >
                    {item.text}
                  </Link>
                ))}
              </>
            )}

            <div className="border-t border-[var(--tui-border)] pt-4 mt-4">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="text-white/60 hover:text-[var(--tui-primary)] block w-full text-left px-3 py-2 rounded-md text-base font-mono transition-colors"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="text-white/60 hover:text-[var(--tui-primary)] block px-3 py-2 rounded-md text-sm font-mono transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <Ticker />
    </>
  );
}
