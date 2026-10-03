# PMX Rendering Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the PMX loading and rendering path so PMX textures display correctly, transparency behaves predictably, and PMX-specific debug noise no longer produces runtime exceptions.

**Architecture:** Keep PMX-specific decision logic in `frontend/src/utils/modelImport.ts`, apply those decisions in `frontend/src/hooks/usePMXModelLoader.ts`, and ensure `frontend/src/components/ModelViewer.tsx` preserves PMX-managed materials instead of overriding them. Verify behavior with focused Vitest coverage around material semantics and PMX helper logic.

**Tech Stack:** React, TypeScript, Three.js, Vitest

---

### Task 1: Add PMX material policy helpers and tests

**Files:**
- Modify: `frontend/src/utils/modelImport.ts`
- Test: `frontend/src/utils/modelImport.test.ts`

- [ ] **Step 1: Write failing helper tests for PMX transparency policy and texture classification**

```ts
describe('resolvePMXTransparencyPolicy', () => {
  it('keeps opaque materials depth-safe', () => {
    expect(resolvePMXTransparencyPolicy({
      opacity: 1,
      hasColorTexture: true,
      hasSphereTexture: false,
      hasToonTexture: false
    })).toEqual({
      transparent: false,
      alphaTest: 0,
      depthWrite: true,
      renderOrderOffset: 0
    });
  });

  it('treats low-opacity materials as transparent overlays', () => {
    expect(resolvePMXTransparencyPolicy({
      opacity: 0.35,
      hasColorTexture: true,
      hasSphereTexture: false,
      hasToonTexture: false
    })).toEqual({
      transparent: true,
      alphaTest: 0,
      depthWrite: false,
      renderOrderOffset: 10
    });
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- modelImport.test.ts`
Expected: FAIL because `resolvePMXTransparencyPolicy` does not exist yet.

- [ ] **Step 3: Implement helper types and `resolvePMXTransparencyPolicy()` in `modelImport.ts`**

```ts
export interface PMXTransparencyPolicy {
  transparent: boolean;
  alphaTest: number;
  depthWrite: boolean;
  renderOrderOffset: number;
}

export const resolvePMXTransparencyPolicy = (input: {
  opacity: number;
  hasColorTexture: boolean;
  hasSphereTexture: boolean;
  hasToonTexture: boolean;
}): PMXTransparencyPolicy => {
  const opacity = Number.isFinite(input.opacity) ? input.opacity : 1;

  if (opacity >= 0.999) {
    return {
      transparent: false,
      alphaTest: 0,
      depthWrite: true,
      renderOrderOffset: 0
    };
  }

  if (opacity <= 0.4) {
    return {
      transparent: true,
      alphaTest: 0,
      depthWrite: false,
      renderOrderOffset: 10
    };
  }

  return {
    transparent: true,
    alphaTest: 0,
    depthWrite: true,
    renderOrderOffset: 5
  };
};
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- modelImport.test.ts`
Expected: PASS for the new transparency policy coverage.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/modelImport.ts frontend/src/utils/modelImport.test.ts
git commit -m "fix: add pmx material policy helpers"
```

### Task 2: Apply PMX material semantics in the loader

**Files:**
- Modify: `frontend/src/hooks/usePMXModelLoader.ts`
- Modify: `frontend/src/utils/modelImport.ts`
- Test: `frontend/src/utils/modelImport.test.ts`

- [ ] **Step 1: Extend tests to cover sphere and toon decision outputs**

```ts
it('resolves add sphere maps and shared toon textures together', () => {
  expect(resolvePMXMaterialTextureRefs(
    {
      diffuse: [1, 1, 1, 0.8],
      textureIndex: 0,
      envTextureIndex: 1,
      envFlag: 2,
      toonFlag: 1,
      toonIndex: 0
    },
    ['body.png', 'cloth.spa']
  )).toEqual({
    colorTextureRef: 'body.png',
    sphereTextureRef: 'cloth.spa',
    toonTextureRef: 'toon01.bmp',
    sphereBlendMode: 'add',
    opacity: 0.8,
    transparent: true,
    alphaTest: 0
  });
});
```

- [ ] **Step 2: Run the test suite to confirm current PMX material behavior before edits**

Run: `npm test -- modelImport.test.ts`
Expected: current tests pass or only new expectations fail.

- [ ] **Step 3: Update `usePMXModelLoader.ts` to use policy helpers and map PMX textures intentionally**

```ts
const transparencyPolicy = resolvePMXTransparencyPolicy({
  opacity: textureRefs.opacity,
  hasColorTexture: !!textureRefs.colorTextureRef,
  hasSphereTexture: !!textureRefs.sphereTextureRef,
  hasToonTexture: !!textureRefs.toonTextureRef
});

const material = new THREE.MeshPhongMaterial({
  color: new THREE.Color(diffuseR, diffuseG, diffuseB),
  specular: new THREE.Color(specularR, specularG, specularB),
  shininess: Math.max(1, shininess),
  transparent: transparencyPolicy.transparent,
  opacity: textureRefs.opacity,
  alphaTest: transparencyPolicy.alphaTest,
  side: isDoubleSided ? THREE.DoubleSide : THREE.FrontSide,
  depthWrite: transparencyPolicy.depthWrite
});

if (baseTexture) {
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  material.map = baseTexture;
}

if (sphereTexture && textureRefs.sphereBlendMode === 'multiply') {
  sphereTexture.colorSpace = THREE.NoColorSpace;
  material.specularMap = sphereTexture;
  material.specular.multiplyScalar(1.15);
}

if (sphereTexture && textureRefs.sphereBlendMode === 'add') {
  sphereTexture.colorSpace = THREE.SRGBColorSpace;
  material.emissiveMap = sphereTexture;
  material.emissive.setRGB(0.18, 0.18, 0.18);
}

if (toonTexture && !material.emissiveMap) {
  toonTexture.colorSpace = THREE.NoColorSpace;
  material.gradientMap = null as never;
  material.emissiveMap = toonTexture;
  material.emissive.setRGB(0.1, 0.1, 0.1);
}

material.userData.pmxRenderOrderOffset = transparencyPolicy.renderOrderOffset;
```

- [ ] **Step 4: Run tests after the loader update**

Run: `npm test -- modelImport.test.ts`
Expected: PASS with PMX helper tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/usePMXModelLoader.ts frontend/src/utils/modelImport.ts frontend/src/utils/modelImport.test.ts
git commit -m "fix: improve pmx material texture mapping"
```

### Task 3: Preserve PMX material settings in the viewer and remove PMX debug noise

**Files:**
- Modify: `frontend/src/components/ModelViewer.tsx`
- Modify: `frontend/src/hooks/usePMXModelLoader.ts`

- [ ] **Step 1: Add a small PMX debug gate and viewer-side preservation change**

```ts
const PMX_DEBUG_ENDPOINT = 'http://127.0.0.1:7777/event';
const PMX_DEBUG_ENABLED = false;

const reportDebug = (...) => {
  if (!PMX_DEBUG_ENABLED) {
    return;
  }

  fetch(PMX_DEBUG_ENDPOINT, { ... }).catch(() => {});
};
```

```ts
if (mat.userData?.pmxManaged) {
  if (typeof mat.userData.pmxRenderOrderOffset === 'number') {
    child.renderOrder = mat.userData.pmxRenderOrderOffset;
  }
  continue;
}
```

- [ ] **Step 2: Run the frontend test suite or targeted tests**

Run: `npm test -- modelImport.test.ts`
Expected: PASS, with no PMX helper regressions.

- [ ] **Step 3: Build the frontend to catch type errors**

Run: `npm run build`
Expected: successful TypeScript compile and Vite build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ModelViewer.tsx frontend/src/hooks/usePMXModelLoader.ts
git commit -m "fix: stabilize pmx viewer rendering"
```

### Task 4: Final verification and cleanup

**Files:**
- Modify: `frontend/src/utils/modelImport.test.ts`
- Modify: `frontend/src/hooks/usePMXModelLoader.ts`
- Modify: `frontend/src/components/ModelViewer.tsx`

- [ ] **Step 1: Re-run focused PMX verification**

Run: `npm test -- modelImport.test.ts`
Expected: PASS

- [ ] **Step 2: Re-run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Manual verification checklist**

```md
- Import a PMX folder with its texture directory.
- Confirm body and clothing textures appear.
- Confirm semi-transparent parts do not disappear unexpectedly.
- Confirm the browser console no longer floods with `127.0.0.1:7777/event` errors from PMX debug hooks.
- Confirm the model still loads under the low-end device profile.
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/modelImport.test.ts frontend/src/hooks/usePMXModelLoader.ts frontend/src/components/ModelViewer.tsx
git commit -m "test: cover pmx rendering fixes"
```
