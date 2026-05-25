# Org Branding Logo — Design Spec

**Date:** 2026-05-25
**Status:** Approved

## Overview

Allow org admins to upload a custom light-mode and dark-mode logo via Preferences. The logo replaces the default OpenSign logo in the authenticated app header and in the signing page toolbar seen by recipients.

---

## Data Model

**New Parse class: `contracts_OrgBranding`**

| Field | Type | Notes |
|---|---|---|
| `TenantId` | Pointer → `partners_Tenant` | Links branding to the org |
| `LogoLight` | Parse.File | URL served after save |
| `LogoDark` | Parse.File | URL served after save |
| `createdAt` | Date | Auto |
| `updatedAt` | Date | Auto |

- One record per tenant, upserted on save.
- Logos stored as Parse Files (not base64) — same storage backend as all other files in the system, served as stable URLs.
- Either field can be absent; each is optional independently.

---

## Backend

**Files to modify/create in `apps/OpenSignServer/cloud/`:**

### 1. `parsefunction/saveOrgBranding.js` (new)

- Cloud function name: `saveorgbranding`
- Requires valid session (`request.user` guard).
- Params: `{ tenantId, logoLight?, logoDark? }`
  - Each logo is `{ base64, contentType, name }`.
- For each provided logo: create a `Parse.File`, save it, then upsert the `contracts_OrgBranding` record for the given `TenantId` using master key.
- Only updates fields that are explicitly provided (allows saving light logo without touching dark, and vice versa).
- Returns the updated record with resolved file URLs.

### 2. `parsefunction/getOrgBranding.js` (new)

- Cloud function name: `getorgbranding`
- Requires valid session.
- Params: `{ tenantId }` — client reads this from `localStorage.getItem("TenantId")`, same pattern used by `MailTemplateEditor`.
- Queries `contracts_OrgBranding` where `TenantId` equals the given tenant pointer.
- Returns `{ logoLight: url | null, logoDark: url | null }`.

### 3. `parsefunction/getLogoByDomain.js` (extend existing)

- Already queries `partners_Tenant` by domain.
- Add a secondary query: find `contracts_OrgBranding` where `TenantId` equals the found tenant.
- Include `logoLight` and `logoDark` URLs in the return value alongside the existing `logo` and `favicon` fields.
- This is the unauthenticated path used by the signing page — no session required.

### 4. `cloud/main.js`

- Import and register `saveorgbranding` and `getorgbranding`.

---

## Frontend

### 1. `OrgBrandingTab` component

**Path:** `apps/OpenSign/src/components/preferences/tabs/Branding.jsx`

- Export from `apps/OpenSign/src/components/preferences/tabs/index.js`.
- On mount: call `getorgbranding` cloud function, populate existing logo previews.
- UI: two upload sections — "Light mode logo" and "Dark mode logo".
  - Each has: file input (`accept="image/*"`), live preview once a file is selected, remove button to clear a saved logo (sends a save with that field set to null).
- Single Save button at the bottom submits both changed files.
- Convert selected file to base64 on the client before sending to `saveorgbranding`.
- Shows success/error alert matching the existing pattern in other Preferences tabs.

### 2. `apps/OpenSign/src/pages/Preferences.jsx`

- Import `OrgBrandingTab` from tabs.
- Add a "Branding" tab entry (`{ name: "branding", title: "Branding", icon: "fa-light fa-palette" }`) to the tab array.
- Guard: only include in the tab array when `isAdmin` (same condition used for admin-only features in the sidebar).

### 3. `apps/OpenSign/src/components/Header.jsx`

- In `initializeHead`: after `getAppLogo()`, call `getorgbranding` cloud function.
- Store `orgLogoLight` and `orgLogoDark` in component state.
- Logo rendering logic (priority order):
  - Dark mode + `orgLogoDark` set → use `orgLogoDark`
  - Dark mode + no `orgLogoDark` → existing fallback (`logo-dark.png`)
  - Light mode + `orgLogoLight` set → use `orgLogoLight`
  - Light mode + no `orgLogoLight` → existing `getAppLogo()` result
- No change to logout logic; branding is fetched fresh on next login.

### 4. `apps/OpenSign/src/components/pdf/PdfHeader.jsx`

- On mount: call `getAppLogo()` (already unauthenticated-safe; extended to return `logoLight`/`logoDark`).
- Determine which URL to use based on current theme (same dark/light logic as Header).
- Desktop layout: render a small `<img>` in the center of the toolbar between Prev/Next and the action buttons. Max height `32px`, `object-contain`.
- Mobile layout: small logo between the back-arrow and the page controls.
- Hidden (render nothing) if no org logo is configured.

---

## Error Handling

- Upload errors (file too large, wrong type, network): surface via the existing `Alert` primitive with `type="danger"`.
- `getorgbranding` failing silently is acceptable — header falls back to default logo with no visible error.
- `getlogobydomain` branding query failure is acceptable — signing page falls back to default logo.

---

## Out of Scope

- Favicon customisation (separate concern).
- Primary colour / full white-labelling.
- Webhook and API Token pages (separate unimplemented feature).
- Per-user logo overrides.
