"use client";

import { useEffect, useState } from "react";
import { getAdapter } from "@/lib/db/synthetic";
import type { DashboardData } from "@beerfest/domain";
import { Users, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Clock } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    getAdapter().getDashboardData().then(setData);
    getAdapter().getEventStream().then(setEvents);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-beerfest-yellow" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "busy":
        return "text-beerfest-red bg-beerfest-red/10";
      case "under_capacity":
        return "text-beerfest-amber bg-beerfest-amber/10";
      default:
        return "text-green-600 bg-green-50";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "busy":
        return "繁忙";
      case "under_capacity":
        return "客流不足";
      default:
        return "正常";
    }
  };

  const kpis = [
    { label: "实时客流", value: data.activeVisitors.toLocaleString(), icon: Users, color: "text-blue-600" },
    { label: "订单数", value: data.totalOrders.toLocaleString(), icon: ShoppingCart, color: "text-green-600" },
    { label: "净支付 GMV", value: `¥${data.totalGMV.toLocaleString()}`, icon: DollarSign, color: "text-beerfest-yellow" },
    { label: "剩余预算", value: `¥${data.totalBudgetRemaining.toLocaleString()}`, icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-beerfest-navy">态势总览</h1>
        <p className="text-sm text-beerfest-navy/50 mt-0.5">
          演示数据 · 实时更新 · last updated {new Date(data.lastUpdated).toLocaleTimeString("zh-CN")}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${kpi.color}`} />
                <span className="text-sm text-beerfest-navy/50">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-beerfest-navy">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-beerfest-navy mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-beerfest-yellow" />
            区域状态
          </h2>
          <div className="space-y-3">
            {data.zones.map((zone) => (
              <div
                key={zone.zoneId}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium text-beerfest-navy">{zone.name}</div>
                  <div className="text-xs text-beerfest-navy/40 mt-0.5">
                    客流 {zone.currentVisitors} / 基线 {zone.baselineVisitors} · 排队 {zone.avgWaitTime}min
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(zone.status)}`}>
                  {getStatusLabel(zone.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-beerfest-navy mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-beerfest-yellow" />
            最近事件
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-beerfest-navy/40 text-center py-8">暂无事件</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 8).map((event, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-beerfest-yellow mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-beerfest-navy/40">
                      {new Date(event.timestamp).toLocaleTimeString("zh-CN")}
                    </div>
                    <div className="text-sm text-beerfest-navy">
                      {String(event.payload?.message ?? event.eventType)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
