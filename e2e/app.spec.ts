import { expect, test, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const services = [
  {
    key: "6c6f63616c2074616773",
    name: "my tags",
    type: 5,
    group: "local_tags",
  },
  {
    key: "616c6c206c6f63616c206d65646961",
    name: "combined local media",
    type: 21,
    group: "local_files",
  },
];
const files = [
  {
    fileId: 1,
    ext: "jpg",
    filetypeHuman: "jpeg",
    width: 900,
    height: 1600,
    duration: null,
    hasAudio: false,
  },
  {
    fileId: 2,
    ext: "mp4",
    filetypeHuman: "mp4",
    width: 1280,
    height: 720,
    duration: 51_000,
    hasAudio: true,
  },
  {
    fileId: 3,
    ext: "mp3",
    filetypeHuman: "mp3",
    width: null,
    height: null,
    duration: 180_000,
    hasAudio: true,
  },
  {
    fileId: 4,
    ext: "pdf",
    filetypeHuman: "pdf",
    width: null,
    height: null,
    duration: null,
    hasAudio: false,
  },
  {
    fileId: 5,
    ext: "jxl",
    filetypeHuman: "jxl",
    width: 3200,
    height: 1800,
    duration: null,
    hasAudio: false,
  },
].map((file) => ({
  ...file,
  hash: String(file.fileId).padStart(64, "0"),
  size: 1_500_000,
  mime: 1,
  numFrames: null,
  inbox: true,
  archived: false,
  timeImported: 1_700_000_000,
  modified: null,
  displayTags: { "6c6f63616c2074616773": ["creator:test artist"] },
  storageTags: { "6c6f63616c2074616773": ["creator:test artist"] },
}));
const pixel = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#708090"/></svg>`;

async function mockApi(page: Page) {
  const searches: unknown[] = [];
  const mutations: unknown[] = [];
  const mediaRequests: number[] = [];
  const renderRequests: number[] = [];
  let healthy = true;
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: healthy
        ? {
            gateway: "ok",
            hydrus: "ok",
            version: "test",
            hydrusVersion: 649,
            apiVersion: 83,
            permissions: [1, 2, 3],
            services,
          }
        : {
            gateway: "ok",
            hydrus: "error",
            version: "test",
            code: "HYDRUS_UNAVAILABLE",
            message: "Hydrus is restarting",
          },
    }),
  );
  await page.route("**/api/tags**", (route) =>
    route.fulfill({
      json: {
        tags: [
          { value: "creator:test artist", count: 42 },
          { value: "series:test", count: 7 },
        ],
      },
    }),
  );
  await page.route("**/api/search", async (route) => {
    searches.push(route.request().postDataJSON());
    await route.fulfill({
      json: { fileIds: [1, 2, 3, 4, 5], limit: 500, limited: false },
    });
  });
  await page.route("**/api/metadata", (route) =>
    route.fulfill({ json: { files } }),
  );
  await page.route("**/api/media/*/thumbnail", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: pixel }),
  );
  await page.route("**/api/media/*/render", (route) => {
    renderRequests.push(Number(route.request().url().split("/").at(-2)));
    return route.fulfill({ contentType: "image/svg+xml", body: pixel });
  });
  await page.route("**/api/media/*/file", (route) => {
    const id = Number(route.request().url().split("/").at(-2));
    mediaRequests.push(id);
    const contentType =
      id === 2
        ? "video/mp4"
        : id === 3
          ? "audio/mpeg"
          : id === 4
            ? "application/pdf"
            : "image/svg+xml";
    return route.fulfill({
      status: 200,
      contentType,
      body: id === 1 ? pixel : "fixture",
    });
  });
  const mutation = async (route: Route) => {
    mutations.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  };
  await page.route("**/api/tags/mutate", mutation);
  await page.route("**/api/files/state", mutation);
  return {
    searches,
    mutations,
    mediaRequests,
    renderRequests,
    setHealthy: (value: boolean) => {
      healthy = value;
    },
  };
}

test("search composition, domains, filters, sorting, and limits are deterministic", async ({
  page,
}, testInfo) => {
  const state = await mockApi(page);
  await page.goto("/");
  await expect(page.getByTitle("Hydrus connected")).toBeVisible();
  const input = page.getByLabel("Search tags");
  await input.fill("cat");
  await input.press("Enter");
  await input.fill("-spoiler");
  await input.press("Enter");
  await input.fill("red | blue");
  await input.press("Enter");
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByLabel("Files").selectOption("616c6c206c6f63616c206d65646961");
  await page
    .getByLabel("Tags", { exact: true })
    .selectOption("6c6f63616c2074616773");
  await page.getByLabel("Result limit").selectOption("1000");
  await page.getByLabel("Media type").selectOption("video");
  await page.getByLabel("Date range").selectOption("30d");
  await page.getByLabel("Duration").selectOption("custom");
  await page.getByLabel("Minimum seconds").fill("30");
  await page.getByLabel("Maximum seconds").fill("300");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("button", { name: "Sort" }).click();
  await page.getByText("File size", { exact: true }).click();
  await page.getByRole("button", { name: "Apply sort" }).click();
  await expect
    .poll(() => (state.searches.at(-1) as any)?.sort)
    .toBe(0);
  await expect
    .poll(() =>
      ((state.searches.at(-1) as any)?.predicates ?? []).includes(
        "system:duration < 300 seconds",
      ),
    )
    .toBe(true);
  const payload = state.searches.at(-1) as any;
  expect(payload).toMatchObject({
    limit: 1000,
    fileServiceKey: "616c6c206c6f63616c206d65646961",
    tagServiceKey: "6c6f63616c2074616773",
    sort: 0,
  });
  expect(payload.predicates).toEqual(
    expect.arrayContaining([
      "cat",
      "-spoiler",
      ["red", "blue"],
      "system:filetype is video",
      "system:duration > 30 seconds",
      "system:duration < 300 seconds",
    ]),
  );
  if (process.env.CAPTURE_VISUALS) {
    await page.screenshot({
      path: `docs/screenshots/${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
});

test("browse surface has no critical WCAG A/AA violations", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByTitle("Hydrus connected")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("viewer navigation and reload restore the exact grid position", async ({
  page,
}) => {
  const state = await mockApi(page);
  const ids = Array.from({ length: 120 }, (_, index) => index + 1);
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { fileIds: ids, limit: 500, limited: false } }),
  );
  await page.route("**/api/metadata", async (route) => {
    const requested = route.request().postDataJSON().fileIds as number[];
    await route.fulfill({
      json: {
        files: requested.map((id) => ({
          ...files[0],
          fileId: id,
          hash: String(id).padStart(64, "0"),
        })),
      },
    });
  });
  await page.goto("/");
  const grid = page.locator("#results-scroll");
  await expect(grid).toBeVisible();
  await expect
    .poll(() =>
      grid.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    )
    .toBeGreaterThanOrEqual(600);
  await grid.evaluate((element) => {
    element.scrollTop = 600;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(() => grid.evaluate((element) => element.scrollTop))
    .toBe(600);
  const gridBox = await grid.boundingBox();
  if (!gridBox) throw new Error("grid has no visible bounds");
  await page.mouse.click(gridBox.x + 50, gridBox.y + 50);
  await expect.poll(() => state.mediaRequests.length).toBeGreaterThan(3);
  await page.goBack();
  await expect
    .poll(() => grid.evaluate((element) => element.scrollTop))
    .toBe(600);
  await page.reload();
  await expect
    .poll(() => grid.evaluate((element) => element.scrollTop))
    .toBe(600);
});

test("mixed-media viewer, Back, metadata, tags, and archive controls work", async (
  { page },
  testInfo,
) => {
  const state = await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open jpeg" }).click();
  await expect(
    page.getByRole("button", { name: "Close viewer" }),
  ).toBeVisible();
  await expect(page.locator(".viewer-image")).toBeVisible();
  if (testInfo.project.name === "android") {
    const stage = page.locator(".zoom-stage");
    const bounds = await stage.boundingBox();
    if (!bounds) throw new Error("zoom stage has no visible bounds");
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(80);
    await page.touchscreen.tap(x, y);
    await expect(page.locator(".viewer-image")).toHaveAttribute(
      "style",
      /scale\(2\.5\)/,
    );
  }
  if (process.env.CAPTURE_VISUALS) {
    await page.screenshot({
      path: `docs/screenshots/viewer-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "creator:test artist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore this tag", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Search with tag", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("view")).toBe("1");
  await page.getByRole("button", { name: "Next file" }).click();
  expect(new URL(page.url()).searchParams.get("view")).toBe("2");
  await expect(page.locator("video")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: "Close viewer" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Open mp4" }).click();
  await expect(page.locator("video")).toBeVisible();
  await page.getByRole("button", { name: "File information" }).click();
  await expect(page.getByText("1:00")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "File information" }).getByText("0:51"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit tags" }).click();
  await expect(page.getByLabel("Tag service")).toHaveValue(
    "6c6f63616c2074616773",
  );
  await page.getByLabel("Add tags (comma separated)").fill("series:");
  await page.getByRole("option", { name: "series:test 7" }).click();
  await page.getByRole("button", { name: "Save tag changes" }).click();
  await expect.poll(() => state.mutations.length).toBe(1);
  expect(state.mutations[0]).toMatchObject({ hash: "2".padStart(64, "0") });
  await page.getByRole("button", { name: "File information" }).click();
  await page.getByRole("button", { name: "Move to archive" }).click();
  await expect.poll(() => state.mutations.length).toBe(2);
  expect(state.mutations[1]).toMatchObject({
    hashes: ["2".padStart(64, "0")],
    action: "archive",
  });
  await page
    .getByRole("button", { name: "Close File information", exact: true })
    .click();
  await page.getByRole("button", { name: "Close viewer" }).click();
  await page.getByRole("button", { name: "Open mp3" }).click();
  await expect(page.locator("audio")).toBeVisible();
  await page.getByRole("button", { name: "Close viewer" }).click();
  await page.getByRole("button", { name: "Open pdf" }).click();
  await expect(page.getByText("Preview unavailable")).toBeVisible();
  await page.getByRole("button", { name: "Close viewer" }).click();
  await page.getByRole("button", { name: "Open jxl" }).click();
  await expect(page.locator(".viewer-image")).toBeVisible();
  await expect.poll(() => state.renderRequests.length).toBeGreaterThan(0);
  const renderedBeforeReopen = state.renderRequests.length;
  await page.getByRole("button", { name: "Close viewer" }).click();
  await page.getByRole("button", { name: "Open jxl" }).click();
  await expect(page.locator('.viewer-image[src^="blob:"]')).toBeVisible();
  expect(state.renderRequests).toHaveLength(renderedBeforeReopen);
});

test("viewer tags refine a collection and Back restores its prior page", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/");
  const input = page.getByLabel("Search tags");
  await input.fill("cat");
  await input.press("Enter");
  await expect
    .poll(() => ((state.searches.at(-1) as any)?.predicates ?? []).includes("cat"))
    .toBe(true);
  const beforeAdd = state.searches.length;
  await page.getByRole("button", { name: "Open jpeg" }).click();
  await page.getByRole("button", { name: "Next file", exact: true }).click();
  await expect(page.locator("video")).toBeVisible();
  await page
    .getByRole("button", { name: "creator:test artist", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add to this search", exact: true })
    .click();
  await expect.poll(() => state.searches.length).toBeGreaterThan(beforeAdd);
  expect((state.searches.at(-1) as any).predicates).toEqual(
    expect.arrayContaining(["cat", "creator:test artist"]),
  );
  expect(new URL(page.url()).searchParams.get("view")).toBeNull();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Close viewer", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("view")).toBe("2");
  await expect(page.locator("video")).toBeVisible();
  await page
    .getByRole("button", { name: "creator:test artist", exact: true })
    .click();
  const beforeExplore = state.searches.length;
  await page
    .getByRole("button", { name: "Explore this tag", exact: true })
    .click();
  await expect.poll(() => state.searches.length).toBeGreaterThan(beforeExplore);
  expect((state.searches.at(-1) as any).predicates).toEqual([
    "creator:test artist",
  ]);
});

test("saved searches, restart state, offline direction, and PWA metadata work", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/");
  page.once("dialog", (dialog) => dialog.accept("My test search"));
  await page.getByRole("button", { name: "Save search" }).click();
  await page.getByRole("link", { name: "Saved" }).click();
  await expect(page.getByText("My test search")).toBeVisible();
  await page.getByText("My test search").click();
  state.setHealthy(false);
  await page.reload();
  await expect(page.getByText("Hydrus is closed or restarting")).toBeVisible();
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
});

test("gateway outage gives a directed recovery state", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/health", (route) =>
    route.abort("connectionrefused"),
  );
  await page.goto("/");
  await expect(page.getByText("Gateway unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
