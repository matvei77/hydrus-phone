import { expect, test } from "@playwright/test";

test("live release health and read-only media path", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({ gateway: "ok", hydrus: "ok" });
  await page.goto("/");
  await expect(page.getByTitle("Hydrus connected")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".media-card")).not.toHaveCount(0);
});
