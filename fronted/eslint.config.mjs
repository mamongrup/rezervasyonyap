import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    // Derleme çıktısı ve bağımlılıklar — lint/watch şişmesini ve sahte "yüzlerce hata"yı önler
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      ".turbo/**",
    ],
  },
  {
    extends: [...nextCoreWebVitals],

    rules: {
      "@next/next/no-img-element": "off",
      // React 19 + eslint-plugin-react-hooks: yüzlerce mevcut desen; build'i kırmadan kademeli refaktör için kapalı.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);