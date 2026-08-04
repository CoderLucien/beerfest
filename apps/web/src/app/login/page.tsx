"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVisitor } from "@/context/VisitorContext";
import { getAdapter } from "@/lib/db/synthetic";
import type { Visitor } from "@beerfest/domain";
import { Beer, Users, User, Shield } from "lucide-react";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  demo_normal_01: <User className="w-8 h-8" />,
  demo_family_01: <Users className="w-8 h-8" />,
  demo_normal_02: <User className="w-8 h-8" />,
  demo_admin_01: <Shield className="w-8 h-8" />,
};

const ROLE_LABELS: Record<string, string> = {
  demo_normal_01: "金卡会员 · 已验证",
  demo_family_01: "银卡会员 · 家庭游客",
  demo_normal_02: "普通会员",
  demo_admin_01: "运营管理员",
};

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const { setVisitor } = useVisitor();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAdapter()
      .getPresetVisitors()
      .then(setVisitors);
  }, []);

  const handleLogin = async () => {
    if (!selected) return;
    setLoading(true);
    const visitor = visitors.find((v) => v.visitorId === selected);
    if (visitor) {
      setCookie("beerfest_visitor_id", visitor.visitorId, 1);
      setVisitor(visitor);
      if (visitor.visitorId === "demo_admin_01") {
        router.push("/dashboard");
      } else {
        router.push("/verify");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-beerfest-yellow mb-6">
            <Beer className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-beerfest-navy mb-2">
            啤酒节
          </h1>
          <p className="text-beerfest-amber text-sm">
            智能营促销系统 · 演示环境
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-beerfest-yellow/20 p-6 mb-6">
          <h2 className="text-sm font-medium text-beerfest-navy/60 mb-4 uppercase tracking-wide">
            选择演示账号
          </h2>

          <div className="space-y-3">
            {visitors.map((v) => {
              const isSelected = selected === v.visitorId;
              return (
                <button
                  key={v.visitorId}
                  onClick={() => setSelected(v.visitorId)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-beerfest-yellow bg-beerfest-yellow/5"
                      : "border-gray-100 hover:border-beerfest-yellow/30"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      isSelected
                        ? "bg-beerfest-yellow text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {ROLE_ICONS[v.visitorId] ?? <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-beerfest-navy text-sm">
                      {v.name}
                    </div>
                    <div className="text-xs text-beerfest-navy/50 mt-0.5">
                      {ROLE_LABELS[v.visitorId] ?? v.type}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "border-beerfest-yellow"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-beerfest-yellow" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={!selected || loading}
          className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
            selected && !loading
              ? "bg-beerfest-yellow hover:bg-beerfest-amber active:scale-[0.98]"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "正在进入..." : "进入系统"}
        </button>

        <p className="text-center text-xs text-beerfest-navy/30 mt-4">
          演示数据 · 预置账号 · 无需真实登录
        </p>
      </div>
    </div>
  );
}
