import { describe, expect, it } from "vitest";

import { APP_ROUTES, APP_ROUTE_IDS, APP_ROUTE_MAP } from "../src/routes/appRoutes";

describe("appRoutes", () => {
  it("uses unique route identifiers", () => {
    const unique = new Set(APP_ROUTE_IDS);
    expect(unique.size).toBe(APP_ROUTE_IDS.length);
  });

  it("keeps the route map in sync with the route list", () => {
    APP_ROUTES.forEach((route) => {
      expect(APP_ROUTE_MAP[route.id]).toBe(route);
    });
  });

  it("retains the registered route components", () => {
    APP_ROUTES.forEach((route) => {
      expect(route.Component).toBeTruthy();
    });
  });
});
