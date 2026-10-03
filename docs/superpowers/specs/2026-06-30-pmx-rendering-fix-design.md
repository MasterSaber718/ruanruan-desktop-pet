# PMX Rendering Fix Design

## Goal

Stabilize the PMX preview pipeline so imported PMX models render with correct base textures, acceptable PMX material semantics, and fewer transparency artifacts on low-end devices.

## Scope

- Only touch the PMX import and rendering path.
- Focus on `frontend/src/utils/modelImport.ts`, `frontend/src/hooks/usePMXModelLoader.ts`, `frontend/src/components/ModelViewer.tsx`, and nearby PMX tests.
- Keep performance-safe defaults for old hardware.
- Remove PMX-specific debug noise that causes repeated browser console connection errors.

## Problems Observed

1. Base texture matching is fragile when PMX references and imported file paths differ by directory structure or naming style.
2. PMX material texture semantics are only partially applied. Base textures are used, but sphere and toon textures are not mapped in a stable, intentional way.
3. Transparent materials are treated too simplistically, which can cause missing-looking surfaces, edge sorting issues, and unstable depth results.
4. Viewer-side material optimization must not override PMX-managed materials after the loader has already configured them.
5. Development-only PMX debug reporting hits `127.0.0.1:7777/event`, creating noisy runtime errors when the local collector is absent.

## Design

### 1. Material Semantic Normalization

Extend PMX material helpers so the loader can make consistent decisions for:

- base color texture reference
- sphere texture reference and blend mode
- toon texture reference
- opacity and transparency mode
- alpha cutoff for likely cutout materials
- whether depth writing should stay enabled

This stays in `modelImport.ts` so the rules are testable without a WebGL scene.

### 2. Texture Application Rules

In `usePMXModelLoader.ts`:

- Keep base textures on `material.map`.
- Apply toon textures conservatively as brightness support instead of hard overriding the material look.
- Approximate sphere maps in a stable way:
  - multiply mode prefers `specularMap` and a modest specular boost
  - add mode prefers `emissiveMap` with restrained emissive intensity
- Configure loaded textures consistently for PMX:
  - `flipY = false`
  - color textures use `SRGBColorSpace`
  - non-color helper textures may use neutral color space where needed
  - mipmaps and filters remain performance-safe

### 3. Transparency Stability

Introduce a small PMX transparency policy:

- fully opaque materials keep `transparent = false` and `depthWrite = true`
- low-opacity materials use `transparent = true`
- likely cutout materials can use a non-zero `alphaTest`
- very transparent materials may disable depth write
- materials receive a stable `renderOrder` hint to reduce small sorting artifacts

The goal is not perfect MMD parity, but stable browser rendering.

### 4. Viewer Safety

In `ModelViewer.tsx`:

- preserve PMX-managed material settings
- keep device-aware renderer settings
- avoid generic overrides that change PMX side, transparency, or environment behavior after load
- keep the existing scene, controls, and low-power rendering posture unless a PMX-specific bug requires a narrow change

### 5. Debug Noise Removal

Guard or disable the PMX debug POST calls so normal use does not spam failed requests when no debug collector is running.

## Validation

### Automated

- extend `frontend/src/utils/modelImport.test.ts`
- cover PMX material texture resolution and transparency policy
- cover sphere/toon mode decisions
- keep existing path normalization and bone/material group regressions passing

### Manual

- import a PMX model folder with textures
- confirm base textures appear
- confirm transparent accessories or clothing no longer disappear unexpectedly
- confirm console no longer floods with `127.0.0.1:7777/event` errors from PMX debug hooks
- confirm low-end rendering settings still load and display the model

## Non-Goals

- custom MMD shaders
- full Blender-identical shading
- unrelated AI/service/router logging cleanup
- broad refactors outside the PMX path
