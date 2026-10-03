# AGENTS.md — Working rules for AI collaborators

> 中文版：[AGENTS_zh.md](AGENTS_zh.md) · Architecture: [ARCHITECTURE_en.md](ARCHITECTURE_en.md)
> These rules come from the project owner's standing decisions. Violating them = rework.

## Red lines (always)

1. **No "works-on-my-machine" code.** Think through data flow, edge cases, and failure paths before writing.
2. **Backup before edits.** Any file you modify gets a same-name `.bak_<yyyymmdd>` copy first.
3. **Evidence chains.** Before fixing, reproduce/observe, collect logs with timestamps, confirm causality; after fixing, re-verify and write ONE report (new replaces old).
4. **Legal interfaces only.** Talk to the motion system through the sanctioned chain only: `27865 /joint-control|/pet-action` → `motion-hub 9877` → renderer `__petAction` / `__playStdMotion` / `__playVmdClip`. Never hand-write bone quaternions outside asset files; never bypass `providers.json` for API config.
5. **Locked scope — do not delete.** `flags` / `companionFlagsV2` state, the render-side life layer (breath/blink/gaze/micro-motions), and the legacy quit-prompt code are locked by the owner. Reuse, don't remove.
6. **Centralized management.** Idle-companionship rhythm lives ONLY in `backend/src/routes/companion.ts`. The main process is a dumb heartbeat + speaker. Do not create competing timers.
7. **Motion assets must self-enforce limits.** vmdClip driving writes quaternions directly (no safeRotateJoint guards). Any generator you write must validate against KINEMATICS limits (elbow |Z| ≤ 0.40, knees X− only, …) before writing files — see `motion-core/tools/make_dance_xyz.py` as the reference pattern.
8. **Deploy = source → build → sync to the KKS install dir** (`resources/app`). Never hand-edit built files; never invent version numbers (packaging owns versions).
9. **Do not touch DSH internals.** DSH © DeepSeek — integrate via `dsh-bridge/dshHarness.js` only; local adaptation patches must be documented in `docs/THIRD_PARTY.md`.
10. **Reports and deliverables are single-file HTML pages** in the owner's reports folder, kept at TWO copies (new + previous).

## Quick anchors

- Ports & flows: [ARCHITECTURE_en.md](ARCHITECTURE_en.md) §2–3.
- API config authority: `dsh-workspace/providers.json` (active provider wins).
- Motion asset format: `ruanlinyun-vmd-asset-v1` (see `frontend/public/vmd/*.motion.json`); cats→bones map in `frontend/src/motion/vmdClipPlayer.ts`.
- Scene3d editor: `window.__scene3d` in `frontend/src/components/BabylonModelViewer.tsx`; assets in `frontend/public/scene3d/`.
- Idle scheduler: `backend/src/routes/companion.ts` (v1.1) + heartbeat in `frontend/electron-main.js` (`startCompanionTicker`).
- Command queue: `backend/src/routes/jointControl.ts` (`/pet-action` is the legal external trigger).
