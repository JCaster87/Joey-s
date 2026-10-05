# Joey-s

Remotion (React-based video) project.

- Compositions are registered in `src/Root.tsx`; entry point is `src/index.ts`.
- Render: `npx remotion render src/index.ts <CompositionId> out/<name>.mp4`
- Still frame: `npx remotion still src/index.ts <CompositionId> out/<name>.png --frame=<n>`
- Preview UI: `npm run studio`
- Typecheck: `npm run typecheck`
- `out/` is gitignored — rendered files are not committed.
- In cloud sessions `remotion.config.ts` points Remotion at the preinstalled
  Chromium, because downloading Remotion's own browser is blocked by the network policy.
