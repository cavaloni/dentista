import { test } from "@playwright/test";

test.describe("Happy path", () => {
  test("first YES wins the released slot", async () => {
    test.skip(true, "Requires seeded Supabase data and messaging webhooks.");

    // This test is intentionally skipped by default. When wired to a staging
    // Supabase project and messaging sandbox numbers, remove the skip above
    // and provide the necessary seeded fixtures.
    //
    // await page.goto("/login");
    // await page.getByLabel("Work email").fill(process.env.TEST_STAFF_EMAIL!);
    // await page.getByRole("button", { name: "Send magic link" }).click();
    // ... follow the magic-link flow, add waitlist members, release a slot,
    // and assert that the winner and taken states propagate to the UI.
  });
});
