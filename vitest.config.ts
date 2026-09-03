import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(root, "client", "src"),
      "@shared": path.join(root, "shared"),
    },
  },
  test: {
    setupFiles: ["./test/setup.js"],
    environment: "node",
    include: ["server/**/*.{test,spec}.js", "client/**/*.{test,spec}.{jsx,tsx}", "admin/**/*.{test,spec}.{js,jsx,tsx}"],
    exclude: [
      "server/account-media-cleanup.http.test.js",
      "server/account-validation.test.js",
      "server/address-routes.http.test.js",
      "server/billing-validation.test.js",
      "server/checkout-guard.test.js",
      "server/coupon-routes.http.test.js",
      "server/coupon-routes.test.js",
      "server/customer-routes.test.js",
      "server/domain-validation.http.test.js",
      "server/integration-routes.http.test.js",
      "server/integration-routes.test.js",
      "server/module-input-validation.http.test.js",
      "server/modules/orders/validation.test.js",
      "server/product-media-upload.http.test.js",
      "server/product-routes.contract.test.js",
      "server/product-routes.test.js",
      "server/recovery.test.js",
      "server/request-limits.test.js",
      "server/schedule.test.js",
      "server/store-deletion-routes.http.test.js",
      "server/store-deletion-service.test.js",
      "server/store-media-cleanup.http.test.js",
      "server/store-profile.test.js",
      "server/trial.test.js",
      "server/webhook-signature.test.js",
    ],
    environmentMatchGlobs: [["client/**/*.{test,spec}.{jsx,tsx}", "jsdom"], ["admin/**/*.{test,spec}.{js,jsx,tsx}", "jsdom"]],
  },
});
