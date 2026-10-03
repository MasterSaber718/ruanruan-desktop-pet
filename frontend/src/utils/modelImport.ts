import * as THREE from 'three';

export interface ImportedAsset {
  name: string;
  path: string;
}

export interface ClassifiedImportedFiles {
  modelFiles: ImportedAsset[];
  textureFiles: ImportedAsset[];
  motionFiles: ImportedAsset[];
  unsupportedFiles: ImportedAsset[];
}

export interface MaterialGroup {
  start: number;
  count: number;
  materialIndex: number;
}

export interface SkeletonBoneInput {
  position?: number[];
  parentIndex?: number;
}

export interface PMXMaterialTextureRefs {
  colorTextureRef: string | null;
  sphereTextureRef: string | null;
  toonTextureRef: string | null;
  sphereBlendMode: 'none' | 'multiply' | 'add';
  opacity: number;
  transparent: boolean;
  alphaTest: number;
}

export interface PMXTransparencyPolicy {
  transparent: boolean;
  alphaTest: number;
  depthWrite: boolean;
  renderOrderOffset: number;
}

export interface PMXMaterialTextureInput {
  diffuse?: number[];
  textureIndex?: number;
  envTextureIndex?: number;
  envFlag?: number;
  toonFlag?: number;
  toonIndex?: number;
}

// [v21 修复] 增加 'pmd'：BabylonModelViewer 渲染端支持 .pmd（pmdLoader），此前分类器将其归入 unsupportedFiles 导致无法导入
const MODEL_EXTENSIONS = ['pmx', 'pmd', 'gltf', 'glb', 'obj'];
const TEXTURE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tga', 'webp', 'spa', 'sph'];
const MOTION_EXTENSIONS = ['vmd'];

const getFileExtension = (fileName: string): string => {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const getPMXTextureRefByIndex = (textureIndex: number | undefined, textureRefs: string[]): string | null => {
  return typeof textureIndex === 'number' && textureIndex >= 0 && textureIndex < textureRefs.length
    ? textureRefs[textureIndex] || null
    : null;
};

const getSharedToonTextureName = (toonIndex: number | undefined): string | null => {
  if (typeof toonIndex !== 'number' || toonIndex < 0 || toonIndex > 9) {
    return null;
  }

  return `toon${String(toonIndex + 1).padStart(2, '0')}.bmp`;
};

export const normalizeImportPath = (inputPath: string): string => {
  return inputPath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim()
    .toLowerCase();
};

const getImportedAssetPath = (file: Pick<File, 'name'> & { webkitRelativePath?: string }): string => {
  return normalizeImportPath(file.webkitRelativePath || file.name);
};

const getPathBasename = (inputPath: string): string => {
  const normalizedPath = normalizeImportPath(inputPath);
  const segments = normalizedPath.split('/');
  return segments[segments.length - 1] || normalizedPath;
};

export const findTextureAsset = <T extends ImportedAsset>(textureReference: string, textures: T[]): T | undefined => {
  const normalizedReference = normalizeImportPath(textureReference);
  const exactMatch = textures.find((texture) => normalizeImportPath(texture.path) === normalizedReference);
  if (exactMatch) {
    return exactMatch;
  }

  const basename = getPathBasename(normalizedReference);
  return textures.find((texture) => getPathBasename(texture.path) === basename);
};

export const classifyImportedFiles = (
  files: Array<Pick<File, 'name'> & { webkitRelativePath?: string }>
): ClassifiedImportedFiles => {
  const classified: ClassifiedImportedFiles = {
    modelFiles: [],
    textureFiles: [],
    motionFiles: [],
    unsupportedFiles: []
  };

  files.forEach((file) => {
    const path = getImportedAssetPath(file);
    const asset = { name: file.name, path };
    const extension = getFileExtension(file.name);

    if (MODEL_EXTENSIONS.includes(extension)) {
      classified.modelFiles.push(asset);
      return;
    }

    if (TEXTURE_EXTENSIONS.includes(extension)) {
      classified.textureFiles.push(asset);
      return;
    }

    if (MOTION_EXTENSIONS.includes(extension)) {
      classified.motionFiles.push(asset);
      return;
    }

    classified.unsupportedFiles.push(asset);
  });

  classified.modelFiles.sort((left, right) => {
    const leftPriority = getFileExtension(left.name) === 'pmx' ? 0 : 1;
    const rightPriority = getFileExtension(right.name) === 'pmx' ? 0 : 1;
    return leftPriority - rightPriority;
  });

  return classified;
};

export const buildMaterialGroups = (materials: Array<{ faceCount?: number }>): MaterialGroup[] => {
  let start = 0;

  return materials.reduce<MaterialGroup[]>((groups, material, materialIndex) => {
    const triangleCount = typeof material.faceCount === 'number' ? material.faceCount : 0;
    const count = triangleCount * 3;
    if (count > 0) {
      groups.push({ start, count, materialIndex });
      start += count;
    }
    return groups;
  }, []);
};

export const resolvePMXMaterialTextureRefs = (
  material: PMXMaterialTextureInput,
  textureRefs: string[]
): PMXMaterialTextureRefs => {
  const opacity = typeof material.diffuse?.[3] === 'number' ? material.diffuse[3] : 1;
  const colorTextureRef = getPMXTextureRefByIndex(material.textureIndex, textureRefs);
  const sphereTextureRef = (material.envFlag === 1 || material.envFlag === 2)
    ? getPMXTextureRefByIndex(material.envTextureIndex, textureRefs)
    : null;

  let toonTextureRef: string | null = null;
  if (material.toonFlag === 0) {
    toonTextureRef = getPMXTextureRefByIndex(material.toonIndex, textureRefs);
  } else if (material.toonFlag === 1) {
    toonTextureRef = getSharedToonTextureName(material.toonIndex);
  }

  return {
    colorTextureRef,
    sphereTextureRef,
    toonTextureRef,
    sphereBlendMode: material.envFlag === 1 ? 'multiply' : material.envFlag === 2 ? 'add' : 'none',
    opacity,
    transparent: opacity < 0.999,
    alphaTest: 0
  };
};

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
    depthWrite: false,
    renderOrderOffset: 5
  };
};

export const buildSkeletonLocalPositions = (
  bones: SkeletonBoneInput[]
): Array<[number, number, number]> => {
  return bones.map((bone, index) => {
    const position = Array.isArray(bone.position) ? bone.position : [0, 0, 0];
    const parentIndex = typeof bone.parentIndex === 'number' ? bone.parentIndex : -1;

    if (parentIndex < 0 || parentIndex >= bones.length || parentIndex === index) {
      return [
        Number(position[0] ?? 0),
        Number(position[1] ?? 0),
        Number(position[2] ?? 0)
      ];
    }

    const parentPosition = Array.isArray(bones[parentIndex].position)
      ? bones[parentIndex].position as number[]
      : [0, 0, 0];

    return [
      Number(position[0] ?? 0) - Number(parentPosition[0] ?? 0),
      Number(position[1] ?? 0) - Number(parentPosition[1] ?? 0),
      Number(position[2] ?? 0) - Number(parentPosition[2] ?? 0)
    ];
  });
};

export const getTextureLoaderType = (fileName: string): 'default' | 'tga' => {
  return getFileExtension(fileName) === 'tga' ? 'tga' : 'default';
};

const normalizeBoneName = (name: string): string => {
  return name.replace(/\s+/g, '').trim().toLowerCase();
};

const findBoneByNames = (bones: THREE.Bone[], names: string[]): THREE.Bone | undefined => {
  const normalizedNames = names.map((name) => normalizeBoneName(name));
  return bones.find((bone) => normalizedNames.includes(normalizeBoneName(bone.name || '')));
};

const applyWorldDeltaToBone = (bone: THREE.Bone, deltaWorld: THREE.Quaternion): void => {
  const parentWorld = new THREE.Quaternion();
  if (bone.parent && (bone.parent as THREE.Object3D).getWorldQuaternion) {
    (bone.parent as THREE.Object3D).getWorldQuaternion(parentWorld);
  } else {
    parentWorld.identity();
  }

  const localDelta = parentWorld
    .clone()
    .invert()
    .multiply(deltaWorld)
    .multiply(parentWorld);

  bone.quaternion.premultiply(localDelta);
  bone.updateMatrixWorld(true);
};

export const applyPMXArmsRelaxedPose = (skeleton: THREE.Skeleton): boolean => {
  const bones = skeleton.bones;
  const leftUpper = findBoneByNames(bones, ['左腕', 'leftarm', 'larm', 'l_arm']);
  const leftFore = findBoneByNames(bones, ['左ひじ', '左肘', 'leftelbow', 'lelbow', 'l_elbow']);
  const rightUpper = findBoneByNames(bones, ['右腕', 'rightarm', 'rarm', 'r_arm']);
  const rightFore = findBoneByNames(bones, ['右ひじ', '右肘', 'rightelbow', 'relbow', 'r_elbow']);
  const outwardFactor = Math.tan((10 * Math.PI) / 180);

  const relaxChain = (upper: THREE.Bone | undefined, fore: THREE.Bone | undefined, fallbackHoriz: THREE.Vector3): boolean => {
    if (!upper || !fore) {
      return false;
    }

    upper.updateMatrixWorld(true);
    fore.updateMatrixWorld(true);

    const upperPos = new THREE.Vector3();
    const forePos = new THREE.Vector3();
    upper.getWorldPosition(upperPos);
    fore.getWorldPosition(forePos);

    const currentDir = forePos.sub(upperPos).normalize();
    if (Math.abs(currentDir.y) >= 0.35 || currentDir.y <= -0.5) {
      return false;
    }

    const horiz = currentDir.clone().setY(0);
    const horizDir = horiz.lengthSq() > 1e-6 ? horiz.normalize() : fallbackHoriz.clone().normalize();
    const targetDir = horizDir.multiplyScalar(outwardFactor).add(new THREE.Vector3(0, -1, 0)).normalize();

    const deltaWorld = new THREE.Quaternion().setFromUnitVectors(currentDir, targetDir);
    const identity = new THREE.Quaternion();

    const upperDelta = new THREE.Quaternion().slerpQuaternions(identity, deltaWorld, 0.75);
    const foreDelta = new THREE.Quaternion().slerpQuaternions(identity, deltaWorld, 0.35);

    applyWorldDeltaToBone(upper, upperDelta);
    applyWorldDeltaToBone(fore, foreDelta);

    return true;
  };

  const leftApplied = relaxChain(leftUpper, leftFore, new THREE.Vector3(1, 0, 0));
  const rightApplied = relaxChain(rightUpper, rightFore, new THREE.Vector3(-1, 0, 0));

  return leftApplied || rightApplied;
};

export const attachSkeletonAndFinalizePMXMesh = (
  skinnedMesh: THREE.SkinnedMesh,
  skeleton: THREE.Skeleton,
  rootBones: THREE.Bone[],
  options?: {
    parserAlreadyConvertedToLeftToRight?: boolean;
  }
): void => {
  const parserAlreadyConvertedToLeftToRight = options?.parserAlreadyConvertedToLeftToRight ?? true;

  rootBones.forEach((rootBone) => {
    skinnedMesh.add(rootBone);
  });

  if (!parserAlreadyConvertedToLeftToRight) {
    skinnedMesh.scale.set(0.085, 0.085, -0.085);
  } else {
    skinnedMesh.scale.set(0.085, 0.085, 0.085);
  }

  skinnedMesh.position.y = -1.5;

  skinnedMesh.updateMatrixWorld(true);

  skeleton.calculateInverses();
  skinnedMesh.bind(skeleton);

  if (skinnedMesh.geometry.getAttribute('skinWeight')) {
    skinnedMesh.normalizeSkinWeights();
  }

  if (!skinnedMesh.userData.pmxArmsRelaxedApplied) {
    const applied = applyPMXArmsRelaxedPose(skeleton);
    skinnedMesh.userData.pmxArmsRelaxedApplied = applied;
    if (applied) {
      skinnedMesh.updateMatrixWorld(true);
      skeleton.update();
    }
  }

  // 注意：不强制开启阴影投射
  // MMD骨骼模型 + MeshDepthMaterial 在部分GPU上不兼容，会导致WebGL上下文丢失
  skinnedMesh.castShadow = false;
  skinnedMesh.receiveShadow = false;
};
