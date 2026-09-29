# @cig-technology/i18n

[![npm version](https://img.shields.io/npm/v/@cig-technology/i18n.svg)](https://www.npmjs.com/package/@cig-technology/i18n)
[![npm downloads](https://img.shields.io/npm/dm/@cig-technology/i18n.svg)](https://www.npmjs.com/package/@cig-technology/i18n)
[![license](https://img.shields.io/npm/l/@cig-technology/i18n.svg)](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/blob/main/packages/i18n/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@cig-technology/i18n)](https://bundlephobia.com/package/@cig-technology/i18n)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

> **Zero-dependency, type-safe internationalization engine.**
> ICU MessageFormat · React bindings · Node/CLI/Mobile support · ~3KB gzipped.

<!-- version: 1.0.0 -->

---

## Features

- **Zero runtime dependencies** — uses native `Intl.PluralRules` and `Intl.NumberFormat`
- **ICU MessageFormat lite** — interpolation, plurals, select, number formatting
- **Framework-agnostic core** — works in Node.js, React, React Native, Expo, CLI tools
- **React bindings** — `I18nProvider`, `useI18n`, `useTranslation`, `<Trans>` component
- **Type-safe** — generated `TranslationKey` union type provides autocomplete
- **Namespace splitting** — each app loads only its own catalogs
- **Locale detection** — browser, Node.js, and mobile detection strategies
- **CI tooling** — built-in scripts for missing translation checks and key extraction
- **Tiny bundle** — ~3KB gzipped, no external deps

## Installation

```bash
npm install @cig-technology/i18n
# or
pnpm add @cig-technology/i18n
# or
yarn add @cig-technology/i18n
```

## Quick Start

### 1. Create translation catalogs

```
catalogs/
  common/
    en.json
    es.json
    zh.json
```

**`catalogs/common/en.json`**
```json
{
  "greeting": "Hello {name}!",
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

**`catalogs/common/es.json`**
```json
{
  "greeting": "¡Hola {name}!",
  "items": "{count, plural, =0 {Sin elementos} one {# elemento} other {# elementos}}"
}
```

### 2. Use in Node.js / CLI

```typescript
import { i18n, staticLoader } from "@cig-technology/i18n";
import en from "./catalogs/common/en.json";
import es from "./catalogs/common/es.json";

// Register catalog loader
i18n.registerLoader("common", staticLoader({ en, es }));

// Activate a locale
await i18n.activate("es", ["common"]);

// Translate
console.log(i18n.t("greeting", { name: "World" }));
// → "¡Hola World!"

console.log(i18n.t("items", { count: 5 }));
// → "5 elementos"
```

### 3. Use in React

```tsx
import { I18nProvider, useTranslation, Trans } from "@cig-technology/i18n/react";
import { i18n, staticLoader } from "@cig-technology/i18n";
import en from "./catalogs/common/en.json";
import es from "./catalogs/common/es.json";

i18n.registerLoader("common", staticLoader({ en, es }));

function App() {
  return (
    <I18nProvider>
      <MyComponent />
    </I18nProvider>
  );
}

function MyComponent() {
  const t = useTranslation();

  return (
    <div>
      <h1>{t("greeting", { name: "React" })}</h1>
      <Trans id="items" values={{ count: 42 }} />
    </div>
  );
}
```

### 4. Use in React Native / Expo

```typescript
import { i18n, detectMobileLocale } from "@cig-technology/i18n";
import { I18nProvider } from "@cig-technology/i18n/react";
import * as Localization from "expo-localization";

const locale = detectMobileLocale(
  Localization.getLocales().map(l => l.languageTag)
);
await i18n.activate(locale, ["common"]);

// Wrap your app:
<I18nProvider>{children}</I18nProvider>
```

## API Reference

### Core (`@cig-technology/i18n`)

| Export | Description |
|--------|-------------|
| `i18n` | Global singleton instance of `I18n` class |
| `I18n` | Class — create custom instances |
| `isValidLocale(str)` | Type guard for `SupportedLocale` |
| `staticLoader(map)` | Create a sync catalog loader from a locale→catalog map |
| `dynamicLoader(fn)` | Create an async catalog loader with dynamic imports |
| `formatMessage(msg, values, locale)` | Low-level ICU formatter |
| `SUPPORTED_LOCALES` | `["en", "es", "zh"]` (readonly tuple) |
| `DEFAULT_LOCALE` | `"en"` |
| `LOCALE_META` | Display names and direction per locale |

### I18n Instance

```typescript
const i18n = new I18n();

i18n.registerLoader(namespace, loaderFn)  // Register async/sync catalog loader
i18n.loadCatalog(namespace, locale, data) // Load catalog directly
i18n.activate(locale, namespaces)         // Switch locale + load catalogs
i18n.setLocale(locale)                    // Switch locale (catalogs must be loaded)
i18n.t(key, values?)                      // Translate a key
i18n.has(key)                             // Check if key exists
i18n.locale                               // Current locale
i18n.missingKeys                          // Set of missing key IDs
i18n.on(event, handler)                   // Subscribe to events (returns unsubscribe fn)
```

**Events:** `"locale-change"` · `"catalog-load"` · `"missing-key"`

### React (`@cig-technology/i18n/react`)

| Export | Description |
|--------|-------------|
| `I18nProvider` | Context provider (accepts optional `instance` prop) |
| `useI18n()` | Returns `{ i18n, locale, t, setLocale }` |
| `useTranslation()` | Returns just the `t()` function |
| `useLocale()` | Returns just the current locale |
| `Trans` | Component: `<Trans id="key" values={{}} />` |

### Detection (`@cig-technology/i18n/detection`)

| Export | Description |
|--------|-------------|
| `detectBrowserLocale()` | URL param → cookie → `<html lang>` → `navigator.language` |
| `detectNodeLocale()` | `CIG_LOCALE` → `LANG` → `LC_ALL` env vars |
| `detectMobileLocale(tags)` | Match device locale tags to supported locales |
| `persistLocale(locale)` | Save locale to cookie + `<html lang>` |

## ICU MessageFormat

The built-in formatter supports:

```
Simple:     "Hello {name}"
Plural:     "{count, plural, =0 {None} one {# item} other {# items}}"
Select:     "{role, select, admin {Admin} other {User}}"
Number:     "{price, number}"
Escaped:    "Use '{braces}' for literal braces"
```

Plurals use native `Intl.PluralRules` — automatic support for all CLDR languages.

## CI Tooling

### Check missing translations

```bash
npx i18n-check
# Scans catalogs/ for missing or empty translations.
# Exit code 1 if any found — use in CI pipelines.

npx i18n-check --strict
# Also warns about extra keys in target locales.
```

### Extract keys from code

```bash
npx i18n-extract --scan-dir ./src
# Scans code for t("key") and <Trans id="key"> patterns.
# Reports keys used in code but missing from catalogs.
```

### Compile catalogs to TypeScript

```bash
npx i18n-compile
# Reads catalogs/*/*.json → generates typed TypeScript modules.
# Produces a TranslationKey union type for autocomplete.
```

## Adding a New Language

1. Add the locale code to `SUPPORTED_LOCALES` in your config
2. Create `{locale}.json` in each catalog namespace
3. Run `npx i18n-check` to verify completeness
4. Run `npx i18n-compile` to regenerate types

## Namespace Splitting

Split translations by feature area. Each app loads only what it needs:

```typescript
i18n.registerLoader("common", staticLoader({ en: commonEn, es: commonEs }));
i18n.registerLoader("dashboard", dynamicLoader(
  (locale) => import(`./catalogs/dashboard/${locale}.json`)
));

// Landing page loads only "common"
await i18n.activate("en", ["common"]);

// Dashboard loads "common" + "dashboard"
await i18n.activate("en", ["common", "dashboard"]);
```

## License

MIT © [Edward Calderon](https://github.com/edwardcalderon)
