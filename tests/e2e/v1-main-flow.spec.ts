import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 60000 });

const DEMO_ZHANGSAN = "demo_normal_01";
const DEMO_ADMIN = "demo_admin_01";
const DEFAULT_CAMPAIGN = "campaign_001";
const CAMPAIGN_NAME = "V1_E2E_测试活动";

async function loginAs(page: any, displayName: string) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.locator("text=选择演示账号")).toBeVisible({ timeout: 15000 });
  await page.waitForSelector(`text=${displayName}`, { timeout: 15000 });
  await page.locator(`text=${displayName}`).first().click();
  await expect(page.locator('button:has-text("进入系统")')).toBeEnabled({ timeout: 5000 });
  await page.locator('button:has-text("进入系统")').click();
  await page.waitForURL("**/verify", { timeout: 15000 });
}

// ============================================================
// V1 Visitor Flow
// ============================================================
test.describe("V1 Visitor Main Flow", () => {

  test("1. 游客登录并查看可用活动列表", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.locator("text=啤酒节")).toBeVisible();
    await expect(page.locator("text=选择演示账号")).toBeVisible();

    await page.waitForSelector("text=张三", { timeout: 15000 });
    await page.locator("text=张三").first().click();
    await expect(page.locator('button:has-text("进入系统")')).toBeEnabled({ timeout: 5000 });
    await page.locator('button:has-text("进入系统")').click();
    await page.waitForTimeout(2000);

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("text=会场区域")).toBeVisible({ timeout: 15000 });

    await expect(page.locator("text=精酿主会场")).toBeVisible();
    await expect(page.locator("text=文创美食区")).toBeVisible();
    await expect(page.locator("text=进行中的活动")).toBeVisible();
    const noCampaigns = page.locator("text=暂无活动");
    await expect(noCampaigns).toHaveCount(0, { timeout: 15000 });
  });

  test("2. 游客领券（正常流程）", async ({ page }) => {
    await loginAs(page, "张三");

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("text=进行中的活动")).toBeVisible({ timeout: 15000 });

    await page.locator('button:has-text("立即领取")').first().click();
    await page.waitForURL("**/verify?campaignId=*", { timeout: 15000 });

    await expect(page.locator("text=校验结果")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=张三")).toBeVisible();
    await expect(page.locator("text=年龄验证")).toBeVisible();

    await page.locator('button:has-text("立即领取优惠券")').click();
    await page.waitForURL("**/coupons", { timeout: 15000 });

    await expect(page.locator("text=我的券包")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=¥12 优惠券").first()).toBeVisible({ timeout: 15000 });
  });

  test("3. 游客重复领券被拦截（幂等）", async ({ page }) => {
    await loginAs(page, "张三");

    await page.goto(`/verify?campaignId=${DEFAULT_CAMPAIGN}`, { waitUntil: "networkidle" });
    await page.locator('button:has-text("立即领取优惠券")').click();
    await page.waitForURL("**/coupons", { timeout: 15000 });
    await expect(page.locator("text=¥12 优惠券").first()).toBeVisible({ timeout: 15000 });

    await page.goto(`/verify?campaignId=${DEFAULT_CAMPAIGN}`, { waitUntil: "networkidle" });
    await expect(page.locator('button:has-text("立即领取优惠券")')).toBeVisible({ timeout: 15000 });
    await page.locator('button:has-text("立即领取优惠券")').click();
    await page.waitForURL("**/coupons", { timeout: 15000 });

    await expect(page.locator("text=¥12 优惠券").first()).toBeVisible({ timeout: 15000 });
  });

  test("4. 游客下单使用券", async ({ page }) => {
    await loginAs(page, "张三");

    await page.goto(`/verify?campaignId=${DEFAULT_CAMPAIGN}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.locator('button:has-text("立即领取优惠券")').click();
    await page.waitForURL("**/coupons", { timeout: 15000 });

    await expect(page.locator('button:has-text("模拟下单")')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("模拟下单")').click();

    await expect(page.locator("text=我的订单")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=订单 #").first()).toBeVisible({ timeout: 15000 });
  });
});

// ============================================================
// Admin Tests
// ============================================================
test.describe("V1 Admin Dashboard", () => {

  test("5. 运营查看驾驶舱 KPI", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await expect(page.locator("text=态势总览").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=实时客流").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=订单数").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=净支付 GMV").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=剩余预算").first()).toBeVisible({ timeout: 5000 });

    await expect(page.locator("text=区域状态").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=最近事件").first()).toBeVisible({ timeout: 5000 });
  });

  test("11. 运营查看实验结果", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);
    await page.goto(`/dashboard/campaigns/${DEFAULT_CAMPAIGN}/results`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await expect(page.locator("text=效果评估").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=实验组").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=对照组").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=转化率").first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// Campaign Lifecycle (serial)
// ============================================================
test.describe.serial("V1 Admin Campaign Lifecycle", () => {
  let campaignId: string;

  test("6. 运营创建活动草案", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);
    await page.goto("/dashboard/campaigns", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    await expect(page.locator("text=活动管理").first()).toBeVisible({ timeout: 30000 });

    await expect(page.locator('button:has-text("新建活动")')).toBeVisible({ timeout: 15000 });
    await page.locator('button:has-text("新建活动")').click();

    await expect(page.locator("text=新建活动").first()).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder*="夜游"]').fill(CAMPAIGN_NAME);
    await page.locator("textarea").fill("E2E 测试活动描述");
    await page.locator('button:has-text("创建")').click();

    await expect(page.locator(`text=${CAMPAIGN_NAME}`).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=草稿").first()).toBeVisible({ timeout: 5000 });

    const resp = await page.request.get("/api/v1/admin/campaigns");
    const body = await resp.json();
    const campaign = body.data.find((c: any) => c.name === CAMPAIGN_NAME);
    expect(campaign).toBeTruthy();
    campaignId = campaign.campaignId;
  });

  test("7. 运营提交审批（API）", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);

    expect(campaignId).toBeTruthy();

    const submitResp = await page.request.post(`/api/v1/admin/campaigns/${campaignId}/submit`);
    expect(submitResp.ok()).toBeTruthy();
    const submitBody = await submitResp.json();
    expect(submitBody.data.campaign.status).toBe("pending_approval");

    await page.goto("/dashboard/campaigns", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=待审批").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=处理审批").first()).toBeVisible({ timeout: 5000 });
  });

  test("8. 审批通过 → 活动运行", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);
    await page.goto(`/dashboard/campaigns/${campaignId}/approve`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await expect(page.locator("text=审批活动")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=活动信息")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=风险评估")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=审批操作")).toBeVisible({ timeout: 5000 });

    await page.locator('button:has-text("批准通过")').click();
    await page.waitForURL("**/dashboard/campaigns", { timeout: 15000 });

    await page.waitForTimeout(2000);
    await expect(page.locator("text=运行中").first()).toBeVisible({ timeout: 15000 });
  });

  test("9. 活动暂停（API）", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);

    const pauseResp = await page.request.post(`/api/v1/admin/campaigns/${campaignId}/pause`);
    expect(pauseResp.ok()).toBeTruthy();

    await page.goto("/dashboard/campaigns", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=已暂停").first()).toBeVisible({ timeout: 15000 });
  });

  test("10. 运营恢复活动", async ({ page }) => {
    await page.context().addCookies([
      { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
    ]);

    const resumeResp = await page.request.post(`/api/v1/admin/campaigns/${campaignId}/resume`);
    expect(resumeResp.ok()).toBeTruthy();

    await page.goto("/dashboard/campaigns", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=运行中").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=查看效果").first()).toBeVisible({ timeout: 5000 });
  });
});
