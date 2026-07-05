"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use direct fetch for login since we don't have auth tokens yet
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        // Store JWT tokens in localStorage
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
        setUser(data.user);
        router.push("/editor");
      } else {
        const data = await response.json();
        setError(data.message || "Invalid email or password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, role: "admin" })
      });

      if (response.ok) {
        const data = await response.json();
        // Store JWT tokens in localStorage
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
        setUser(data.user);
        router.push("/editor");
      } else {
        const data = await response.json();
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="tui-theme min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="border border-[var(--tui-border)] p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-mono text-[var(--tui-primary)] mb-2">
              Welcome Back
            </h1>
            <p className="text-[var(--tui-muted)] font-mono text-lg">
              Enter your credentials to access the editor
            </p>
          </div>

          <div className="border border-[var(--tui-border)] p-4 mb-6">
            <p className="tui-text-muted text-sm mb-2">
              <strong className="tui-text-primary">New users:</strong> Enter the
              email and password you wish to register with, then click Register.
            </p>
            <p className="tui-text-muted text-sm">
              <strong className="tui-text-primary">Existing users:</strong>{" "}
              Enter your existing email and password, then click Login.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="tui-label block mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tui-input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="tui-label block mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="tui-input"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <div className="tui-msg-error">{error}</div>}

            <button
              type="submit"
              disabled={loading || isRegistering}
              className="tui-btn-primary w-full"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-4">
            <button
              onClick={handleRegister}
              disabled={loading || isRegistering}
              className="tui-btn w-full"
            >
              {isRegistering ? "Registering..." : "Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
