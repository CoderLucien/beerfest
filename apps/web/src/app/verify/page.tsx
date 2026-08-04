"use client";

import { useVisitor } from "@/context/VisitorContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VerifyPage() {
  const { visitor } = useVisitor();
  const router = useRouter();

  useEffect(() => {
    if (!visitor) {
      router.push("/login");
    }
  }, [visitor, router]);

  if (!visitor) return null;

  return (
    <div className="min-h-screen bg-beerfest-cream flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-4">🍺</div>
        <h1 className="text-xl font-bold text-beerfest-navy mb-2">
          {visitor.name}，欢迎来到啤酒节！
        </h1>
        <p className="text-sm text-beerfest-navy/50 mb-6">
          资格校验通过 · 可以参与活动
        </p>

        <div className="space-y-2">
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl bg-beerfest-yellow text-white font-semibold hover:bg-beerfest-amber transition-colors"
          >
            浏览活动
          </button>
          <button
            onClick={() => router.push("/coupons")}
            className="w-full py-3 rounded-xl border border-beerfest-yellow text-beerfest-amber font-semibold hover:bg-beerfest-yellow/5 transition-colors"
          >
            我的券包
          </button>
        </div>
      </div>
    </div>
  );
}
