import {
  test as base,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import { e2eHeaders, seed, users } from './seed';

type ActorFixtures = {
  ownerPage: Page;
  editorPage: Page;
  commenterPage: Page;
  viewerPage: Page;
  otherPage: Page;
  anonymousPage: Page;
  ownerApi: APIRequestContext;
  editorApi: APIRequestContext;
  commenterApi: APIRequestContext;
  viewerApi: APIRequestContext;
  otherApi: APIRequestContext;
  anonymousApi: APIRequestContext;
  seed: typeof seed;
};

async function pageAs(browser: Browser, userId: string) {
  const context = await browser.newContext();
  const appOrigin = new URL(process.env.E2E_BASE_URL!).origin;
  const headers = e2eHeaders(userId);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === appOrigin && url.pathname.startsWith('/api/')) {
      await route.continue({ headers: { ...request.headers(), ...headers } });
      return;
    }
    await route.continue();
  });
  return { context, page: await context.newPage() };
}

export const test = base.extend<ActorFixtures>({
  seed: async ({}, use) => {
    await use(seed);
  },

  ownerPage: async ({ browser }, use) => {
    const { context, page } = await pageAs(browser, users.owner);
    await use(page);
    await context.close();
  },

  editorPage: async ({ browser }, use) => {
    const { context, page } = await pageAs(browser, users.editor);
    await use(page);
    await context.close();
  },

  commenterPage: async ({ browser }, use) => {
    const { context, page } = await pageAs(browser, users.commenter);
    await use(page);
    await context.close();
  },

  viewerPage: async ({ browser }, use) => {
    const { context, page } = await pageAs(browser, users.viewer);
    await use(page);
    await context.close();
  },

  otherPage: async ({ browser }, use) => {
    const { context, page } = await pageAs(browser, users.other);
    await use(page);
    await context.close();
  },

  anonymousPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(await context.newPage());
    await context.close();
  },

  ownerApi: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL!,
      extraHTTPHeaders: e2eHeaders(users.owner),
    });
    await use(api);
    await api.dispose();
  },

  editorApi: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL!,
      extraHTTPHeaders: e2eHeaders(users.editor),
    });
    await use(api);
    await api.dispose();
  },

  commenterApi: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL!,
      extraHTTPHeaders: e2eHeaders(users.commenter),
    });
    await use(api);
    await api.dispose();
  },

  viewerApi: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL!,
      extraHTTPHeaders: e2eHeaders(users.viewer),
    });
    await use(api);
    await api.dispose();
  },

  otherApi: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL!,
      extraHTTPHeaders: e2eHeaders(users.other),
    });
    await use(api);
    await api.dispose();
  },

  anonymousApi: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL!,
    });
    await use(api);
    await api.dispose();
  },
});

export { expect };
