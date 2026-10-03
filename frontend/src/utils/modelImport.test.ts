import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { applyPMXArmsRelaxedPose } from './modelImport';

const getBoneDirection = (from: THREE.Bone, to: THREE.Bone): THREE.Vector3 => {
  from.updateMatrixWorld(true);
  to.updateMatrixWorld(true);

  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  from.getWorldPosition(fromPos);
  to.getWorldPosition(toPos);

  return toPos.sub(fromPos).normalize();
};

describe('applyPMXArmsRelaxedPose', () => {
  it('relaxes near T-pose upper arms downwards (light A-pose)', () => {
    const shoulder = new THREE.Bone();
    shoulder.name = '左肩';

    const upperArm = new THREE.Bone();
    upperArm.name = '左腕';

    const foreArm = new THREE.Bone();
    foreArm.name = '左ひじ';

    shoulder.add(upperArm);
    upperArm.add(foreArm);

    upperArm.position.set(0, 0, 0);
    foreArm.position.set(1, 0, 0);

    const skeleton = new THREE.Skeleton([shoulder, upperArm, foreArm]);

    const before = getBoneDirection(upperArm, foreArm);
    expect(Math.abs(before.y)).toBeLessThan(0.1);
    expect(Math.abs(before.x)).toBeGreaterThan(0.8);

    const applied = applyPMXArmsRelaxedPose(skeleton);
    expect(applied).toBe(true);

    const after = getBoneDirection(upperArm, foreArm);
    expect(after.y).toBeLessThan(-0.15);
  });

  it('does not modify an already-down arm chain', () => {
    const shoulder = new THREE.Bone();
    shoulder.name = '右肩';

    const upperArm = new THREE.Bone();
    upperArm.name = '右腕';

    const foreArm = new THREE.Bone();
    foreArm.name = '右ひじ';

    shoulder.add(upperArm);
    upperArm.add(foreArm);

    upperArm.position.set(0, 0, 0);
    foreArm.position.set(0, -1, 0);

    const skeleton = new THREE.Skeleton([shoulder, upperArm, foreArm]);

    const before = getBoneDirection(upperArm, foreArm);
    expect(before.y).toBeLessThan(-0.9);

    const applied = applyPMXArmsRelaxedPose(skeleton);
    expect(applied).toBe(false);

    const after = getBoneDirection(upperArm, foreArm);
    expect(after.dot(before)).toBeGreaterThan(0.999);
  });
});

