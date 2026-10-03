# RuanRuan Desktop Pet（阮阮桌面宠物）

> Windows desktop AI companion · Electron + Babylon.js rendering + **DeepSeek Harness** workbench + motion-core cerebellum
> This repository is the **source of truth**; the running build lives in the desktop KKS install directory (`resources/app`, hot-update deployment).
> Former names: RuanYun Desktop Pet.

## What it is

An AI companion living on your desktop:

- **3D character**: Babylon.js renders PMX models with a life layer (breathing / blinking / gaze tracking / random micro-motions) and a motion system (standard recipes + VMD clips + motion library, with joint physiological-limit guards and collision rollback).
- **3D scene editor** (added 2026-10): multi-model import (PMX/GLB/glTF/OBJ), drag placement (left-drag = screen plane, right-drag = depth), XYZ scale & rotation, bone/joint posing, background switching; layouts persist with a scope choice (preview / wallpaper / both).
- **Brain**: integrates **DeepSeek Harness (DSH)** as the workbench & automation runtime (DSH Web embedded in `/chat`, port 5190); conversations route through the backend `runBrain` (DSH CLI → cloud API → fallback); model configuration authority is DSH's `providers.json`.
- **Cerebellum**: `motion-core/motion-hub` (:9877) — the motion protocol layer: primitive library, parameter validation, physiological-limit softGate, recipe orchestration; motions flow through the :27865 command queue and a 1s main-process poll broadcast to all windows.
- **Companionship**: idle interaction scheduler (30s heartbeat, non-repeating shuffle bag, AI-choreographed actions, hourly stretch + spoken line; deferred during calls, muted at night).
- **Desktop forms**: pet window, wallpaper mode (WorkerW beneath desktop icons), floating-ball wallpaper console; voice calls (STT/TTS via an Edge speech-bridge page).

## Architecture

Full topology and data flows: **English [docs/ARCHITECTURE_en.md](docs/ARCHITECTURE_en.md) (with [topology diagram](docs/architecture_en.svg))** · 中文 [docs/ARCHITECTURE_zh.md](docs/ARCHITECTURE_zh.md)（[拓扑图](docs/architecture_zh.svg)）。

One-line flow: user → Electron window layer (main / pet / wallpaper / console) → render engine (Babylon active; Godot 4.7.2 optional second backend) → main process `electron-main.js` (static UI :5175 / command polling / heartbeat / DSH bridge) → backend Express :27865 (`/ai/hub`, `/companion`, `/joint-control`, …) → cerebellum motion-hub :9877 → brain DeepSeek Harness :5190 (cloud LLM / optional local Qwen).

## Layout

```
├─ frontend/            # Electron + React frontend (BabylonModelViewer, pages, services)
│  ├─ electron-main.js  # main process (windows, process orchestration, polling, heartbeat, DSH bridge, scene3d IPC)
│  ├─ preload.js        # contextBridge bridges
│  ├─ src/              # renderer source (pages / components / services / ai / motion …)
│  └─ public/           # vmd motion library, console.html, scene3d assets
├─ backend/             # Express API (aiHub / companion / jointControl / motion / …)
├─ motion-core/         # cerebellum: motion-hub(:9877) / vmd-pipeline / tuning viewer / asset generators
└─ docs/                # architecture docs (zh/en) + topology diagrams (zh/en SVG) + AI-collaboration notes
```

> The DSH runtime is a local companion component (third-party, not in the repo); its bridge source lives in `frontend/dsh-bridge/`.

## Build & development

- Frontend: `cd frontend && npm install && npm run build` (tsc + vite → `frontend/dist`)
- Backend: `cd backend && npm install && npm run build` (tsc → `backend/dist`)
- Deployment convention: build outputs + `electron-main.js` / `preload.js` are synced into the KKS install dir `resources/app/` (hot-update style; restart applies the new version).
- Runtime ports: `5175` UI static · `27865` backend · `9877` motion-hub · `5190` DSH · `9880` Godot (optional) · `5181` gui-agent · `5180` browser-search.

## Attribution (DeepSeek Harness and others)

- This project **integrates DeepSeek Harness (DSH)** as its workbench/automation runtime: started and kept alive via `frontend/dsh-bridge/dshHarness.js`, with the workspace at `dsh-workspace` in the app directory (`providers.json` is the single source of truth for API config). **DSH is copyright DeepSeek**; this project only integrates it and carries local adaptation patches (see [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)); no DSH source is included or redistributed here.
- Third-party components and assets (including copyright notes for PMX model assets): [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md).

## For AI collaborators

If you are an AI agent, read **[docs/AGENTS.md](docs/AGENTS.md)** (English) / [docs/AGENTS_zh.md](docs/AGENTS_zh.md) (中文) first — workflow red lines live there (backup before edits, evidence chains, legal interfaces only, centralized management, …).

---

*Note: this README replaced an early template (which described MongoDB/Redis/Claude etc. — never part of the actual stack). The old copy is kept at `README.md.bak_20261001`.*
