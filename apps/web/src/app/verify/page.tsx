"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVisitor } from "@/context/VisitorContext";
import { getAdapter } from "@/lib/db/synthetic";
import type { Campaign } from "@beerfest/domain";
import { Shield, CheckCircle, AlertTriangle, Beer, ArrowRight } from "lucide-react";

export default function VerifyPage() {
  const { visitor, loading: ctxLoading } = useVisitor();
  const router = useRouter();
  const params = useSearchParams();
  const campaignId = params.get("campaignId");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [alcoholOk, setAlcoholOk] = useState(false);

  useEffect(() => {
    if (ctxLoading) return;
    if (!visitor) { router.push("/login"); return; }
    if (campaignId) {
      setCampaignLoading(true);
      fetch(`/api/v1/admin/campaigns/${campaignId}`)
        .then(r => r.json())
        .then(d => { setCampaign(d.data?.campaign ?? d.data ?? null); setCampaignLoading(false); })
        .catch(() => { setCampaign(null); setCampaignLoading(false); });
    }
  }, [ctxLoading, visitor, campaignId]);

  if (!visitor || ctxLoading) return null;

  const isAdult = visitor.age >= 18;
  const canViewAlcohol = visitor.alcoholVerified || visitor.type === "family";
  const canClaim = (campaignId && campaign?.containsAlcohol) ? (isAdult && visitor.alcoholVerified) : isAdult;

  const checks = [
    { label: "年龄验证", pass: isAdult, detail: `${visitor.age} 岁${isAdult ? "" : " (不满18)"}`, icon: Shield },
    { label: "酒精资格", pass: canViewAlcohol, detail: visitor.type === "family" ? "家庭游客免酒精" : visitor.alcoholVerified ? "已验证" : "未验证", icon: Beer, required: campaign?.containsAlcohol },
    { label: "会员等级", pass: true, detail: visitor.memberLevel === "gold" ? "金卡" : visitor.memberLevel === "silver" ? "银卡" : "普通", icon: CheckCircle },
  ];

  const handleClaim = async () => {
    if (campaignId) {
      await fetch("/api/v1/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitor.visitorId, campaignId, idempotencyKey: `${visitor.visitorId}_${campaignId}` }),
      });
      router.push("/coupons");
    }
  };

  return (
    <div className="min-h-screen bg-beerfest-cream">
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center">
          <button onClick={() => router.back()} className="text-beerfest-navy/50">← 返回</button>
          <h1 className="flex-1 text-center text-sm font-semibold text-beerfest-navy">资格校验</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-beerfest-navy mb-4">校验结果 · {visitor.name}</h2>
          <div className="space-y-3">
            {checks.filter(c => !("required" in c) || c.required !== false).map(c => (
              <div key={c.label} className={`flex items-center gap-3 p-3 rounded-lg ${c.pass ? "bg-green-50" : "bg-beerfest-red/10"}`}>
                <c.icon className={`w-5 h-5 flex-shrink-0 ${c.pass ? "text-green-500" : "text-beerfest-red"}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-beerfest-navy">{c.label}</div>
                  <div className="text-xs text-beerfest-navy/50">{c.detail}</div>
                </div>
                {c.pass ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-beerfest-red" />}
              </div>
            ))}
          </div>
        </div>

        {campaign && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h3 className="font-semibold text-beerfest-navy">{campaign.name}</h3>
            <p className="text-xs text-beerfest-navy/50 mt-1">{campaign.description}</p>
            <div className="flex gap-3 text-xs text-beerfest-navy/50 mt-2">
              <span>预算 ¥{campaign.budgetLimit}</span>
              <span>已用 ¥{campaign.budgetConsumed}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className={`w-full py-3.5 rounded-xl font-semibold transition-colors ${
            canClaim ? "bg-beerfest-yellow text-white hover:bg-beerfest-amber" : "bg-gray-300 text-gray-500"
          }`}
        >
          {canClaim ? "立即领取优惠券" : "资格不满足"}
        </button>
      </main>
    </div>
  );
}
