import { expect, test } from "@playwright/test";

const apiUrl = "http://127.0.0.1:8000";

test.beforeEach(async ({ request }) => {
  await request.delete(`${apiUrl}/api/visits`);
});

test.afterEach(async ({ request }) => {
  await request.delete(`${apiUrl}/api/visits`);
});

test("prepares, saves, edits, duplicates, searches, and clears a visit", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "New Visit Brief" })).toBeVisible();
  await expect(page.getByText("Analytics: Off")).toBeVisible();

  await page.getByRole("button", { name: "Load sample" }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Preview Brief")).toBeVisible();
  await expect(page.getByText("100/100")).toBeVisible();

  await page.getByRole("button", { name: "Save brief" }).click();
  await expect(page.getByText("Saved Brief")).toBeVisible();
  await expect(page.getByRole("link", { name: "Export" })).toBeVisible();

  await page.getByLabel("Search").fill("Maya");
  await expect(page.getByRole("button", { name: /Maya Sharma/ })).toBeVisible();
  await page.getByRole("button", { name: /Maya Sharma/ }).click();
  await expect(page.getByRole("heading", { name: "Edit Visit Brief" })).toBeVisible();

  await page.getByLabel("Main concern").fill("Recurring headaches with neck tension");
  await page.getByRole("button", { name: "Update brief" }).click();
  await expect(page.getByText("Recurring headaches with neck tension")).toBeVisible();

  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByText("Saved Brief")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "New Visit Brief" })).toBeVisible();

  await page.getByRole("button", { name: "Clear all data" }).click();
  await expect(page.getByText("No saved visits yet.")).toBeVisible();
});
