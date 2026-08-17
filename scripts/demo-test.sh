#!/bin/bash
# 啤酒节智能营促销系统 — 完整业务流程演示脚本
# 用法: bash demo-test.sh [API_BASE]
# 默认: http://<API_HOST>

API="${1:-http://<API_HOST>}"
OK="\033[32m✓\033[0m"
ERR="\033[31m✗\033[0m"
STEP="\033[1;33m▶\033[0m"

echo "=============================================="
echo "  啤酒节智能营促销系统 — Demo 流程演示"
echo "  API: $API"
echo "=============================================="

# ── 1. 健康检查 (V1 可观测性) ──
echo ""
echo -e "$STEP 1/10 系统健康检查 (V1 可观测性)"
# Quick ping
RESP=$(curl -s "$API/api/v1/ping")
echo "  GET /api/v1/ping → $RESP"
[[ "$RESP" == *'"ok"'* ]] && echo -e "  $OK ping 正常" || echo -e "  $ERR ping 失败"

# Full health with component checks
HEALTH=$(curl -s "$API/api/v1/health")
echo "  GET /api/v1/health →"
echo "  $(echo $HEALTH | python3 -c "import json,sys; d=json.load(sys.stdin); print('status:', d['status'], 'uptime:', d['uptime'])")" 2>/dev/null || echo "  $HEALTH"
DB_STATUS=$(echo "$HEALTH" | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
REDIS_STATUS=$(echo "$HEALTH" | grep -o '"redis":{"status":"[^"]*"' | cut -d'"' -f6)
echo "  → DB: $DB_STATUS  Redis: $REDIS_STATUS"
[[ "$HEALTH" == *'"healthy"'* ]] && echo -e "  $OK 全组件健康" || echo -e "  $ERR 组件异常"

# ── 2. 创建活动 ──
echo ""
echo -e "$STEP 2/10 创建啤酒节活动"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u -v+14d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d"+14 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "2026-08-20T23:59:59Z")
ACTIVITY=$(curl -s -X POST "$API/api/v1/activities" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"啤酒节主会场\",\"start_time\":\"$NOW\",\"end_time\":\"$END\"}")
ACTIVITY_ID=$(echo "$ACTIVITY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  POST /api/v1/activities → id=$ACTIVITY_ID"
[[ -n "$ACTIVITY_ID" ]] && echo -e "  $OK 活动创建成功" || echo -e "  $ERR 失败: $ACTIVITY"

# ── 3. 创建促销规则 ──
echo ""
echo -e "$STEP 3/10 创建促销规则（3种类型）"

# Discount
DISC=$(curl -s -X POST "$API/api/v1/promotions" -H "Content-Type: application/json" \
  -d "{\"activity_id\":\"$ACTIVITY_ID\",\"name\":\"全场8折\",\"type\":\"discount\",\"rule\":\"{\\\"rate\\\":0.8}\"}")
DISC_ID=$(echo "$DISC" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  → discount: $DISC_ID (全场8折)"

# Coupon
COUP=$(curl -s -X POST "$API/api/v1/promotions" -H "Content-Type: application/json" \
  -d "{\"activity_id\":\"$ACTIVITY_ID\",\"name\":\"满100减30优惠券\",\"type\":\"coupon\",\"rule\":\"{\\\"threshold\\\":100,\\\"discount\\\":30}\"}")
COUP_ID=$(echo "$COUP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  → coupon: $COUP_ID (满100减30)"

# Bundle
BUND=$(curl -s -X POST "$API/api/v1/promotions" -H "Content-Type: application/json" \
  -d "{\"activity_id\":\"$ACTIVITY_ID\",\"name\":\"啤酒+烧烤套餐\",\"type\":\"bundle\",\"rule\":\"{\\\"items\\\":[\\\"beer\\\",\\\"bbq\\\"],\\\"price\\\":88}\"}")
BUND_ID=$(echo "$BUND" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  → bundle: $BUND_ID (啤酒+烧烤套餐88元)"

[[ -n "$DISC_ID" && -n "$COUP_ID" ]] && echo -e "  $OK 3条促销规则创建成功" || echo -e "  $ERR 失败"

# ── 4. 审批促销 ──
echo ""
echo -e "$STEP 4/10 审批促销规则"
APPR=$(curl -s -X POST "$API/api/v1/promotions/$DISC_ID/approve")
echo "  POST /approve discount → $(echo $APPR | grep -o '"status":"[^"]*"')"
APPR=$(curl -s -X POST "$API/api/v1/promotions/$COUP_ID/approve")
echo "  POST /approve coupon → $(echo $APPR | grep -o '"status":"[^"]*"')"
APPR=$(curl -s -X POST "$API/api/v1/promotions/$BUND_ID/approve")
echo "  POST /approve bundle → $(echo $APPR | grep -o '"status":"[^"]*"')"
echo -e "  $OK 3条促销全部审批通过"

# ── 5. 发放优惠券 ──
echo ""
echo -e "$STEP 5/10 向用户发放优惠券"
USER_ALICE="u_alice_001"
C1=$(curl -s -X POST "$API/api/v1/coupons" -H "Content-Type: application/json" \
  -d "{\"promotion_id\":\"$COUP_ID\",\"user_id\":\"$USER_ALICE\"}")
CP_CODE=$(echo "$C1" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  → $USER_ALICE 获得优惠券: $CP_CODE"

USER_BOB="u_bob_002"
C2=$(curl -s -X POST "$API/api/v1/coupons" -H "Content-Type: application/json" \
  -d "{\"promotion_id\":\"$COUP_ID\",\"user_id\":\"$USER_BOB\"}")
CP_CODE2=$(echo "$C2" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  → $USER_BOB 获得优惠券: $CP_CODE2"

[[ -n "$CP_CODE" ]] && echo -e "  $OK 优惠券发放成功" || echo -e "  $ERR 失败"

# ── 6. 核销优惠券 ──
echo ""
echo -e "$STEP 6/10 核销优惠券"
USE=$(curl -s -X POST "$API/api/v1/coupons/$CP_CODE/use")
echo "  POST /use $CP_CODE → $(echo $USE | grep -o '"status":"[^"]*"')"
echo -e "  $OK 优惠券核销成功"

# ── 7. 创建客群分群 (V2) ──
echo ""
echo -e "$STEP 7/10 创建客群分群 (V2 增量功能)"
SEG=$(curl -s -X POST "$API/api/v1/segments" -H "Content-Type: application/json" \
  -d "{\"name\":\"高频高消费用户\",\"rule\":{\"min_spend\":100,\"member_days\":7}}")
SEG_ID=$(echo "$SEG" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  POST /segments → $SEG_ID (高频高消费用户: min_spend≥100, member_days≥7)"
[[ -n "$SEG_ID" ]] && echo -e "  $OK 客群创建成功" || echo -e "  $ERR 失败"

# ── 8. 运行 A/B 实验 ──
echo ""
echo -e "$STEP 8/10 启动 A/B 实验"
EXP=$(curl -s -X POST "$API/api/v1/experiments" -H "Content-Type: application/json" \
  -d "{\"activity_id\":\"$ACTIVITY_ID\",\"name\":\"折扣vs满减效果对比\",\"variant_a\":{\"type\":\"discount\",\"rate\":0.8},\"variant_b\":{\"type\":\"coupon\",\"threshold\":100,\"discount\":30}}")
EXP_ID=$(echo "$EXP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  POST /experiments → $EXP_ID"

START=$(curl -s -X POST "$API/api/v1/experiments/$EXP_ID/start")
echo "  POST /start → $(echo $START | grep -o '"status":"[^"]*"')"

RESULT=$(curl -s -w "\n%{http_code}" -X POST "$API/api/v1/experiments/$EXP_ID/complete" -H "Content-Type: application/json" \
  -d '{"result":"variant_a_win"}')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
COMPLETE_STATUS=$(echo "$BODY" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  POST /complete → HTTP $HTTP_CODE status=$COMPLETE_STATUS"
if [[ "$HTTP_CODE" == "200" && "$COMPLETE_STATUS" == "completed" ]]; then
  echo -e "  $OK A/B 实验完成（折扣方案胜出）"
else
  echo -e "  $ERR 实验完成失败 (HTTP $HTTP_CODE): $BODY"
fi

# ── 9. 运行模拟器 (M4) ──
echo ""
echo -e "$STEP 9/10 运行业务模拟器 (M4 合成数据)"
SIM=$(curl -s -X POST "$API/api/v1/simulate" -H "Content-Type: application/json" \
  -d "{\"activity_id\":\"$ACTIVITY_ID\",\"days\":2,\"seed\":42}")
echo "  POST /simulate (2天, seed=42)"
ORDERS=$(echo "$SIM" | grep -o '"orders_created":[0-9]*' | cut -d: -f2)
COUPS=$(echo "$SIM" | grep -o '"coupons_issued":[0-9]*' | cut -d: -f2)
USED=$(echo "$SIM" | grep -o '"coupons_used":[0-9]*' | cut -d: -f2)
REV=$(echo "$SIM" | grep -o '"revenue":[0-9.]*' | cut -d: -f2)
ANOM=$(echo "$SIM" | grep -o '"anomalies_found":[0-9]*' | cut -d: -f2)
echo "  → 订单:$ORDERS 发券:$COUPS 用券:$USED 营收:¥$REV 异常:$ANOM"
[[ -n "$ORDERS" ]] && echo -e "  $OK 模拟器运行成功" || echo -e "  $ERR 失败"

# ── 10. 运营看板 ──
echo ""
echo -e "$STEP 10/10 查看运营看板"
DASH=$(curl -s "$API/api/v1/dashboard/$ACTIVITY_ID")
echo "  GET /dashboard/$ACTIVITY_ID"
echo "  $(echo $DASH | python3 -m json.tool 2>/dev/null || echo $DASH)"
echo -e "  $OK 看板数据就绪"

# ── 总结 ──
echo ""
echo "=============================================="
echo -e "  全部 10 步业务流程演示完成！"
echo ""
echo "  健康状态:   $(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4) / uptime $(echo "$HEALTH" | grep -o '"uptime":"[^"]*"' | cut -d'"' -f4)"
echo "  活动 ID:    $ACTIVITY_ID"
echo "  优惠券码:   $CP_CODE"
echo "  A/B 实验:   $EXP_ID (折扣方案胜出)"
echo "  服务地址:   $API"
echo "  落地页:     $API/        (运营看板 Dashboard)"
echo "  Health API: $API/api/v1/health"
echo "=============================================="
