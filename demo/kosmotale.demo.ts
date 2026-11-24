import { expect, test } from "@pesuto/demotale";

test("From Earth to Sirius", async ({ page, demo }) => {
  await demo.card("kosmotale", "From Earth to the edge of what we can see.");
  await page.goto("/");
  await demo.hideCard();

  await demo.step("You start at Earth, with the sky behind it.", async () => {
    await page.waitForFunction(
      () =>
        (window as Window & { __kosmotaleReady?: boolean }).__kosmotaleReady === true &&
        !document.body.innerText.includes("Building the scene"),
      { timeout: 20_000 },
    );
    const card = page.locator("article", { has: page.getByRole("heading", { name: "Earth" }) });
    await expect(card).toBeVisible();
    await demo.spotlight(card, 1_600);
    await demo.clearSpotlight();
  });

  await demo.step("Top view looks down on the orbit.", async () => {
    const top = page.getByRole("button", { name: "Top view" });
    await expect(top).toBeVisible();
    await demo.click(top);
    await expect(top).toHaveAttribute("aria-pressed", "true");
  });

  await demo.step("Pick a moment. This one is the year 2000.", async () => {
    await demo.click(page.getByRole("button", { name: /^Date / }));
    const j2000 = page.getByRole("button", { name: "J2000" });
    await expect(j2000).toBeVisible();
    await demo.click(j2000);
    await expect(page.getByRole("button", { name: "Date January 1, 2000" })).toBeVisible();
  });

  await demo.step("Search finds Sirius, then flies there.", async () => {
    const search = page.getByRole("textbox", { name: "Search for an object" });
    await expect(search).toBeVisible();
    await demo.type(search, "Sirius");
    const row = page.locator("ul button", { hasText: "Sirius" }).first();
    await expect(row).toBeVisible();
    await demo.click(row);
    await expect(page.getByRole("heading", { level: 2, name: "Sirius" })).toBeVisible();
    // De nadering duurt hooguit 8,5 s. De regel blijft staan tot de ster in beeld is.
    await page.waitForTimeout(9_000);
  });

  await demo.card(
    "That is the tour",
    "Recorded by demotale. Orbits are calculated. The sky is a star map.",
  );
});
