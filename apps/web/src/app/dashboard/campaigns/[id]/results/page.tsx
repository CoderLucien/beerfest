"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ExperimentResult, Campaign } from "@beerfest/domain";
import { getAdapter } from "@/lib/db/synthetic";
import { ArrowLeft, TrendingUp, Users, DollarSign, Percent } from "lucide-react";

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    const adapter = getAdapter();
    adapter.getCampaign(params.id).then(c => {
      setCampaign(c);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-2 border-beerfest-yellow border-t-transparent rounded-full" /></div>;
  }

  if (!campaign) {
    return <div className="text-center py-12 text-beerfest-navy/40">活动不存在</div>;
  }

  const metrics = [
    { label: "实验组转化率", value: "4.2%", icon: Percent, color: "text-blue-600" },
    { label: "对照组转化率", value: "2.1%", icon: Percent, color: "text-gray-600" },
    { label: "实验组 GMV", value: "¥3,120", icon: DollarSign, color: "text-green-600" },
    { label: "对照组 GMV", value: "¥3,120", icon: DollarSign, color: "text-gray-600" },
    { label: "优惠券成本", value: "¥780", icon: TrendingUp, color: "text-beerfest-amber" },
    { label: "净增益", value: "+¥2,340", icon: TrendingUp, color: "text-beerfest-yellow" },
  ];

  const control = { visitorCount: 160, conversionRate: 2.1, orderCount: 20, avgOrderValue: 156, netPaymentGMV: 3120, couponCostTotal: 0 };
  const experiment = { visitorCount: 170, conversionRate: 4.2, orderCount: 65, avgOrderValue: 96, netPaymentGMV: 6240, couponCostTotal: 780 };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/dashboard/campaigns")}><ArrowLeft className="w-5 h-5 text-beerfest-navy/60" /></button>
        <div>
          <h1 className="text-xl font-bold text-beerfest-navy">效果评估</h1>
          <p className="text-sm text-beerfest-navy/50">{campaign.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-xs text-beerfest-navy/50">{m.label}</span>
            </div>
            <div className="text-xl font-bold text-beerfest-navy">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-beerfest-navy mb-4">实验组 (n={experiment.visitorCount})</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">参与人数</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">{experiment.visitorCount}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">下单人数</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">{experiment.orderCount}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">转化率</td>
                <td className="py-2 text-right text-green-600 font-medium">{experiment.conversionRate}%</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">客单价</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">¥{experiment.avgOrderValue}</td>
              </tr>
              <tr>
                <td className="py-2 text-beerfest-navy/50">净支付 GMV</td>
                <td className="py-2 text-right text-beerfest-navy font-bold">¥{experiment.netPaymentGMV.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-beerfest-navy mb-4">对照组 (n={control.visitorCount})</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">参与人数</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">{control.visitorCount}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">下单人数</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">{control.orderCount}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">转化率</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">{control.conversionRate}%</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 text-beerfest-navy/50">客单价</td>
                <td className="py-2 text-right text-beerfest-navy font-medium">¥{control.avgOrderValue}</td>
              </tr>
              <tr>
                <td className="py-2 text-beerfest-navy/50">净支付 GMV</td>
                <td className="py-2 text-right text-beerfest-navy font-bold">¥{control.netPaymentGMV.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
