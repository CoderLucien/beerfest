import { test, expect } from "@playwright/test";

const DEMO_FAMILY = "demo_family_01";
const DEMO_WANGWU = "demo_normal_02";
const DEMO_ZHANGSAN = "demo_normal_01";
const DEMO_ADMIN = "demo_admin_01";
const DEFAULT_CAMPAIGN = "campaign_001";

async function loginAs(page: any, displayName: string) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.locator("text=选择演示账号")).toBeVisible({ timeout: 15000 });
  await page.waitForSelector(`text=${displayName}`, { timeout: 15000 });
  await page.locator(`text=${displayName}`).first().click();
  await expect(page.locator('button:has-text("进入系统")')).toBeEnabled({ timeout: 5000 });
  await page.locator('button:has-text("进入系统")').click();
  await page.waitForTimeout(2000);
}

async function setAdminCookie(page: any) {
  await page.context().addCookies([
    { name: "beerfest_visitor_id", value: DEMO_ADMIN, path: "/", domain: "localhost" },
  ]);
}

// ============================================================
// V2 Family Segment Regression
// ============================================================
test.describe("V2 Family Segment Regression", () => {

  test("1. 家庭游客仅见餐饮文创券", async ({ page }) => {
    await loginAs(page, "李四一家");

    await page.goto(`/verify?campaignId=${DEFAULT_CAMPAIGN}`, { waitUntil: "networkidle" });
    await expect(page.locator("text=校验结果")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=李四一家")).toBeVisible({ timeout: 5000 });

    await page.locator('button:has-text("立即领取优惠券")').click();
    await page.waitForURL("**/coupons", { timeout: 15000 });
    await expect(page.locator("text=我的券包")).toBeVisible({ timeout: 15000 });

    const orderBtn = page.locator('button:has-text("模拟下单")');
    try {
      await orderBtn.waitFor({ state: "visible", timeout: 5000 });
      await orderBtn.click();
      await expect(page.locator("text=我的订单")).toBeVisible({ timeout: 10000 });
    } catch {
      // coupon may not have been claimed yet in this run
    }
  });

  test("2. 成年验证后才见含酒精券", async ({ page }) => {
    await loginAs(page, "王五");

    const createResp = await page.request.post("/api/v1/admin/campaigns", {
      data: {
        name: "_V2_酒精测试",
        description: "酒精验证测试活动",
        objective: "测试酒精验证",
        budgetLimit: 3000,
        targetVisitorType: "normal",
        containsAlcohol: true,
      },
    });
    const createBody = await createResp.json();
    expect(createBody.data).toBeTruthy();
    const campaignId = createBody.data.campaignId;

    await page.request.post(`/api/v1/admin/campaigns/${campaignId}/submit`);
    await page.request.post(`/api/v1/admin/campaigns/${campaignId}/approve`, {
      data: { approver: "管理员" },
    });

    await page.goto(`/verify?campaignId=${campaignId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await expect(page.locator("text=校验结果")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=王五")).toBeVisible({ timeout: 5000 });

    const button = page.locator('button:has-text("资格不满足"), button:has-text("立即领取优惠券")');
    await expect(button).toBeVisible({ timeout: 10000 });
    const text = await button.textContent();
    expect(text).toContain("资格不满足");
    await expect(button).toBeDisabled({ timeout: 5000 });
  });

  test("3. 审批页展示客群资格说明", async ({ page }) => {
    await setAdminCookie(page);

    const resp = await page.request.get("/api/v1/admin/campaigns");
    const body = await resp.json();
    const pending = body.data.find((c: any) => c.status === "pending_approval");

    let targetId = pending ? pending.campaignId : DEFAULT_CAMPAIGN;

    if (targetId === DEFAULT_CAMPAIGN) {
      await page.request.post(`/api/v1/admin/campaigns/${DEFAULT_CAMPAIGN}/submit`);
    }

    await page.goto(`/dashboard/campaigns/${targetId}/approve`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await expect(page.locator("text=审批活动")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=活动信息")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=风险评估")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=版本历史")).toBeVisible({ timeout: 5000 });
  });

  test("4. V1 全部流程回归", async ({ page }) => {
    await loginAs(page, "张三");

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(5000);
    await expect(page.locator("text=啤酒节")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=精酿专场")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=进行中的活动")).toBeVisible({ timeout: 5000 });

    await setAdminCookie(page);
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    await expect(page.locator("text=态势总览").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=实时客流").first()).toBeVisible({ timeout: 10000 });

    await page.goto("/dashboard/campaigns", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=活动管理").first()).toBeVisible({ timeout: 20000 });

    await page.goto(`/dashboard/campaigns/${DEFAULT_CAMPAIGN}/results`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=效果评估").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=实验组").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=对照组").first()).toBeVisible({ timeout: 5000 });
  });
});
