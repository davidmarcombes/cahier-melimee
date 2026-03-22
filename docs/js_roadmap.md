# JS Code Review & Roadmap

This document tracks the technical debt and improvements identified during the code review of `src/assets/js`.

## Core Application (`app.js`)

- [x] **State Management Refactor**: The `seriesPlayer` object is overcrowded. Group exercise-specific state into a `state` or `current` object.
- [x] **Simplify `goTo()`**: Replace manual state reset with a centralized `resetState()` or `initExercise()` function to improve maintainability.
- [x] **Optimize `trouParts`**: Memoize or pre-calculate the regex expansion of operations à trou instead of using a getter that recalculates on every access.
- [x] **Centralize Constants**: Extract hardcoded magic numbers (like `2000ms` for error timeouts) into a `SETTINGS` object for easier tuning (Implemented in `modules/constants.js`).
- [x] **Modularization**: Break `app.js` into smaller modules (e.g., `store`, `player`, `utils`) to improve readability and file organization.

## SVG Generation (`svg.js`)

- [x] **Robust IDs**: Replace `Math.random().toString(36).substr(2, 5)` in SVG gradient IDs with a more deterministic or safer counter-based ID system (Implemented in `SVG.uid`).
- [x] **Standardize Typography**: Replace remaining hardcoded `font-family="Arial"` with `system-ui, sans-serif` to ensure platform-native experience (Implemented in `SVG.font`).
- [x] **Batch Optimization**: Apply similar rounding and grouping optimizations from `slicedPieSvg` to all other complex SVG generators (Implemented in `SVG.f` and `SVG.tag`).

## Generators (`generators.js`)

- [x] **Shared Helpers**: Deduplicate `shuffle()` and random number generation logic used across multiple generators. Consolidated at top of `generators.js`.
- [x] **Parameter Guarding**: Add range validation and guard clauses to arithmetic generators (e.g., `min > max` swapping) to ensure robust randomization.
- [x] **Naming Standardization**: Align naming conventions between `AppGenerators` (global) and `generators` (local) across the codebase.

## Timed Player (`timed-player.js`)

- [x] **Decouple Utilities**: Move shared utilities (like `renderOpShorthands` and `normalizeAnswer`) to `modules/utils.js` to eliminate strict script order dependencies.

## Performance & Build

- [ ] **File Splitting**: Consider splitting `generators.js` into smaller topic-based files (e.g., `gen-maths.js`, `gen-geometry.js`) to optimize conditional loading.

---
**Status Update (2026-03-22):** All components refactored into ES modules. Shared constants and utilities centralized. E2E tests (41/41) PASS.
