"use client";

import { useVisitor } from "@/context/VisitorContext";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, ClipboardCheck, BarChart3, Beer, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "态势总览", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "活动管理", icon: Megaphone },
  { href: "/dashboard/campaigns", label: "审批", icon: ClipboardCheck },
  { href: "/dashboard/campaigns", label: "效果评估", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { visitor, logout } = useVisitor();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Beer className="w-5 h-5 text-beerfest-yellow" />
            <span className="font-bold text-beerfest-navy text-sm">青岛啤酒节</span>
          </div>
          <span className="text-xs text-beerfest-navy/40">运营驾驶舱</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <button
                key={item.href + item.label}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-beerfest-yellow/10 text-beerfest-amber font-medium"
                    : "text-beerfest-navy/60 hover:bg-gray-50 hover:text-beerfest-navy"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-beerfest-yellow flex items-center justify-center text-white text-xs font-medium">
              {visitor?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-beerfest-navy truncate">
                {visitor?.name}
              </div>
              <div className="text-xs text-beerfest-navy/40">运营管理员</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-beerfest-red transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
