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

startScreen.style.touchAction = 'none';

const CONFIG = Object.freeze({
  // Đạn kiếm Level 1: chậm và bắn thưa hơn.
  projectileLevelOneSpeed: 38,
  projectileLevelOneCooldownMs: 240,

  // Đạn kiếm Level 2: nhanh, bắn dày và có sét xanh.
  projectileLevelTwoSpeed: 66,
  projectileLevelTwoCooldownMs: 105,
  projectileLevelTwoColor: 0x218cff,
  projectileLevelTwoBurstColor: 0x2d8fff,

  projectileRange: 105,
  projectileHomingStrength: 8.5,
  projectileHomingDelay: 0.11,
  projectileTrailDelay: 0.05,
  projectileFanSpacingDeg: 5.2,
  secondaryTargetRadius: 24,
  backSwordFanSpacingDeg: 15,

  // Số kiếm bắn thủ công tối đa.
  maxManualSwords: 5,

  // Số kiếm tự động tối đa từ Level 11.
  maxAutonomousSwords: 8,

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

  // Sau khi kiếm lửa quay về,
  // nhóm kiếm tự động chờ 1.5 giây.
  autoSwordAfterFireDelay: 1.5,

  // Sau mỗi lần Ultimate kết thúc,
  // nhóm kiếm tự động phải hoàn thành
  // đúng hai lượt trước khi nạp vòng mới.
  level20AutoWavesAfterUltimate: 3,

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

  // Kiếm lửa xuất hiện từ Level 11.
  fireSwordCooldown: 2,
  fireSwordSpeed: 40,
  fireSwordReturnSpeed: 40,
  fireSwordHitRadius: 0.42,

  // Kích thước khi đứng cạnh nhân vật.
  fireSwordIdleScale: 0.5,

  // Kích thước sau khi bắt đầu tấn công.
  fireSwordAttackScale: 3,

  // Sau 0,05 giây mới bắt đầu phóng lớn.
  fireSwordEnlargeDelay: 0.05,

  // Tốc độ chuyển đổi kích thước.
  fireSwordScaleFollowStrength: 22,

  // Vị trí kiếm lửa khi đứng cạnh nhân vật.
  fireSwordIdleY: 0.1,
  fireSwordIdleZ: 0.3,

  // Màu sắc và phát sáng.
  fireSwordColor: 0xff7a16,
  fireSwordEmissive: 0xff3200,
  fireSwordEmissiveIntensity: 10,
  fireSwordBurstColor: 0xff6a12,

  // Bán kính cháy lan
  fireSwordBurnRadius: 20,

  // Thời gian cháy cơ bản
  fireSwordBurnDuration: 1.05,

  // Giới hạn tổng số meteor đang cháy.
  // Mobile dùng giới hạn thấp hơn.
  fireSwordMaxBurnTargets:
    isCompactScreen
      ? 6
      : 12,

  // Làm các meteor nổ lệch thời điểm,
  // tránh tất cả phát nổ cùng một frame.
  fireSwordBurnStagger: 0.06,

  // Mỗi lượt kiếm lửa tạo thêm
  // một vòng kiếm Ultimate.
  ultimateRingChargeStep: 1,

  // Thời gian chờ sau khi đủ 5 vòng
  // trước khi bắt đầu Ultimate.
  ultimateChargeDelay: 0.65,

  // Vạn Kiếm Quy Tông
  ultimateSwordCount: isCompactScreen ? 200 : 300,
  ultimateSwordRingCount: 5,
  ultimateSwordSpeed: 48,
  ultimateSwordHitRadius: 0.34,

  // Mỗi lượt phóng một nhóm 3 kiếm.
  ultimateSwordBatchSize: 3,

  // Khoảng thời gian giữa hai nhóm.
  ultimateSwordBatchInterval: 0.1,

  // Tổng quãng đường mỗi kiếm bay.
  ultimateSwordTravelDistance: 105,

  // Khoảng cách ngang từ kiếm giữa
  // tới hai kiếm bên cánh.
  ultimateSwordFormationHalfWidth: 0.3,

  // Kiếm giữa dẫn trước hai kiếm còn lại.
  ultimateSwordCenterLeadDistance: 0.62,

  // Thời gian chuyển từ vị trí vòng
  // sang đội hình tam giác.
  ultimateSwordFormationBlendDuration: 0.28,

  ultimateSwordBurstColor: 0x71efff,

  /*
  * Vị trí tâm vòng kiếm so với nhân vật.
  */
  ultimateSwordCenterOffsetX: 0,
  ultimateSwordCenterOffsetY: isCompactScreen ? 0.7 : 0.9,
  ultimateSwordCenterOffsetZ: isCompactScreen ? 1.5 : 2.5,

  /*
  * Bán kính vòng trong cùng và khoảng
  * cách bán kính giữa các vòng.
  */
  ultimateSwordInnerRadius: isCompactScreen ? 0.8 : 1,
  ultimateSwordRingSpacing: isCompactScreen ? 0.2 : 0.25,

  /*
  * Tỷ lệ chiều cao của vòng.
  * 1 tạo vòng tròn.
  * 0.58 tạo vòng dẹt theo Y.
  */
  ultimateSwordVerticalRatio: 0.8,

  /*
  * Khoảng cách Z giữa các vòng.
  */
  ultimateSwordDepthSpacing: 0.05,

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

  // Khoảng cách spawn ban đầu.
  meteorSpawnEvery: 1.05,

  // Khoảng cách spawn nhỏ nhất.
  meteorMinSpawnInterval: 0.28,

  // Mỗi giây giảm 0.009 giây chờ spawn.
  meteorSpawnAcceleration: 0.009,

  // Mỗi giây tăng 0.018 lần tốc độ meteor.
  meteorSpeedAcceleration: 0.006,

  // Giới hạn tốc độ theo thời gian.
  meteorMaxTimeSpeedMultiplier: 3.2,

  // Giới hạn tổng sau khi cộng độ khó theo điểm.
  meteorMaxSpeedMultiplier: 3.6,

  startingShield: 3,
  hitsPerLevelPoint: 5,
  pointsPerLevel: 3,
  maxLevel: 20,

  aimPlaneZ: -48,

  // Kích thước màn hình tối đa dùng điều khiển vuốt tương đối.
  relativeTouchAimMaxEdge: 1366,

  // Độ nhạy khi vuốt: 1px ngón tay = 1px tâm ngắm.
  relativeTouchAimSensitivity: 1.7,

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
  playTime: 0,
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
    powerPreference: 'high-performance'
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

const aimScreenBeforePause =
  new THREE.Vector2();

let hasAimScreenBeforePause =
  false;

const projectiles = [];
const meteors = [];
const bursts = [];
const fireExplosions = [];

// Kiếm tự động xuất hiện từ Level 11.
const autonomousSwords = [];

let stars;
let swordAsset = null;
let swordVisualTemplate = null;
let projectileSwordTemplate = null;
let projectileLevelTwoSwordTemplate = null;
let meteorVisualTemplate = null;
let projectileTrailTemplate = null;
let projectileLightningTrailTemplate = null;
let sharedFireParticleTexture = null;
let sharedFireCoreMaterial = null;
let sharedFireOuterMaterial = null;
let sharedFireExplosionGeometry = null;
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
let relativeTouchAimActive = false;
let relativeTouchLastX = 0;
let relativeTouchLastY = 0;
let pointerIsOverHud = false;
let autoSwordOrbitAngle = 0;
let fireSword = null;
let fireSwordPhase = 'idle';
let fireSwordTarget = null;
let fireSwordAttackAge = 0;

let fireSwordCooldownRemaining =
  CONFIG.fireSwordCooldown;
let ultimateRingChargeCount = 0;
/*
 * Giai đoạn đặc biệt sau mỗi lần
 * Vạn Kiếm Quy Tông kết thúc.
 */
let level20PostUltimateSequenceActive =
  false;

/*
 * Số lượt kiếm tự động đã hoàn thành
 * trong giai đoạn đặc biệt.
 */
let level20PostUltimateAutoWaves = 0;
let specialSwordCyclePhase = 'inactive';
let ultimateChargeTimer = 0;
let ultimateSwordField = null;
let ultimateSwordLaunchTimer = 0;
let ultimateSwordLaunchIndex = 0;
let ultimateSwordSpentCount = 0;

const ultimateSwordStates = [];

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

const fireSwordIdleWorldPosition =
  new THREE.Vector3();

const fireSwordDirection =
  new THREE.Vector3();

const ultimateSwordDirection =
  new THREE.Vector3();

/*
 * Tọa độ cố định mà toàn bộ kiếm
 * của năm vòng Ultimate hướng tới
 * trước khi được phóng.
 */
const ULTIMATE_SWORD_PREVIEW_TARGET =
  new THREE.Vector3(
    0,
    27,
    -62
  );

const ultimateSwordStreamCenter =
  new THREE.Vector3();

const ultimateSwordFormationOffset =
  new THREE.Vector3();

const ultimateSwordPreviousPosition =
  new THREE.Vector3();

const ultimateSwordMovement =
  new THREE.Vector3();

const ultimateSwordDummy =
  new THREE.Object3D();

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
        side: THREE.DoubleSide,
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
    character.rotation.y = Math.PI;

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

  torso.position.y = 0.96;
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

  head.position.y = 1.68;
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

function createProjectileSwordVisual(
  tier = 1
) {
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

  if (
    tier === 2 &&
    !projectileLevelTwoSwordTemplate
  ) {
    projectileLevelTwoSwordTemplate =
      projectileSwordTemplate
        .clone(true);

    projectileLevelTwoSwordTemplate
      .traverse((node) => {
        if (
          !node.isMesh ||
          !node.material
        ) {
          return;
        }

        const sourceMaterials =
          Array.isArray(node.material)
            ? node.material
            : [node.material];

        const blueMaterials =
          sourceMaterials.map(
            (sourceMaterial) => {
              const material =
                sourceMaterial.clone();

              if (material.color) {
                material.color.lerp(
                  new THREE.Color(
                    CONFIG
                      .projectileLevelTwoColor
                  ),
                  1
                );
              }

              if (material.emissive) {
                material.emissive.setHex(
                  CONFIG
                    .projectileLevelTwoColor
                );

                material.emissiveIntensity =
                  Math.max(
                    material
                      .emissiveIntensity ??
                    0,
                    4.8
                  );
              }

              material.needsUpdate = true;

              return material;
            }
          );

        node.material =
          Array.isArray(node.material)
            ? blueMaterials
            : blueMaterials[0];
      });
  }

  return (
    tier === 2
      ? projectileLevelTwoSwordTemplate
      : projectileSwordTemplate
  ).clone(true);
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
      blending: THREE.AdditiveBlending,
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
        blending: THREE.AdditiveBlending,
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
      (meteorA,
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

function getProjectileTier(level) {
  return level >= 6 ? 2 : 1;
}

function getManualProjectileCount(
  level
) {
  if (level <= 5) {
    return THREE.MathUtils.clamp(
      level,
      1,
      CONFIG.maxManualSwords
    );
  }

  return THREE.MathUtils.clamp(
    level - 5,
    1,
    CONFIG.maxManualSwords
  );
}

function getProjectileSpeed(tier) {
  return tier === 2
    ? CONFIG.projectileLevelTwoSpeed
    : CONFIG.projectileLevelOneSpeed;
}

function getProjectileCooldownMs(
  tier
) {
  return tier === 2
    ? CONFIG
      .projectileLevelTwoCooldownMs
    : CONFIG
      .projectileLevelOneCooldownMs;
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

  const projectileTier =
    getProjectileTier(state.level);

  if (
    now - state.lastShotAt <
    getProjectileCooldownMs(
      projectileTier
    )
  ) {
    return;
  }

  state.lastShotAt = now;

  const swordCount =
    getManualProjectileCount(
      state.level
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
      projectileTarget,
      projectileTier
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
  target = null,
  tier = 1
) {
  const normalizedDirection =
    direction
      .clone()
      .normalize();

  const projectile =
    new THREE.Group();

  const visual =
    createProjectileSwordVisual(tier);

  const trail =
    createProjectileTrail(tier);

  const speed =
    getProjectileSpeed(tier);

  // Ban đầu chưa hiển thị trail.
  trail.visible = false;

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
        speed
      );

  projectile.userData
    .previousPosition =
    origin.clone();

  projectile.userData
    .distanceTravelled = 0;

  projectile.userData.age = 0;
  projectile.userData.target = target;
  projectile.userData.trail = trail;
  projectile.userData.tier = tier;
  projectile.userData.speed = speed;

  projectile.userData.burstColor =
    tier === 2
      ? CONFIG
        .projectileLevelTwoBurstColor
      : 0x71efff;

  projectiles.push(projectile);
  scene.add(projectile);
}

function createProjectileTrail(
  tier = 1
) {
  if (
    tier === 2 &&
    !projectileLightningTrailTemplate
  ) {
    projectileLightningTrailTemplate =
      new THREE.Group();

    const glow =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.025,
          0.2,
          3.5,
          8,
          1,
          true
        ),
        new THREE.MeshBasicMaterial({
          color:
            CONFIG
              .projectileLevelTwoColor,
          transparent: true,
          opacity: 0.48,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending:
            THREE.AdditiveBlending,
          toneMapped: false
        })
      );

    glow.rotation.x =
      Math.PI / 2;

    glow.position.z = 1.7;

    projectileLightningTrailTemplate
      .add(glow);

    for (
      let boltIndex = 0;
      boltIndex < 3;
      boltIndex += 1
    ) {
      const points = [];
      const segmentCount = 9;

      for (
        let segmentIndex = 0;
        segmentIndex <= segmentCount;
        segmentIndex += 1
      ) {
        const progress =
          segmentIndex /
          segmentCount;

        points.push(
          new THREE.Vector3(
            segmentIndex === 0
              ? 0
              : THREE.MathUtils
                .randFloatSpread(
                  0.34
                ),
            segmentIndex === 0
              ? 0
              : THREE.MathUtils
                .randFloatSpread(
                  0.34
                ),
            progress * 3.7
          )
        );
      }

      const lightning =
        new THREE.Line(
          new THREE.BufferGeometry()
            .setFromPoints(points),
          new THREE.LineBasicMaterial({
            color:
              boltIndex === 0
                ? 0xd8f5ff
                : CONFIG
                  .projectileLevelTwoColor,
            transparent: true,
            opacity:
              boltIndex === 0
                ? 0.95
                : 0.68,
            depthWrite: false,
            blending:
              THREE.AdditiveBlending,
            toneMapped: false
          })
        );

      lightning.rotation.z =
        boltIndex *
        (Math.PI * 2 / 3);

      projectileLightningTrailTemplate
        .add(lightning);
    }
  }

  if (
    tier === 1 &&
    !projectileTrailTemplate
  ) {
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

  return (
    tier === 2
      ? projectileLightningTrailTemplate
      : projectileTrailTemplate
  ).clone(true);
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

    if (
      data.trail &&
      !data.trail.visible &&
      data.age >= CONFIG.projectileTrailDelay
    ) {
      data.trail.visible = true;
    }

    if (
      data.tier === 2 &&
      data.trail.visible
    ) {
      data.trail.rotation.z +=
        delta * 11;

      const lightningPulse =
        1 +
        Math.sin(
          data.age * 90
        ) * 0.09;

      data.trail.scale.setScalar(
        lightningPulse
      );
    }

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
          data.speed
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
      data.speed *
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
          meteor.position,
          data.burstColor
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

function createFireExplosion(position) {
  createBurst(
    position,
    0xff4b0b
  );

  createBurst(
    position,
    0xffc928
  );

  if (!sharedFireExplosionGeometry) {
    sharedFireExplosionGeometry =
      new THREE.RingGeometry(
        0.24,
        0.56,
        32
      );
  }

  const explosion =
    new THREE.Group();

  const ringMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xff6a12,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      toneMapped: false
    });

  const ring =
    new THREE.Mesh(
      sharedFireExplosionGeometry,
      ringMaterial
    );

  const light =
    new THREE.PointLight(
      0xff6817,
      18,
      12,
      2
    );

  explosion.position.copy(position);
  explosion.add(ring, light);

  explosion.userData.life = 0.48;
  explosion.userData.maxLife = 0.48;
  explosion.userData.ring = ring;
  explosion.userData.light = light;

  fireExplosions.push(explosion);
  scene.add(explosion);
}

function updateFireExplosions(delta) {
  for (
    let explosionIndex =
      fireExplosions.length - 1;
    explosionIndex >= 0;
    explosionIndex -= 1
  ) {
    const explosion =
      fireExplosions[
        explosionIndex
      ];

    explosion.userData.life -=
      delta;

    const progress =
      1 -
      Math.max(
        0,
        explosion.userData.life
      ) /
      explosion.userData.maxLife;

    const scale =
      0.7 + progress * 6.2;

    explosion.userData.ring
      .scale.setScalar(scale);

    explosion.userData.ring
      .material.opacity =
      Math.max(
        0,
        (1 - progress) * 0.9
      );

    explosion.userData
      .light.intensity =
      Math.max(
        0,
        (1 - progress) * 18
      );

    if (
      explosion.userData.life <= 0
    ) {
      fireExplosions.splice(
        explosionIndex,
        1
      );

      scene.remove(explosion);

      explosion.userData.ring
        .material.dispose();
    }
  }
}

function igniteNearbyMeteors(
  impactPosition,
  primaryMeteor
) {
  const burnRadiusSquared =
    CONFIG.fireSwordBurnRadius ** 2;

  /*
   * Đếm những meteor đang cháy để giới
   * hạn tổng số hiệu ứng đang hoạt động.
   */
  const activeBurnCount =
    meteors.reduce(
      (
        currentCount,
        meteor
      ) => {
        if (
          meteor !== primaryMeteor &&
          meteor.parent &&
          meteor.userData.burnTime > 0
        ) {
          return currentCount + 1;
        }

        return currentCount;
      },
      0
    );

  const availableBurnSlots =
    Math.max(
      0,
      CONFIG.fireSwordMaxBurnTargets -
        activeBurnCount
    );

  if (availableBurnSlots === 0) {
    return;
  }

  /*
   * Chỉ chọn meteor chưa cháy,
   * nằm trong bán kính và gần điểm
   * va chạm nhất.
   */
  const burnTargets =
    meteors
      .filter((meteor) => {
        return (
          meteor !== primaryMeteor &&
          meteor.parent &&
          !(meteor.userData.burnTime > 0)
        );
      })
      .map((meteor) => {
        return {
          meteor,

          distanceSquared:
            meteor.position
              .distanceToSquared(
                impactPosition
              )
        };
      })
      .filter((entry) => {
        return (
          entry.distanceSquared <=
          burnRadiusSquared
        );
      })
      .sort(
        (
          entryA,
          entryB
        ) => {
          return (
            entryA.distanceSquared -
            entryB.distanceSquared
          );
        }
      )
      .slice(
        0,
        availableBurnSlots
      );

  burnTargets.forEach(
    (
      entry,
      burnIndex
    ) => {
      const meteor =
        entry.meteor;

      /*
       * Các meteor nổ lệch nhau 0.06
       * giây để giảm tải một frame.
       */
      meteor.userData.burnTime =
        CONFIG.fireSwordBurnDuration +
        burnIndex *
          CONFIG.fireSwordBurnStagger;

      meteor.userData
        .fireExplosionCreated =
        false;

      if (
        !meteor.userData.fireEffect
      ) {
        const fireEffect =
          createMeteorFireEffect();

        meteor.userData.fireEffect =
          fireEffect;

        meteor.add(fireEffect);
      }
    }
  );
}

function updateBurningMeteor(
  meteor,
  delta
) {
  if (
    !meteor.userData.fireEffect ||
    !(meteor.userData.burnTime > 0)
  ) {
    return false;
  }

  meteor.userData.burnTime -=
    delta;

  const burnProgress =
    1 -
    Math.max(
      0,
      meteor.userData.burnTime
    ) /
    CONFIG.fireSwordBurnDuration;

  updateFireEffect(
    meteor.userData.fireEffect,
    delta,
    0.9 + burnProgress * 0.45
  );

  meteor.userData.fireEffect
    .rotation.y +=
    delta * 3.2;

  return (
    meteor.userData.burnTime <= 0
  );
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

  const timeSpeedMultiplier =
    Math.min(
      1 +
      state.playTime *
      CONFIG.meteorSpeedAcceleration,
      CONFIG.meteorMaxTimeSpeedMultiplier
    );

  const scoreSpeedMultiplier =
    1 +
    Math.min(
      state.score / 20000,
      0.35
    );

  const meteorSpeedMultiplier =
    Math.min(
      timeSpeedMultiplier *
      scoreSpeedMultiplier,
      CONFIG.meteorMaxSpeedMultiplier
    );

  meteor.userData.horizontalSpeed *=
    meteorSpeedMultiplier;

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
      updateBurningMeteor(
        meteor,
        delta
      )
    ) {
      const burnPosition =
        meteor.position.clone();

      meteor.userData
        .fireExplosionCreated = true;

      registerHit(
        burnPosition,
        CONFIG.fireSwordBurstColor
      );

      createFireExplosion(
        burnPosition
      );

      removeMeteor(index);
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

  if (
    meteor.userData.fireEffect &&
    !meteor.userData
      .fireExplosionCreated
  ) {
    createFireExplosion(
      meteor.position
    );

    meteor.userData
      .fireExplosionCreated = true;
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

  if (
    meteor.userData
      .specialSwordOwner ===
    fireSword
  ) {
    fireSwordTarget = null;
  }

  meteor.userData
    .specialSwordOwner = null;

  const ultimateSwordOwner =
    meteor.userData
      .ultimateSwordOwner;

  if (
    ultimateSwordOwner?.target ===
    meteor
  ) {
    ultimateSwordOwner.target = null;
  }

  meteor.userData
    .ultimateSwordOwner = null;

  if (aimedMeteor === meteor) {
    aimedMeteor = null;
  }

  /*
  * Geometry hạt lửa được tạo riêng cho
  * từng meteor nên phải dispose trước
  * khi xóa meteor khỏi scene.
  */
  disposeFireEffectGeometry(
    meteor.userData.fireEffect
  );

  meteor.userData.fireEffect = null;

  scene.remove(meteor);
}

function getBackSwordCount(level) {
  if (level < 6) {
    return 0;
  }

  if (level <= 10) {
    return level - 5;
  }

  // Level 11–20 dùng một kiếm đỏ riêng.
  return 0;
}

function getAutonomousSwordCount(
  level
) {
  return THREE.MathUtils.clamp(
    level - 11,
    0,
    CONFIG.maxAutonomousSwords
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

function ensureSharedFireAssets() {
  if (!sharedFireParticleTexture) {
    const textureCanvas =
      document.createElement('canvas');

    textureCanvas.width = 64;
    textureCanvas.height = 64;

    const context =
      textureCanvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Không thể tạo Canvas 2D cho hiệu ứng lửa.'
      );
    }

    const gradient =
      context.createRadialGradient(
        32,
        36,
        2,
        32,
        32,
        30
      );

    gradient.addColorStop(
      0,
      'rgba(255,255,255,1)'
    );

    gradient.addColorStop(
      0.18,
      'rgba(255,244,162,1)'
    );

    gradient.addColorStop(
      0.46,
      'rgba(255,133,24,0.92)'
    );

    gradient.addColorStop(
      0.76,
      'rgba(255,45,4,0.48)'
    );

    gradient.addColorStop(
      1,
      'rgba(255,18,0,0)'
    );

    context.fillStyle = gradient;

    context.fillRect(
      0,
      0,
      textureCanvas.width,
      textureCanvas.height
    );

    sharedFireParticleTexture =
      new THREE.CanvasTexture(
        textureCanvas
      );

    sharedFireParticleTexture.colorSpace =
      THREE.SRGBColorSpace;

    sharedFireParticleTexture.needsUpdate =
      true;
  }

  if (!sharedFireCoreMaterial) {
    sharedFireCoreMaterial =
      new THREE.PointsMaterial({
        color: 0xffd35a,
        map: sharedFireParticleTexture,
        size: 0.12,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.96,
        alphaTest: 0.015,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
        toneMapped: false
      });

    sharedFireCoreMaterial.userData
      .sharedFireMaterial = true;
  }

  if (!sharedFireOuterMaterial) {
    sharedFireOuterMaterial =
      new THREE.PointsMaterial({
        color: 0xff3d08,
        map: sharedFireParticleTexture,
        size: 0.24,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.72,
        alphaTest: 0.01,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
        toneMapped: false
      });

    sharedFireOuterMaterial.userData
      .sharedFireMaterial = true;
  }
}

function createFireParticleLayer(
  particleCount,
  material,
  effectType,
  layerScale,
  layerLength = null
) {
  const positions =
    new Float32Array(
      particleCount * 3
    );

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const points =
    new THREE.Points(
      geometry,
      material
    );

  points.frustumCulled = false;

  points.userData.isFireParticleLayer =
    true;

  points.userData.effectType =
    effectType;

  points.userData.layerScale =
    layerScale;

  /*
  * Chiều dài riêng của lớp hạt.
  * Giá trị này chủ yếu dùng cho fireSword.
  */
  points.userData.layerLength =
    layerLength;

  points.userData.particles =
    Array.from(
      {
        length: particleCount
      },
      (
        unusedValue,
        particleIndex
      ) => {
        return {
          progress:
            (
              particleIndex /
                particleCount +
              Math.random() * 0.18
            ) % 1,

          speed:
            THREE.MathUtils.randFloat(
              0.62,
              1.18
            ),

          phase:
            Math.random() *
            Math.PI *
            2,

          radius:
            THREE.MathUtils.randFloat(
              0.65,
              1.15
            )
        };
      }
    );

  return points;
}

function createFireSwordFlameEffect() {
  ensureSharedFireAssets();

  const flameGroup =
    new THREE.Group();

  flameGroup.name =
    'fire-sword-flames';

  flameGroup.userData.time = 0;
  flameGroup.userData.layers = [];

  /*
   * 46 hạt cam đỏ bên ngoài.
   */
  const outerLayer =
    createFireParticleLayer(
      46,
      sharedFireOuterMaterial,
      'sword',
      1,
      1.6
    );

  /*
   * 28 hạt vàng ở lõi.
   */
  const coreLayer =
    createFireParticleLayer(
      28,
      sharedFireCoreMaterial,
      'sword',
      0.56,
      1.2
    );

  flameGroup.userData.layers.push(
    outerLayer,
    coreLayer
  );

  flameGroup.add(
    outerLayer,
    coreLayer
  );

  /*
   * Ánh sáng cam đi cùng kiếm.
   */
  const fireLight =
    new THREE.PointLight(
      0xff5a12,
      6.5,
      8,
      2
    );

  fireLight.position.set(
    0,
    0,
    -0.9
  );

  flameGroup.userData.fireLight =
    fireLight;

  flameGroup.add(fireLight);

  return flameGroup;
}

function createMeteorFireEffect() {
  ensureSharedFireAssets();

  const flameGroup =
    new THREE.Group();

  flameGroup.name =
    'burning-meteor-flames';

  flameGroup.position.y = 0.18;

  flameGroup.userData.time = 0;
  flameGroup.userData.layers = [];

  /*
  * Giảm số hạt trên mobile để tránh
  * cập nhật quá nhiều vertex mỗi frame.
  */
  const outerParticleCount =
    isCompactScreen
      ? 10
      : 20;

  const coreParticleCount =
    isCompactScreen
      ? 6
      : 10;

  /*
  * Lớp lửa ngoài của meteor.
  */
  const outerLayer =
    createFireParticleLayer(
      outerParticleCount,
      sharedFireOuterMaterial,
      'meteor',
      1
    );

  /*
  * Lõi vàng của meteor.
  */
  const coreLayer =
    createFireParticleLayer(
      coreParticleCount,
      sharedFireCoreMaterial,
      'meteor',
      0.58
    );

  flameGroup.userData.layers.push(
    outerLayer,
    coreLayer
  );

  flameGroup.add(
    outerLayer,
    coreLayer
  );

  return flameGroup;
}

function updateFireEffect(
  flameGroup,
  delta,
  intensity = 1
) {
  if (!flameGroup) {
    return;
  }

  flameGroup.userData.time += delta;

  const time =
    flameGroup.userData.time;

  for (
    const layer
    of flameGroup.userData.layers
  ) {
    const positionAttribute =
      layer.geometry.getAttribute(
        'position'
      );

    const particles =
      layer.userData.particles;

    const layerScale =
      layer.userData.layerScale;

    /*
    * Nếu lớp không khai báo chiều dài,
    * giữ giá trị cũ là 2.25.
    */
    const layerLength =
      layer.userData.layerLength ??
      2.25;

    for (
      let particleIndex = 0;
      particleIndex <
        particles.length;
      particleIndex += 1
    ) {
      const particle =
        particles[particleIndex];

      const progress =
        (
          particle.progress +
          time * particle.speed
        ) % 1;

      /*
       * Hạt trên kiếm chạy dọc theo
       * trục Z âm, tức hướng mũi kiếm.
       */
      if (
        layer.userData.effectType ===
        'sword'
      ) {
        const envelope =
          Math.sin(
            progress * Math.PI
          );

        const radius =
          (
            0.018 +
            envelope * 0.13
          ) *
          layerScale *
          intensity *
          particle.radius;

        positionAttribute.setXYZ(
          particleIndex,

          Math.sin(
            time * 13 +
            particle.phase
          ) * radius,

          Math.cos(
            time * 11 +
            particle.phase
          ) *
          radius *
          0.7,

          0.15 -
            progress * layerLength
        );
      } else {
        /*
         * Hạt trên meteor bay lên trên
         * và thu hẹp dần ở phần ngọn.
         */
        const radius =
          (
            0.48 *
              (1 - progress) +
            0.045
          ) *
          layerScale *
          intensity *
          particle.radius;

        const angle =
          particle.phase +
          time * 2.2;

        positionAttribute.setXYZ(
          particleIndex,

          Math.cos(angle) *
            radius,

          progress * 1.55,

          Math.sin(angle) *
            radius
        );
      }
    }

    positionAttribute.needsUpdate =
      true;
  }

  /*
   * Đèn lửa nhấp nháy.
   */
  if (flameGroup.userData.fireLight) {
    flameGroup.userData
      .fireLight.intensity =
      (
        5.6 +
        Math.sin(time * 26) *
          1.8
      ) *
      intensity;
  }
}

/*
 * Chỉ dispose geometry riêng của
 * từng cụm hạt.
 *
 * Không dispose material và texture
 * vì chúng đang được dùng chung.
 */
function disposeFireEffectGeometry(
  flameGroup
) {
  if (!flameGroup) {
    return;
  }

  flameGroup.traverse((node) => {
    if (
      node.isPoints &&
      node.userData
        .isFireParticleLayer
    ) {
      node.geometry.dispose();
    }
  });
}

function setFireSwordAppearance(sword) {
  sword.traverse((node) => {
    if (
      !node.isMesh ||
      !node.material
    ) {
      return;
    }

    const materials =
      Array.isArray(node.material)
        ? node.material
        : [node.material];

    for (
      const material
      of materials
    ) {
      if (material.color) {
        material.color.setHex(
          CONFIG.fireSwordColor
        );
      }

      if (material.emissive) {
        material.emissive.setHex(
          CONFIG.fireSwordEmissive
        );

        material.emissiveIntensity =
          CONFIG
            .fireSwordEmissiveIntensity;
      }

      if (
        typeof material.metalness ===
        'number'
      ) {
        material.metalness =
          Math.max(
            material.metalness,
            0.8
          );
      }

      if (
        typeof material.roughness ===
        'number'
      ) {
        material.roughness =
          Math.min(
            material.roughness,
            0.2
          );
      }

      material.needsUpdate = true;
    }
  });
}

function setFireSwordIdleTransform() {
  if (!fireSword || !aimRig) {
    return;
  }

  if (fireSword.parent !== aimRig) {
    aimRig.attach(fireSword);
  }

  fireSword.position.set(
    0,
    CONFIG.fireSwordIdleY,
    CONFIG.fireSwordIdleZ
  );

  fireSword.scale.setScalar(
    CONFIG.fireSwordIdleScale
  );

  fireSword.quaternion.copy(
    AUTO_SWORD_IDLE_QUATERNION
  );
}

function createFireSword() {
  if (fireSword || !aimRig) {
    return;
  }

  fireSword =
    new THREE.Group();

  fireSword.name =
    'level-11-fire-sword';

  const visual =
    createProjectileSwordVisual();

  prepareAutonomousSwordMaterials(
    visual
  );

  setFireSwordAppearance(visual);

  fireSword.scale.setScalar(
    CONFIG.fireSwordIdleScale
  );

  fireSword.add(
    visual,
    createFireSwordFlameEffect()
  );

  aimRig.add(fireSword);

  fireSwordPhase = 'idle';
  fireSwordTarget = null;
  fireSwordAttackAge = 0;

  setFireSwordIdleTransform();
}

function releaseFireSwordTarget() {
  if (
    fireSwordTarget?.userData
      .specialSwordOwner ===
    fireSword
  ) {
    fireSwordTarget.userData
      .specialSwordOwner = null;
  }

  fireSwordTarget = null;
}

function removeFireSword() {
  releaseFireSwordTarget();

  if (!fireSword) {
    return;
  }

  /*
  * Giải phóng geometry của các lớp
  * hạt lửa trước khi xóa kiếm.
  */
  disposeFireEffectGeometry(
    fireSword.getObjectByName(
      'fire-sword-flames'
    )
  );

  fireSword.removeFromParent();

  const disposedMaterials =
    new Set();

  fireSword.traverse((node) => {
    if (
      !node.isMesh ||
      !node.material
    ) {
      return;
    }

    const materials =
      Array.isArray(node.material)
        ? node.material
        : [node.material];

    for (
      const material
      of materials
    ) {
      if (
        !material ||
        disposedMaterials.has(material)
      ) {
        continue;
      }

      if (
        !material.userData
          .sharedFireMaterial
      ) {
        material.dispose();
      }

      disposedMaterials.add(material);
    }
  });

  fireSword = null;
  fireSwordPhase = 'idle';
  fireSwordAttackAge = 0;

  fireSwordCooldownRemaining =
    CONFIG.fireSwordCooldown;
}

function releaseUltimateSwordTarget(
  swordState
) {
  const target = swordState.target;

  if (
    target?.userData
      .ultimateSwordOwner ===
    swordState
  ) {
    target.userData
      .ultimateSwordOwner = null;
  }

  swordState.target = null;
}

function clearUltimateSwordField() {
  for (
    const swordState
    of ultimateSwordStates
  ) {
    releaseUltimateSwordTarget(
      swordState
    );
  }

  ultimateSwordStates.length = 0;

  if (ultimateSwordField) {
    const bladeMesh =
      ultimateSwordField.userData
        .bladeMesh;

    const handleMesh =
      ultimateSwordField.userData
        .handleMesh;

    ultimateSwordField
      .removeFromParent();

    bladeMesh?.geometry.dispose();
    bladeMesh?.material.dispose();
    handleMesh?.geometry.dispose();
    handleMesh?.material.dispose();
  }

  ultimateSwordField = null;
  ultimateSwordLaunchTimer = 0;
  ultimateSwordLaunchIndex = 0;
  ultimateSwordSpentCount = 0;
}

function writeUltimateSwordMatrix(
  swordState
) {
  if (!ultimateSwordField) {
    return;
  }

  const visibleScale =
    swordState.status === 'spent'
      ? 0
      : swordState.status === 'flying'
        ? 0.82
        : 0.62;

  ultimateSwordDummy.position.copy(
    swordState.position
  );

  ultimateSwordDummy.quaternion.copy(
    swordState.quaternion
  );

  ultimateSwordDummy.scale.setScalar(
    visibleScale
  );

  ultimateSwordDummy.updateMatrix();

  ultimateSwordField.userData
    .bladeMesh.setMatrixAt(
      swordState.index,
      ultimateSwordDummy.matrix
    );

  ultimateSwordField.userData
    .handleMesh.setMatrixAt(
      swordState.index,
      ultimateSwordDummy.matrix
    );
}

function createUltimateSwordField(
  ringCount =
    CONFIG.ultimateSwordRingCount
) {
  /*
   * Lưu hướng của những kiếm đã xuất hiện.
   *
   * Khi thêm vòng mới, hàm phải tạo lại
   * InstancedMesh, nhưng những vòng cũ
   * không được quay theo meteor mới.
   */
  const preservedQuaternions =
    new Map();

  for (
    const previousSword
    of ultimateSwordStates
  ) {
    const swordKey =
      `${previousSword.ringIndex}:` +
      `${previousSword.positionInRing}`;

    preservedQuaternions.set(
      swordKey,
      previousSword.quaternion.clone()
    );
  }

  clearUltimateSwordField();

  const activeRingCount =
    THREE.MathUtils.clamp(
      Math.floor(ringCount),
      1,
      CONFIG.ultimateSwordRingCount
    );

  const swordsPerRing =
    CONFIG.ultimateSwordCount /
    CONFIG.ultimateSwordRingCount;

  const activeSwordCount =
    swordsPerRing *
    activeRingCount;

  ultimateSwordField =
    new THREE.Group();

  ultimateSwordField.name =
    'van-kiem-quy-tong';

  const bladeGeometry =
    new THREE.ConeGeometry(
      0.045,
      1.05,
      4
    );

  bladeGeometry.rotateX(
    -Math.PI / 2
  );

  const handleGeometry =
    new THREE.CylinderGeometry(
      0.025,
      0.025,
      0.34,
      5
    );

  handleGeometry.rotateX(
    -Math.PI / 2
  );
  handleGeometry.translate(
    0,
    0,
    0.66
  );

  const bladeMaterial =
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      toneMapped: false
    });

  const handleMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
      toneMapped: false
    });

  const bladeMesh =
    new THREE.InstancedMesh(
      bladeGeometry,
      bladeMaterial,
      activeSwordCount
    );

  const handleMesh =
    new THREE.InstancedMesh(
      handleGeometry,
      handleMaterial,
      activeSwordCount
    );

  bladeMesh.frustumCulled = false;
  handleMesh.frustumCulled = false;

  ultimateSwordField.userData
    .bladeMesh = bladeMesh;

  ultimateSwordField.userData
    .handleMesh = handleMesh;

  ultimateSwordField.add(
    bladeMesh,
    handleMesh
  );

  player.getWorldPosition(
    playerWorldPosition
  );

  for (
    let swordIndex = 0;
    swordIndex <
    activeSwordCount;
    swordIndex += 1
  ) {
    const ringIndex =
      Math.floor(
        swordIndex /
        swordsPerRing
      );

    const positionInRing =
      swordIndex %
      swordsPerRing;

    const swordKey =
      `${ringIndex}:` +
      `${positionInRing}`;

    const preservedQuaternion =
      preservedQuaternions.get(
        swordKey
      );

    const angle =
      positionInRing /
      swordsPerRing *
      Math.PI * 2 +
      ringIndex * 0.085;

    const radius =
      CONFIG.ultimateSwordInnerRadius +
      ringIndex *
        CONFIG.ultimateSwordRingSpacing;

    /*
    * Giữ nguyên phần tạo swordState
    * hiện có ở phía dưới.
    */

    const swordState = {
      index: swordIndex,

      /*
      * Dùng để sắp xếp thứ tự:
      * vòng Z thấp phóng trước.
      */
      ringIndex,
      positionInRing,

      status: 'waiting',
      target: null,
      position:
        new THREE.Vector3(
          playerWorldPosition.x +
          CONFIG
            .ultimateSwordCenterOffsetX +
          Math.cos(angle) *
            radius,

          playerWorldPosition.y +
          CONFIG
            .ultimateSwordCenterOffsetY +
          Math.sin(angle) *
            radius *
            CONFIG
              .ultimateSwordVerticalRatio,

          playerWorldPosition.z +
          CONFIG
            .ultimateSwordCenterOffsetZ -
          ringIndex *
            CONFIG
              .ultimateSwordDepthSpacing
        ),
      quaternion:
        preservedQuaternion
          ? preservedQuaternion.clone()
          : AUTO_SWORD_IDLE_QUATERNION
            .clone()
    };

    /*
    * Kiếm của vòng cũ giữ nguyên hướng.
    *
    * Kiếm thuộc vòng mới luôn hướng tới
    * tọa độ thế giới (0, 27, -62).
    */
    if (!preservedQuaternion) {
      ultimateSwordDirection
        .copy(
          ULTIMATE_SWORD_PREVIEW_TARGET
        )
        .sub(
          swordState.position
        );

      if (
        ultimateSwordDirection.lengthSq() >
        0.000001
      ) {
        ultimateSwordDirection.normalize();

        swordState.quaternion
          .setFromUnitVectors(
            PROJECTILE_FORWARD_AXIS,
            ultimateSwordDirection
          );
      }
    }

    ultimateSwordStates.push(
      swordState
    );

    writeUltimateSwordMatrix(
      swordState
    );
  }

  /*
  * Sắp xếp theo Z tăng dần:
  * vòng có Z thấp phóng trước,
  * vòng có Z cao phóng sau.
  *
  * Trong cùng một vòng, kiếm được
  * sắp theo thứ tự quanh chu vi.
  */
  ultimateSwordStates.sort(
    (
      swordA,
      swordB
    ) => {
      const zDifference =
        swordB.position.z -
        swordA.position.z;

      if (
        Math.abs(zDifference) >
        0.000001
      ) {
        return zDifference;
      }

      return (
        swordA.positionInRing -
        swordB.positionInRing
      );
    }
  );

  bladeMesh.instanceMatrix.needsUpdate =
    true;

  handleMesh.instanceMatrix.needsUpdate =
    true;

  scene.add(ultimateSwordField);
}

function startUltimateSwordAttack() {
  specialSwordCyclePhase =
    'ultimate';

  for (
    const sword
    of autonomousSwords
  ) {
    sword.visible = false;
  }

  if (fireSword) {
    fireSword.visible = false;
  }

  /*
   * Khi đã nạp đủ 5 vòng thì sử dụng
   * trực tiếp hệ kiếm đang hiển thị.
   *
   * Không tạo lại toàn bộ field vì việc
   * đó có thể làm các kiếm đổi hướng và
   * tạo thêm allocation không cần thiết.
   */
  if (
    !ultimateSwordField ||
    ultimateSwordStates.length !==
      CONFIG.ultimateSwordCount
  ) {
    createUltimateSwordField(
      CONFIG.ultimateSwordRingCount
    );
  }

  /*
   * Bảo đảm tiến trình phóng bắt đầu
   * từ nhóm kiếm đầu tiên.
   */
  ultimateSwordLaunchTimer = 0;
  ultimateSwordLaunchIndex = 0;
  ultimateSwordSpentCount = 0;
}

function finishUltimateSwordAttack() {
  clearUltimateSwordField();

  ultimateRingChargeCount = 0;

  for (
    const sword
    of autonomousSwords
  ) {
    sword.visible = true;
  }

  if (fireSword) {
    fireSword.visible = true;

    setFireSwordIdleTransform();
  }

  /*
   * Sau Ultimate, kiếm lửa phải tấn công
   * trước khi hai lượt auto bắt đầu.
   */
  level20PostUltimateSequenceActive =
    state.level >= 20;

  level20PostUltimateAutoWaves = 0;

  specialSwordCyclePhase =
    'red';

  autoSwordGroupPhase =
    'cooldown';

  /*
   * Cooldown auto chưa chạy ở đây vì
   * đang đến lượt kiếm lửa.
   */
  autoSwordWaveCooldownRemaining = 0;
}

function findNearestUltimateStreamMeteor(
  origin
) {
  let nearestMeteor = null;

  let nearestDistanceSquared =
    Infinity;

  for (const meteor of meteors) {
    if (!meteor.parent) {
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

      nearestMeteor = meteor;
    }
  }

  return nearestMeteor;
}

function launchUltimateSwordBatch(
  swordBatch
) {
  if (swordBatch.length === 0) {
    return;
  }

  /*
   * Tính tâm xuất phát chung của
   * nhóm ba kiếm.
   */
  const streamOrigin =
    new THREE.Vector3();

  for (
    const swordState
    of swordBatch
  ) {
    streamOrigin.add(
      swordState.position
    );
  }

  streamOrigin.multiplyScalar(
    1 / swordBatch.length
  );

  /*
   * Chọn meteor gần tâm nhóm để
   * xác định hướng bay ban đầu.
   */
  const target =
    findNearestUltimateStreamMeteor(
      streamOrigin
    );

  const streamDirection =
    new THREE.Vector3();

  if (target) {
    target.getWorldPosition(
      tempTarget
    );

    streamDirection
      .copy(tempTarget)
      .sub(streamOrigin);
  } else {
    /*
     * Không có meteor thì bay theo
     * hướng nhìn của nhân vật.
     */
    aimRig.getWorldQuaternion(
      playerWorldQuaternion
    );

    streamDirection
      .copy(
        PROJECTILE_FORWARD_AXIS
      )
      .applyQuaternion(
        playerWorldQuaternion
      );
  }

  if (
    streamDirection.lengthSq() <
    0.000001
  ) {
    streamDirection.set(
      0,
      0,
      -1
    );
  }

  streamDirection.normalize();

  /*
   * Tạo trục ngang vuông góc với
   * hướng di chuyển.
   */
  const referenceAxis =
    Math.abs(streamDirection.y) >
      0.92
      ? new THREE.Vector3(
        1,
        0,
        0
      )
      : new THREE.Vector3(
        0,
        1,
        0
      );

  const formationAxisU =
    new THREE.Vector3()
      .crossVectors(
        streamDirection,
        referenceAxis
      )
      .normalize();

  swordBatch.forEach(
    (
      swordState,
      swordBatchIndex
    ) => {
      releaseUltimateSwordTarget(
        swordState
      );

      swordState.status =
        'flying';

      swordState.streamAge = 0;
      swordState.streamDistance = 0;

      swordState.streamOrigin =
        streamOrigin.clone();

      swordState.streamDirection =
        streamDirection.clone();

      swordState.formationAxisU =
        formationAxisU.clone();

      /*
       * Giữ lại vị trí ban đầu để kiếm
       * hội tụ mượt, không bị dịch chuyển
       * tức thời.
       */
      swordState.initialStreamOffset =
        swordState.position
          .clone()
          .sub(streamOrigin);

      /*
       * Nhóm ba kiếm:
       *
       * kiếm 0: cánh trái
       * kiếm 1: ở giữa và dẫn trước
       * kiếm 2: cánh phải
       */
      const centeredIndex =
        swordBatchIndex -
        (swordBatch.length - 1) /
          2;

      swordState
        .formationLateralOffset =
        centeredIndex *
        CONFIG
          .ultimateSwordFormationHalfWidth;

      swordState
        .formationLeadDistance =
        swordBatch.length === 3 &&
        swordBatchIndex === 1
          ? CONFIG
            .ultimateSwordCenterLeadDistance
          : 0;
    }
  );
}

function updateUltimateSwordAttack(
  delta
) {
  if (!ultimateSwordField) {
    return;
  }

  ultimateSwordLaunchTimer +=
    delta;

  /*
   * Phóng theo từng nhóm 3 kiếm.
   * Danh sách đã được sắp theo Z nên
   * toàn bộ nhóm của vòng cao được
   * phóng trước vòng thấp.
   */
  while (
    ultimateSwordLaunchIndex <
      ultimateSwordStates.length &&
    ultimateSwordLaunchTimer >=
      CONFIG
        .ultimateSwordBatchInterval
  ) {
    const firstSword =
      ultimateSwordStates[
        ultimateSwordLaunchIndex
      ];

    const currentRingIndex =
      firstSword.ringIndex;

    const swordBatch = [];

    /*
     * Không cho một nhóm chứa kiếm
     * thuộc hai vòng khác nhau.
     */
    while (
      ultimateSwordLaunchIndex <
        ultimateSwordStates.length &&
      swordBatch.length <
        CONFIG.ultimateSwordBatchSize
    ) {
      const swordState =
        ultimateSwordStates[
          ultimateSwordLaunchIndex
        ];

      if (
        swordState.ringIndex !==
        currentRingIndex
      ) {
        break;
      }

      swordBatch.push(
        swordState
      );

      ultimateSwordLaunchIndex += 1;
    }

    launchUltimateSwordBatch(
      swordBatch
    );

    ultimateSwordLaunchTimer -=
      CONFIG
        .ultimateSwordBatchInterval;
  }

  for (
    const swordState
    of ultimateSwordStates
  ) {
    if (
      swordState.status === 'spent'
    ) {
      continue;
    }

    /*
    * Kiếm chưa đến lượt phóng tiếp tục
    * giữ hướng nhìn về (0, 27, -62).
    *
    * Chỉ khi được phóng, launchUltimateSwordBatch()
    * mới quyết định hướng tấn công.
    */
    if (
      swordState.status === 'waiting'
    ) {
      writeUltimateSwordMatrix(
        swordState
      );

      continue;
    }

    /*
     * Kiếm đang bay liên tục.
     */
    ultimateSwordPreviousPosition
      .copy(
        swordState.position
      );

    swordState.streamAge +=
      delta;

    swordState.streamDistance +=
      CONFIG.ultimateSwordSpeed *
      delta;

    /*
     * Tâm dòng kiếm di chuyển thẳng
     * theo trục chung của nhóm.
     */
    ultimateSwordStreamCenter
      .copy(
        swordState.streamOrigin
      )
      .addScaledVector(
        swordState.streamDirection,
        swordState.streamDistance
      );

      /*
      * Kiếm hội tụ từ vị trí trên vòng
      * vào đội hình tam giác.
      */
      const rawBlend =
        THREE.MathUtils.clamp(
          swordState.streamAge /
          Math.max(
            CONFIG
              .ultimateSwordFormationBlendDuration,
            0.0001
          ),
          0,
          1
        );

      const smoothBlend =
        rawBlend *
        rawBlend *
        (
          3 -
          2 * rawBlend
        );

      /*
      * Hai kiếm cánh nằm hai bên.
      * Kiếm giữa dẫn trước theo đúng
      * hướng bay của cả nhóm.
      */
      ultimateSwordFormationOffset
        .copy(
          swordState.formationAxisU
        )
        .multiplyScalar(
          swordState
            .formationLateralOffset
        )
        .addScaledVector(
          swordState.streamDirection,
          swordState
            .formationLeadDistance
        );

      swordState.position
        .copy(
          ultimateSwordStreamCenter
        )
        .addScaledVector(
          swordState.initialStreamOffset,
          1 - smoothBlend
        )
        .addScaledVector(
          ultimateSwordFormationOffset,
          smoothBlend
        );

      /*
      * Mũi kiếm luôn hướng theo chuyển động.
      */
      ultimateSwordMovement
        .copy(
          swordState.position
        )
        .sub(
          ultimateSwordPreviousPosition
        );

      if (
        ultimateSwordMovement.lengthSq() >
        0.000001
      ) {
        ultimateSwordMovement.normalize();

        swordState.quaternion
          .setFromUnitVectors(
            PROJECTILE_FORWARD_AXIS,
            ultimateSwordMovement
          );
      }

    /*
     * Quét cả đoạn đường vừa đi thay
     * vì chỉ kiểm tra điểm cuối.
     *
     * Cách này tránh xuyên meteor khi
     * tốc độ kiếm cao.
     */
    collisionSegment.set(
      ultimateSwordPreviousPosition,
      swordState.position
    );

    for (
      let meteorIndex =
        meteors.length - 1;
      meteorIndex >= 0;
      meteorIndex -= 1
    ) {
      const meteor =
        meteors[meteorIndex];

      if (!meteor?.parent) {
        continue;
      }

      collisionSegment
        .closestPointToPoint(
          meteor.position,
          true,
          closestPoint
        );

      const collisionRadius =
        meteor.userData.radius +
        CONFIG
          .ultimateSwordHitRadius;

      if (
        closestPoint
          .distanceToSquared(
            meteor.position
          ) >
        collisionRadius *
        collisionRadius
      ) {
        continue;
      }

      const hitPosition =
        meteor.position.clone();

      registerHit(
        hitPosition,
        CONFIG
          .ultimateSwordBurstColor
      );

      removeMeteor(
        meteorIndex
      );

      /*
       * Không đặt kiếm thành spent.
       * Kiếm tiếp tục lướt theo dòng
       * và có thể phá meteor tiếp theo.
       */
    }

    /*
     * Kiếm chỉ biến mất sau khi bay
     * hết toàn bộ quãng đường.
     */
    if (
      swordState.streamDistance >=
      CONFIG
        .ultimateSwordTravelDistance
    ) {
      swordState.status =
        'spent';

      ultimateSwordSpentCount += 1;
    }

    writeUltimateSwordMatrix(
      swordState
    );
  }

  ultimateSwordField.userData
    .bladeMesh.instanceMatrix
    .needsUpdate = true;

  ultimateSwordField.userData
    .handleMesh.instanceMatrix
    .needsUpdate = true;

  if (
    ultimateSwordSpentCount >=
    ultimateSwordStates.length
  ) {
    finishUltimateSwordAttack();
  }
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
          .autoSwordOwner &&
        !meteor.userData
          .specialSwordOwner &&
        !meteor.userData
          .ultimateSwordOwner
      );
    })
    .sort(
      (
        meteorA,
        meteorB
      ) => {
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
    if (
      !meteor.parent ||
      meteor.userData
        .autoSwordOwner ||
      meteor.userData
        .specialSwordOwner ||
      meteor.userData
        .ultimateSwordOwner
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
    sword.userData.isWaveMember =
      false;

    sword.userData.hasStruck =
      false;

    sword.userData.hasReturned =
      false;

    releaseAutonomousSwordTarget(
      sword
    );
  }

  autoSwordGroupPhase =
    'cooldown';

  /*
   * Chu kỳ đặc biệt sau Ultimate:
   * nhóm kiếm tự động phải hoàn thành
   * đúng hai lượt.
   */
  if (
    state.level >= 20 &&
    specialSwordCyclePhase ===
      'auto' &&
    level20PostUltimateSequenceActive
  ) {
    level20PostUltimateAutoWaves += 1;

    /*
     * Mới hoàn thành lượt thứ nhất:
     * giữ quyền cho nhóm auto và chờ
     * cooldown trước lượt thứ hai.
     */
    if (
      level20PostUltimateAutoWaves <
      CONFIG
        .level20AutoWavesAfterUltimate
    ) {
      autoSwordWaveCooldownRemaining =
        CONFIG.autoSwordWaveCooldown;

      return;
    }

    /*
     * Đã hoàn thành đủ hai lượt.
     */
    level20PostUltimateSequenceActive =
      false;

    level20PostUltimateAutoWaves = 0;

    /*
     * Spawn vòng đầu tiên cho chu kỳ
     * Vạn Kiếm Quy Tông tiếp theo.
     */
    const ultimateIsReady =
      spawnNextUltimateChargeRing();

    /*
     * Trường hợp đã đủ vòng thì helper
     * đã chuyển sang pha charging.
     */
    if (ultimateIsReady) {
      autoSwordWaveCooldownRemaining =
        0;

      return;
    }

    /*
     * Sau khi vòng đầu tiên xuất hiện,
     * trở về chu kỳ auto → fire hiện tại.
     */
    specialSwordCyclePhase =
      'auto';

    autoSwordWaveCooldownRemaining =
      CONFIG.autoSwordWaveCooldown;

    return;
  }

  /*
   * Chu kỳ thông thường Level 12–20:
   * sau một lượt auto sẽ tới kiếm lửa.
   */
  if (
    state.level >= 12 &&
    specialSwordCyclePhase ===
      'auto'
  ) {
    autoSwordWaveCooldownRemaining =
      0;

    specialSwordCyclePhase =
      'red';

    return;
  }

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

  if (
    state.level >= 12 &&
    specialSwordCyclePhase !==
      'auto'
  ) {
    /*
    * Trong lượt kiếm lửa, nhóm kiếm
    * tự động chỉ quay quanh nhân vật.
    *
    * Riêng Level 20, khi Vạn Kiếm
    * hoạt động thì không cập nhật
    * nhóm kiếm tự động.
    */
    if (
      specialSwordCyclePhase ===
        'ultimate'
    ) {
      return;
    }

    autoSwordOrbitAngle +=
      CONFIG.autoSwordOrbitSpeed *
      delta;

    autoSwordOrbitAngle %=
      Math.PI * 2;

    for (
      const sword
      of autonomousSwords
    ) {
      updateAutonomousSwordOrbit(
        sword,
        delta
      );
    }

    return;
  }

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

  const orbitingSwords =
    autonomousSwords.filter(
      (sword) => {
        return !sword.userData
          .isWaveMember;
      }
    );

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

function findNearestFireSwordTarget() {
  if (!fireSword) {
    return null;
  }

  const origin =
    fireSword.getWorldPosition(
      fireSwordIdleWorldPosition
    );

  let nearestMeteor = null;
  let nearestDistanceSquared =
    Infinity;

  for (const meteor of meteors) {
    if (
      !meteor.parent ||
      meteor.userData.autoSwordOwner ||
      meteor.userData.specialSwordOwner ||
      meteor.userData.ultimateSwordOwner
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

      nearestMeteor = meteor;
    }
  }

  return nearestMeteor;
}

function assignFireSwordTarget(target) {
  if (
    !fireSword ||
    !target ||
    !target.parent ||
    target.userData.autoSwordOwner ||
    target.userData.specialSwordOwner ||
    target.userData.ultimateSwordOwner
  ) {
    return null;
  }

  releaseFireSwordTarget();

  fireSwordTarget = target;

  target.userData.specialSwordOwner =
    fireSword;

  return target;
}

function startFireSwordAttack() {
  if (
    !fireSword ||
    fireSwordPhase !== 'idle'
  ) {
    return false;
  }

  const target =
    findNearestFireSwordTarget();

  if (!target) {
    return false;
  }

  scene.attach(fireSword);

  fireSword.userData
    .attackBaseScale =
    fireSword.scale.x;

  fireSwordAttackAge = 0;

  assignFireSwordTarget(target);

  fireSwordPhase = 'attacking';

  return true;
}

function updateFireSwordScale(
  delta,
  enlarged
) {
  if (!fireSword) {
    return;
  }

  const baseScale =
    fireSword.userData
      .attackBaseScale ??
    CONFIG.fireSwordIdleScale;

  const attackScaleRatio =
    CONFIG.fireSwordAttackScale /
    CONFIG.fireSwordIdleScale;

  const targetScale =
    enlarged
      ? baseScale * attackScaleRatio
      : baseScale;

  const scaleFollowAmount =
    1 -
    Math.exp(
      -CONFIG
        .fireSwordScaleFollowStrength *
      delta
    );

  const nextScale =
    THREE.MathUtils.lerp(
      fireSword.scale.x,
      targetScale,
      scaleFollowAmount
    );

  fireSword.scale.setScalar(
    nextScale
  );
}

function updateFireSwordVisual(delta) {
  if (!fireSword) {
    return;
  }

  const flameEffect =
    fireSword.getObjectByName(
      'fire-sword-flames'
    );

  const flameIntensity =
    fireSwordPhase === 'attacking'
      ? 1.42
      : fireSwordPhase === 'returning'
        ? 1.18
        : 1;

  updateFireEffect(
    flameEffect,
    delta,
    flameIntensity
  );
}

function spawnNextUltimateChargeRing() {
  if (state.level < 20) {
    return false;
  }

  ultimateRingChargeCount =
    Math.min(
      CONFIG.ultimateSwordRingCount,
      ultimateRingChargeCount +
        CONFIG.ultimateRingChargeStep
    );

  /*
   * Hiển thị lại toàn bộ số vòng
   * đã nạp, bao gồm vòng vừa thêm.
   */
  createUltimateSwordField(
    ultimateRingChargeCount
  );

  /*
   * Chưa đủ năm vòng thì tiếp tục
   * chu kỳ kiếm tự động và kiếm lửa.
   */
  if (
    ultimateRingChargeCount <
    CONFIG.ultimateSwordRingCount
  ) {
    return false;
  }

  /*
   * Đủ năm vòng: chuyển sang trạng thái
   * chuẩn bị Vạn Kiếm Quy Tông.
   */
  specialSwordCyclePhase =
    'charging';

  ultimateChargeTimer =
    CONFIG.ultimateChargeDelay;

  return true;
}

function completeFireSwordTurn() {
  fireSwordPhase = 'idle';

  setFireSwordIdleTransform();

  /*
   * Level 11 vẫn dùng kiếm lửa
   * theo cooldown định kỳ.
   */
  if (state.level < 12) {
    fireSwordCooldownRemaining =
      CONFIG.fireSwordCooldown;

    specialSwordCyclePhase =
      'fire-periodic';

    return;
  }

  /*
   * Sau khi Ultimate vừa kết thúc,
   * lượt kiếm lửa đầu tiên không tạo vòng.
   *
   * Nó chỉ mở đầu cho hai lượt tấn công
   * của nhóm kiếm tự động.
   */
  if (
    state.level >= 20 &&
    level20PostUltimateSequenceActive
  ) {
    specialSwordCyclePhase =
      'auto';

    autoSwordGroupPhase =
      'cooldown';

    autoSwordWaveCooldownRemaining =
      CONFIG.autoSwordAfterFireDelay;

    return;
  }

  /*
   * Chu kỳ nạp vòng thông thường tại
   * Level 20: kiếm lửa quay về thì
   * tạo thêm một vòng Ultimate.
   */
  if (state.level >= 20) {
    const ultimateIsReady =
      spawnNextUltimateChargeRing();

    if (ultimateIsReady) {
      return;
    }
  }

  /*
   * Sau kiếm lửa, trả quyền cho nhóm
   * kiếm tự động và giữ delay hiện tại.
   */
  specialSwordCyclePhase =
    'auto';

  autoSwordGroupPhase =
    'cooldown';

  autoSwordWaveCooldownRemaining =
    CONFIG.autoSwordAfterFireDelay;
}

function updateFireSwordAttack(delta) {
  if (!fireSword) {
    return;
  }

  if (fireSwordPhase === 'idle') {
    startFireSwordAttack();
    return;
  }

  if (fireSwordPhase === 'attacking') {
    fireSwordAttackAge += delta;

    updateFireSwordScale(
      delta,
      fireSwordAttackAge >=
        CONFIG.fireSwordEnlargeDelay
    );
    let target = fireSwordTarget;

    const hasValidTarget =
      target &&
      target.parent &&
      meteors.includes(target) &&
      target.userData
        .specialSwordOwner ===
      fireSword;

    if (!hasValidTarget) {
      releaseFireSwordTarget();

      target =
        findNearestFireSwordTarget();

      if (target) {
        assignFireSwordTarget(target);
      }
    }

    if (!target) {
      return;
    }

    target.getWorldPosition(
      tempTarget
    );

    fireSwordDirection
      .copy(tempTarget)
      .sub(fireSword.position);

    const distanceToTarget =
      fireSwordDirection.length();

    if (
      distanceToTarget > 0.0001
    ) {
      fireSwordDirection
        .divideScalar(
          distanceToTarget
        );

      fireSword.quaternion
        .setFromUnitVectors(
          PROJECTILE_FORWARD_AXIS,
          fireSwordDirection
        );
    }

    const travelDistance =
      CONFIG.fireSwordSpeed * delta;

    const hitDistance =
      target.userData.radius +
      CONFIG.fireSwordHitRadius;

    if (
      distanceToTarget <=
      hitDistance + travelDistance
    ) {
      const meteorIndex =
        meteors.indexOf(target);

      const hitPosition =
        tempTarget.clone();

      releaseFireSwordTarget();

      if (meteorIndex !== -1) {
        igniteNearbyMeteors(
          hitPosition,
          target
        );

        registerHit(
          hitPosition,
          CONFIG.fireSwordBurstColor
        );

        createFireExplosion(
          hitPosition
        );

        target.userData
          .fireExplosionCreated = true;

        removeMeteor(meteorIndex);
      }

      fireSwordPhase = 'returning';
      fireSwordAttackAge = 0;

      return;
    }

    fireSword.position
      .addScaledVector(
        fireSwordDirection,
        travelDistance
      );

    return;
  }

  if (fireSwordPhase === 'returning') {
    updateFireSwordScale(
      delta,
      false
    );
    fireSwordIdleWorldPosition.set(
      0,
      CONFIG.fireSwordIdleY,
      CONFIG.fireSwordIdleZ
    );

    aimRig.localToWorld(
      fireSwordIdleWorldPosition
    );

    fireSwordDirection
      .copy(fireSwordIdleWorldPosition)
      .sub(fireSword.position);

    const distanceToIdle =
      fireSwordDirection.length();

    const travelDistance =
      CONFIG.fireSwordReturnSpeed *
      delta;

    if (
      distanceToIdle <=
      CONFIG
        .autoSwordReturnArrivalDistance +
      travelDistance
    ) {
      completeFireSwordTurn();
      return;
    }

    if (distanceToIdle > 0.0001) {
      fireSwordDirection
        .divideScalar(
          distanceToIdle
        );

      fireSword.quaternion
        .setFromUnitVectors(
          PROJECTILE_FORWARD_AXIS,
          fireSwordDirection
        );
    }

    fireSword.position.addScaledVector(
      fireSwordDirection,
      travelDistance
    );
  }
}

function syncSpecialSwordSystem(
  level
) {
  /*
   * Bộ đếm đặc biệt chỉ tồn tại
   * ở Level 20.
   */
  if (level < 20) {
    level20PostUltimateSequenceActive =
      false;

    level20PostUltimateAutoWaves = 0;
  }

  /*
   * Dưới Level 11 chưa có kiếm lửa.
   */
  if (level < 11) {
    removeFireSword();

    clearUltimateSwordField();

    ultimateRingChargeCount = 0;
    ultimateChargeTimer = 0;

    fireSwordCooldownRemaining =
      CONFIG.fireSwordCooldown;

    specialSwordCyclePhase =
      'inactive';

    return;
  }

  /*
   * Từ Level 11 trở đi luôn tồn tại
   * một kiếm lửa.
   */
  createFireSword();

  /*
   * Riêng Level 11:
   * kiếm lửa tấn công sau mỗi 5 giây.
   */
  if (level < 12) {
    clearUltimateSwordField();

    ultimateRingChargeCount = 0;
    ultimateChargeTimer = 0;

    if (
      specialSwordCyclePhase !==
        'fire-periodic'
    ) {
      specialSwordCyclePhase =
        'fire-periodic';

      fireSwordCooldownRemaining =
        CONFIG.fireSwordCooldown;
    }

    return;
  }

  /*
   * Level 12–19 tuyệt đối không dùng
   * kiếm hai bên hoặc Vạn Kiếm.
   */
  if (level < 20) {
    clearUltimateSwordField();

    ultimateRingChargeCount = 0;
    ultimateChargeTimer = 0;
  }

  /*
   * Khi vừa chuyển từ Level 11 sang
   * Level 12, bắt đầu bằng lượt của
   * nhóm kiếm tự động.
   *
   * Nếu kiếm lửa đang bay thì cho nó
   * hoàn thành trước để tránh dịch
   * chuyển tức thời về vị trí đứng.
   */
  if (
    specialSwordCyclePhase ===
      'inactive' ||
    specialSwordCyclePhase ===
      'fire-periodic'
  ) {
    specialSwordCyclePhase =
      fireSwordPhase === 'idle'
        ? 'auto'
        : 'red';

    if (
      specialSwordCyclePhase ===
        'auto' &&
      autoSwordGroupPhase ===
        'cooldown'
    ) {
      autoSwordWaveCooldownRemaining =
        0;
    }
  }
}

function updateSpecialSwordSystem(
  delta
) {
  /*
   * Dưới Level 11 không có kiếm lửa.
   */
  if (state.level < 11) {
    return;
  }

  /*
   * Luôn cập nhật hiệu ứng ngọn lửa.
   */
  updateFireSwordVisual(delta);

  /*
   * Riêng Level 11:
   * kiếm lửa tấn công sau mỗi 5 giây.
   */
  if (state.level < 12) {
    if (fireSwordPhase === 'idle') {
      fireSwordCooldownRemaining =
        Math.max(
          0,
          fireSwordCooldownRemaining -
            delta
        );

      if (
        fireSwordCooldownRemaining <=
        0
      ) {
        startFireSwordAttack();
      }
    } else {
      updateFireSwordAttack(delta);
    }

    return;
  }

  /*
   * Level 12–20:
   * chỉ cập nhật kiếm lửa khi máy
   * trạng thái chuyển đến lượt của nó.
   */
  if (
    specialSwordCyclePhase ===
      'red'
  ) {
    updateFireSwordAttack(delta);

    return;
  }

  /*
   * Hai pha dưới đây chỉ được phép
   * hoạt động tại Level 20.
   */
  if (
    state.level >= 20 &&
    specialSwordCyclePhase ===
      'charging'
  ) {
    ultimateChargeTimer =
      Math.max(
        0,
        ultimateChargeTimer - delta
      );

    if (
      ultimateChargeTimer <= 0
    ) {
      startUltimateSwordAttack();
    }

    return;
  }

  if (
    state.level >= 20 &&
    specialSwordCyclePhase ===
      'ultimate'
  ) {
    updateUltimateSwordAttack(delta);
  }
}

function updateLevelSwords(level) {
  updateBackSwordFan(level);
  syncAutonomousSwords(level);
  syncSpecialSwordSystem(level);
}

function getLevelRewardLabel(level) {
  if (level <= 5) {
    return (
      `${level} KIẾM CẤP I`
    );
  }

  if (level <= 10) {
    return (
      `${level - 5} KIẾM CẤP II`
    );
  }

  if (level === 11) {
    return 'KIẾM LỬA THỨC TỈNH';
  }

  if (level <= 19) {
    return (
      `${getAutonomousSwordCount(level)} ` +
      'KIẾM TỰ ĐỘNG'
    );
  }

  return 'CẤP TỐI ĐA';
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

  if (leveledUp) showHitLabel(getLevelRewardLabel(state.level));

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

    restoreCompactAimBeforePause();

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
  state.playTime = 0;
  state.lastShotAt = 0;
  state.lastHitAt = 0;
  state.running = true;

  state.overlayMode =
    'playing';

  hasAimScreenBeforePause =
    false;

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

  if (isCompactScreen) {
    aimScreenBeforePause.copy(
      aimScreen
    );

    hasAimScreenBeforePause =
      true;
  }

  state.running = false;

  state.overlayMode =
    'pause';

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
  removeFireSword();
  clearUltimateSwordField();

  ultimateRingChargeCount = 0;
  ultimateChargeTimer = 0;

  level20PostUltimateSequenceActive =
  false;

  level20PostUltimateAutoWaves = 0;

  fireSwordCooldownRemaining =
    CONFIG.fireSwordCooldown;

  specialSwordCyclePhase =
    'inactive';

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
    const meteor =
      meteors.pop();

    disposeFireEffectGeometry(
      meteor.userData.fireEffect
    );

    scene.remove(meteor);
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

  while (
    fireExplosions.length
  ) {
    const explosion =
      fireExplosions.pop();

    scene.remove(explosion);

    explosion.userData.ring
      ?.material.dispose();
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
    }, 1500);
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
  if (!isCompactScreen) {
    return;
  }

  const pointerType =
    reticle.classList.contains(
      'is-touch'
    )
      ? 'touch'
      : 'mouse';

  updateAim(
    innerWidth / 2,
    innerHeight / 2 * 0.38,
    pointerType
  );
}

function restoreCompactAimBeforePause() {
  if (
    !isCompactScreen ||
    !hasAimScreenBeforePause
  ) {
    return;
  }

  const pointerType =
    reticle.classList.contains(
      'is-touch'
    )
      ? 'touch'
      : 'mouse';

  updateAim(
    aimScreenBeforePause.x,
    aimScreenBeforePause.y,
    pointerType
  );
}

function updateRelativeTouchAim(
  event
) {
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

    if (pointerIsOverHud) {
      reticle.classList.remove(
        'is-visible'
      );

      stopContinuousFireForPointer(
        event.pointerId
      );

      return;
    }

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

    if (
      usesRelativeTouchAim(
        event.pointerType
      )
    ) {
      return;
    }

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
  if (
    event.button !== 0 &&
    event.pointerType !== 'touch'
  ) {
    return;
  }

  if (
    event.target
      ?.closest?.(
        '#start, #pause-button, .hud'
      )
  ) {
    return;
  }

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

  if (state.running) {
    shootAtAim();
  }
}

canvas.addEventListener(
  'pointerdown',
  beginAimPointerInput,
  {
    passive: false
  }
);

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
  updateFireExplosions(delta);
  updateCamera(delta);

  if (state.running) {
    if (
      continuousFireActive
    ) {
      shootAtAim();
    }

    state.spawnTimer +=
      delta;

    state.playTime +=
      delta;

    const spawnInterval =
      Math.max(
        CONFIG.meteorMinSpawnInterval,
        CONFIG.meteorSpawnEvery -
        state.playTime *
        CONFIG.meteorSpawnAcceleration
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

    updateSpecialSwordSystem(
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
    /*
    * Chỉ cập nhật hình ảnh hạt lửa.
    *
    * Không gọi updateSpecialSwordSystem()
    * vì hàm đó sẽ làm cooldown và lượt
    * tấn công của kiếm lửa tiếp tục chạy.
    */
    updateFireSwordVisual(
      delta
    );

    /*
    * Kiếm tự động vẫn quay quanh nhân vật
    * theo rule pause hiện tại.
    */
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

    projectileLevelTwoSwordTemplate =
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