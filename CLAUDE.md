# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Gym progression tracker built with React Native + Expo (SDK 54, new architecture enabled). Tracks progress on exercises with sets/reps suggestions per week and progress visualization. Local-first: data lives in SQLite via `expo-sqlite` (see `db/init.tsx`, currently a stub). No backend for now; Firebase may be added later for sync. Styling uses React Native's built-in `StyleSheet` API only — no styling libraries (Tailwind, styled-components, etc.).

This is an early-stage project: most of the codebase is still the stock `create-expo-app` template output (`app/(tabs)/`, `components/`, `hooks/`) alongside a fresh `app/index.tsx` and an empty `db/init.tsx` where real feature work is starting.

## Commands

- `npm start` — start the Expo dev server (press `a`/`i`/`w` to open Android/iOS/web)
- `npm run android` / `npm run ios` / `npm run web` — start directly on a given platform
- `npm run lint` — run `expo lint` (ESLint via `eslint-config-expo`)
- `npm run reset-project` — moves the template starter code to `app-example/` and resets `app/` to blank (already effectively done; only run if intentionally reverting to a clean slate)

There is no test runner configured yet.

## Design

All components should be made in neumorphic design with gradient, shadows and slight glow effect beneath buttons. Avoid making boring flat design.

## Architecture

- **Routing**: `expo-router` with typed routes enabled (`experiments.typedRoutes` in `app.json`). Routes are files under `app/`; `app/_layout.tsx` is the root layout, `app/(tabs)/` is a tab group. `main` entry point is `expo-router/entry` (see `package.json`).
- **Database**: `expo-sqlite` is registered as a config plugin in `app.json`. `db/init.tsx` is where schema/migration setup is meant to live (currently just imports `SQLiteDatabase`'s type, not yet implemented).
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`), e.g. `@/components/...`.
- **TypeScript**: strict mode on, extends `expo/tsconfig.base`.
- **React Compiler**: enabled via `experiments.reactCompiler` in `app.json` — avoid manual memoization patterns that fight the compiler.

## Expo version note

Per `AGENTS.md`, Expo APIs/config have changed — consult the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing Expo-specific code (config plugins, `expo-router`, `expo-sqlite`, etc.) rather than relying on training data.
