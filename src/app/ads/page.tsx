"use client";

import React, { useState } from "react";
import PageContainer from "../../components/PageContainer";
import LoadingSpinner from "../../components/LoadingSpinner";
import ContentCard from "../../components/ContentCard";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import FormInput from "../../components/FormInput";
import EmptyState from "../../components/EmptyState";
import { apiService } from "@/app/services/api.service";
import { useList } from "@/hooks/useList";

interface AdEntry {
  id: string;
  userId: string;
  name: string;
  bidPrice: number;
  promptContent: string;
}

const AdsPage: React.FC = () => {
  const {
    data: ads,
    setData: setAds,
    loading,
    error: listError,
    refetch
  } = useList<AdEntry>("/api/ads");
  const [error, setError] = useState<string | null>(null);
  const [newAd, setNewAd] = useState({
    name: "",
    bidPrice: "",
    promptContent: ""
  });

  const createAd = async () => {
    if (!newAd.name || !newAd.bidPrice || !newAd.promptContent) {
      setError("All fields are required");
      return;
    }

    try {
      const createdAd = await apiService.post<AdEntry>("/api/ads", {
        name: newAd.name,
        bidPrice: newAd.bidPrice,
        promptContent: newAd.promptContent
      });
      setAds((prev) => [...prev, createdAd]);
      setNewAd({ name: "", bidPrice: "", promptContent: "" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad");
    }
  };

  // Update ad
  const updateAd = async (
    id: string,
    field: keyof AdEntry,
    value: string | number
  ) => {
    try {
      const updatedAd = await apiService.put<AdEntry>(`/api/ads/${id}`, {
        [field]: value
      });
      setAds((prev) => prev.map((ad) => (ad.id === id ? updatedAd : ad)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ad");
    }
  };

  // Delete ad
  const deleteAd = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;

    try {
      await apiService.delete(`/api/ads/${id}`);
      setAds((prev) => prev.filter((ad) => ad.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete ad");
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading ads..." />;
  }

  return (
    <PageContainer maxWidth="container">
      <PageHeader title="Ad Entries" className="mb-8" />

      {/* Informational Section */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
        {/* Sheen effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
        <h2 className="text-lg font-semibold mb-6 text-white relative z-10">
          How Ads Work
        </h2>
        <div className="relative z-10 space-y-4">
          <p className="text-white/90 text-sm leading-relaxed">
            Each ad you create may be placed into a reporter's article
            generation prompt. This provides valuable exposure for your business
            by potentially influencing how your product is discussed in news
            articles.
          </p>
          <p className="text-white/90 text-sm leading-relaxed">
            Benefits include increased positive exposure and the ability to
            shape consumers' understanding of your product through contextual
            mentions in relevant news content.
          </p>
          <p className="text-cyan-300 font-semibold text-sm">
            Contact us for pricing information and to get started with your ad
            campaign.
          </p>
        </div>
      </div>

      {/* Pricing Section - commented out */}
      {false && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
          {/* Sheen effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
          <h2 className="text-lg font-semibold mb-6 text-white relative z-10">
            Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-white mb-3">
                Fixed-Text Ad
              </h3>
              <p className="text-lg font-bold text-cyan-300 mb-3">$5/mo</p>
              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                One fixed-text advertisement that appears in relevant reporter
                prompts.
              </p>
              <ul className="text-white/70 text-sm space-y-2">
                <li>• Static content placement</li>
                <li>• Guaranteed exposure in targeted prompts</li>
                <li>• Basic performance tracking</li>
              </ul>
            </div>

            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-white mb-3">
                Contextually Aware Ad
              </h3>
              <p className="text-lg font-bold text-cyan-300 mb-3">$20/mo</p>
              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                One dynamically tuned advertisement that uses AI to adapt to its
                context for maximum impact.
              </p>
              <ul className="text-white/70 text-sm space-y-2">
                <li>• AI-powered content optimization</li>
                <li>• Contextual adaptation for relevance</li>
                <li>• Advanced analytics and reporting</li>
                <li>• Maximum engagement potential</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 relative z-10">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Create New Ad Form */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
        {/* Sheen effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
        <h2 className="text-lg font-semibold mb-6 text-white relative z-10">
          Create New Ad
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 relative z-10">
          <FormInput
            type="text"
            label="Ad Name"
            value={newAd.name}
            onChange={(e) =>
              setNewAd((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter ad name"
          />

          <FormInput
            type="number"
            label="Bid Price ($)"
            step="0.01"
            min="0"
            value={newAd.bidPrice}
            onChange={(e) =>
              setNewAd((prev) => ({ ...prev, bidPrice: e.target.value }))
            }
            placeholder="0.00"
          />

          <div className="flex items-end">
            <GradientButton
              onClick={createAd}
              variant="blue"
              className="w-full py-3"
            >
              Create Ad
            </GradientButton>
          </div>
        </div>

        <div className="relative z-10">
          <FormInput
            as="textarea"
            label="Prompt Content"
            rows={4}
            value={newAd.promptContent}
            onChange={(e) =>
              setNewAd((prev) => ({ ...prev, promptContent: e.target.value }))
            }
            placeholder="Enter prompt content here..."
          />
        </div>
      </div>

      {/* Existing Ads */}
      <div className="space-y-6">
        {ads.length === 0 ? (
          <EmptyState
            title="No Ads Found"
            description="Create your first ad above."
          />
        ) : (
          ads.map((ad) => (
            <div
              key={ad.id}
              className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden"
            >
              {/* Sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <h3 className="text-base font-medium text-white">Ad Entry</h3>
                <GradientButton
                  onClick={() => deleteAd(ad.id)}
                  variant="red"
                  size="sm"
                >
                  Delete
                </GradientButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 relative z-10">
                <FormInput
                  type="text"
                  label="Name"
                  value={ad.name}
                  onChange={(e) => updateAd(ad.id, "name", e.target.value)}
                />

                <FormInput
                  type="number"
                  label="Bid Price ($)"
                  step="0.01"
                  min="0"
                  value={ad.bidPrice}
                  onChange={(e) =>
                    updateAd(ad.id, "bidPrice", parseFloat(e.target.value) || 0)
                  }
                />

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-white/90 mb-3">
                    ID
                  </label>
                  <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm backdrop-blur-sm">
                    {ad.id}
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Prompt Content
                </label>
                <FormInput
                  as="textarea"
                  label="Prompt Content"
                  rows={4}
                  value={ad.promptContent}
                  onChange={(e) =>
                    updateAd(ad.id, "promptContent", e.target.value)
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
};

export default AdsPage;
