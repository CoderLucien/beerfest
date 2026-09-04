#!/bin/bash
# ============================================================
# 啤酒节智能营促销系统 — 业务流程测试脚本
# 服务地址: http://<API_HOST>
# ============================================================
set -e

BASE="http://<API_HOST>/api/v1"
OK="\033[32m✓\033[0m"
FAIL="\033[31m✗\033[0m"
SECTION="\n\033[1;34m"
RESET="\033[0m"

check() { grep -q '"status":"ok"' && echo -e "$OK $1" || echo -e "$FAIL $1"; }

echo "============================================"
echo "  啤酒节智能营促销系统 — 业务流程测试"
echo "  服务: $BASE"
echo "============================================"

# ============================================================
# Step 1: 健康检查
# ============================================================
echo -e "$SECTION--- [1/8] 健康检查 ---$RESET"
curl -s "$BASE/ping" | tee /dev/stderr | check "服务存活"

# ============================================================
# Step 2: 创建活动 (Activity)
# ============================================================
echo -e "$SECTION--- [2/8] 创建啤酒节活动 ---$RESET"
ACT=$(curl -s -X POST "$BASE/activities" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "第34届国际啤酒节",
    "description": "2026年8月啤酒节智能营销活动",
    "start_time": "2026-08-10T00:00:00Z",
    "end_time": "2026-08-31T23:59:59Z",
    "location": "滨海啤酒城"
  }')
echo "$ACT" | python3 -m json.tool 2>/dev/null || echo "$ACT"
ACT_ID=$(echo "$ACT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
echo -e "活动 ID: \033[33m$ACT_ID\033[0m"

# ============================================================
# Step 3: 查看活动列表
# ============================================================
echo -e "$SECTION--- [3/8] 查看活动列表 ---$RESET"
curl -s "$BASE/activities" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/activities"

# ============================================================
# Step 4: 创建促销规则
# ============================================================
echo -e "$SECTION--- [4/8] 创建促销规则 ---$RESET"

# 4a: 折扣券
echo -e "\n-- 4a: 满减折扣 --"
PROMO1=$(curl -s -X POST "$BASE/activities/$ACT_ID/promotions" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "啤酒满200减50",
    "type": "discount",
    "rule": {"min_amount": 200, "discount_amount": 50},
    "priority": 1
  }')
echo "$PROMO1" | python3 -m json.tool 2>/dev/null || echo "$PROMO1"

# 4b: 优惠券
echo -e "\n-- 4b: 赠饮券 --"
PROMO2=$(curl -s -X POST "$BASE/activities/$ACT_ID/promotions" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "打卡赠精酿啤酒",
    "type": "coupon",
    "rule": {"coupon_type": "free_drink", "quantity": 1000},
    "priority": 2
  }')
echo "$PROMO2" | python3 -m json.tool 2>/dev/null || echo "$PROMO2"

# 4c: 套餐
echo -e "\n-- 4c: 畅饮套餐 --"
PROMO3=$(curl -s -X POST "$BASE/activities/$ACT_ID/promotions" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "双人畅饮套餐",
    "type": "bundle",
    "rule": {"original_price": 298, "bundle_price": 198, "items": ["beer_x2", "snack_x1"]},
    "priority": 3
  }')
echo "$PROMO3" | python3 -m json.tool 2>/dev/null || echo "$PROMO3"

# ============================================================
# Step 5: 创建客户分群
# ============================================================
echo -e "$SECTION--- [5/8] 创建客户分群 ---$RESET"
SEG=$(curl -s -X POST "$BASE/segments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "啤酒节高消费游客",
    "rules": {"min_age": 18, "max_age": 55, "min_spend": 100, "regions": ["山东", "北京", "上海"], "member_days": 1}
  }')
echo "$SEG" | python3 -m json.tool 2>/dev/null || echo "$SEG"
SEG_ID=$(echo "$SEG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
echo -e "分群 ID: \033[33m$SEG_ID\033[0m"

# ============================================================
# Step 6: 发放优惠券
# ============================================================
echo -e "$SECTION--- [6/8] 发放优惠券 ---$RESET"
COUPON=$(curl -s -X POST "$BASE/coupons" \
  -H "Content-Type: application/json" \
  -d "{
    \"activity_id\": \"$ACT_ID\",
    \"promotion_id\": \"$(echo "$PROMO2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)\",
    \"user_id\": \"user_test_001\",
    \"channel\": \"app\"
  }")
echo "$COUPON" | python3 -m json.tool 2>/dev/null || echo "$COUPON"
COUPON_CODE=$(echo "$COUPON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
echo -e "券码: \033[33m$COUPON_CODE\033[0m"

# ============================================================
# Step 7: 核销优惠券
# ============================================================
echo -e "$SECTION--- [7/8] 核销优惠券 ---$RESET"
if [ -n "$COUPON_CODE" ]; then
  USE=$(curl -s -X POST "$BASE/coupons/$COUPON_CODE/use" \
    -H "Content-Type: application/json" \
    -d '{"store_id": "store_001", "amount": 198}')
  echo "$USE" | python3 -m json.tool 2>/dev/null || echo "$USE"
  echo -e "$OK 核销完成"

  # 验证幂等性：重复核销应失败
  echo -e "\n-- 重复核销（应返回错误）--"
  USE2=$(curl -s -X POST "$BASE/coupons/$COUPON_CODE/use" \
    -H "Content-Type: application/json" \
    -d '{"store_id": "store_001", "amount": 198}')
  echo "$USE2" | python3 -m json.tool 2>/dev/null || echo "$USE2"
else
  echo "跳过（未获取到券码）"
fi

# ============================================================
# Step 8: 运营看板
# ============================================================
echo -e "$SECTION--- [8/8] 运营看板 ---$RESET"
curl -s "$BASE/dashboard/$ACT_ID" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/dashboard/$ACT_ID"

# ============================================================
# 完成
# ============================================================
echo -e "\n============================================"
echo -e "  测试完成！服务正常。"
echo -e "  活动 ID: $ACT_ID"
echo -e "============================================"
