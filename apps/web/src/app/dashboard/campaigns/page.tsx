"use client";

import { useEffect, useState } from "react";
import type { Campaign, CampaignRules } from "@beerfest/domain";
import { Plus, Edit, Eye, Play, Pause, CheckCircle, XCircle } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_approval: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-600",
  running: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-600",
  completed: "bg-purple-100 text-purple-600",
  cancelled: "bg-red-100 text-red-500",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBudget, setNewBudget] = useState("5000");

  useEffect(() => {
    fetch("/api/v1/admin/campaigns")
      .then(r => r.json())
      .then(d => { setCampaigns(d.data ?? []); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/v1/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDesc,
        objective: "引导客流平衡",
        budgetLimit: Number(newBudget),
        targetVisitorType: "normal",
        containsAlcohol: false,
      }),
    });
    const d = await res.json();
    setCampaigns(prev => [...prev, d.data]);
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-2 border-beerfest-yellow border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-beerfest-navy">活动管理</h1>
          <p className="text-sm text-beerfest-navy/50">{campaigns.length} 个活动</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-beerfest-yellow text-white rounded-lg font-medium text-sm hover:bg-beerfest-amber transition-colors"
        >
          <Plus className="w-4 h-4" /> 新建活动
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-beerfest-navy mb-4">新建活动</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-beerfest-navy mb-1">活动名称</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-beerfest-yellow"
                  placeholder="例如：夜游错峰组合券"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-beerfest-navy mb-1">描述</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-beerfest-yellow resize-none"
                  placeholder="活动详细说明..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-beerfest-navy mb-1">预算上限 (¥)</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={e => setNewBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-beerfest-yellow"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-beerfest-navy/60">取消</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-beerfest-yellow text-white rounded-lg text-sm font-medium">创建</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.campaignId} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-beerfest-navy">{c.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] ?? "bg-gray-100"}`}>
                    {c.status === "draft" ? "草稿" : c.status === "pending_approval" ? "待审批" : c.status === "approved" ? "已审批" : c.status === "rejected" ? "已驳回" : c.status === "running" ? "运行中" : c.status === "paused" ? "已暂停" : c.status === "completed" ? "已完成" : c.status}
                  </span>
                </div>
                <p className="text-xs text-beerfest-navy/50 mt-1">{c.description?.slice(0, 60)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-beerfest-navy/50 mb-4">
              <span>预算 ¥{c.budgetLimit} / ¥{c.budgetConsumed}</span>
              <span>v{c.currentVersion}</span>
              <span>{new Date(c.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>

            {(c.status === "draft" || c.status === "rejected") && (
              <button className="w-full py-2 text-sm text-beerfest-yellow font-medium border border-beerfest-yellow/30 rounded-lg hover:bg-beerfest-yellow/5">
                提交审批
              </button>
            )}
            {c.status === "pending_approval" && (
              <a href={`/dashboard/campaigns/${c.campaignId}/approve`} className="block w-full py-2 text-sm text-beerfest-yellow font-medium border border-beerfest-yellow/30 rounded-lg hover:bg-beerfest-yellow/5 text-center">
                处理审批
              </a>
            )}
            {c.status === "running" && (
              <a href={`/dashboard/campaigns/${c.campaignId}/results`} className="block w-full py-2 text-sm text-beerfest-yellow font-medium border border-beerfest-yellow/30 rounded-lg hover:bg-beerfest-yellow/5 text-center">
                查看效果
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
