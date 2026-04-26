"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import LoadingSpinner from "../../components/LoadingSpinner";
import ContentCard from "../../components/ContentCard";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import FormInput from "../../components/FormInput";
import { apiService } from "../services/api.service";

interface User {
  id: string;
  email: string;
  role: "admin" | "editor" | "reporter" | "user";
  createdAt: number;
  lastLoginAt?: number;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Form state for account info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  // Abilities state
  const [hasReader, setHasReader] = useState(false);
  const [hasReporter, setHasReporter] = useState(false);
  const [hasEditor, setHasEditor] = useState(false);

  const checkAuthAndLoadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const data = await apiService.get<{ user: User }>("/api/auth/verify");
      setUser(data.user);
      // Load existing account info (placeholder - would come from API)
      loadAccountInfo();
      // Load abilities
      loadAbilities();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuthAndLoadUser();
  }, [checkAuthAndLoadUser]);

  const loadAccountInfo = async () => {
    // Placeholder - in a real app, this would fetch from an API
    // For now, we'll just set some placeholder data
    setFirstName("John");
    setLastName("Doe");
    setPhone("(555) 123-4567");
    setCompany("Example Corp");
    setBio("News enthusiast and content creator.");
  };

  const loadAbilities = async () => {
    try {
      const [readerData, reporterData, editorData] = await Promise.all([
        apiService.get<{ hasReader: boolean }>("/api/abilities/reader"),
        apiService.get<{ hasReporter: boolean }>("/api/abilities/reporter"),
        apiService.get<{ hasEditor: boolean }>("/api/abilities/editor")
      ]);

      setHasReader(readerData.hasReader);
      setHasReporter(reporterData.hasReporter);
      setHasEditor(editorData.hasEditor);
    } catch {
      console.error("Failed to load abilities");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Placeholder - in a real app, this would save to an API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      alert("Account information saved successfully!");
    } catch {
      alert("Failed to save account information.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading account..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageContainer>
      <ContentCard>
        <PageHeader
          title="Account Settings"
          description="Manage your account information and preferences"
          className="px-6 py-4 border-b border-white/20"
        />

        <div className="p-6 space-y-8">
          {/* Account Permissions */}
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Account Permissions
            </h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="reader-permission"
                  checked={hasReader}
                  disabled
                  className="h-4 w-4 text-white focus:ring-white border-white/30 rounded cursor-not-allowed bg-white/10"
                />
                <label
                  htmlFor="reader-permission"
                  className="text-sm font-medium text-white/90"
                >
                  Reader
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="reporter-permission"
                  checked={hasReporter}
                  disabled
                  className="h-4 w-4 text-white focus:ring-white border-white/30 rounded cursor-not-allowed bg-white/10"
                />
                <label
                  htmlFor="reporter-permission"
                  className="text-sm font-medium text-white/90"
                >
                  Reporter
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="editor-permission"
                  checked={hasEditor}
                  disabled
                  className="h-4 w-4 text-white focus:ring-white border-white/30 rounded cursor-not-allowed bg-white/10"
                />
                <label
                  htmlFor="editor-permission"
                  className="text-sm font-medium text-white/90"
                >
                  Editor
                </label>
              </div>
            </div>
            <div className="mt-4 text-sm text-white/70">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </div>
            {/* Upgrade Options */}
            <div className="mt-6 space-y-4">
              {/* Upgrade to Reader (existing) */}
              {!hasReader && (
                <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        Upgrade to Reader
                      </h3>
                      <p className="text-xs text-white/70 mt-1">
                        Premium access to all published content and enhanced
                        reading features
                      </p>
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_STRIPE_READER_BUY_URL}?prefilled_email=${user.email}`}
                      className="group relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden transition-all duration-300"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                      <span className="relative">Upgrade To Reader</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Upgrade to Reporter */}
              {!hasReporter && (
                <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        Upgrade to Reporter
                      </h3>
                      <p className="text-xs text-white/70 mt-1">
                        Access AI-powered reporting tools and create
                        professional news content
                      </p>
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_STRIPE_REPORTER_BUY_URL}?prefilled_email=${user.email}`}
                      className="group relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 overflow-hidden transition-all duration-300"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                      <span className="relative">Upgrade To Reporter</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Upgrade to Editor */}
              {!hasEditor && (
                <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        Upgrade to Editor
                      </h3>
                      <p className="text-xs text-white/70 mt-1">
                        Full editorial control with advanced publishing tools
                        and team management
                      </p>
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_STRIPE_EDITOR_BUY_URL}?prefilled_email=${user.email}`}
                      className="group relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 overflow-hidden transition-all duration-300"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                      <span className="relative">Upgrade To Editor</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                type="text"
                id="firstName"
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />

              <FormInput
                type="text"
                id="lastName"
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />

              <FormInput
                type="email"
                id="email"
                label="Email Address"
                value={user.email}
                disabled
                placeholder="Email cannot be changed"
              />
              <p className="text-xs text-white/50 -mt-2">
                Email cannot be changed
              </p>

              <FormInput
                type="tel"
                id="phone"
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />

              <FormInput
                type="text"
                id="company"
                label="Company/Organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter your company or organization"
              />

              <FormInput
                as="textarea"
                id="bio"
                label="Bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself"
              />
            </div>
          </div>

          {/* Account Activity */}
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Account Activity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/70">Last Login</p>
                <p className="font-medium text-white">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/70">Account Created</p>
                <p className="font-medium text-white">
                  {new Date(user.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-white/20">
            <GradientButton
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              loadingText="Saving..."
              variant="blue"
            >
              Save Changes
            </GradientButton>
          </div>
        </div>
      </ContentCard>
    </PageContainer>
  );
}
