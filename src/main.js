import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#game');
const gameShell = document.querySelector('.game-shell');
const hud = document.querySelector('.hud');
const scoreText = document.querySelector('#score');
const pauseButton = document.querySelector('#pause-button');
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
const isCompactScreen = innerWidth <= 900;
/*
 * Cho phép vuốt trên màn hình Intro/Pause
 * mà không bị trình duyệt cuộn trang.
 */
startScreen.style.touchAction = 'none';

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
  autoSwordSpeed: 34,

  // Khoảng cách được tính là đã chém trúng.
  autoSwordHitRadius: 0.32,

  // Bán kính vòng bay quanh nhân vật.
  autoSwordOrbitRadius: 1.4,

  // Độ cao quỹ đạo so với player.
  autoSwordOrbitHeight: 0,

  // Tốc độ quay quanh nhân vật.
  autoSwordOrbitSpeed: 4,

  // Độ nhanh khi kiếm nhập vào quỹ đạo.
  autoSwordOrbitFollowStrength: 9,

  // Thời gian chờ giữa hai đợt tấn công.
  autoSwordWaveCooldown: 1.5,

  // Tốc độ nhóm kiếm trở về quỹ đạo.
  autoSwordReturnSpeed: 34,

  // Khoảng cách được xem là đã về quỹ đạo.
  autoSwordReturnArrivalDistance: 0.08,

  // Kích thước cố định của kiếm tự động.
  autoSwordScale: 0.4,

  // Màu vàng của kiếm tự động.
  autoSwordGoldColor: 0xffd84a,

  // Màu phát sáng.
  autoSwordGoldEmissive: 0xff9800,

  // Cường độ phát sáng.
  autoSwordGoldEmissiveIntensity: 10,

  // Màu burst khi kiếm tự động chém trúng.
  autoSwordBurstColor: 0xffc928,

  // Tốc độ meteor đi xuống theo Y.
  meteorFallSpeed: 2.1,

  // Tốc độ meteor tiến ra theo Z.
  meteorOutSpeed: 5,

  // Tốc độ meteor trở về biên X hợp lệ.
  meteorXReturnSpeed:
    isCompactScreen ? 0.3 : 0.7,

  // Độ cao spawn meteor.
  meteorSpawnMinY: 27,
  meteorSpawnMaxY: 28,

  // Meteor vượt qua Y này sẽ gây sát thương.
  meteorBottomY: -0.55,

  meteorSpawnEvery: 1.05,
  startingShield: 3,
  hitsPerLevelPoint: 5,
  pointsPerLevel: 3,
  maxLevel: 10,
  aimPlaneZ: -48,

  // Kích thước màn hình tối đa dùng điều khiển vuốt tương đối.
  relativeTouchAimMaxEdge: 1366,

  // Độ nhạy khi vuốt: 1px ngón tay = 1px tâm ngắm.
  relativeTouchAimSensitivity: 2,

  // Khoảng cách tối thiểu giữa tâm ngắm và mép màn hình.
  aimScreenMargin: 28
});

const PROJECTILE_FORWARD_AXIS =
  new THREE.Vector3(0, 0, -1);

const MAX_RIG_PITCH =
  THREE.MathUtils.degToRad(10);

const localRigAimDirection =
  new THREE.Vector3();

const AIM_PLANE =
  new THREE.Plane(
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

bestScoreText.textContent =
  formatScore(state.bestScore);

const scene =
  new THREE.Scene();

scene.background =
  new THREE.Color(0x050817);

scene.fog =
  new THREE.FogExp2(
    0x050817,
    0.018
  );

const camera =
  new THREE.PerspectiveCamera(
    58,
    innerWidth / innerHeight,
    0.1,
    180
  );

const cameraBase =
  new THREE.Vector3(
    0,
    3.4,
    10
  );

const cameraLookAt =
  new THREE.Vector3(
    0,
    1.15,
    -18
  );

camera.position.copy(cameraBase);
camera.lookAt(cameraLookAt);

const renderer =
  new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference:
      'high-performance'
  });

renderer.setPixelRatio(
  Math.min(
    devicePixelRatio,
      isCompactScreen ? 1.25 : 2
    )
  );

renderer.setSize(
  innerWidth,
  innerHeight
);

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure =
  1.18;

const timer =
  createCompatibleTimer();

const loader =
  new GLTFLoader();

const raycaster =
  new THREE.Raycaster();

const pointer =
  new THREE.Vector2();

const aimScreen =
  new THREE.Vector2(
    innerWidth / 2,
    innerHeight / 2
  );

const projectiles = [];
const meteors = [];
const bursts = [];

// Kiếm tự động xuất hiện từ Level 6.
const autonomousSwords = [];

let stars;
let swordAsset = null;
let swordVisualTemplate = null;
let projectileSwordTemplate = null;
let meteorVisualTemplate = null;
let projectileTrailTemplate = null;
let aimRig = null;
let aimSwordPivot = null;
let aimMuzzle = null;
let backSwordFan = null;
let hitLabelTimer = 0;
let damageFlashTimer = 0;
let aimedMeteor = null;
let continuousFirePointerId = null;
let continuousFireActive = false;
let aimPointerCaptureElement = null;

/*
 * Trạng thái điều khiển tâm ngắm kiểu trackpad
 * cho màn hình iPad trở xuống.
 */
let relativeTouchAimActive = false;
let relativeTouchLastX = 0;
let relativeTouchLastY = 0;

/*
 * True khi chuột hoặc cảm ứng
 * đang nằm trong vùng HUD.
 */
let pointerIsOverHud = false;
let autoSwordOrbitAngle = 0;

/*
 * Trạng thái của cả nhóm kiếm:
 *
 * cooldown:
 * quay quanh nhân vật và đếm 5 giây.
 *
 * attacking:
 * toàn bộ kiếm trong đợt đang tấn công.
 *
 * returning:
 * các kiếm đã chém xong cùng trở về.
 */
let autoSwordGroupPhase =
  'cooldown';

let autoSwordWaveCooldownRemaining =
  CONFIG.autoSwordWaveCooldown;

const tempOrigin =
  new THREE.Vector3();

const tempTarget =
  new THREE.Vector3();

const tempDirection =
  new THREE.Vector3();

const homingDirection =
  new THREE.Vector3();

const fanDirection =
  new THREE.Vector3();

const FAN_ROTATION_AXIS =
  new THREE.Vector3(0, 1, 0);

const primaryTargetPosition =
  new THREE.Vector3();

const previousTip =
  new THREE.Vector3();

const currentTip =
  new THREE.Vector3();

const closestPoint =
  new THREE.Vector3();

const collisionSegment =
  new THREE.Line3();

const playerWorldQuaternion =
  new THREE.Quaternion();

const playerWorldPosition =
  new THREE.Vector3();

const autoSwordDirection =
  new THREE.Vector3();

const autoSwordOrbitPosition =
  new THREE.Vector3();

/*
 * Model kiếm được quy ước hướng
 * theo trục local -Z.
 */
const AUTO_SWORD_IDLE_QUATERNION =
  new THREE.Quaternion()
    .setFromUnitVectors(
      PROJECTILE_FORWARD_AXIS,
      new THREE.Vector3(0, 1, 0)
    );

function createCompatibleTimer() {
  if (
    typeof THREE.Timer ===
    'function'
  ) {
    const threeTimer =
      new THREE.Timer();

    threeTimer.connect?.(
      document
    );

    return threeTimer;
  }

  let previousTime =
    performance.now();

  let delta = 0;
  let elapsed = 0;

  return {
    reset() {
      previousTime =
        performance.now();

      delta = 0;

      return this;
    },

    update(
      timestamp = performance.now()
    ) {
      delta =
        Math.max(
          0,
          timestamp - previousTime
        ) / 1000;

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

const keyLight =
  new THREE.DirectionalLight(
    0xd8ecff,
    3.2
  );

keyLight.position.set(
  6,
  11,
  7
);

scene.add(keyLight);

const cyanLight =
  new THREE.PointLight(
    0x43dcff,
    18,
    30,
    2
  );

cyanLight.position.set(
  -5,
  3,
  -8
);

scene.add(cyanLight);

const violetLight =
  new THREE.PointLight(
    0x7d45ff,
    14,
    36,
    2
  );

violetLight.position.set(
  7,
  6,
  -24
);

scene.add(violetLight);

const floorMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x080d21,
    roughness: 0.88,
    metalness: 0.2,
    transparent: true,
    opacity: 0.76
  });

const floor =
  new THREE.Mesh(
    new THREE.PlaneGeometry(
      90,
      130
    ),
    floorMaterial
  );

floor.rotation.x =
  -Math.PI / 2;

floor.position.set(
  0,
  -0.72,
  -35
);

scene.add(floor);

const grid =
  new THREE.GridHelper(
    90,
    45,
    0x2e9eba,
    0x172342
  );

grid.position.set(
  0,
  -0.7,
  -34
);

grid.material.transparent =
  true;

grid.material.opacity =
  0.22;

scene.add(grid);

const horizon =
  new THREE.Group();

for (
  const z of [-22, -42, -62]
) {
  const ring =
    new THREE.Mesh(
      new THREE.RingGeometry(
        8.8,
        8.84,
        96
      ),

      new THREE.MeshBasicMaterial({
        color:
          z === -42
            ? 0x806dff
            : 0x45dff5,

        transparent: true,

        opacity:
          z === -42
            ? 0.11
            : 0.07,

        side:
          THREE.DoubleSide,

        depthWrite: false
      })
    );

  ring.position.z = z;

  horizon.add(ring);
}

scene.add(horizon);

stars =
  createStarfield(620);

scene.add(stars);

const player =
  new THREE.Group();

scene.add(player);

async function loadAssets() {
  const assetUrls = {
    character:
      new URL(
        '../models/character_1.glb',
        import.meta.url
      ).href,

    sword:
      new URL(
        '../models/sword_1.glb',
        import.meta.url
      ).href
  };

  const [
    characterResult,
    swordResult
  ] =
    await Promise.allSettled([
      loader.loadAsync(
        assetUrls.character
      ),

      loader.loadAsync(
        assetUrls.sword
      )
    ]);

  const characterAsset =
    characterResult.status ===
    'fulfilled'
      ? characterResult.value.scene
      : null;

  swordAsset =
    swordResult.status ===
    'fulfilled'
      ? swordResult.value.scene
      : null;

  setupPlayer(characterAsset);

  state.assetsReady = true;

  startButton.disabled = false;

  startLabel.textContent =
    'Bắt đầu nhiệm vụ';

  status.classList.add(
    'is-ready'
  );

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

function setupPlayer(
  characterAsset
) {
  player.clear();

  aimRig =
    new THREE.Group();

  aimRig.name =
    'character-sword-aim-rig';

  aimSwordPivot = null;
  aimMuzzle = null;
  backSwordFan = null;

  if (characterAsset) {
    const character =
      characterAsset.clone(true);

    character.scale.setScalar(80);

    character.rotation.y =
      Math.PI;

    aimRig.add(character);
  } else {
    aimRig.add(
      createFallbackCharacter()
    );
  }

  const heldSword =
    createSwordVisual('held');

  aimSwordPivot =
    new THREE.Group();

  aimSwordPivot.name =
    'aim-sword-pivot';

  if (swordAsset) {
    heldSword.scale.setScalar(10);

    aimSwordPivot.position.set(
      0,
      -1,
      0
    );
  } else {
    heldSword.scale.setScalar(
      0.72
    );

    aimSwordPivot.position.set(
      0.62,
      1.02,
      -0.34
    );
  }

  heldSword.position.set(
    0,
    0,
    0
  );

  heldSword.rotation.set(
    0,
    0,
    0
  );

  aimSwordPivot.add(
    heldSword
  );

  aimRig.add(
    aimSwordPivot
  );

  player.add(aimRig);

  player.updateMatrixWorld(true);

  aimMuzzle =
    new THREE.Object3D();

  aimMuzzle.name =
    'sword-muzzle';

  const heldSwordBounds =
    new THREE.Box3()
      .setFromObject(
        heldSword
      );

  if (
    !heldSwordBounds.isEmpty()
  ) {
    const muzzleWorldPosition =
      heldSwordBounds.getCenter(
        new THREE.Vector3()
      );

    muzzleWorldPosition.z =
      heldSwordBounds.min.z;

    aimSwordPivot.worldToLocal(
      muzzleWorldPosition
    );

    aimMuzzle.position.copy(
      muzzleWorldPosition
    );
  } else {
    aimMuzzle.position.set(
      0,
      0,
      -2.5
    );
  }

  aimSwordPivot.add(
    aimMuzzle
  );

  updateResponsivePlayerLayout();
  updateLevelSwords(state.level);

  updateAimRigFromScreen(
    aimScreen.x,
    aimScreen.y
  );
}

function createFallbackCharacter() {
  const group =
    new THREE.Group();

  const armorMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x17233d,
      metalness: 0.72,
      roughness: 0.28
    });

  const darkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x070b16,
      metalness: 0.55,
      roughness: 0.4
    });

  const glowMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x8bf6ff,
      emissive: 0x38cde8,
      emissiveIntensity: 3.5,
      metalness: 0.2,
      roughness: 0.22
    });

  const torso =
    new THREE.Mesh(
      new THREE.CapsuleGeometry(
        0.34,
        0.72,
        8,
        16
      ),
      armorMaterial
    );

  torso.position.y =
    0.96;

  group.add(torso);

  const chest =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.5,
        0.18,
        0.17
      ),
      glowMaterial
    );

  chest.position.set(
    0,
    1.11,
    -0.31
  );

  group.add(chest);

  const head =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.29,
        20,
        14
      ),
      darkMaterial
    );

  head.position.y =
    1.68;

  group.add(head);

  const visor =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.37,
        0.09,
        0.08
      ),
      glowMaterial
    );

  visor.position.set(
    0,
    1.7,
    -0.25
  );

  group.add(visor);

  for (
    const x of [-0.19, 0.19]
  ) {
    const leg =
      new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.11,
          0.54,
          6,
          10
        ),
        armorMaterial
      );

    leg.position.set(
      x,
      0.23,
      0
    );

    group.add(leg);
  }

  return group;
}

function createSwordVisual(
  mode = 'projectile'
) {
  if (swordAsset) {
    const sword =
      swordAsset.clone(true);

    sword.position.set(
      0,
      0,
      0
    );

    sword.rotation.set(
      0,
      0,
      0
    );

    sword.scale.setScalar(
      mode === 'projectile'
        ? 10
        : 1
    );

    return sword;
  }

  if (!swordVisualTemplate) {
    swordVisualTemplate =
      createProceduralSword();
  }

  return swordVisualTemplate
    .clone(true);
}

function createProjectileSwordVisual() {
  if (!projectileSwordTemplate) {
    const visual =
      createSwordVisual(
        'projectile'
      );

    if (!swordAsset) {
      visual.scale.setScalar(
        0.76
      );
    }

    visual.updateMatrixWorld(true);

    const bounds =
      new THREE.Box3()
        .setFromObject(visual);

    if (!bounds.isEmpty()) {
      const center =
        bounds.getCenter(
          new THREE.Vector3()
        );

      visual.position.sub(
        center
      );
    }

    projectileSwordTemplate =
      visual;
  }

  return projectileSwordTemplate
    .clone(true);
}

function createProceduralSword() {
  const sword =
    new THREE.Group();

  sword.name =
    'energy-sword';

  const bladeMaterial =
    new THREE.MeshPhysicalMaterial({
      color: 0xe8fdff,
      emissive: 0x27cde8,
      emissiveIntensity: 3.6,
      metalness: 0.68,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.12
    });

  const bladeCoreMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false
    });

  const bladeGlowMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x36e6ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      toneMapped: false
    });

  const metalMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x7182ab,
      emissive: 0x16233c,
      emissiveIntensity: 0.5,
      metalness: 0.92,
      roughness: 0.2
    });

  const gripMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x11162a,
      metalness: 0.42,
      roughness: 0.62
    });

  const blade =
    new THREE.Mesh(
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

  blade.rotation.x =
    -Math.PI / 2;

  blade.position.z =
    -1.22;

  sword.add(blade);

  const bladeCore =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.028,
        0.028,
        1.58
      ),
      bladeCoreMaterial
    );

  bladeCore.position.z =
    -1.2;

  sword.add(bladeCore);

  const bladeGlow =
    new THREE.Mesh(
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

  bladeGlow.rotation.x =
    -Math.PI / 2;

  bladeGlow.position.z =
    -1.22;

  sword.add(bladeGlow);

  const tip =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        0.048,
        0.38,
        4
      ),
      bladeMaterial
    );

  tip.rotation.x =
    -Math.PI / 2;

  tip.position.z =
    -2.36;

  sword.add(tip);

  const guard =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.72,
        0.09,
        0.14
      ),
      metalMaterial
    );

  guard.position.z =
    -0.19;

  sword.add(guard);

  for (
    const x of [-0.4, 0.4]
  ) {
    const guardTip =
      new THREE.Mesh(
        new THREE.OctahedronGeometry(
          0.11,
          0
        ),
        bladeMaterial
      );

    guardTip.position.set(
      x,
      0,
      -0.19
    );

    guardTip.scale.set(
      1.25,
      0.62,
      0.7
    );

    sword.add(guardTip);
  }

  const grip =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.065,
        0.076,
        0.54,
        12
      ),
      gripMaterial
    );

  grip.rotation.x =
    Math.PI / 2;

  grip.position.z =
    0.17;

  sword.add(grip);

  for (
    const z of [
      -0.02,
      0.1,
      0.22,
      0.34
    ]
  ) {
    const gripRing =
      new THREE.Mesh(
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

  const pommel =
    new THREE.Mesh(
      new THREE.OctahedronGeometry(
        0.13,
        0
      ),
      bladeMaterial
    );

  pommel.position.z =
    0.54;

  pommel.scale.set(
    0.8,
    0.8,
    1.18
  );

  sword.add(pommel);

  return sword;
}

function createMeteorVisual() {
  if (!meteorVisualTemplate) {
    meteorVisualTemplate =
      createProceduralMeteor();
  }

  return meteorVisualTemplate
    .clone(true);
}

function createProceduralMeteor() {
  const group =
    new THREE.Group();

  group.name =
    'red-meteor';

  const sphere =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.72,
        16,
        12
      ),

      new THREE.MeshStandardMaterial({
        color: 0xff173d,
        emissive: 0xa50025,
        emissiveIntensity: 2.15,
        metalness: 0.04,
        roughness: 0.38
      })
    );

  group.add(sphere);

  const glow =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.84,
        12,
        8
      ),

      new THREE.MeshBasicMaterial({
        color: 0xff315c,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
        toneMapped: false
      })
    );

  group.add(glow);

  return group;
}

function createStarfield(count) {
  const positions =
    new Float32Array(
      count * 3
    );

  const colors =
    new Float32Array(
      count * 3
    );

  const cyan =
    new THREE.Color(
      0x7deeff
    );

  const violet =
    new THREE.Color(
      0x9c86ff
    );

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const offset =
      index * 3;

    positions[offset] =
      THREE.MathUtils
        .randFloatSpread(52);

    positions[offset + 1] =
      THREE.MathUtils.randFloat(
        -0.2,
        22
      );

    positions[offset + 2] =
      THREE.MathUtils.randFloat(
        -85,
        3
      );

    const color =
      Math.random() > 0.72
        ? violet
        : cyan;

    colors[offset] =
      color.r;

    colors[offset + 1] =
      color.g;

    colors[offset + 2] =
      color.b;
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

  geometry.setAttribute(
    'color',

    new THREE.BufferAttribute(
      colors,
      3
    )
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

function setRaycasterFromScreen(
  clientX,
  clientY
) {
  pointer.x =
    (clientX / innerWidth) *
      2 -
    1;

  pointer.y =
    -(clientY / innerHeight) *
      2 +
    1;

  raycaster.setFromCamera(
    pointer,
    camera
  );
}

function findMeteorAtScreen(
  clientX,
  clientY
) {
  if (meteors.length === 0) {
    return null;
  }

  setRaycasterFromScreen(
    clientX,
    clientY
  );

  const intersections =
    raycaster.intersectObjects(
      meteors,
      true
    );

  for (
    const intersection
    of intersections
  ) {
    let object =
      intersection.object;

    while (
      object &&
      object !== scene
    ) {
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
  setRaycasterFromScreen(
    clientX,
    clientY
  );

  if (
    !raycaster.ray
      .intersectPlane(
        AIM_PLANE,
        tempTarget
      )
  ) {
    raycaster.ray.at(
      60,
      tempTarget
    );
  }

  getMuzzlePosition(
    tempOrigin
  );

  targetDirection
    .copy(tempTarget)
    .sub(tempOrigin)
    .normalize();

  return targetDirection;
}

function updateAimRigFromScreen(
  clientX,
  clientY
) {
  if (!aimRig) {
    return;
  }

  calculateAimDirection(
    clientX,
    clientY,
    tempDirection
  );

  player.getWorldQuaternion(
    playerWorldQuaternion
  );

  playerWorldQuaternion
    .invert();

  localRigAimDirection
    .copy(tempDirection)
    .applyQuaternion(
      playerWorldQuaternion
    )
    .normalize();

  const rawYaw =
    Math.atan2(
      -localRigAimDirection.x,
      -localRigAimDirection.z
    );

  const rawPitch =
    Math.asin(
      THREE.MathUtils.clamp(
        localRigAimDirection.y,
        -1,
        1
      )
    );

  const pitch =
    THREE.MathUtils.clamp(
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

function shootFromScreen(
  clientX,
  clientY
) {
  let target =
    aimedMeteor;

  if (
    !target ||
    !meteors.includes(target)
  ) {
    target =
      findMeteorAtScreen(
        clientX,
        clientY
      );

    aimedMeteor = target;
  }

  if (target) {
    getMuzzlePosition(
      tempOrigin
    );

    target.getWorldPosition(
      tempTarget
    );

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
  /*
   * Tâm ngắm được phép di chuyển ở Intro/Pause,
   * nhưng chỉ được tạo đạn khi game đang chạy.
   */
  if (
    !state.running ||
    pointerIsOverHud
  ) {
    return;
  }

  shootFromScreen(
    aimScreen.x,
    aimScreen.y
  );
}

function getNearbySecondaryTargets(
  primaryTarget,
  maximumTargets
) {
  if (
    !primaryTarget ||
    maximumTargets <= 0
  ) {
    return [];
  }

  primaryTarget.getWorldPosition(
    primaryTargetPosition
  );

  const maximumDistanceSquared =
    CONFIG.secondaryTargetRadius **
    2;

  return meteors
    .filter((meteor) => {
      return (
        meteor !== primaryTarget &&
        meteor.parent &&
        meteor.position
          .distanceToSquared(
            primaryTargetPosition
          ) <=
          maximumDistanceSquared
      );
    })
    .sort(
      (
        meteorA,
        meteorB
      ) => {
        return (
          meteorA.position
            .distanceToSquared(
              primaryTargetPosition
            ) -
          meteorB.position
            .distanceToSquared(
              primaryTargetPosition
            )
        );
      }
    )
    .slice(
      0,
      maximumTargets
    );
}

function fireProjectileFan(
  origin,
  direction,
  target = null
) {
  if (
    !state.running ||
    !state.assetsReady
  ) {
    return;
  }

  const now =
    performance.now();

  if (
    now - state.lastShotAt <
    CONFIG.projectileCooldownMs
  ) {
    return;
  }

  state.lastShotAt = now;

  const swordCount =
    THREE.MathUtils.clamp(
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
    Math.floor(
      swordCount / 2
    );

  const secondaryTargets =
    getNearbySecondaryTargets(
      target,
      swordCount - 1
    );

  let secondaryTargetIndex =
    0;

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
      swordIndex ===
      primarySwordIndex
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

  reticle.classList.add(
    'is-firing'
  );

  window.setTimeout(() => {
    reticle.classList.remove(
      'is-firing'
    );
  }, 90);
}

function createProjectile(
  origin,
  direction,
  target = null
) {
  const normalizedDirection =
    direction
      .clone()
      .normalize();

  const projectile =
    new THREE.Group();

  const visual =
    createProjectileSwordVisual();

  const trail =
    createProjectileTrail();

  projectile.add(visual);
  projectile.add(trail);

  projectile.position.copy(
    origin
  );

  projectile.quaternion
    .setFromUnitVectors(
      PROJECTILE_FORWARD_AXIS,
      normalizedDirection
    );

  projectile.userData
    .lockedQuaternion =
      projectile.quaternion.clone();

  projectile.userData.direction =
    normalizedDirection;

  projectile.userData.velocity =
    normalizedDirection
      .clone()
      .multiplyScalar(
        CONFIG.projectileSpeed
      );

  projectile.userData
    .previousPosition =
      origin.clone();

  projectile.userData
    .distanceTravelled = 0;

  projectile.userData.age = 0;
  projectile.userData.target = target;

  projectiles.push(projectile);
  scene.add(projectile);
}

function createProjectileTrail() {
  if (!projectileTrailTemplate) {
    projectileTrailTemplate =
      new THREE.Group();

    const trail =
      new THREE.Mesh(
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

    trail.rotation.x =
      Math.PI / 2;

    trail.position.z =
      1.34;

    projectileTrailTemplate.add(
      trail
    );
  }

  return projectileTrailTemplate
    .clone(true);
}

function updateProjectiles(delta) {
  for (
    let projectileIndex =
      projectiles.length - 1;
    projectileIndex >= 0;
    projectileIndex -= 1
  ) {
    const projectile =
      projectiles[
        projectileIndex
      ];

    const data =
      projectile.userData;

    const target =
      data.target;

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
      target.getWorldPosition(
        tempTarget
      );

      homingDirection
        .copy(tempTarget)
        .sub(
          projectile.position
        )
        .normalize();

      const steeringAmount =
        1 -
        Math.exp(
          -CONFIG
            .projectileHomingStrength *
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

      data.lockedQuaternion
        .setFromUnitVectors(
          PROJECTILE_FORWARD_AXIS,
          data.direction
        );
    } else if (
      !hasActiveTarget
    ) {
      data.target = null;
    }

    data.previousPosition.copy(
      projectile.position
    );

    projectile.position
      .addScaledVector(
        data.velocity,
        delta
      );

    projectile.quaternion.copy(
      data.lockedQuaternion
    );

    data.distanceTravelled +=
      CONFIG.projectileSpeed *
      delta;

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

      collisionSegment
        .closestPointToPoint(
          meteor.position,
          true,
          closestPoint
        );

      const collisionRadius =
        meteor.userData.radius +
        0.22;

      const distanceSquared =
        closestPoint
          .distanceToSquared(
            meteor.position
          );

      if (
        distanceSquared <=
        collisionRadius *
          collisionRadius
      ) {
        registerHit(
          meteor.position
        );

        removeMeteor(
          meteorIndex
        );

        removeProjectile(
          projectileIndex
        );

        collided = true;

        break;
      }
    }

    if (
      !collided &&
      data.distanceTravelled >=
        CONFIG.projectileRange
    ) {
      removeProjectile(
        projectileIndex
      );
    }
  }
}

function removeProjectile(index) {
  const [projectile] =
    projectiles.splice(
      index,
      1
    );

  if (projectile) {
    scene.remove(
      projectile
    );
  }
}

function getMuzzlePosition(
  target
) {
  if (aimMuzzle) {
    return aimMuzzle
      .getWorldPosition(
        target
      );
  }

  target.set(
    0,
    -0.8,
    -4
  );

  return player.localToWorld(
    target
  );
}

function getMeteorXBoundary() {
  if (innerWidth <= 900) {
    return 1.5;
  }

  if (innerWidth <= 1200) {
    return 3;
  }

  if (innerWidth <= 1500) {
    return 4;
  }

  if (innerWidth <= 1800) {
    return 5;
  }

  return 6;
}

function spawnMeteor() {
  const meteor =
    new THREE.Group();

  meteor.userData.isMeteor =
    true;

  const visual =
    createMeteorVisual();

  const size =
    THREE.MathUtils.randFloat(
      0.72,
      1.35
    );

  visual.scale.setScalar(size);

  meteor.add(visual);

  const spawnX =
    THREE.MathUtils.randFloat(
      -6,
      6
    );

  const xBoundary =
    getMeteorXBoundary();

  meteor.position.set(
    spawnX,

    THREE.MathUtils.randFloat(
      CONFIG.meteorSpawnMinY,
      CONFIG.meteorSpawnMaxY
    ),

    -62
  );

  meteor.userData.visual =
    visual;

  meteor.userData.xBoundary =
    xBoundary;

  if (
    spawnX < -xBoundary
  ) {
    meteor.userData
      .horizontalSpeed =
        CONFIG
          .meteorXReturnSpeed;
  } else if (
    spawnX > xBoundary
  ) {
    meteor.userData
      .horizontalSpeed =
        -CONFIG
          .meteorXReturnSpeed;
  } else {
    meteor.userData
      .horizontalSpeed = 0;
  }

  const meteorSpeedMultiplier =
    1 +
    Math.min(
      state.score / 10000,
      0.6
    );

  meteor.userData.fallSpeed =
    CONFIG.meteorFallSpeed *
    meteorSpeedMultiplier;

  meteor.userData.forwardSpeed =
    CONFIG.meteorOutSpeed *
    meteorSpeedMultiplier;

  meteor.userData.radius =
    0.72 * size;

  meteors.push(meteor);
  scene.add(meteor);
}

function updateMeteors(delta) {
  for (
    let index =
      meteors.length - 1;
    index >= 0;
    index -= 1
  ) {
    const meteor =
      meteors[index];

    if (!meteor) {
      continue;
    }

    if (
      meteor.userData
        .horizontalSpeed !== 0
    ) {
      meteor.position.x +=
        meteor.userData
          .horizontalSpeed *
        delta;

      const xBoundary =
        meteor.userData
          .xBoundary;

      if (
        meteor.userData
          .horizontalSpeed > 0 &&
        meteor.position.x >=
          -xBoundary
      ) {
        meteor.position.x =
          -xBoundary;

        meteor.userData
          .horizontalSpeed = 0;
      } else if (
        meteor.userData
          .horizontalSpeed < 0 &&
        meteor.position.x <=
          xBoundary
      ) {
        meteor.position.x =
          xBoundary;

        meteor.userData
          .horizontalSpeed = 0;
      }
    }

    meteor.position.y -=
      meteor.userData.fallSpeed *
      delta;

    meteor.position.z +=
      meteor.userData.forwardSpeed *
      delta;

    if (
      meteor.position.z > 7.5 ||
      meteor.position.y <
        CONFIG.meteorBottomY
    ) {
      const impactPosition =
        meteor.position.clone();

      removeMeteor(index);

      damagePlayer(
        impactPosition
      );

      if (!state.running) {
        return;
      }
    }
  }
}

function removeMeteor(index) {
  const [meteor] =
    meteors.splice(
      index,
      1
    );

  if (!meteor) {
    return;
  }

  const autoSwordOwner =
    meteor.userData
      .autoSwordOwner;

  if (
    autoSwordOwner?.userData
      .target === meteor
  ) {
    autoSwordOwner.userData
      .lastTargetPosition
      .copy(
        meteor.position
      );

    releaseAutonomousSwordTarget(
      autoSwordOwner
    );
  }

  meteor.userData
    .autoSwordOwner = null;

  if (aimedMeteor === meteor) {
    aimedMeteor = null;
  }

  scene.remove(meteor);
}

function getBackSwordCount(level) {
  if (level < 2) {
    return 0;
  }

  if (
    level <=
    CONFIG.maxManualSwords
  ) {
    return level;
  }

  return Math.max(
    0,

    CONFIG.maxManualSwords -
      (
        level -
        CONFIG.maxManualSwords
      )
  );
}

function getAutonomousSwordCount(
  level
) {
  return THREE.MathUtils.clamp(
    level -
      CONFIG.maxManualSwords,

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

  if (
    !aimRig ||
    fanSwordCount === 0
  ) {
    return;
  }

  backSwordFan =
    new THREE.Group();

  backSwordFan.name =
    `level-${level}-persistent-back-sword-fan`;

  backSwordFan.position.set(
    0,
    -1.5,
    0.2
  );

  const fanCenter =
    (fanSwordCount - 1) /
    2;

  const spacing =
    THREE.MathUtils.degToRad(
      CONFIG
        .backSwordFanSpacingDeg
    );

  for (
    let swordIndex = 0;
    swordIndex < fanSwordCount;
    swordIndex += 1
  ) {
    const angle =
      (swordIndex - fanCenter) *
      spacing;

    const swordPivot =
      new THREE.Group();

    swordPivot.position.set(
      Math.sin(angle) * 1.35,

      1.28 +
        Math.cos(angle) *
          0.12,

      0
    );

    swordPivot.rotation.z =
      -angle;

    const sword =
      createSwordVisual('held');

    sword.scale.setScalar(
      swordAsset
        ? 5
        : 0.25
    );

    sword.position.set(
      0,
      0,
      0
    );

    sword.rotation.set(
      Math.PI / 2,
      0,
      0
    );

    swordPivot.add(sword);

    backSwordFan.add(
      swordPivot
    );
  }

  aimRig.add(backSwordFan);
}

function releaseAutonomousSwordTarget(
  sword
) {
  const target =
    sword.userData.target;

  if (
    target?.userData
      .autoSwordOwner === sword
  ) {
    target.userData
      .autoSwordOwner = null;
  }

  sword.userData.target =
    null;
}

function getAutonomousSwordOrbitPosition(
  swordIndex,
  swordCount,
  target
) {
  const safeSwordCount =
    Math.max(
      1,
      swordCount
    );

  const angleStep =
    (Math.PI * 2) /
    safeSwordCount;

  const angle =
    autoSwordOrbitAngle +
    swordIndex * angleStep;

  player.getWorldPosition(
    playerWorldPosition
  );

  target.set(
    playerWorldPosition.x +
      Math.cos(angle) *
        CONFIG
          .autoSwordOrbitRadius,

    playerWorldPosition.y +
      CONFIG
        .autoSwordOrbitHeight,

    playerWorldPosition.z +
      Math.sin(angle) *
        CONFIG
          .autoSwordOrbitRadius
  );

  return target;
}

function prepareAutonomousSwordMaterials(
  root
) {
  root.traverse((node) => {
    if (
      !node.isMesh ||
      !node.material
    ) {
      return;
    }

    const sourceMaterials =
      Array.isArray(
        node.material
      )
        ? node.material
        : [node.material];

    const clonedMaterials =
      sourceMaterials.map(
        (sourceMaterial) => {
          const material =
            sourceMaterial.clone();

          material.userData
            .autoSwordBaseAppearance = {
              color:
                material.color
                  ? material.color
                      .getHex()
                  : null,

              emissive:
                material.emissive
                  ? material.emissive
                      .getHex()
                  : null,

              emissiveIntensity:
                material
                  .emissiveIntensity,

              metalness:
                material.metalness,

              roughness:
                material.roughness
            };

          return material;
        }
      );

    node.material =
      Array.isArray(
        node.material
      )
        ? clonedMaterials
        : clonedMaterials[0];
  });
}

function setAutonomousSwordGolden(
  sword,
  enabled
) {
  sword.traverse((node) => {
    if (
      !node.isMesh ||
      !node.material
    ) {
      return;
    }

    const materials =
      Array.isArray(
        node.material
      )
        ? node.material
        : [node.material];

    for (
      const material
      of materials
    ) {
      const base =
        material.userData
          .autoSwordBaseAppearance;

      if (!base) {
        continue;
      }

      if (
        material.color &&
        base.color !== null
      ) {
        material.color.setHex(
          enabled
            ? CONFIG
                .autoSwordGoldColor
            : base.color
        );
      }

      if (
        material.emissive &&
        base.emissive !== null
      ) {
        material.emissive
          .setHex(
            enabled
              ? CONFIG
                  .autoSwordGoldEmissive
              : base.emissive
          );
      }

      if (
        typeof material
          .emissiveIntensity ===
        'number'
      ) {
        material
          .emissiveIntensity =
            enabled
              ? CONFIG
                  .autoSwordGoldEmissiveIntensity
              : base
                  .emissiveIntensity;
      }

      if (
        typeof material
          .metalness ===
        'number'
      ) {
        material.metalness =
          enabled
            ? Math.max(
                base.metalness ??
                  0,

                0.75
              )
            : base.metalness;
      }

      if (
        typeof material
          .roughness ===
        'number'
      ) {
        material.roughness =
          enabled
            ? Math.min(
                base.roughness ??
                  1,

                0.24
              )
            : base.roughness;
      }

      material.needsUpdate =
        true;
    }
  });

  sword.userData.isGolden =
    enabled;
}

function createAutonomousSword(
  swordIndex
) {
  const sword =
    new THREE.Group();

  const visual =
    createProjectileSwordVisual();

  prepareAutonomousSwordMaterials(
    visual
  );

  sword.scale.setScalar(
    CONFIG.autoSwordScale
  );

  sword.name =
    `autonomous-sword-${swordIndex + 1}`;

  sword.userData.target =
    null;

  sword.userData.slotIndex =
    swordIndex;

  sword.userData
    .isWaveMember = false;

  sword.userData.hasStruck =
    false;

  sword.userData.hasReturned =
    false;

  sword.userData
    .lastTargetPosition =
      new THREE.Vector3();

  sword.add(visual);

  setAutonomousSwordGolden(
    sword,
    true
  );

  getAutonomousSwordOrbitPosition(
    swordIndex,

    Math.max(
      1,
      autonomousSwords.length +
        1
    ),

    autoSwordOrbitPosition
  );

  sword.position.copy(
    autoSwordOrbitPosition
  );

  sword.quaternion.copy(
    AUTO_SWORD_IDLE_QUATERNION
  );

  autonomousSwords.push(
    sword
  );

  scene.add(sword);
}

function removeAutonomousSword(
  sword
) {
  releaseAutonomousSwordTarget(
    sword
  );

  sword.removeFromParent();

  const disposedMaterials =
    new Set();

  sword.traverse((node) => {
    if (
      !node.isMesh ||
      !node.material
    ) {
      return;
    }

    const materials =
      Array.isArray(
        node.material
      )
        ? node.material
        : [node.material];

    for (
      const material
      of materials
    ) {
      if (
        !material ||
        disposedMaterials.has(
          material
        )
      ) {
        continue;
      }

      material.dispose();

      disposedMaterials.add(
        material
      );
    }
  });
}

function syncAutonomousSwords(
  level
) {
  const desiredCount =
    getAutonomousSwordCount(
      level
    );

  const previousCount =
    autonomousSwords.length;

  while (
    autonomousSwords.length <
    desiredCount
  ) {
    createAutonomousSword(
      autonomousSwords.length
    );
  }

  while (
    autonomousSwords.length >
    desiredCount
  ) {
    const sword =
      autonomousSwords.pop();

    removeAutonomousSword(
      sword
    );
  }

  autonomousSwords.forEach(
    (
      sword,
      swordIndex
    ) => {
      sword.userData.slotIndex =
        swordIndex;
    }
  );

  if (
    previousCount === 0 &&
    autonomousSwords.length > 0
  ) {
    autoSwordGroupPhase =
      'cooldown';

    autoSwordWaveCooldownRemaining =
      CONFIG
        .autoSwordWaveCooldown;
  }

  if (
    autonomousSwords.length === 0
  ) {
    autoSwordGroupPhase =
      'cooldown';

    autoSwordWaveCooldownRemaining =
      CONFIG
        .autoSwordWaveCooldown;
  }
}

function removeAllAutonomousSwords() {
  while (
    autonomousSwords.length
  ) {
    const sword =
      autonomousSwords.pop();

    removeAutonomousSword(
      sword
    );
  }

  autoSwordOrbitAngle = 0;

  autoSwordGroupPhase =
    'cooldown';

  autoSwordWaveCooldownRemaining =
    CONFIG.autoSwordWaveCooldown;
}

function getAvailableAutonomousSwordTargets() {
  player.getWorldPosition(
    playerWorldPosition
  );

  return meteors
    .filter((meteor) => {
      return (
        meteor.parent &&
        !meteor.userData
          .autoSwordOwner
      );
    })
    .sort(
      (
        meteorA,
        meteorB
      ) => {
        /*
         * Xét tất cả meteor trên sân
         * và sắp xếp từ gần đến xa.
         */
        return (
          playerWorldPosition
            .distanceToSquared(
              meteorA.position
            ) -
          playerWorldPosition
            .distanceToSquared(
              meteorB.position
            )
        );
      }
    );
}

function assignAutonomousSwordTarget(
  sword,
  target
) {
  if (
    !target ||
    !target.parent ||
    target.userData
      .autoSwordOwner
  ) {
    return null;
  }

  releaseAutonomousSwordTarget(
    sword
  );

  sword.userData.target =
    target;

  target.userData
    .autoSwordOwner =
      sword;

  target.getWorldPosition(
    sword.userData
      .lastTargetPosition
  );

  return target;
}

function findNearestAvailableMeteorToPoint(
  origin
) {
  let nearestMeteor = null;

  let nearestDistanceSquared =
    Infinity;

  for (
    const meteor of meteors
  ) {
    /*
     * Chỉ bỏ qua meteor đã bị xóa
     * hoặc đang được kiếm khác giữ.
     */
    if (
      !meteor.parent ||
      meteor.userData
        .autoSwordOwner
    ) {
      continue;
    }

    const distanceSquared =
      origin.distanceToSquared(
        meteor.position
      );

    if (
      distanceSquared <
      nearestDistanceSquared
    ) {
      nearestDistanceSquared =
        distanceSquared;

      nearestMeteor =
        meteor;
    }
  }

  return nearestMeteor;
}

function startAutonomousSwordWave() {
  const waveSwords =
    [...autonomousSwords]
      .sort(
        (
          swordA,
          swordB
        ) => {
          return (
            swordA.userData
              .slotIndex -
            swordB.userData
              .slotIndex
          );
        }
      );

  if (
    waveSwords.length === 0
  ) {
    return false;
  }

  const availableTargets =
    getAvailableAutonomousSwordTargets();

  /*
   * Chỉ bắt đầu đợt khi số meteor
   * hợp lệ ít nhất bằng số kiếm.
   */
  if (
    availableTargets.length <
    waveSwords.length
  ) {
    return false;
  }

  waveSwords.forEach(
    (
      sword,
      swordIndex
    ) => {
      sword.userData
        .isWaveMember = true;

      sword.userData
        .hasStruck = false;

      sword.userData
        .hasReturned = false;

      assignAutonomousSwordTarget(
        sword,

        availableTargets[
          swordIndex
        ]
      );
    }
  );

  autoSwordGroupPhase =
    'attacking';

  return true;
}

function updateAutonomousSwordOrbit(
  sword,
  delta
) {
  getAutonomousSwordOrbitPosition(
    sword.userData.slotIndex,

    Math.max(
      1,
      autonomousSwords.length
    ),

    autoSwordOrbitPosition
  );

  const followAmount =
    1 -
    Math.exp(
      -CONFIG
        .autoSwordOrbitFollowStrength *
        delta
    );

  sword.position.lerp(
    autoSwordOrbitPosition,
    followAmount
  );

  player.getWorldPosition(
    playerWorldPosition
  );

  autoSwordDirection
    .copy(sword.position)
    .sub(playerWorldPosition);

  autoSwordDirection.y = 0;

  if (
    autoSwordDirection.lengthSq() >
    0.000001
  ) {
    autoSwordDirection
      .normalize();

    sword.quaternion
      .setFromUnitVectors(
        PROJECTILE_FORWARD_AXIS,
        autoSwordDirection
      );
  }
}

function beginAutonomousSwordGroupReturn() {
  for (
    const sword
    of autonomousSwords
  ) {
    if (
      !sword.userData
        .isWaveMember
    ) {
      continue;
    }

    releaseAutonomousSwordTarget(
      sword
    );

    sword.userData.hasReturned =
      false;
  }

  autoSwordGroupPhase =
    'returning';
}

function finishAutonomousSwordGroupReturn() {
  for (
    const sword
    of autonomousSwords
  ) {
    sword.userData
      .isWaveMember = false;

    sword.userData
      .hasStruck = false;

    sword.userData
      .hasReturned = false;

    releaseAutonomousSwordTarget(
      sword
    );
  }

  autoSwordGroupPhase =
    'cooldown';

  /*
   * Chỉ bắt đầu 5 giây mới sau khi
   * toàn bộ nhóm đã về quỹ đạo.
   */
  autoSwordWaveCooldownRemaining =
    CONFIG.autoSwordWaveCooldown;
}

function updateAutonomousSwordAttackers(
  delta
) {
  const waveSwords =
    autonomousSwords.filter(
      (sword) => {
        return sword.userData
          .isWaveMember;
      }
    );

  if (
    waveSwords.length === 0
  ) {
    finishAutonomousSwordGroupReturn();

    return;
  }

  for (
    const sword
    of waveSwords
  ) {
    /*
     * Kiếm chém xong đứng yên,
     * chờ các kiếm còn lại.
     */
    if (
      sword.userData.hasStruck
    ) {
      continue;
    }

    let target =
      sword.userData.target;

    const hasValidTarget =
      target &&
      target.parent &&
      meteors.includes(target) &&
      target.userData
        .autoSwordOwner ===
        sword;

    if (!hasValidTarget) {
      releaseAutonomousSwordTarget(
        sword
      );

      /*
       * Target cũ đã bị phá:
       * chọn meteor chưa bị giữ gần
       * vị trí cuối của target cũ nhất.
       */
      target =
        findNearestAvailableMeteorToPoint(
          sword.userData
            .lastTargetPosition
        );

      if (target) {
        assignAutonomousSwordTarget(
          sword,
          target
        );
      }
    }

    /*
     * Nếu chưa có mục tiêu thay thế,
     * kiếm đứng yên trong không gian.
     */
    if (!target) {
      continue;
    }

    target.getWorldPosition(
      tempTarget
    );

    sword.userData
      .lastTargetPosition
      .copy(tempTarget);

    autoSwordDirection
      .copy(tempTarget)
      .sub(sword.position);

    const distanceToTarget =
      autoSwordDirection.length();

    if (
      distanceToTarget >
      0.0001
    ) {
      autoSwordDirection
        .divideScalar(
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
      hitDistance +
        travelDistance
    ) {
      const meteorIndex =
        meteors.indexOf(
          target
        );

      const hitPosition =
        tempTarget.clone();

      releaseAutonomousSwordTarget(
        sword
      );

      if (
        meteorIndex !== -1
      ) {
        /*
         * Mỗi kiếm chỉ được chém
         * đúng một meteor trong đợt.
         */
        sword.userData.hasStruck =
          true;

        registerHit(
          hitPosition,
          CONFIG
            .autoSwordBurstColor
        );

        removeMeteor(
          meteorIndex
        );
      }

      continue;
    }

    sword.position
      .addScaledVector(
        autoSwordDirection,
        travelDistance
      );
  }

  const currentWaveSwords =
    autonomousSwords.filter(
      (sword) => {
        return sword.userData
          .isWaveMember;
      }
    );

  if (
    currentWaveSwords.length >
      0 &&
    currentWaveSwords.every(
      (sword) => {
        return sword.userData
          .hasStruck;
      }
    )
  ) {
    beginAutonomousSwordGroupReturn();
  }
}

function updateAutonomousSwordGroupReturn(
  delta
) {
  const waveSwords =
    autonomousSwords.filter(
      (sword) => {
        return sword.userData
          .isWaveMember;
      }
    );

  if (
    waveSwords.length === 0
  ) {
    finishAutonomousSwordGroupReturn();

    return;
  }

  for (
    const sword
    of waveSwords
  ) {
    getAutonomousSwordOrbitPosition(
      sword.userData.slotIndex,

      Math.max(
        1,
        autonomousSwords.length
      ),

      autoSwordOrbitPosition
    );

    if (
      sword.userData.hasReturned
    ) {
      sword.position.copy(
        autoSwordOrbitPosition
      );

      continue;
    }

    autoSwordDirection
      .copy(
        autoSwordOrbitPosition
      )
      .sub(sword.position);

    const distanceToOrbit =
      autoSwordDirection.length();

    const travelDistance =
      CONFIG
        .autoSwordReturnSpeed *
      delta;

    if (
      distanceToOrbit <=
      CONFIG
        .autoSwordReturnArrivalDistance +
        travelDistance
    ) {
      sword.position.copy(
        autoSwordOrbitPosition
      );

      sword.userData.hasReturned =
        true;

      player.getWorldPosition(
        playerWorldPosition
      );

      autoSwordDirection
        .copy(sword.position)
        .sub(
          playerWorldPosition
        );

      autoSwordDirection.y = 0;

      if (
        autoSwordDirection.lengthSq() >
        0.000001
      ) {
        autoSwordDirection
          .normalize();

        sword.quaternion
          .setFromUnitVectors(
            PROJECTILE_FORWARD_AXIS,
            autoSwordDirection
          );
      }

      continue;
    }

    if (
      distanceToOrbit >
      0.0001
    ) {
      autoSwordDirection
        .divideScalar(
          distanceToOrbit
        );

      sword.quaternion
        .setFromUnitVectors(
          PROJECTILE_FORWARD_AXIS,
          autoSwordDirection
        );
    }

    sword.position
      .addScaledVector(
        autoSwordDirection,
        travelDistance
      );
  }

  const arrivalDistanceSquared =
    CONFIG
      .autoSwordReturnArrivalDistance **
    2;

  /*
   * Kiếm được thêm giữa đợt không
   * tham chiến, nhưng vẫn phải ở đúng
   * quỹ đạo trước khi cooldown bắt đầu.
   */
  const allSwordsAreOnOrbit =
    autonomousSwords.every(
      (sword) => {
        getAutonomousSwordOrbitPosition(
          sword.userData.slotIndex,

          Math.max(
            1,
            autonomousSwords.length
          ),

          autoSwordOrbitPosition
        );

        return (
          sword.position
            .distanceToSquared(
              autoSwordOrbitPosition
            ) <=
          arrivalDistanceSquared
        );
      }
    );

  if (
    waveSwords.every(
      (sword) => {
        return sword.userData
          .hasReturned;
      }
    ) &&
    allSwordsAreOnOrbit
  ) {
    finishAutonomousSwordGroupReturn();
  }
}

function updateAutonomousSwords(
  delta
) {
  if (
    autonomousSwords.length === 0
  ) {
    return;
  }

  /*
   * Khi đang trở về, khóa góc quỹ đạo
   * để điểm đích không tiếp tục chạy.
   */
  if (
    autoSwordGroupPhase !==
    'returning'
  ) {
    autoSwordOrbitAngle +=
      CONFIG.autoSwordOrbitSpeed *
      delta;

    autoSwordOrbitAngle %=
      Math.PI * 2;
  }

  if (
    autoSwordGroupPhase ===
    'cooldown'
  ) {
    for (
      const sword
      of autonomousSwords
    ) {
      updateAutonomousSwordOrbit(
        sword,
        delta
      );
    }

    autoSwordWaveCooldownRemaining =
      Math.max(
        0,

        autoSwordWaveCooldownRemaining -
          delta
      );

    /*
     * Hết 5 giây nhưng chưa đủ meteor:
     * nhóm tiếp tục quay và chờ.
     */
    if (
      autoSwordWaveCooldownRemaining <=
      0
    ) {
      startAutonomousSwordWave();
    }

    return;
  }

  if (
    autoSwordGroupPhase ===
    'attacking'
  ) {
    /*
     * Kiếm mới được thêm giữa đợt
     * chỉ quay và chờ đợt tiếp theo.
     */
    for (
      const sword
      of autonomousSwords
    ) {
      if (
        !sword.userData
          .isWaveMember
      ) {
        updateAutonomousSwordOrbit(
          sword,
          delta
        );
      }
    }

    updateAutonomousSwordAttackers(
      delta
    );

    return;
  }

  if (
    autoSwordGroupPhase ===
    'returning'
  ) {
    for (
      const sword
      of autonomousSwords
    ) {
      if (
        !sword.userData
          .isWaveMember
      ) {
        updateAutonomousSwordOrbit(
          sword,
          delta
        );
      }
    }

    updateAutonomousSwordGroupReturn(
      delta
    );

    return;
  }

  finishAutonomousSwordGroupReturn();
}

function updatePausedAutonomousSwords(
  delta
) {
  if (
    autonomousSwords.length === 0
  ) {
    return;
  }

  /*
   * isWaveMember = true:
   * kiếm đang tham gia đợt tấn công,
   * đang chờ kiếm khác hoặc đang trở về.
   *
   * isWaveMember = false:
   * kiếm hiện đang quay quanh nhân vật.
   */
  const orbitingSwords =
    autonomousSwords.filter(
      (sword) => {
        return !sword.userData
          .isWaveMember;
      }
    );

  /*
   * Không có kiếm nào quanh nhân vật:
   * giữ nguyên toàn bộ hệ thống.
   */
  if (
    orbitingSwords.length === 0
  ) {
    return;
  }

  autoSwordOrbitAngle +=
    CONFIG.autoSwordOrbitSpeed *
    delta;

  autoSwordOrbitAngle %=
    Math.PI * 2;

  /*
   * Chỉ cập nhật những kiếm vẫn đang
   * nằm trên quỹ đạo quanh nhân vật.
   */
  for (
    const sword
    of orbitingSwords
  ) {
    updateAutonomousSwordOrbit(
      sword,
      delta
    );
  }
}

function updateLevelSwords(level) {
  updateBackSwordFan(level);
  syncAutonomousSwords(level);
}

function advanceLevelProgress() {
  if (
    state.level >=
    CONFIG.maxLevel
  ) {
    return false;
  }

  state.levelHitProgress +=
    1;

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

  state.level =
    Math.min(
      state.level + 1,
      CONFIG.maxLevel
    );

  updateLevelSwords(
    state.level
  );

  state.shake =
    Math.max(
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
  const now =
    performance.now();

  state.combo =
    now - state.lastHitAt <
      2200
      ? Math.min(
          state.combo + 1,
          9
        )
      : 1;

  state.lastHitAt = now;

  const gained =
    10 * state.combo;

  state.score += gained;

  const leveledUp =
    advanceLevelProgress();

  state.shake =
    Math.max(
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

function damagePlayer(
  position
) {
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

  if (
    state.shield <= 0
  ) {
    endGame();
  }
}

function createBurst(
  position,
  color
) {
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
        THREE.MathUtils
          .randFloatSpread(7),

        THREE.MathUtils
          .randFloatSpread(7),

        THREE.MathUtils
          .randFloatSpread(7)
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

  points.position.copy(
    position
  );

  points.userData.velocities =
    velocities;

  points.userData.life =
    0.56;

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
      burst.geometry
        .getAttribute(
          'position'
        );

    burst.userData.life -=
      delta;

    for (
      let index = 0;
      index <
      burst.userData
        .velocities.length;
      index += 1
    ) {
      const velocity =
        burst.userData
          .velocities[index];

      const offset =
        index * 3;

      positionAttribute.array[
        offset
      ] +=
        velocity.x * delta;

      positionAttribute.array[
        offset + 1
      ] +=
        velocity.y * delta;

      positionAttribute.array[
        offset + 2
      ] +=
        velocity.z * delta;

      velocity.multiplyScalar(
        0.94
      );
    }

    positionAttribute.needsUpdate =
      true;

    burst.material.opacity =
      Math.max(
        0,
        burst.userData.life /
          0.56
      );

    if (
      burst.userData.life <= 0
    ) {
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

  if (
    state.overlayMode ===
    'pause'
  ) {
    state.running = true;

    state.overlayMode =
      'playing';

    /*
     * Reset khi bấm Tiếp tục.
     */
    resetCompactAimToDefault();

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

  state.shield =
    CONFIG.startingShield;

  state.level = 1;
  state.levelPoints = 0;
  state.levelHitProgress = 0;
  state.spawnTimer = 0.55;
  state.lastShotAt = 0;
  state.lastHitAt = 0;
  state.running = true;

  state.overlayMode =
    'playing';

  /*
   * Reset khi bấm Bắt đầu hoặc Chơi lại.
   */
  resetCompactAimToDefault();

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

  state.overlayMode =
    'pause';

  /*
   * Dừng bắn và giải phóng pointer hiện tại.
   * Người chơi vẫn có thể chạm lại để ngắm.
   */
  stopAllAimPointerInput();

  gameTitle.innerHTML =
    'Tạm dừng<br><em>giữ vững đội hình.</em>';

  introCopy.textContent =
    'Trận đấu đang được giữ nguyên. Tiếp tục khi bạn đã sẵn sàng.';

  startLabel.textContent =
    'Tiếp tục';

  startScreen.classList.remove(
    'is-hidden'
  );

  /*
  * Ẩn tâm ngắm khi Pause.
  */
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

  state.overlayMode =
    'gameover';

  stopAllAimPointerInput();

  clearDynamicObjects();

  if (
    state.score >
    state.bestScore
  ) {
    state.bestScore =
      state.score;

    writeBestScore(
      state.bestScore
    );

    bestScoreText.textContent =
      formatScore(
        state.bestScore
      );
  }

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

  while (
    projectiles.length
  ) {
    scene.remove(
      projectiles.pop()
    );
  }

  while (
    meteors.length
  ) {
    scene.remove(
      meteors.pop()
    );
  }

  while (
    bursts.length
  ) {
    const burst =
      bursts.pop();

    scene.remove(burst);

    burst.geometry.dispose();
    burst.material.dispose();
  }
}

function updateHud() {
  scoreText.textContent =
    formatScore(
      state.score
    );

  shield.setAttribute(
    'aria-label',

    `${state.shield} điểm lá chắn`
  );

  [...shield.children]
    .forEach(
      (
        bar,
        index
      ) => {
        bar.classList.toggle(
          'is-empty',

          index >=
            state.shield
        );
      }
    );

  levelText.textContent =
    state.level;

  const displayedLevelPoints =
    state.level >=
    CONFIG.maxLevel
      ? CONFIG.pointsPerLevel
      : state.levelPoints;

  const levelLabel =
    state.level >=
    CONFIG.maxLevel
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

  [...levelProgress.children]
    .forEach(
      (
        bar,
        index
      ) => {
        bar.classList.toggle(
          'is-filled',

          index <
            displayedLevelPoints
        );
      }
    );
}

function showHitLabel(
  message
) {
  hitLabel.textContent =
    message;

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

function setStatus(
  message,
  variant
) {
  statusText.textContent =
    message;

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
  return String(value)
    .padStart(
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

function writeBestScore(
  value
) {
  try {
    localStorage.setItem(
      'sword-meteor-best',
      String(value)
    );
  } catch {
    // localStorage bị chặn.
  }
}

startButton.addEventListener(
  'click',
  startOrResumeGame
);

pauseButton.addEventListener(
  'click',
  (event) => {
    /*
     * Ngăn thao tác chạm truyền xuống
     * canvas và kích hoạt bắn kiếm.
     */
    event.preventDefault();
    event.stopPropagation();

    pauseGame();
  }
);

function isPointInsideHud(
  clientX,
  clientY
) {
  const bounds =
    hud.getBoundingClientRect();

  return (
    clientX >= bounds.left &&
    clientX <= bounds.right &&
    clientY >= bounds.top &&
    clientY <= bounds.bottom
  );
}

function stopContinuousFireForPointer(
  pointerId
) {
  /*
   * Chỉ dừng đúng pointer đang giữ quyền
   * điều khiển tâm ngắm.
   */
  if (
    pointerId !==
    continuousFirePointerId
  ) {
    return;
  }

  continuousFireActive =
    false;

  continuousFirePointerId =
    null;

  relativeTouchAimActive =
    false;

  const captureElement =
    aimPointerCaptureElement;

  aimPointerCaptureElement =
    null;

  /*
   * Pointer có thể được giữ bởi canvas
   * hoặc màn hình Intro/Pause.
   */
  if (
    captureElement
      ?.hasPointerCapture?.(
        pointerId
      )
  ) {
    captureElement
      .releasePointerCapture(
        pointerId
      );
  }
}

function stopAllAimPointerInput() {
  if (
    continuousFirePointerId !==
    null
  ) {
    stopContinuousFireForPointer(
      continuousFirePointerId
    );

    return;
  }

  continuousFireActive = false;
  relativeTouchAimActive = false;
  aimPointerCaptureElement = null;
}

/*
 * Chặn popup nhấn giữ mặc định của Safari.
 *
 * Không chặn pointerdown hoặc click nên nút Pause,
 * nút Bắt đầu và điều khiển cảm ứng vẫn hoạt động.
 */
function preventNativeGameMenu(
  event
) {
  event.preventDefault();
}

for (
  const eventName of [
    'contextmenu',
    'selectstart',
    'dragstart'
  ]
) {
  gameShell.addEventListener(
    eventName,
    preventNativeGameMenu,
    {
      capture: true,
      passive: false
    }
  );
}

function usesRelativeTouchAim(
  pointerType
) {
  const isTouchInput =
    pointerType === 'touch' ||
    pointerType === 'pen';

  const longestViewportEdge =
    Math.max(
      innerWidth,
      innerHeight
    );

  return (
    isTouchInput &&
    longestViewportEdge <=
      CONFIG.relativeTouchAimMaxEdge
  );
}

hud.addEventListener(
  'pointerdown',

  (event) => {
    pointerIsOverHud =
      true;

    reticle.classList.remove(
      'is-visible'
    );

    stopContinuousFireForPointer(
      event.pointerId
    );

    /*
     * Nút Pause vẫn được phép nhận click.
     */
    if (
      !event.target.closest(
        '#pause-button'
      )
    ) {
      event.preventDefault();
    }
  },

  {
    passive: false
  }
);

function updateAim(
  clientX,
  clientY,
  pointerType = 'mouse'
) {
  /*
   * Giữ toàn bộ tâm ngắm trong màn hình.
   */
  const horizontalMargin =
    Math.min(
      CONFIG.aimScreenMargin,
      innerWidth * 0.5
    );

  const verticalMargin =
    Math.min(
      CONFIG.aimScreenMargin,
      innerHeight * 0.5
    );

  aimScreen.set(
    THREE.MathUtils.clamp(
      clientX,
      horizontalMargin,
      innerWidth -
        horizontalMargin
    ),

    THREE.MathUtils.clamp(
      clientY,
      verticalMargin,
      innerHeight -
        verticalMargin
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

  /*
  * Chỉ hiển thị tâm ngắm khi game đang chạy.
  */
  reticle.classList.toggle(
    'is-visible',
    state.running
  );

  updateAimRigFromScreen(
    aimScreen.x,
    aimScreen.y
  );

  aimedMeteor =
    findMeteorAtScreen(
      aimScreen.x,
      aimScreen.y
    );
}

function resetCompactAimToDefault() {
  /*
   * Desktop giữ nguyên vị trí tâm ngắm.
   */
  if (!isCompactScreen) {
    return;
  }

  const pointerType =
    reticle.classList.contains(
      'is-touch'
    )
      ? 'touch'
      : 'mouse';

  /*
   * Đưa tâm ngắm về giữa màn hình,
   * giống vị trí khi trang vừa tải.
   */
  updateAim(
    innerWidth / 2,
    innerHeight / 2,
    pointerType
  );
}

function updateRelativeTouchAim(
  event
) {
  /*
   * Khoảng dịch chuyển của ngón tay kể từ
   * sự kiện pointermove trước đó.
   */
  const deltaX =
    event.clientX -
    relativeTouchLastX;

  const deltaY =
    event.clientY -
    relativeTouchLastY;

  relativeTouchLastX =
    event.clientX;

  relativeTouchLastY =
    event.clientY;

  /*
   * Dịch chuyển từ vị trí hiện tại của tâm ngắm,
   * không đưa tâm ngắm thẳng tới vị trí ngón tay.
   */
  updateAim(
    aimScreen.x +
      deltaX *
        CONFIG.relativeTouchAimSensitivity,

    aimScreen.y +
      deltaY *
        CONFIG.relativeTouchAimSensitivity,

    event.pointerType
  );
}

window.addEventListener(
  'pointermove',

  (event) => {
    pointerIsOverHud =
      isPointInsideHud(
        event.clientX,
        event.clientY
      );

    /*
     * Khi ngón tay hoặc con trỏ đi vào HUD:
     * - Không đổi hướng ngắm.
     * - Ẩn tâm ngắm.
     * - Dừng bắn liên hoàn.
     */
    if (pointerIsOverHud) {
      reticle.classList.remove(
        'is-visible'
      );

      stopContinuousFireForPointer(
        event.pointerId
      );

      return;
    }

    /*
     * iPad/mobile:
     * độ lệch của ngón tay điều khiển tâm ngắm.
     */
    if (
      relativeTouchAimActive &&
      event.pointerId ===
        continuousFirePointerId &&
      usesRelativeTouchAim(
        event.pointerType
      )
    ) {
      updateRelativeTouchAim(
        event
      );

      return;
    }

    /*
     * Không cho sự kiện cảm ứng không hoạt động
     * đưa tâm ngắm tới tọa độ tuyệt đối.
     */
    if (
      usesRelativeTouchAim(
        event.pointerType
      )
    ) {
      return;
    }

    /*
     * Chuột trên desktop vẫn ngắm trực tiếp
     * theo vị trí con trỏ.
     */
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

function beginAimPointerInput(
  event
) {
  /*
   * Chỉ nhận chuột trái, cảm ứng
   * hoặc bút cảm ứng.
   */
  if (
    event.button !== 0 &&
    event.pointerType !== 'touch'
  ) {
    return;
  }

  /*
   * Không biến thao tác trên nút hoặc HUD
   * thành thao tác ngắm/bắn.
   */
  if (
    event.target
      ?.closest?.(
        '#start, #pause-button, .hud'
      )
  ) {
    return;
  }

  /*
   * Trường hợp màn hình Pause phủ trên HUD,
   * vẫn kiểm tra bằng tọa độ thực.
   */
  if (
    isPointInsideHud(
      event.clientX,
      event.clientY
    )
  ) {
    pointerIsOverHud =
      true;

    reticle.classList.remove(
      'is-visible'
    );

    return;
  }

  const isContinuousInput =
    event.pointerType === 'touch' ||
    event.pointerType === 'pen';

  /*
   * Mỗi lần chỉ một ngón tay hoặc
   * một bút được điều khiển tâm ngắm.
   */
  if (
    isContinuousInput &&
    continuousFirePointerId !==
      null &&
    continuousFirePointerId !==
      event.pointerId
  ) {
    return;
  }

  pointerIsOverHud =
    false;

  if (
    usesRelativeTouchAim(
      event.pointerType
    )
  ) {
    /*
     * Điểm chạm đầu chỉ bắt đầu phiên ngắm.
     * Tâm ngắm không nhảy tới vị trí ngón tay.
     */
    relativeTouchAimActive =
      true;

    relativeTouchLastX =
      event.clientX;

    relativeTouchLastY =
      event.clientY;

    updateAim(
      aimScreen.x,
      aimScreen.y,
      event.pointerType
    );
  } else {
    /*
     * Chuột desktop vẫn dùng vị trí tuyệt đối.
     */
    relativeTouchAimActive =
      false;

    updateAim(
      event.clientX,
      event.clientY,
      event.pointerType
    );
  }

  if (isContinuousInput) {
    continuousFirePointerId =
      event.pointerId;

    /*
     * Intro/Pause vẫn giữ pointer để ngắm,
     * nhưng không kích hoạt bắn liên hoàn.
     */
    continuousFireActive =
      state.running;

    aimPointerCaptureElement =
      event.currentTarget;

    aimPointerCaptureElement
      ?.setPointerCapture?.(
        event.pointerId
      );

    event.preventDefault();
  }

  /*
   * Chỉ bắn phát đầu tiên khi đang chơi.
   */
  if (state.running) {
    shootAtAim();
  }
}

/*
 * Điều khiển trong lúc game đang chạy.
 */
canvas.addEventListener(
  'pointerdown',
  beginAimPointerInput,

  {
    passive: false
  }
);

/*
 * Khi Intro hoặc Pause phủ lên canvas,
 * startScreen nhận thao tác ngắm thay canvas.
 */
startScreen.addEventListener(
  'pointerdown',
  beginAimPointerInput,

  {
    passive: false
  }
);

function stopContinuousFire(
  event
) {
  stopContinuousFireForPointer(
    event.pointerId
  );
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
    if (
      event.code === 'Space'
    ) {
      event.preventDefault();
      shootAtAim();
    }

    if (
      event.code === 'Escape'
    ) {
      if (state.running) {
        pauseGame();
      } else if (
        state.overlayMode ===
        'pause'
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
      innerWidth /
      innerHeight;

    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        isCompactScreen ? 1.25 : 2
      )
    );

    renderer.setSize(
      innerWidth,
      innerHeight
    );

    updateResponsivePlayerLayout();

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

function updateResponsivePlayerLayout() {
  const compactScreen =
    innerWidth <= 900;

  const playerScale =
    compactScreen
      ? 0.78
      : 1;

  player.scale.setScalar(
    playerScale
  );

  player.position.set(
    0,

    compactScreen
      ? 1.2
      : 1,

    2.5
  );
}

function updateBackground(
  delta,
  elapsed
) {
  const positions =
    stars.geometry
      .getAttribute(
        'position'
      );

  for (
    let index = 2;
    index <
    positions.array.length;
    index += 3
  ) {
    positions.array[index] +=
      delta * 0.62;

    if (
      positions.array[index] >
      6
    ) {
      positions.array[index] =
        -85;
    }
  }

  positions.needsUpdate =
    true;

  horizon.rotation.z =
    Math.sin(
      elapsed * 0.12
    ) * 0.025;
}

function updateCamera(delta) {
  state.shake =
    Math.max(
      0,
      state.shake -
        delta * 1.45
    );

  const shake =
    state.shake;

  camera.position.set(
    cameraBase.x +
      THREE.MathUtils
        .randFloatSpread(
          shake
        ),

    cameraBase.y +
      THREE.MathUtils
        .randFloatSpread(
          shake
        ),

    cameraBase.z +
      THREE.MathUtils
        .randFloatSpread(
          shake * 0.55
        )
  );

  camera.lookAt(
    cameraLookAt
  );
}

function animate(timestamp) {
  requestAnimationFrame(
    animate
  );

  timer.update(timestamp);

  const delta =
    Math.min(
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
    if (
      continuousFireActive
    ) {
      shootAtAim();
    }

    state.spawnTimer +=
      delta;

    const spawnInterval =
      Math.max(
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

    updateAutonomousSwords(
      delta
    );

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
  } else if (
    state.overlayMode ===
    'pause'
  ) {
    updatePausedAutonomousSwords(
      delta
    );
  }

  renderer.render(
    scene,
    camera
  );
}

updateHud();

requestAnimationFrame(
  animate
);

loadAssets().catch(
  (error) => {
    console.error(
      'Không thể khởi tạo model, dùng hình học dự phòng.',
      error
    );

    swordAsset = null;

    projectileSwordTemplate =
      null;

    setupPlayer(null);

    state.assetsReady = true;

    startButton.disabled =
      false;

    startLabel.textContent =
      'Bắt đầu nhiệm vụ';

    setStatus(
      'Sẵn sàng • hình học dựng sẵn',
      'ready'
    );
  }
);