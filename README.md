https://zenn.dev/emadurandal/books/cb6818fd3a1b2e
↑ このサイトを参考にした。

# WebGPU TypeScript Starter

This small project sets up a minimal TypeScript workflow for WebGPU.

Quick start:

1. Install dev dependencies:

```bash
npm install
```

2. Build TypeScript to `js/`:

```bash
npm run build
```

3. Serve the folder (WebGPU requires secure context; `http://localhost` is allowed):

```bash
npm run serve
# then open http://localhost:8000 in a WebGPU-capable browser (Chrome/Edge Canary, or local builds)
```

For development watch:

```bash
npm run dev
```

Files:

-   `src/main.ts` — WebGPU initialization and single-frame clear
-   `tsconfig.json` — TypeScript config (outputs to `js/`)
