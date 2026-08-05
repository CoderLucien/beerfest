"use client";

import { useEffect, useState } from "react";
import { useVisitor } from "@/context/VisitorContext";
import { useRouter } from "next/navigation";
import type { Campaign, Zone } from "@beerfest/domain";
import { MapPin, Users, Clock, Ticket } from "lucide-react";

const ZONE_LABELS: Record<string, string> = {
  zone_a: "精酿主会场",
  zone_b: "文创美食区",
  zone_c: "国际美食区",
};

export default function HomePage() {
  const { visitor } = useVisitor();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visitor) { router.push("/login"); return; }
    Promise.all([
      fetch("/api/v1/zones/status").then(r => r.json()),
      fetch("/api/v1/campaigns/active").then(r => r.json()),
    ]).then(([z, c]) => {
      setZones(z.data?.zones ?? []);
      setCampaigns(c.data ?? []);
      setLoading(false);
    });
  }, []);

  if (!visitor || loading) {
    return <div className="min-h-screen bg-beerfest-cream flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-beerfest-yellow border-t-transparent rounded-full" /></div>;
  }

  const getStatusColor = (s: string) => s === "busy" ? "bg-beerfest-red/10 text-beerfest-red" : s === "under_capacity" ? "bg-beerfest-amber/10 text-beerfest-amber" : "bg-green-50 text-green-600";

  return (
    <div className="min-h-screen bg-beerfest-cream">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-beerfest-navy">啤酒节</h1>
          <p className="text-xs text-beerfest-navy/50">{visitor.name} · 欢迎</p>
        </div>
        <button onClick={() => router.push("/coupons")} className="bg-beerfest-yellow text-white text-sm px-4 py-2 rounded-lg font-medium">券包</button>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-beerfest-navy/60 mb-3">会场区域</h2>
          <div className="grid grid-cols-3 gap-3">
            {zones.map(z => (
              <div key={z.zoneId} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="text-xs font-bold text-beerfest-navy">{ZONE_LABELS[z.zoneId] ?? z.name}</div>
                <div className="flex items-center gap-1 text-xs text-beerfest-navy/50 mt-1"><Users className="w-3 h-3"/>{z.currentVisitors}</div>
                <div className="flex items-center gap-1 text-xs text-beerfest-navy/50"><Clock className="w-3 h-3"/>{z.avgWaitTime}min</div>
                <span className={`inline-block mt-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(z.status)}`}>{z.status === "busy" ? "繁忙" : z.status === "under_capacity" ? "客流不足" : "正常"}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-beerfest-navy/60 mb-3">进行中的活动</h2>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-beerfest-navy/40 text-sm">暂无活动</div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.campaignId} className="bg-white rounded-xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-beerfest-navy">{c.name}</h3>
                  <p className="text-xs text-beerfest-navy/50 mt-1">{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-beerfest-navy/50 mt-2 mb-3">
                    <span>预算 ¥{c.budgetLimit} / 已用 ¥{c.budgetConsumed}</span>
                  </div>
                  <button onClick={() => router.push(`/verify?campaignId=${c.campaignId}`)} className="w-full py-2.5 bg-beerfest-yellow text-white text-sm font-semibold rounded-lg">
                    立即领取
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
