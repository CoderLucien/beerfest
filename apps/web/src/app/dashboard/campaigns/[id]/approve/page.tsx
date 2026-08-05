"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdapter } from "@/lib/db/synthetic";
import type { Campaign, CampaignVersion } from "@beerfest/domain";
import { CheckCircle, XCircle, AlertTriangle, Clock, ArrowLeft } from "lucide-react";

export default function ApprovePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [version, setVersion] = useState<CampaignVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    const adapter = getAdapter();
    Promise.all([
      adapter.getCampaign(params.id),
      adapter.getCampaignVersions(params.id),
    ]).then(([c, vs]) => {
      setCampaign(c);
      if (vs.length > 0) setVersion(vs[vs.length - 1]);
      setLoading(false);
    });
  }, [params.id]);

  const handleApprove = async () => {
    if (!params.id) return;
    setActionLoading(true);
    await fetch(`/api/v1/admin/campaigns/${params.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approver: "运营管理员", reason: "方案合理，预算可控" }),
    });
    router.push("/dashboard/campaigns");
  };

  const handleReject = async () => {
    if (!params.id) return;
    setActionLoading(true);
    await fetch(`/api/v1/admin/campaigns/${params.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approver: "运营管理员", reason: "需要进一步评估", campaignId: params.id, versionId: version?.versionId ?? "" }),
    });
    router.push("/dashboard/campaigns");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-2 border-beerfest-yellow border-t-transparent rounded-full" /></div>;
  }

  if (!campaign) {
    return <div className="text-center py-12 text-beerfest-navy/40">活动不存在</div>;
  }

  const riskLevel = campaign.budgetLimit > 8000 ? "high" : campaign.budgetLimit > 5000 ? "medium" : "low";
  const riskColor = riskLevel === "high" ? "text-beerfest-red" : riskLevel === "medium" ? "text-beerfest-amber" : "text-green-600";

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/dashboard/campaigns")}><ArrowLeft className="w-5 h-5 text-beerfest-navy/60" /></button>
        <div>
          <h1 className="text-xl font-bold text-beerfest-navy">审批活动</h1>
          <p className="text-sm text-beerfest-navy/50">{campaign.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-beerfest-navy mb-3">活动信息</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-beerfest-navy/50">名称</dt>
                <dd className="text-beerfest-navy font-medium">{campaign.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-beerfest-navy/50">目标</dt>
                <dd className="text-beerfest-navy">{campaign.objective}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-beerfest-navy/50">预算</dt>
                <dd className="text-beerfest-navy font-medium">¥{campaign.budgetLimit.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-beerfest-navy/50">状态</dt>
                <dd>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    campaign.status === "pending_approval" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100"
                  }`}>
                    {campaign.status === "pending_approval" ? "待审批" : campaign.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className={`rounded-xl border p-5 ${riskLevel === "high" ? "border-beerfest-red/30 bg-beerfest-red/5" : riskLevel === "medium" ? "border-beerfest-amber/30 bg-beerfest-amber/5" : "border-green-200 bg-green-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-5 h-5 ${riskColor}`} />
              <span className={`font-semibold ${riskColor}`}>风险评估</span>
            </div>
            <p className="text-sm text-beerfest-navy/60">
              {riskLevel === "high" ? "高预算活动，建议仔细评估 ROI 预期和止损策略" :
               riskLevel === "medium" ? "中等风险，预算适中，按正常流程审批" :
               "低风险活动，可快速通过"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-beerfest-navy mb-3">审批操作</h2>
            <div className="space-y-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> 批准通过
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="w-full py-3 bg-beerfest-red text-white rounded-xl font-semibold text-sm hover:bg-beerfest-red/80 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> 驳回
              </button>
              <button
                onClick={() => router.push("/dashboard/campaigns")}
                className="w-full py-3 border border-gray-200 rounded-xl text-sm text-beerfest-navy/60 font-medium"
              >
                返回
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-beerfest-navy mb-3">版本历史</h2>
            <div className="text-sm text-beerfest-navy/50">
              {version ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>版本 v{version.version} · {new Date(version.createdAt).toLocaleString("zh-CN")}</span>
                </div>
              ) : (
                <p>暂无版本记录</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
