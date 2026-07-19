import type { Page, Response } from '@playwright/test';

export function waitForApi(
  page: Page,
  match: (url: string, method: string) => boolean
): Promise<Response> {
  return page.waitForResponse((res) => {
    const url = res.url();
    return match(url, res.request().method());
  });
}

export function apiEndsWith(suffix: string, method = 'GET') {
  return (url: string, m: string) => {
    if (m !== method) return false;
    try {
      const pathname = new URL(url).pathname;
      return pathname === suffix || pathname.endsWith(suffix);
    } catch {
      return url.includes(suffix);
    }
  };
}
