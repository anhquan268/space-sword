import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#game');
const scoreText = document.querySelector('#score');
const comboText = document.querySelector('#combo');
const shield = document.querySelector('#shield');
const levelText = document.querySelector('#level');
const levelProgress = document.querySelector('#level-progress');
const levelCard = document.querySelector('#level-card');
const startButton = document.querySelector('#start');
const startLabel = document.querySelector('#start-label');
const startScreen = document.querySelector('#start-screen');
const gameTitle = document.querySelector('#game-title');
const introCopy = document.querySelector('.start-card > p');
const status = document.querySelector('#status');
const statusText = document.querySelector('#status-text');
const reticle = document.querySelector('#reticle');
const hitLabel = document.querySelector('#hit-label');
const bestScoreText = document.querySelector('#best-score');

const CONFIG = Object.freeze({
  projectileSpeed: 52,
  projectileCooldownMs: 145,
  projectileRange: 105,
  projectileHomingStrength: 8.5,
  projectileHomingDelay: 0.11,
  projectileFanSpacingDeg: 5.2,
  secondaryTargetRadius: 24,
  backSwordFanSpacingDeg: 15,

  // Số kiếm bắn thủ công tối đa.
  maxManualSwords: 5,

  // Tốc độ kiếm tự động.
  autoSwordSpeed: 42,

  // Khoảng cách được tính là đã chém trúng.
  autoSwordHitRadius: 0.32,

  // Kiếm tự động chỉ chọn meteor nằm
  // trong bán kính này quanh nhân vật.
  autoSwordTargetRadius: 30,

  // Bán kính vòng bay quanh nhân vật.
  autoSwordOrbitRadius: 1.4,

  // Độ cao quỹ đạo so với player.
  autoSwordOrbitHeight: 0.2,

  // Tốc độ quay, đơn vị radian/giây.
  autoSwordOrbitSpeed: 3,

  // Độ nhanh khi kiếm nhập vào quỹ đạo.
  autoSwordOrbitFollowStrength: 9,

  autoSwordScale: 0.4,

  // Thời gian kiếm phải bay quanh nhân vật
  // trước khi được phép tìm mục tiêu mới.
  // autoSwordRetargetDelay: 5,

  // Mỗi kiếm được chém tối đa 20 meteor
  // trong một lượt hoạt động.
  autoSwordKillsPerTurn: 20,

  // Màu thân kiếm khi giữ lượt.
  autoSwordGoldColor: 0xffd84a,

  // Màu phát sáng.
  autoSwordGoldEmissive: 0xff9800,

  // Cường độ phát sáng.
  autoSwordGoldEmissiveIntensity: 2.2,

  // Cường độ đèn vàng quanh kiếm.
  autoSwordGoldLightIntensity: 7,

  // Chiều dài vệt sáng của kiếm tự động đang giữ lượt.
  autoSwordTrailLength: 6.4,

  // Độ sáng tổng thể của trail vàng.
  autoSwordTrailOpacity: 0.72,

  // Màu burst khi kiếm tự động chém trúng meteor.
  autoSwordBurstColor: 0xffc928,

  meteorSpawnEvery: 1.05,
  meteorMinSpeed: 9.5,
  meteorMaxSpeed: 15,
  startingShield: 3,
  hitsPerLevelPoint: 5,
  pointsPerLevel: 3,
  maxLevel: 10,
  aimPlaneZ: -48
});

const PROJECTILE_FORWARD_AXIS = new THREE.Vector3(0, 0, -1);
const MAX_RIG_PITCH = THREE.MathUtils.degToRad(10);
const localRigAimDirection = new THREE.Vector3();

const AIM_PLANE = new THREE.Plane(
  new THREE.Vector3(0, 0, 1),
  -CONFIG.aimPlaneZ
);

const state = {
  assetsReady: false,
  running: false,
  overlayMode: 'intro',
  score: 0,
  combo: 1,
  shield: CONFIG.startingShield,
  level: 1,
  levelPoints: 0,
  levelHitProgress: 0,
  bestScore: readBestScore(),
  spawnTimer: 0,
  lastShotAt: 0,
  lastHitAt: 0,
  shake: 0
};

bestScoreText.textContent = formatScore(state.bestScore);

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x050817);
scene.fog = new THREE.FogExp2(0x050817, 0.018);

const camera = new THREE.PerspectiveCamera(
  58,
  innerWidth / innerHeight,
  0.1,
  180
);

const cameraBase = new THREE.Vector3(0, 3.4, 10);
const cameraLookAt = new THREE.Vector3(0, 1.15, -18);

camera.position.copy(cameraBase);
camera.lookAt(cameraLookAt);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const timer = createCompatibleTimer();
const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const aimScreen = new THREE.Vector2(
  innerWidth / 2,
  innerHeight / 2
);

const projectiles = [];
const meteors = [];
const bursts = [];

// Các thanh kiếm tự động từ Level 6.
const autonomousSwords = [];

let stars;
let swordAsset = null;
let swordVisualTemplate = null;
let projectileSwordTemplate = null;
let meteorVisualTemplate = null;
let projectileTrailTemplate = null;
let autoSwordTrailOuterGeometry = null;
let autoSwordTrailCoreGeometry = null;
let aimRig = null;
let aimSwordPivot = null;
let backSwordFan = null;
let hitLabelTimer = 0;
let damageFlashTimer = 0;
let aimedMeteor = null;
let continuousFirePointerId = null;
let continuousFireActive = false;
let autoSwordOrbitAngle = 0;

/*
 * Thanh kiếm duy nhất đang được phép
 * tự động tấn công.
 */
let activeAutonomousSword = null;

/*
 * Số thứ tự được cấp khi một kiếm
 * chuyển từ BackSwordFan sang tự động.
 */
let nextAutonomousSwordOrder = 0;

const tempOrigin = new THREE.Vector3();
const tempTarget = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const homingDirection = new THREE.Vector3();
const fanDirection = new THREE.Vector3();
const FAN_ROTATION_AXIS = new THREE.Vector3(0, 1, 0);
const primaryTargetPosition = new THREE.Vector3();
const previousTip = new THREE.Vector3();
const currentTip = new THREE.Vector3();
const closestPoint = new THREE.Vector3();
const collisionSegment = new THREE.Line3();
const playerWorldQuaternion = new THREE.Quaternion();

const playerWorldPosition = new THREE.Vector3();
const autoSwordDirection = new THREE.Vector3();
const autoSwordOrbitPosition = new THREE.Vector3();

/*
 * Khi không có meteor, kiếm tự động dựng mũi lên trên.
 * Model kiếm được quy ước hướng theo trục local -Z.
 */
const AUTO_SWORD_IDLE_QUATERNION =
  new THREE.Quaternion().setFromUnitVectors(
    PROJECTILE_FORWARD_AXIS,
    new THREE.Vector3(0, 1, 0)
  );

function createCompatibleTimer() {
  if (typeof THREE.Timer === 'function') {
    const threeTimer = new THREE.Timer();

    threeTimer.connect?.(document);

    return threeTimer;
  }

  let previousTime = performance.now();
  let delta = 0;
  let elapsed = 0;

  return {
    reset() {
      previousTime = performance.now();
      delta = 0;

      return this;
    },

    update(timestamp = performance.now()) {
      delta = Math.max(0, timestamp - previousTime) / 1000;
      previousTime = timestamp;
      elapsed += delta;

      return this;
    },

    getDelta() {
      return delta;
    },

    getElapsed() {
      return elapsed;
    }
  };
}

scene.add(
  new THREE.HemisphereLight(
    0xaccdff,
    0x101323,
    1.65
  )
);

const keyLight = new THREE.DirectionalLight(
  0xd8ecff,
  3.2
);

keyLight.position.set(6, 11, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.025;

scene.add(keyLight);

const cyanLight = new THREE.PointLight(
  0x43dcff,
  18,
  30,
  2
);

cyanLight.position.set(-5, 3, -8);

scene.add(cyanLight);

const violetLight = new THREE.PointLight(
  0x7d45ff,
  14,
  36,
  2
);

violetLight.position.set(7, 6, -24);

scene.add(violetLight);

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x080d21,
  roughness: 0.88,
  metalness: 0.2,
  transparent: true,
  opacity: 0.76
});

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 130),
  floorMaterial
);

floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -0.72, -35);
floor.receiveShadow = true;

scene.add(floor);

const grid = new THREE.GridHelper(
  90,
  45,
  0x2e9eba,
  0x172342
);

grid.position.set(0, -0.7, -34);
grid.material.transparent = true;
grid.material.opacity = 0.22;

scene.add(grid);

const horizon = new THREE.Group();

for (const z of [-22, -42, -62]) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(8.8, 8.84, 96),
    new THREE.MeshBasicMaterial({
      color: z === -42 ? 0x806dff : 0x45dff5,
      transparent: true,
      opacity: z === -42 ? 0.11 : 0.07,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );

  ring.position.z = z;

  horizon.add(ring);
}

scene.add(horizon);

stars = createStarfield(620);

scene.add(stars);

const player = new THREE.Group();

scene.add(player);

async function loadAssets() {
  const assetUrls = {
    character: new URL(
      '../models/character_1.glb',
      import.meta.url
    ).href,

    sword: new URL(
      '../models/sword_1.glb',
      import.meta.url
    ).href
  };

  const [characterResult, swordResult] = await Promise.allSettled([
    loader.loadAsync(assetUrls.character),
    loader.loadAsync(assetUrls.sword)
  ]);

  const characterAsset =
    characterResult.status === 'fulfilled'
      ? characterResult.value.scene
      : null;

  swordAsset =
    swordResult.status === 'fulfilled'
      ? swordResult.value.scene
      : null;

  setupPlayer(characterAsset);

  state.assetsReady = true;

  startButton.disabled = false;
  startLabel.textContent = 'Bắt đầu nhiệm vụ';

  status.classList.add('is-ready');

  if (!swordAsset) {
    statusText.textContent =
      'Sẵn sàng • thiếu sword_1.glb, dùng kiếm dự phòng';
  } else if (!characterAsset) {
    statusText.textContent =
      'Sẵn sàng • sword_1.glb đã nạp, nhân vật dự phòng';
  } else {
    statusText.textContent =
      'Sẵn sàng • sword_1.glb đã nạp';
  }
}

function setupPlayer(characterAsset) {
  player.clear();

  aimRig = new THREE.Group();
  aimRig.name = 'character-sword-aim-rig';

  aimSwordPivot = null;
  backSwordFan = null;

  if (characterAsset) {
    const character = characterAsset.clone(true);

    character.scale.setScalar(80);
    character.rotation.y = Math.PI;

    prepareModel(character);

    aimRig.add(character);
  } else {
    aimRig.add(createFallbackCharacter());
  }

  const heldSword = createSwordVisual('held');

  aimSwordPivot = new THREE.Group();
  aimSwordPivot.name = 'aim-sword-pivot';

  if (swordAsset) {
    heldSword.scale.setScalar(15);
    aimSwordPivot.position.set(0, -1.2, 0);
  } else {
    heldSword.scale.setScalar(0.72);
    aimSwordPivot.position.set(0.62, 1.02, -0.34);
  }

  heldSword.position.set(0, 0, 0);
  heldSword.rotation.set(0, 0, 0);

  aimSwordPivot.add(heldSword);
  aimRig.add(aimSwordPivot);
  player.add(aimRig);

  updateLevelSwords(state.level);
  updateAimRigFromScreen(
    aimScreen.x,
    aimScreen.y
  );
}

function prepareModel(
  root,
  {
    castShadow = true,
    receiveShadow = false
  } = {}
) {
  root.traverse((node) => {
    if (!node.isMesh) {
      return;
    }

    node.castShadow = castShadow;
    node.receiveShadow = receiveShadow;
  });

  return root;
}

function createFallbackCharacter() {
  const group = new THREE.Group();

  const armorMaterial = new THREE.MeshStandardMaterial({
    color: 0x17233d,
    metalness: 0.72,
    roughness: 0.28
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x070b16,
    metalness: 0.55,
    roughness: 0.4
  });

  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x8bf6ff,
    emissive: 0x38cde8,
    emissiveIntensity: 3.5,
    metalness: 0.2,
    roughness: 0.22
  });

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.72, 8, 16),
    armorMaterial
  );

  torso.position.y = 0.96;
  torso.castShadow = true;

  group.add(torso);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.17),
    glowMaterial
  );

  chest.position.set(0, 1.11, -0.31);

  group.add(chest);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 20, 14),
    darkMaterial
  );

  head.position.y = 1.68;
  head.castShadow = true;

  group.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.37, 0.09, 0.08),
    glowMaterial
  );

  visor.position.set(0, 1.7, -0.25);

  group.add(visor);

  for (const x of [-0.19, 0.19]) {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.54, 6, 10),
      armorMaterial
    );

    leg.position.set(x, 0.23, 0);
    leg.castShadow = true;

    group.add(leg);
  }

  return group;
}

function createSwordVisual(mode = 'projectile') {
  if (swordAsset) {
    const sword = swordAsset.clone(true);

    sword.position.set(0, 0, 0);
    sword.rotation.set(0, 0, 0);
    sword.scale.setScalar(
      mode === 'projectile' ? 10 : 1
    );

    prepareModel(sword);

    if (mode === 'projectile') {
      sword.traverse((node) => {
        if (!node.isMesh) {
          return;
        }

        node.castShadow = false;
        node.receiveShadow = false;
      });
    }

    return sword;
  }

  if (!swordVisualTemplate) {
    swordVisualTemplate = createProceduralSword();
  }

  return swordVisualTemplate.clone(true);
}

function createProjectileSwordVisual() {
  if (!projectileSwordTemplate) {
    const visual = createSwordVisual('projectile');

    if (!swordAsset) {
      visual.scale.setScalar(0.76);
    }

    visual.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(visual);

    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(
        new THREE.Vector3()
      );

      visual.position.sub(center);
    }

    projectileSwordTemplate = visual;
  }

  return projectileSwordTemplate.clone(true);
}

function createProceduralSword() {
  const sword = new THREE.Group();

  sword.name = 'energy-sword';

  const bladeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8fdff,
    emissive: 0x27cde8,
    emissiveIntensity: 3.6,
    metalness: 0.68,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.12
  });

  const bladeCoreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false
  });

  const bladeGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x36e6ff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x7182ab,
    emissive: 0x16233c,
    emissiveIntensity: 0.5,
    metalness: 0.92,
    roughness: 0.2
  });

  const gripMaterial = new THREE.MeshStandardMaterial({
    color: 0x11162a,
    metalness: 0.42,
    roughness: 0.62
  });

  const blade = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.045,
      0.15,
      1.92,
      4,
      1,
      false
    ),
    bladeMaterial
  );

  blade.rotation.x = -Math.PI / 2;
  blade.position.z = -1.22;

  sword.add(blade);

  const bladeCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.028, 1.58),
    bladeCoreMaterial
  );

  bladeCore.position.z = -1.2;

  sword.add(bladeCore);

  const bladeGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.08,
      0.205,
      2.02,
      4,
      1,
      true
    ),
    bladeGlowMaterial
  );

  bladeGlow.rotation.x = -Math.PI / 2;
  bladeGlow.position.z = -1.22;

  sword.add(bladeGlow);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.048, 0.38, 4),
    bladeMaterial
  );

  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -2.36;

  sword.add(tip);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.09, 0.14),
    metalMaterial
  );

  guard.position.z = -0.19;

  sword.add(guard);

  for (const x of [-0.4, 0.4]) {
    const guardTip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      bladeMaterial
    );

    guardTip.position.set(x, 0, -0.19);
    guardTip.scale.set(1.25, 0.62, 0.7);

    sword.add(guardTip);
  }

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.065,
      0.076,
      0.54,
      12
    ),
    gripMaterial
  );

  grip.rotation.x = Math.PI / 2;
  grip.position.z = 0.17;

  sword.add(grip);

  for (const z of [-0.02, 0.1, 0.22, 0.34]) {
    const gripRing = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.077,
        0.012,
        6,
        16
      ),
      metalMaterial
    );

    gripRing.position.z = z;

    sword.add(gripRing);
  }

  const pommel = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    bladeMaterial
  );

  pommel.position.z = 0.54;
  pommel.scale.set(0.8, 0.8, 1.18);

  sword.add(pommel);

  sword.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
    }
  });

  return sword;
}

function createMeteorVisual() {
  if (!meteorVisualTemplate) {
    meteorVisualTemplate = createProceduralMeteor();
  }

  return meteorVisualTemplate.clone(true);
}

function createProceduralMeteor() {
  const group = new THREE.Group();

  group.name = 'red-meteor';

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xff173d,
      emissive: 0xa50025,
      emissiveIntensity: 2.15,
      metalness: 0.04,
      roughness: 0.38
    })
  );

  group.add(sphere);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.84, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff315c,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  );

  group.add(glow);

  return group;
}

function createStarfield(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyan = new THREE.Color(0x7deeff);
  const violet = new THREE.Color(0x9c86ff);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;

    positions[offset] =
      THREE.MathUtils.randFloatSpread(52);

    positions[offset + 1] =
      THREE.MathUtils.randFloat(-0.2, 22);

    positions[offset + 2] =
      THREE.MathUtils.randFloat(-85, 3);

    const color =
      Math.random() > 0.72
        ? violet
        : cyan;

    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
  );

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true,
      depthWrite: false
    })
  );
}

function setRaycasterFromScreen(clientX, clientY) {
  pointer.x =
    (clientX / innerWidth) * 2 - 1;

  pointer.y =
    -(clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
}

function findMeteorAtScreen(clientX, clientY) {
  if (meteors.length === 0) {
    return null;
  }

  setRaycasterFromScreen(clientX, clientY);

  const intersections =
    raycaster.intersectObjects(meteors, true);

  for (const intersection of intersections) {
    let object = intersection.object;

    while (object && object !== scene) {
      if (
        object.userData.isMeteor &&
        meteors.includes(object)
      ) {
        return object;
      }

      object = object.parent;
    }
  }

  return null;
}

function calculateAimDirection(
  clientX,
  clientY,
  targetDirection
) {
  setRaycasterFromScreen(clientX, clientY);

  if (
    !raycaster.ray.intersectPlane(
      AIM_PLANE,
      tempTarget
    )
  ) {
    raycaster.ray.at(60, tempTarget);
  }

  getMuzzlePosition(tempOrigin);

  targetDirection
    .copy(tempTarget)
    .sub(tempOrigin)
    .normalize();

  return targetDirection;
}

function updateAimRigFromScreen(clientX, clientY) {
  if (!aimRig) {
    return;
  }

  calculateAimDirection(
    clientX,
    clientY,
    tempDirection
  );

  player.getWorldQuaternion(playerWorldQuaternion);
  playerWorldQuaternion.invert();

  localRigAimDirection
    .copy(tempDirection)
    .applyQuaternion(playerWorldQuaternion)
    .normalize();

  const rawYaw = Math.atan2(
    -localRigAimDirection.x,
    -localRigAimDirection.z
  );

  const rawPitch = Math.asin(
    THREE.MathUtils.clamp(
      localRigAimDirection.y,
      -1,
      1
    )
  );

  const pitch = THREE.MathUtils.clamp(
    rawPitch,
    -MAX_RIG_PITCH,
    MAX_RIG_PITCH
  );

  aimRig.rotation.set(
    pitch,
    rawYaw,
    0,
    'YXZ'
  );
}

function shootFromScreen(clientX, clientY) {
  let target = aimedMeteor;

  if (!target || !meteors.includes(target)) {
    target = findMeteorAtScreen(
      clientX,
      clientY
    );

    aimedMeteor = target;
  }

  if (target) {
    getMuzzlePosition(tempOrigin);
    target.getWorldPosition(tempTarget);

    tempDirection
      .copy(tempTarget)
      .sub(tempOrigin)
      .normalize();
  } else {
    calculateAimDirection(
      clientX,
      clientY,
      tempDirection
    );
  }

  fireProjectileFan(
    tempOrigin,
    tempDirection,
    target
  );
}

function shootAtAim() {
  shootFromScreen(
    aimScreen.x,
    aimScreen.y
  );
}

function getNearbySecondaryTargets(
  primaryTarget,
  maximumTargets
) {
  if (!primaryTarget || maximumTargets <= 0) {
    return [];
  }

  primaryTarget.getWorldPosition(
    primaryTargetPosition
  );

  const maximumDistanceSquared =
    CONFIG.secondaryTargetRadius ** 2;

  return meteors
    .filter((meteor) => {
      return (
        meteor !== primaryTarget &&
        meteor.parent &&
        meteor.position.distanceToSquared(
          primaryTargetPosition
        ) <= maximumDistanceSquared
      );
    })
    .sort((meteorA, meteorB) => {
      return (
        meteorA.position.distanceToSquared(
          primaryTargetPosition
        ) -
        meteorB.position.distanceToSquared(
          primaryTargetPosition
        )
      );
    })
    .slice(0, maximumTargets);
}

function fireProjectileFan(
  origin,
  direction,
  target = null
) {
  if (!state.running || !state.assetsReady) {
    return;
  }

  const now = performance.now();

  if (
    now - state.lastShotAt <
    CONFIG.projectileCooldownMs
  ) {
    return;
  }

  state.lastShotAt = now;

  const swordCount = THREE.MathUtils.clamp(
    state.level,
    1,
    CONFIG.maxManualSwords
  );

  const fanCenter =
    (swordCount - 1) / 2;

  const fanSpacing =
    THREE.MathUtils.degToRad(
      CONFIG.projectileFanSpacingDeg
    );

  const primarySwordIndex =
    Math.floor(swordCount / 2);

  const secondaryTargets =
    getNearbySecondaryTargets(
      target,
      swordCount - 1
    );

  let secondaryTargetIndex = 0;

  for (
    let swordIndex = 0;
    swordIndex < swordCount;
    swordIndex += 1
  ) {
    const fanOffset =
      (swordIndex - fanCenter) *
      fanSpacing;

    fanDirection
      .copy(direction)
      .applyAxisAngle(
        FAN_ROTATION_AXIS,
        fanOffset
      )
      .normalize();

    const projectileTarget =
      swordIndex === primarySwordIndex
        ? target
        : secondaryTargets[
            secondaryTargetIndex++
          ] ?? null;

    createProjectile(
      origin,
      fanDirection,
      projectileTarget
    );
  }

  reticle.classList.add('is-firing');

  window.setTimeout(() => {
    reticle.classList.remove('is-firing');
  }, 90);
}

function createProjectile(
  origin,
  direction,
  target = null
) {
  const normalizedDirection =
    direction.clone().normalize();

  const projectile = new THREE.Group();
  const visual = createProjectileSwordVisual();
  const trail = createProjectileTrail();

  projectile.add(visual);
  projectile.add(trail);

  projectile.position.copy(origin);

  projectile.quaternion.setFromUnitVectors(
    PROJECTILE_FORWARD_AXIS,
    normalizedDirection
  );

  projectile.userData.lockedQuaternion =
    projectile.quaternion.clone();

  projectile.userData.direction =
    normalizedDirection;

  projectile.userData.velocity =
    normalizedDirection
      .clone()
      .multiplyScalar(
        CONFIG.projectileSpeed
      );

  projectile.userData.previousPosition =
    origin.clone();

  projectile.userData.distanceTravelled = 0;
  projectile.userData.age = 0;
  projectile.userData.target = target;

  projectiles.push(projectile);

  scene.add(projectile);
}

function createProjectileTrail() {
  if (!projectileTrailTemplate) {
    projectileTrailTemplate =
      new THREE.Group();

    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.018,
        0.15,
        2.7,
        10,
        1,
        true
      ),
      new THREE.MeshBasicMaterial({
        color: 0x62eaff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
        toneMapped: false
      })
    );

    trail.rotation.x = Math.PI / 2;
    trail.position.z = 1.34;

    projectileTrailTemplate.add(trail);
  }

  return projectileTrailTemplate.clone(true);
}

function updateProjectiles(delta) {
  for (
    let projectileIndex =
      projectiles.length - 1;
    projectileIndex >= 0;
    projectileIndex -= 1
  ) {
    const projectile =
      projectiles[projectileIndex];

    const data = projectile.userData;
    const target = data.target;

    data.age += delta;

    const hasActiveTarget =
      target &&
      target.parent &&
      meteors.includes(target);

    if (
      hasActiveTarget &&
      data.age >=
        CONFIG.projectileHomingDelay
    ) {
      target.getWorldPosition(tempTarget);

      homingDirection
        .copy(tempTarget)
        .sub(projectile.position)
        .normalize();

      const steeringAmount =
        1 -
        Math.exp(
          -CONFIG.projectileHomingStrength *
            delta
        );

      data.direction
        .lerp(
          homingDirection,
          steeringAmount
        )
        .normalize();

      data.velocity
        .copy(data.direction)
        .multiplyScalar(
          CONFIG.projectileSpeed
        );

      data.lockedQuaternion.setFromUnitVectors(
        PROJECTILE_FORWARD_AXIS,
        data.direction
      );
    } else if (!hasActiveTarget) {
      data.target = null;
    }

    data.previousPosition.copy(
      projectile.position
    );

    projectile.position.addScaledVector(
      data.velocity,
      delta
    );

    projectile.quaternion.copy(
      data.lockedQuaternion
    );

    data.distanceTravelled +=
      CONFIG.projectileSpeed * delta;

    let collided = false;

    previousTip.copy(
      data.previousPosition
    );

    currentTip.copy(
      projectile.position
    );

    collisionSegment.set(
      previousTip,
      currentTip
    );

    for (
      let meteorIndex =
        meteors.length - 1;
      meteorIndex >= 0;
      meteorIndex -= 1
    ) {
      const meteor =
        meteors[meteorIndex];

      collisionSegment.closestPointToPoint(
        meteor.position,
        true,
        closestPoint
      );

      const collisionRadius =
        meteor.userData.radius + 0.22;

      const distanceSquared =
        closestPoint.distanceToSquared(
          meteor.position
        );

      if (
        distanceSquared <=
        collisionRadius * collisionRadius
      ) {
        registerHit(meteor.position);
        removeMeteor(meteorIndex);
        removeProjectile(projectileIndex);

        collided = true;

        break;
      }
    }

    if (
      !collided &&
      data.distanceTravelled >=
        CONFIG.projectileRange
    ) {
      removeProjectile(projectileIndex);
    }
  }
}

function removeProjectile(index) {
  const [projectile] =
    projectiles.splice(index, 1);

  if (projectile) {
    scene.remove(projectile);
  }
}

function getMuzzlePosition(target) {
  target.set(0, -0.8, -4);

  return player.localToWorld(target);
}

function spawnMeteor() {
  const meteor = new THREE.Group();

  meteor.userData.isMeteor = true;

  const visual = createMeteorVisual();

  const size = THREE.MathUtils.randFloat(
    0.72,
    1.35
  );

  visual.scale.setScalar(size);

  meteor.add(visual);

  meteor.position.set(
    THREE.MathUtils.randFloat(-9, 9),
    THREE.MathUtils.randFloat(0.15, 5.3),
    -62
  );

  meteor.userData.visual = visual;

  meteor.userData.speed =
    THREE.MathUtils.randFloat(
      CONFIG.meteorMinSpeed,
      CONFIG.meteorMaxSpeed
    ) +
    Math.min(
      state.score / 900,
      4.5
    );

  meteor.userData.radius = 0.72 * size;

  meteors.push(meteor);

  scene.add(meteor);
}

function updateMeteors(delta) {
  for (
    let index = meteors.length - 1;
    index >= 0;
    index -= 1
  ) {
    const meteor = meteors[index];

    meteor.position.z +=
      meteor.userData.speed * delta;

    if (meteor.position.z > 7.5) {
      const impactPosition =
        meteor.position.clone();

      removeMeteor(index);
      damagePlayer(impactPosition);

      if (!state.running) {
        return;
      }
    }
  }
}

function removeMeteor(index) {
  const [meteor] =
    meteors.splice(index, 1);

  if (meteor) {
    /*
     * Nếu meteor đang bị một kiếm tự động giữ,
     * giải phóng mục tiêu của kiếm đó.
     */
    const autoSwordOwner =
      meteor.userData.autoSwordOwner;

    if (
      autoSwordOwner?.userData.target ===
      meteor
    ) {
      /*
       * Target biến mất:
       * chỉ giải phóng target.
       *
       * Kiếm đang trong lượt sẽ đứng yên
       * tại vị trí hiện tại và tìm meteor mới.
       */
      releaseAutonomousSwordTarget(
        autoSwordOwner
      );
    }

    meteor.userData.autoSwordOwner = null;

    if (aimedMeteor === meteor) {
      aimedMeteor = null;
    }

    scene.remove(meteor);
  }
}

function getBackSwordCount(level) {
  if (level < 2) {
    return 0;
  }

  /*
   * Level 2–5:
   * số kiếm sau lưng bằng Level.
   */
  if (level <= CONFIG.maxManualSwords) {
    return level;
  }

  /*
   * Level 6–10:
   *
   * Level 6  = 4 kiếm
   * Level 7  = 3 kiếm
   * Level 8  = 2 kiếm
   * Level 9  = 1 kiếm
   * Level 10 = 0 kiếm
   */
  return Math.max(
    0,
    CONFIG.maxManualSwords -
      (level - CONFIG.maxManualSwords)
  );
}

function getAutonomousSwordCount(level) {
  /*
   * Level 1–5  = 0 kiếm tự động
   * Level 6    = 1 kiếm tự động
   * Level 7    = 2 kiếm tự động
   * ...
   * Level 10   = 5 kiếm tự động
   */
  return THREE.MathUtils.clamp(
    level - CONFIG.maxManualSwords,
    0,
    CONFIG.maxManualSwords
  );
}

function removeBackSwordFan() {
  if (!backSwordFan) {
    return;
  }

  backSwordFan.parent?.remove(
    backSwordFan
  );

  backSwordFan = null;
}

function updateBackSwordFan(level) {
  removeBackSwordFan();

  const fanSwordCount =
    getBackSwordCount(level);

  if (!aimRig || fanSwordCount === 0) {
    return;
  }

  backSwordFan = new THREE.Group();

  backSwordFan.name =
    `level-${level}-persistent-back-sword-fan`;

  /*
   * Vị trí của toàn bộ dàn kiếm
   * so với nhân vật:
   *
   * X: trái/phải
   * Y: lên/xuống
   * Z: trước/sau
   */
  backSwordFan.position.set(
    0,
    -1.5,
    0.2
  );

  const fanCenter =
    (fanSwordCount - 1) / 2;

  const spacing =
    THREE.MathUtils.degToRad(
      CONFIG.backSwordFanSpacingDeg
    );

  for (
    let swordIndex = 0;
    swordIndex < fanSwordCount;
    swordIndex += 1
  ) {
    const angle =
        (swordIndex - fanCenter) *
        spacing;

    /*
    * Pivot chịu trách nhiệm tạo góc hình quạt.
    */
    const swordPivot = new THREE.Group();

    swordPivot.position.set(
        Math.sin(angle) * 1.35,
        1.28 + Math.cos(angle) * 0.12,
        0
    );

    swordPivot.rotation.z = -angle;

    /*
    * Sword chỉ chịu trách nhiệm đưa mũi kiếm lên trên.
    */
    const sword =
        createSwordVisual('held');

    sword.scale.setScalar(
        swordAsset ? 5 : 0.25
    );

    sword.position.set(0, 0, 0);

    sword.rotation.set(
        Math.PI / 2,
        0,
        0
    );

    sword.traverse((node) => {
        if (!node.isMesh) {
        return;
        }

        node.castShadow = false;
        node.receiveShadow = false;
    });

    swordPivot.add(sword);
    backSwordFan.add(swordPivot);
  }

  aimRig.add(backSwordFan);
}

function releaseAutonomousSwordTarget(sword) {
  const target = sword.userData.target;

  /*
   * Chỉ giải phóng nếu meteor thực sự
   * đang thuộc về thanh kiếm này.
   */
  if (
    target?.userData.autoSwordOwner === sword
  ) {
    target.userData.autoSwordOwner = null;
  }

  sword.userData.target = null;
}

function enterAutonomousSwordOrbit(sword) {
  releaseAutonomousSwordTarget(sword);

  sword.userData.isOrbiting = true;
}

function getAutonomousSwordOrbitPosition(
  swordIndex,
  swordCount,
  target
) {
  const safeSwordCount =
    Math.max(1, swordCount);

  /*
   * Khoảng cách góc giữa hai kiếm:
   *
   * 1 kiếm = 360°
   * 2 kiếm = 180°
   * 3 kiếm = 120°
   * 4 kiếm = 90°
   * 5 kiếm = 72°
   */
  const angleStep =
    (Math.PI * 2) /
    safeSwordCount;

  const angle =
    autoSwordOrbitAngle +
    swordIndex * angleStep;

  player.getWorldPosition(
    playerWorldPosition
  );

  /*
   * Quỹ đạo tròn nằm trên mặt phẳng XZ.
   * Giá trị Y cố định.
   */
  target.set(
    playerWorldPosition.x +
      Math.cos(angle) *
        CONFIG.autoSwordOrbitRadius,

    playerWorldPosition.y +
      CONFIG.autoSwordOrbitHeight,

    playerWorldPosition.z +
      Math.sin(angle) *
        CONFIG.autoSwordOrbitRadius
  );

  return target;
}

function prepareAutonomousSwordMaterials(
  root
) {
  root.traverse((node) => {
    if (!node.isMesh || !node.material) {
      return;
    }

    /*
     * GLTF clone thường vẫn dùng chung
     * material với model gốc.
     *
     * Phải clone material để hiệu ứng vàng
     * không ảnh hưởng đạn kiếm.
     */
    const sourceMaterials =
      Array.isArray(node.material)
        ? node.material
        : [node.material];

    const clonedMaterials =
      sourceMaterials.map(
        (sourceMaterial) => {
          const material =
            sourceMaterial.clone();

          /*
           * Lưu diện mạo ban đầu để có thể
           * trả kiếm về màu bình thường.
           */
          material.userData
            .autoSwordBaseAppearance = {
              color:
                material.color
                  ? material.color.getHex()
                  : null,

              emissive:
                material.emissive
                  ? material.emissive.getHex()
                  : null,

              emissiveIntensity:
                material.emissiveIntensity,

              metalness:
                material.metalness,

              roughness:
                material.roughness
            };

          return material;
        }
      );

    node.material =
      Array.isArray(node.material)
        ? clonedMaterials
        : clonedMaterials[0];
  });
}

function setAutonomousSwordGolden(
  sword,
  enabled
) {
  sword.traverse((node) => {
    if (!node.isMesh || !node.material) {
      return;
    }

    const materials =
      Array.isArray(node.material)
        ? node.material
        : [node.material];

    for (const material of materials) {
      const base =
        material.userData
          .autoSwordBaseAppearance;

      if (!base) {
        continue;
      }

      /*
       * Thay màu bề mặt.
       */
      if (
        material.color &&
        base.color !== null
      ) {
        material.color.setHex(
          enabled
            ? CONFIG.autoSwordGoldColor
            : base.color
        );
      }

      /*
       * Thay màu phát sáng.
       */
      if (
        material.emissive &&
        base.emissive !== null
      ) {
        material.emissive.setHex(
          enabled
            ? CONFIG.autoSwordGoldEmissive
            : base.emissive
        );
      }

      /*
       * Thay cường độ phát sáng.
       */
      if (
        typeof material.emissiveIntensity ===
        'number'
      ) {
        material.emissiveIntensity =
          enabled
            ? CONFIG
                .autoSwordGoldEmissiveIntensity
            : base.emissiveIntensity;
      }

      /*
       * Khi hóa vàng, tăng tính kim loại
       * và giảm độ nhám.
       */
      if (
        typeof material.metalness ===
        'number'
      ) {
        material.metalness =
          enabled
            ? Math.max(
                base.metalness ?? 0,
                0.75
              )
            : base.metalness;
      }

      if (
        typeof material.roughness ===
        'number'
      ) {
        material.roughness =
          enabled
            ? Math.min(
                base.roughness ?? 1,
                0.24
              )
            : base.roughness;
      }

      material.needsUpdate = true;
    }
  });

  /*
   * Bật hoặc tắt đèn vàng đi kèm.
   */
  if (sword.userData.goldLight) {
    sword.userData.goldLight.visible =
      enabled;
  }

  /*
   * Trail vàng chỉ xuất hiện trên thanh kiếm
   * đang giữ lượt tấn công.
   */
  if (sword.userData.goldTrail) {
    sword.userData.goldTrail.visible =
      enabled;
  }

  sword.userData.isGolden = enabled;
}

function createAutonomousSwordTrail() {
  const trailLength =
    CONFIG.autoSwordTrailLength;

  /*
   * Hai geometry được dùng chung cho tối đa
   * năm kiếm tự động, tránh tạo lại dữ liệu GPU.
   */
  if (!autoSwordTrailOuterGeometry) {
    autoSwordTrailOuterGeometry =
      new THREE.CylinderGeometry(
        0.025,
        0.32,
        trailLength,
        14,
        1,
        true
      );
  }

  if (!autoSwordTrailCoreGeometry) {
    autoSwordTrailCoreGeometry =
      new THREE.CylinderGeometry(
        0.012,
        0.105,
        trailLength * 0.86,
        10,
        1,
        true
      );
  }

  const trailGroup =
    new THREE.Group();

  trailGroup.name =
    'autonomous-sword-gold-trail';

  /*
   * Mặc định tắt trail.
   * Trail chỉ bật khi kiếm giữ lượt.
   */
  trailGroup.visible = false;

  /*
   * Lớp hào quang vàng cam bên ngoài.
   */
  const outerTrail =
    new THREE.Mesh(
      autoSwordTrailOuterGeometry,

      new THREE.MeshBasicMaterial({
        color: 0xffa31a,
        transparent: true,

        opacity:
          CONFIG.autoSwordTrailOpacity *
          0.48,

        side: THREE.DoubleSide,
        depthWrite: false,

        blending:
          THREE.AdditiveBlending,

        toneMapped: false
      })
    );

  /*
   * Kiếm hướng theo local -Z.
   * Trail kéo dài về phía local +Z.
   */
  outerTrail.rotation.x =
    Math.PI / 2;

  outerTrail.position.z =
    trailLength / 2;

  outerTrail.renderOrder = 4;

  /*
   * Lõi sáng vàng nhạt giúp trail
   * vẫn nhìn rõ khi kiếm ở xa camera.
   */
  const coreTrail =
    new THREE.Mesh(
      autoSwordTrailCoreGeometry,

      new THREE.MeshBasicMaterial({
        color: 0xfff2a1,
        transparent: true,

        opacity:
          CONFIG.autoSwordTrailOpacity,

        side: THREE.DoubleSide,
        depthWrite: false,

        blending:
          THREE.AdditiveBlending,

        toneMapped: false
      })
    );

  coreTrail.rotation.x =
    Math.PI / 2;

  coreTrail.position.z =
    trailLength * 0.43;

  coreTrail.renderOrder = 5;

  trailGroup.add(
    outerTrail,
    coreTrail
  );

  return trailGroup;
}

function createAutonomousSword(swordIndex) {
  const sword = new THREE.Group();
  const visual = createProjectileSwordVisual();

  /*
   * Tách material của kiếm tự động
   * khỏi material của đạn kiếm.
   */
  prepareAutonomousSwordMaterials(visual);

  sword.scale.setScalar(
    CONFIG.autoSwordScale
  );

  sword.name =
    `autonomous-sword-${swordIndex + 1}`;

  sword.userData.target = null;
  sword.userData.slotIndex = swordIndex;

  /*
   * Thứ tự hàng đợi được quyết định đúng
   * lúc kiếm chuyển sang trạng thái tự động.
   */
  sword.userData.queueOrder =
    nextAutonomousSwordOrder;

  nextAutonomousSwordOrder += 1;

  /*
   * Số meteor đã chém trong lượt hiện tại.
   */
  sword.userData.turnKills = 0;

  /*
   * Chỉ một kiếm được đặt thành true.
   */
  sword.userData.isQueueActive = false;

  /*
   * Kiếm mới chưa đến lượt sẽ bay quanh
   */
  sword.userData.isOrbiting = true;
  sword.add(visual);

  /*
   * Đèn vàng chỉ bật khi kiếm giữ lượt.
   */
  const goldLight =
    new THREE.PointLight(
      CONFIG.autoSwordGoldColor,
      CONFIG.autoSwordGoldLightIntensity,
      6,
      2
    );

  goldLight.visible = false;
  goldLight.castShadow = false;

  sword.userData.goldLight =
    goldLight;

  sword.add(goldLight);

  /*
   * Tạo trail riêng cho thanh kiếm này.
   *
   * Geometry được dùng chung nhưng material
   * là riêng, nên có thể dispose khi xóa kiếm.
   */
  const goldTrail =
    createAutonomousSwordTrail();

  sword.userData.goldTrail =
    goldTrail;

  sword.add(goldTrail);

  /*
   * Kiếm mới mặc định chưa hóa vàng.
   * Lệnh này cũng giữ trail ở trạng thái tắt.
   */
  setAutonomousSwordGolden(
    sword,
    false
  );

  /*
   * Đặt kiếm tại vị trí chờ ban đầu.
   */
  getAutonomousSwordOrbitPosition(
    swordIndex,
    Math.max(
        1,
        autonomousSwords.length + 1
    ),
    autoSwordOrbitPosition
  );

  sword.position.copy(
    autoSwordOrbitPosition
  );

  sword.quaternion.copy(
    AUTO_SWORD_IDLE_QUATERNION
  );

  autonomousSwords.push(sword);

  scene.add(sword);
}

function getOrderedAutonomousSwords() {
  return [...autonomousSwords].sort(
    (swordA, swordB) => {
      return (
        swordA.userData.queueOrder -
        swordB.userData.queueOrder
      );
    }
  );
}

function activateAutonomousSword(sword) {
  if (!sword) {
    activeAutonomousSword = null;

    return;
  }

  /*
   * Chỉ một kiếm được quyền tấn công.
   */
  for (
    const otherSword of autonomousSwords
  ) {
    otherSword.userData.isQueueActive =
      false;

    /*
     * Các kiếm không giữ lượt trở lại
     * màu bình thường.
    */
    setAutonomousSwordGolden(
      otherSword,
      false
    );
  }

  activeAutonomousSword = sword;

  sword.userData.isQueueActive = true;
  sword.userData.isOrbiting = false;
  sword.userData.turnKills = 0;

  /*
   * Kiếm đang giữ lượt hóa vàng,
   * kể cả khi chưa tìm thấy meteor.
   */
  setAutonomousSwordGolden(
    sword,
    true
  );

  /*
   * Không cần target ngay tại đây.
   * updateAutonomousSwords() sẽ tìm
   * meteor gần nhất trong frame tiếp theo.
   */
}

function activateNextAutonomousSword(
  completedSword = null
) {
  const orderedSwords =
    getOrderedAutonomousSwords();

  if (orderedSwords.length === 0) {
    activeAutonomousSword = null;

    return;
  }

  let nextIndex = 0;

  if (completedSword) {
    const completedIndex =
      orderedSwords.indexOf(
        completedSword
      );

    if (completedIndex !== -1) {
      nextIndex =
        (completedIndex + 1) %
        orderedSwords.length;
    }
  }

  activateAutonomousSword(
    orderedSwords[nextIndex]
  );
}

function completeAutonomousSwordTurn(sword) {
  /*
   * Kiếm đã chém đủ 20 meteor:
   * giải phóng mục tiêu và trở về vòng.
   */
  enterAutonomousSwordOrbit(sword);

  sword.userData.isQueueActive = false;

  if (activeAutonomousSword === sword) {
    activeAutonomousSword = null;
  }

  /*
   * Kiếm vừa hoàn thành 20 meteor
   * trở lại màu bình thường.
  */
  setAutonomousSwordGolden(
    sword,
    false
  );

  /*
   * Chuyển quyền tấn công sang kiếm
   * tiếp theo theo queueOrder.
   */
  activateNextAutonomousSword(sword);
}

function removeAutonomousSword(sword) {
  releaseAutonomousSwordTarget(sword);

  if (activeAutonomousSword === sword) {
    activeAutonomousSword = null;
  }

  /*
   * Xóa kiếm khỏi scene trước khi
   * giải phóng tài nguyên GPU.
   */
  sword.removeFromParent();

  /*
   * Một material có thể được nhiều mesh
   * trong cùng thanh kiếm sử dụng.
   *
   * Set ngăn dispose cùng một material
   * nhiều lần.
   */
  const disposedMaterials = new Set();

  sword.traverse((node) => {
    if (!node.isMesh || !node.material) {
      return;
    }

    const materials =
      Array.isArray(node.material)
        ? node.material
        : [node.material];

    for (const material of materials) {
      if (
        !material ||
        disposedMaterials.has(material)
      ) {
        continue;
      }

      material.dispose();
      disposedMaterials.add(material);
    }
  });
}

function syncAutonomousSwords(level) {
  const desiredCount =
    getAutonomousSwordCount(level);

  /*
   * Tạo thêm kiếm khi tăng Level.
   */
  while (
    autonomousSwords.length <
    desiredCount
  ) {
    createAutonomousSword(
      autonomousSwords.length
    );
  }

  /*
   * Xóa kiếm thừa nếu số lượng giảm
   * hoặc game được đặt lại.
   */
  while (
    autonomousSwords.length >
    desiredCount
  ) {
    const sword =
      autonomousSwords.pop();

    removeAutonomousSword(sword);
  }

  /*
   * Cập nhật vị trí chờ tương đối
   * của từng kiếm.
   */
  autonomousSwords.forEach(
    (sword, swordIndex) => {
      sword.userData.slotIndex =
        swordIndex;
    }
  );

  /*
   * Nếu chưa có kiếm đang tấn công,
   * chọn kiếm có queueOrder nhỏ nhất.
   */
  if (
    !activeAutonomousSword &&
    autonomousSwords.length > 0
  ) {
    activateNextAutonomousSword();
  }
}

function removeAllAutonomousSwords() {
  while (autonomousSwords.length) {
    const sword =
      autonomousSwords.pop();

    removeAutonomousSword(sword);
  }

  activeAutonomousSword = null;
  nextAutonomousSwordOrder = 0;
  autoSwordOrbitAngle = 0;
}

function findNearestAvailableMeteor() {
  /*
   * Lấy vị trí thế giới của nhân vật.
   */
  player.getWorldPosition(
    playerWorldPosition
  );

  let nearestMeteor = null;
  let nearestDistanceSquared = Infinity;

  /*
   * Dùng bình phương khoảng cách để
   * không phải tính căn bậc hai.
   */
  const maximumTargetDistanceSquared =
    CONFIG.autoSwordTargetRadius ** 2;

  for (const meteor of meteors) {
    /*
     * Bỏ qua meteor đã bị xóa hoặc
     * đang bị kiếm tự động khác giữ.
     */
    if (
      !meteor.parent ||
      meteor.userData.autoSwordOwner
    ) {
      continue;
    }

    const distanceSquared =
      playerWorldPosition
        .distanceToSquared(
          meteor.position
        );

    /*
     * Meteor nằm ngoài vùng bảo vệ:
     * kiếm tự động không được chọn.
     */
    if (
      distanceSquared >
      maximumTargetDistanceSquared
    ) {
      continue;
    }

    /*
     * Trong số meteor hợp lệ,
     * chọn meteor gần nhất.
     */
    if (
      distanceSquared <
      nearestDistanceSquared
    ) {
      nearestDistanceSquared =
        distanceSquared;

      nearestMeteor = meteor;
    }
  }

  return nearestMeteor;
}

function assignAutonomousSwordTarget(sword) {
  const target =
    findNearestAvailableMeteor();

  if (!target) {
    return null;
  }

  /*
   * Khóa hai chiều:
   *
   * sword biết meteor của mình.
   * meteor biết sword đang giữ nó.
   *
   * Vì vậy hai kiếm không thể chọn
   * cùng một meteor.
   */
  sword.userData.target = target;
  target.userData.autoSwordOwner = sword;

  /*
   * Kiếm đã rời quỹ đạo để tấn công.
   */
  sword.userData.isOrbiting = false;

  return target;
}

function updateAutonomousSwords(delta) {
  const activeSwords = [
    ...autonomousSwords
  ];

  /*
   * Chỉ kiếm đang đứng đầu hàng đợi
   * được phép giữ target.
   */
  for (const sword of activeSwords) {
    if (sword === activeAutonomousSword) {
      sword.userData.isQueueActive = true;

      continue;
    }

    sword.userData.isQueueActive = false;
    sword.userData.isOrbiting = true;

    /*
     * Bảo đảm kiếm không trong lượt
     * không giữ bất kỳ meteor nào.
     */
    if (sword.userData.target) {
      releaseAutonomousSwordTarget(
        sword
      );
    }
  }

  /*
   * Kiểm tra target hiện tại của kiếm
   * đang giữ lượt.
   */
  if (activeAutonomousSword) {
    const currentTarget =
      activeAutonomousSword.userData.target;

    if (currentTarget) {
      const hasValidTarget =
        currentTarget.parent &&
        meteors.includes(currentTarget) &&
        currentTarget.userData
          .autoSwordOwner ===
          activeAutonomousSword;

      /*
       * Target biến mất:
       * giải phóng target nhưng không
       * đưa kiếm trở lại quỹ đạo.
       */
      if (!hasValidTarget) {
        releaseAutonomousSwordTarget(
          activeAutonomousSword
        );
      }
    }

    /*
     * Nếu không có target, tìm meteor
     * gần nhất ở mỗi frame.
     *
     * Nếu chưa có meteor, hàm trả null
     * và kiếm tiếp tục đứng yên.
     */
    if (
      !activeAutonomousSword.userData
        .target
    ) {
      assignAutonomousSwordTarget(
        activeAutonomousSword
      );
    }
  }

  /*
   * Chỉ các kiếm không giữ lượt mới
   * được đưa vào nhóm quay quanh.
   *
   * Kiếm đang giữ lượt nhưng chưa thấy
   * target bị loại khỏi mảng này nên
   * nó sẽ đứng yên trong không gian.
   */
  const orbitingSwords =
    activeSwords.filter((sword) => {
      return (
        sword !== activeAutonomousSword
      );
    });

  autoSwordOrbitAngle +=
    CONFIG.autoSwordOrbitSpeed *
    delta;

  autoSwordOrbitAngle %=
    Math.PI * 2;

  for (const sword of activeSwords) {
    const isActiveSword =
      sword === activeAutonomousSword;

    const target =
      sword.userData.target;

    /*
     * Kiếm không giữ lượt:
     * bay quanh nhân vật và giãn đều
     * trên toàn bộ chu vi.
     */
    if (!isActiveSword) {
      const orbitIndex =
        orbitingSwords.indexOf(sword);

      const orbitSwordCount =
        orbitingSwords.length;

      getAutonomousSwordOrbitPosition(
        orbitIndex,
        orbitSwordCount,
        autoSwordOrbitPosition
      );

      const orbitFollowAmount =
        1 -
        Math.exp(
          -CONFIG
            .autoSwordOrbitFollowStrength *
            delta
        );

      sword.position.lerp(
        autoSwordOrbitPosition,
        orbitFollowAmount
      );

      player.getWorldPosition(
        playerWorldPosition
      );

      /*
       * Mũi kiếm hướng ra ngoài,
       * chuôi kiếm hướng vào nhân vật.
       */
      autoSwordDirection
        .copy(sword.position)
        .sub(playerWorldPosition);

      autoSwordDirection.y = 0;

      if (
        autoSwordDirection.lengthSq() >
        0.000001
      ) {
        autoSwordDirection.normalize();

        sword.quaternion
          .setFromUnitVectors(
            PROJECTILE_FORWARD_AXIS,
            autoSwordDirection
          );
      }

      continue;
    }

    /*
     * Kiếm đang giữ lượt nhưng chưa
     * tìm thấy meteor:
     *
     * Không thay đổi position.
     * Không quay về quỹ đạo.
     * Không có countdown.
     */
    if (!target) {
      continue;
    }

    /*
     * Kiếm đang giữ lượt và có target:
     * bay đến chém meteor.
     */
    target.getWorldPosition(tempTarget);

    autoSwordDirection
      .copy(tempTarget)
      .sub(sword.position);

    const distanceToTarget =
      autoSwordDirection.length();

    if (distanceToTarget > 0.0001) {
      autoSwordDirection.divideScalar(
        distanceToTarget
      );

      sword.quaternion
        .setFromUnitVectors(
          PROJECTILE_FORWARD_AXIS,
          autoSwordDirection
        );
    }

    const travelDistance =
      CONFIG.autoSwordSpeed *
      delta;

    const hitDistance =
      target.userData.radius +
      CONFIG.autoSwordHitRadius;

    if (
      distanceToTarget <=
      hitDistance + travelDistance
    ) {
      const meteorIndex =
        meteors.indexOf(target);

      const hitPosition =
        target.position.clone();

      /*
       * Chỉ bỏ target hiện tại.
       * Chưa đủ 20 meteor thì kiếm vẫn
       * giữ lượt và tìm mục tiêu mới.
       */
      releaseAutonomousSwordTarget(sword);

      if (meteorIndex !== -1) {
        sword.userData.turnKills += 1;

        registerHit(
          hitPosition,
          CONFIG.autoSwordBurstColor
        );

        removeMeteor(meteorIndex);

        /*
         * Chỉ khi đủ 20 meteor,
         * kiếm mới quay về quỹ đạo và
         * chuyển lượt cho kiếm tiếp theo.
         */
        if (
          sword.userData.turnKills >=
          CONFIG.autoSwordKillsPerTurn
        ) {
          completeAutonomousSwordTurn(
            sword
          );
        }
      }

      continue;
    }

    sword.position.addScaledVector(
      autoSwordDirection,
      travelDistance
    );
  }
}

function updateLevelSwords(level) {
  updateBackSwordFan(level);
  syncAutonomousSwords(level);
}

function advanceLevelProgress() {
  if (state.level >= CONFIG.maxLevel) {
    return false;
  }

  state.levelHitProgress += 1;

  if (
    state.levelHitProgress <
    CONFIG.hitsPerLevelPoint
  ) {
    return false;
  }

  state.levelHitProgress = 0;
  state.levelPoints += 1;

  if (
    state.levelPoints <
    CONFIG.pointsPerLevel
  ) {
    return false;
  }

  state.levelPoints = 0;

  state.level = Math.min(
    state.level + 1,
    CONFIG.maxLevel
  );

  updateLevelSwords(state.level);

  state.shake = Math.max(
    state.shake,
    0.1
  );

  levelCard.classList.remove(
    'is-level-up'
  );

  requestAnimationFrame(() => {
    levelCard.classList.add(
      'is-level-up'
    );
  });

  window.setTimeout(() => {
    levelCard.classList.remove(
      'is-level-up'
    );
  }, 650);

  return true;
}

function registerHit(
  position,
  burstColor = 0x71efff
) {
  const now = performance.now();

  state.combo =
    now - state.lastHitAt < 2200
      ? Math.min(state.combo + 1, 9)
      : 1;

  state.lastHitAt = now;

  const gained = 10 * state.combo;

  state.score += gained;

  const leveledUp =
    advanceLevelProgress();

  state.shake = Math.max(
    state.shake,
    0.05
  );

  createBurst(
    position,
    burstColor
  );

  showHitLabel(
    leveledUp
        ? state.level >
        CONFIG.maxManualSwords
        ? `LEVEL ${state.level} • ` +
            `${getAutonomousSwordCount(state.level)} ` +
            'KIẾM TỰ ĐỘNG'
        : `LEVEL ${state.level} • ` +
            `${state.level} KIẾM`
        : `TRÚNG • +${gained}`
  );

  updateHud();
}

function damagePlayer(position) {
  state.shield -= 1;
  state.combo = 1;
  state.shake = 0.22;

  createBurst(
    position,
    0xff547d
  );

  updateHud();

  document.body.classList.add(
    'is-hit'
  );

  window.clearTimeout(
    damageFlashTimer
  );

  damageFlashTimer =
    window.setTimeout(() => {
      document.body.classList.remove(
        'is-hit'
      );
    }, 150);

  if (state.shield <= 0) {
    endGame();
  }
}

function createBurst(position, color) {
  const particleCount = 18;

  const positions =
    new Float32Array(
      particleCount * 3
    );

  const velocities = [];

  for (
    let index = 0;
    index < particleCount;
    index += 1
  ) {
    velocities.push(
      new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(7),
        THREE.MathUtils.randFloatSpread(7),
        THREE.MathUtils.randFloatSpread(7)
      )
    );
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const material =
    new THREE.PointsMaterial({
      color,
      size: 0.22,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending
    });

  const points =
    new THREE.Points(
      geometry,
      material
    );

  points.position.copy(position);
  points.userData.velocities =
    velocities;
  points.userData.life = 0.56;

  bursts.push(points);

  scene.add(points);
}

function updateBursts(delta) {
  for (
    let burstIndex =
      bursts.length - 1;
    burstIndex >= 0;
    burstIndex -= 1
  ) {
    const burst =
      bursts[burstIndex];

    const positionAttribute =
      burst.geometry.getAttribute(
        'position'
      );

    burst.userData.life -= delta;

    for (
      let index = 0;
      index <
      burst.userData.velocities.length;
      index += 1
    ) {
      const velocity =
        burst.userData.velocities[index];

      const offset = index * 3;

      positionAttribute.array[offset] +=
        velocity.x * delta;

      positionAttribute.array[offset + 1] +=
        velocity.y * delta;

      positionAttribute.array[offset + 2] +=
        velocity.z * delta;

      velocity.multiplyScalar(0.94);
    }

    positionAttribute.needsUpdate = true;

    burst.material.opacity =
      Math.max(
        0,
        burst.userData.life / 0.56
      );

    if (burst.userData.life <= 0) {
      bursts.splice(
        burstIndex,
        1
      );

      scene.remove(burst);

      burst.geometry.dispose();
      burst.material.dispose();
    }
  }
}

function startOrResumeGame() {
  if (!state.assetsReady) {
    return;
  }

  if (state.overlayMode === 'pause') {
    state.running = true;
    state.overlayMode = 'playing';

    startScreen.classList.add(
      'is-hidden'
    );

    reticle.classList.add(
      'is-visible'
    );

    setStatus(
      'Đang chiến đấu',
      'ready'
    );

    timer.reset();

    return;
  }

  clearDynamicObjects();

  state.score = 0;
  state.combo = 1;
  state.shield = CONFIG.startingShield;
  state.level = 1;
  state.levelPoints = 0;
  state.levelHitProgress = 0;
  state.spawnTimer = 0.55;
  state.lastShotAt = 0;
  state.lastHitAt = 0;
  state.running = true;
  state.overlayMode = 'playing';

  updateHud();

  startScreen.classList.add(
    'is-hidden'
  );

  reticle.classList.add(
    'is-visible'
  );

  setStatus(
    'Đang chiến đấu',
    'ready'
  );

  timer.reset();
}

function pauseGame() {
  if (!state.running) {
    return;
  }

  state.running = false;
  state.overlayMode = 'pause';

  continuousFireActive = false;
  continuousFirePointerId = null;

  gameTitle.innerHTML =
    'Tạm dừng<br><em>giữ vững đội hình.</em>';

  introCopy.textContent =
    'Trận đấu đang được giữ nguyên. Tiếp tục khi bạn đã sẵn sàng.';

  startLabel.textContent =
    'Tiếp tục';

  startScreen.classList.remove(
    'is-hidden'
  );

  reticle.classList.remove(
    'is-visible'
  );

  setStatus(
    'Đã tạm dừng',
    'paused'
  );
}

function endGame() {
  state.running = false;
  state.overlayMode = 'gameover';

  clearDynamicObjects();

  continuousFireActive = false;
  continuousFirePointerId = null;

  if (state.score > state.bestScore) {
    state.bestScore = state.score;

    writeBestScore(
      state.bestScore
    );

    bestScoreText.textContent =
      formatScore(state.bestScore);
  }

  /*
   * gameTitle đã là thẻ H1,
   * vì vậy không tạo thêm H1 lồng bên trong.
   */
  gameTitle.innerHTML =
    'Nhiệm vụ<br><em>đã kết thúc.</em>';

  introCopy.textContent =
    `Bạn đạt ${formatScore(state.score)} điểm. ` +
    'Đưa tâm ngắm lên thiên thạch để kiếm tự truy tung mục tiêu.';

  startLabel.textContent =
    'Chơi lại';

  startScreen.classList.remove(
    'is-hidden'
  );

  reticle.classList.remove(
    'is-visible'
  );

  setStatus(
    'Kết thúc nhiệm vụ',
    'paused'
  );
}

function clearDynamicObjects() {
  aimedMeteor = null;

  removeBackSwordFan();
  removeAllAutonomousSwords();

  while (projectiles.length) {
    scene.remove(
      projectiles.pop()
    );
  }

  while (meteors.length) {
    scene.remove(
      meteors.pop()
    );
  }

  while (bursts.length) {
    const burst = bursts.pop();

    scene.remove(burst);

    burst.geometry.dispose();
    burst.material.dispose();
  }
}

function updateHud() {
  scoreText.textContent =
    formatScore(state.score);

  comboText.textContent =
    state.combo;

  shield.setAttribute(
    'aria-label',
    `${state.shield} điểm lá chắn`
  );

  [...shield.children].forEach(
    (bar, index) => {
      bar.classList.toggle(
        'is-empty',
        index >= state.shield
      );
    }
  );

  levelText.textContent =
    state.level;

  const displayedLevelPoints =
    state.level >= CONFIG.maxLevel
      ? CONFIG.pointsPerLevel
      : state.levelPoints;

  const levelLabel =
    state.level >= CONFIG.maxLevel
      ? `Level ${state.level}, cấp tối đa`
      : `${displayedLevelPoints} trên ` +
        `${CONFIG.pointsPerLevel} điểm cấp độ; ` +
        `${state.levelHitProgress} trên ` +
        `${CONFIG.hitsPerLevelPoint} meteor ` +
        'cho điểm tiếp theo';

  levelProgress.setAttribute(
    'aria-label',
    levelLabel
  );

  [...levelProgress.children].forEach(
    (bar, index) => {
      bar.classList.toggle(
        'is-filled',
        index < displayedLevelPoints
      );
    }
  );
}

function showHitLabel(message) {
  hitLabel.textContent = message;

  hitLabel.classList.add(
    'is-visible'
  );

  window.clearTimeout(
    hitLabelTimer
  );

  hitLabelTimer =
    window.setTimeout(() => {
      hitLabel.classList.remove(
        'is-visible'
      );
    }, 420);
}

function setStatus(message, variant) {
  statusText.textContent = message;

  status.classList.toggle(
    'is-ready',
    variant === 'ready'
  );

  status.classList.toggle(
    'is-paused',
    variant === 'paused'
  );
}

function formatScore(value) {
  return String(value).padStart(
    4,
    '0'
  );
}

function readBestScore() {
  try {
    return (
      Number.parseInt(
        localStorage.getItem(
          'sword-meteor-best'
        ) ?? '0',
        10
      ) || 0
    );
  } catch {
    return 0;
  }
}

function writeBestScore(value) {
  try {
    localStorage.setItem(
      'sword-meteor-best',
      String(value)
    );
  } catch {
    // Trình duyệt đang chặn localStorage.
  }
}

startButton.addEventListener(
  'click',
  startOrResumeGame
);

function updateAim(
  clientX,
  clientY,
  pointerType = 'mouse'
) {
  aimScreen.set(
    THREE.MathUtils.clamp(
      clientX,
      0,
      innerWidth
    ),
    THREE.MathUtils.clamp(
      clientY,
      0,
      innerHeight
    )
  );

  reticle.style.left =
    `${aimScreen.x}px`;

  reticle.style.top =
    `${aimScreen.y}px`;

  reticle.classList.toggle(
    'is-touch',
    pointerType === 'touch' ||
      pointerType === 'pen'
  );

  reticle.classList.toggle(
    'is-visible',
    state.running
  );

  updateAimRigFromScreen(
    aimScreen.x,
    aimScreen.y
  );

  aimedMeteor = findMeteorAtScreen(
    aimScreen.x,
    aimScreen.y
  );
}

window.addEventListener(
  'pointermove',
  (event) => {
    updateAim(
      event.clientX,
      event.clientY,
      event.pointerType
    );
  },
  {
    passive: true
  }
);

canvas.addEventListener(
  'pointerdown',
  (event) => {
    if (
      event.button !== 0 &&
      event.pointerType !== 'touch'
    ) {
      return;
    }

    updateAim(
      event.clientX,
      event.clientY,
      event.pointerType
    );

    const isContinuousInput =
      event.pointerType === 'touch' ||
      event.pointerType === 'pen';

    if (isContinuousInput) {
      continuousFirePointerId =
        event.pointerId;

      continuousFireActive = true;

      canvas.setPointerCapture?.(
        event.pointerId
      );

      event.preventDefault();
    }

    shootAtAim();
  },
  {
    passive: false
  }
);

function stopContinuousFire(event) {
  if (
    event.pointerId !==
    continuousFirePointerId
  ) {
    return;
  }

  continuousFireActive = false;
  continuousFirePointerId = null;
}

window.addEventListener(
  'pointerup',
  stopContinuousFire,
  {
    passive: true
  }
);

window.addEventListener(
  'pointercancel',
  stopContinuousFire,
  {
    passive: true
  }
);

window.addEventListener(
  'keydown',
  (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      shootAtAim();
    }

    if (event.code === 'Escape') {
      if (state.running) {
        pauseGame();
      } else if (
        state.overlayMode === 'pause'
      ) {
        startOrResumeGame();
      }
    }

    if (
      event.code === 'Enter' &&
      !state.running &&
      state.assetsReady
    ) {
      startOrResumeGame();
    }
  }
);

document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.hidden &&
      state.running
    ) {
      pauseGame();
    }
  }
);

window.addEventListener(
  'resize',
  () => {
    camera.aspect =
      innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
      Math.min(devicePixelRatio, 2)
    );

    renderer.setSize(
      innerWidth,
      innerHeight
    );

    updateAim(
      aimScreen.x,
      aimScreen.y,
      reticle.classList.contains(
        'is-touch'
      )
        ? 'touch'
        : 'mouse'
    );
  }
);

function updateBackground(
  delta,
  elapsed
) {
  const positions =
    stars.geometry.getAttribute(
      'position'
    );

  for (
    let index = 2;
    index < positions.array.length;
    index += 3
  ) {
    positions.array[index] +=
      delta * 0.62;

    if (positions.array[index] > 6) {
      positions.array[index] = -85;
    }
  }

  positions.needsUpdate = true;

  horizon.rotation.z =
    Math.sin(elapsed * 0.12) *
    0.025;

  /*
   * Vị trí của cả nhân vật,
   * kiếm cầm và kiếm sau lưng
   * so với sân khấu.
   *
   * Tăng Y để đưa nhân vật lên cao.
   */
  player.position.y = 1;
  player.position.z = 2.5;
}

function updateCamera(delta) {
  state.shake = Math.max(
    0,
    state.shake - delta * 1.45
  );

  const shake = state.shake;

  camera.position.set(
    cameraBase.x +
      THREE.MathUtils.randFloatSpread(
        shake
      ),

    cameraBase.y +
      THREE.MathUtils.randFloatSpread(
        shake
      ),

    cameraBase.z +
      THREE.MathUtils.randFloatSpread(
        shake * 0.55
      )
  );

  camera.lookAt(cameraLookAt);
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  timer.update(timestamp);

  const delta = Math.min(
    timer.getDelta(),
    0.033
  );

  const elapsed =
    timer.getElapsed();

  updateBackground(
    delta,
    elapsed
  );

  updateBursts(delta);
  updateCamera(delta);

  if (state.running) {
    if (continuousFireActive) {
      shootAtAim();
    }

    state.spawnTimer += delta;

    const spawnInterval = Math.max(
      0.54,
      CONFIG.meteorSpawnEvery -
        state.score / 6500
    );

    if (
      state.spawnTimer >=
      spawnInterval
    ) {
      state.spawnTimer = 0;
      spawnMeteor();
    }

    updateMeteors(delta);
    updateAutonomousSwords(delta);
    updateProjectiles(delta);

    if (
      performance.now() -
        state.lastHitAt >
        2600 &&
      state.combo !== 1
    ) {
      state.combo = 1;
      updateHud();
    }
  }

  renderer.render(
    scene,
    camera
  );
}

updateHud();

requestAnimationFrame(animate);

loadAssets().catch((error) => {
  console.error(
    'Không thể khởi tạo model, dùng hình học dự phòng.',
    error
  );

  swordAsset = null;
  projectileSwordTemplate = null;

  setupPlayer(null);

  state.assetsReady = true;
  startButton.disabled = false;

  startLabel.textContent =
    'Bắt đầu nhiệm vụ';

  setStatus(
    'Sẵn sàng • hình học dựng sẵn',
    'ready'
  );
});