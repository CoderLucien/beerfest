"use client";

import { useEffect, useState } from "react";
import { useVisitor } from "@/context/VisitorContext";
import { useRouter } from "next/navigation";
import type { Coupon, Order } from "@beerfest/domain";
import { getAdapter } from "@/lib/db/synthetic";
import { Ticket, ShoppingCart, Clock, CheckCircle, ArrowLeft } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "可使用", color: "bg-green-100 text-green-700" },
  pending: { label: "待激活", color: "bg-yellow-100 text-yellow-700" },
  used: { label: "已使用", color: "bg-gray-100 text-gray-500" },
  expired: { label: "已过期", color: "bg-red-100 text-red-600" },
};

export default function CouponsPage() {
  const { visitor } = useVisitor();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visitor) { router.push("/login"); return; }
    const adapter = getAdapter();
    Promise.all([
      adapter.getCouponsByVisitor(visitor.visitorId),
      adapter.getOrdersByVisitor(visitor.visitorId),
    ]).then(([c, o]) => {
      setCoupons(c);
      setOrders(o);
      setLoading(false);
    });
  }, [visitor, router]);

  if (!visitor) return null;

  const handleOrder = async () => {
    const p = await getAdapter().getProducts();
    const products = p.slice(0, 3).filter(x => !x.containsAlcohol || visitor.alcoholVerified);
    if (products.length > 0) {
      const order = await getAdapter().createOrder({
        visitorId: visitor.visitorId,
        items: products.slice(0, 2).map(p => ({ productId: p.productId, quantity: 1 })),
      });
      setOrders(prev => [order, ...prev]);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-beerfest-cream flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-beerfest-yellow border-t-transparent rounded-full" /></div>;
  }

  const activeCoupons = coupons.filter(c => c.status === "active");

  return (
    <div className="min-h-screen bg-beerfest-cream">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")}><ArrowLeft className="w-5 h-5 text-beerfest-navy" /></button>
        <h1 className="font-semibold text-beerfest-navy">我的券包</h1>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-beerfest-navy/60 mb-3">
            <Ticket className="w-4 h-4 inline mr-1" />
            我的优惠券 ({activeCoupons.length}/{coupons.length})
          </h2>
          {coupons.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-beerfest-navy/40">还没有领取优惠券</p>
              <button onClick={() => router.push("/")} className="mt-3 text-beerfest-yellow text-sm font-medium">去首页看看</button>
            </div>
          ) : (
            <div className="space-y-2">
              {coupons.map(c => {
                const s = STATUS_MAP[c.status] ?? { label: c.status, color: "bg-gray-100" };
                return (
                  <div key={c.couponId} className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-beerfest-navy">¥{c.discountAmount} 优惠券</div>
                      <div className="text-xs text-beerfest-navy/40 mt-0.5">
                        有效期至 {new Date(c.expiresAt).toLocaleString("zh-CN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-beerfest-navy/60 mb-3">
            <ShoppingCart className="w-4 h-4 inline mr-1" />
            我的订单
          </h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-beerfest-navy/40">暂无订单</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.orderId} className="bg-white rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-beerfest-navy">订单 #{o.orderId.slice(-6)}</span>
                    <span className="text-xs text-beerfest-navy/50">{new Date(o.createdAt).toLocaleTimeString("zh-CN")}</span>
                  </div>
                  <div className="space-y-1">
                    {o.products.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs text-beerfest-navy/60">
                        <span>{p.name} x{p.quantity}</span>
                        <span>¥{p.price * p.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-beerfest-red">{o.discountAmount > 0 ? `已优惠 ¥${o.discountAmount}` : ""}</span>
                    <span className="font-semibold text-beerfest-navy">¥{o.netPayment}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {coupons.length > 0 && (
          <button
            onClick={handleOrder}
            className="w-full py-3.5 bg-beerfest-yellow text-white font-semibold rounded-xl hover:bg-beerfest-amber transition-colors"
          >
            模拟下单
          </button>
        )}
      </main>
    </div>
  );
}
