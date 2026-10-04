import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { Lane, PowerUpType, ThemeMode, CharacterItem, HoverboardItem } from '../types/game';
import { sound } from '../services/sound';

export interface GameEngineEvents {
  onScoreUpdate: (score: number, distance: number, coins: number) => void;
  onPowerUpStart: (type: PowerUpType, duration: number) => void;
  onPowerUpEnd: (type: PowerUpType) => void;
  onHoverboardDestroyed: () => void;
  onTrainDodged: () => void;
  onRoofRun: () => void;
  onRivalPassed: (rivalName: string, score: number) => void;
  onGameOver: (finalScore: number, distance: number, coins: number, trainsDodged: number, roofRuns: number) => void;
}

interface ObstacleObject {
  mesh: THREE.Group;
  lane: number;
  z: number;
  type: 'barrier_low' | 'barrier_high' | 'train' | 'train_ramp';
  boundingBox: THREE.Box3;
  width: number;
  height: number;
  depth: number;
  isTrain: boolean;
  speedZ: number; // for moving oncoming trains
  hasRamp?: boolean;
  dodged?: boolean;
}

interface CollectibleObject {
  mesh: THREE.Object3D;
  lane: number;
  z: number;
  y: number;
  type: 'coin' | PowerUpType;
  collected: boolean;
}

export class SubwaySurfersEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  // Game state
  private isRunning = false;
  private isPaused = false;
  private currentLane: Lane = 0;
  private targetLaneX = 0;
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private velocityY = 0;
  private isGrounded = true;
  private isSliding = false;
  private slideTimer = 0;
  private runSpeed = GAME_CONSTANTS.INITIAL_SPEED;
  private score = 0;
  private distance = 0;
  private coins = 0;
  private trainsDodged = 0;
  private roofRuns = 0;
  private multiplier = 1;

  // Active Power-ups
  private activePowerUps: Map<PowerUpType, number> = new Map();
  private hasHoverboard = false;
  private invulnerableTimer = 0;

  // 3D Objects
  private playerGroup: THREE.Group;
  private characterMeshes: {
    headGroup?: THREE.Group;
    torsoGroup?: THREE.Group;
    neck?: THREE.Mesh;
    leftShoulder?: THREE.Group;
    rightShoulder?: THREE.Group;
    leftElbow?: THREE.Group;
    rightElbow?: THREE.Group;
    leftHip?: THREE.Group;
    rightHip?: THREE.Group;
    leftKnee?: THREE.Group;
    rightKnee?: THREE.Group;
    leftFoot?: THREE.Group;
    rightFoot?: THREE.Group;
    hoverboard?: THREE.Group;
    jetpack?: THREE.Group;
    slideSparks?: THREE.Points;
  } = {};

  private wasGrounded = true;
  private landingSquash = 0;
  private oncomingHornsTriggered: Set<ObstacleObject> = new Set();

  private chunks: THREE.Group[] = [];
  private obstacles: ObstacleObject[] = [];
  private collectibles: CollectibleObject[] = [];
  private particleSystems: THREE.Points[] = [];
  private nextChunkZ = 0;
  private cameraShakeIntensity = 0;

  // Procedural Materials Cache
  private materials: { [key: string]: THREE.Material } = {};

  // Settings & Theme
  private theme: ThemeMode = 'midnight';
  private characterConfig: CharacterItem;
  private hoverboardConfig: HoverboardItem;
  private events: GameEngineEvents;

  // Lights
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private trainHeadlightGroup!: THREE.Group;

  constructor(
    container: HTMLElement,
    character: CharacterItem,
    hoverboard: HoverboardItem,
    theme: ThemeMode,
    events: GameEngineEvents
  ) {
    this.container = container;
    this.characterConfig = character;
    this.hoverboardConfig = hoverboard;
    this.theme = theme;
    this.events = events;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.5, 300);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.playerGroup = new THREE.Group();

    this.initMaterials();
    this.setupLightingAndAtmosphere();
    this.buildPlayerCharacter();
    this.initInitialTrack();

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);

    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private initMaterials() {
    // Reusable physically based materials
    this.materials.rail = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });
    this.materials.railTie = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.9,
    });
    this.materials.groundGravel = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.1,
    });

    // Realistic Subway Train Materials
    this.materials.trainStainless = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Brushed stainless steel
      metalness: 0.92,
      roughness: 0.22,
    });
    this.materials.trainFluting = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.88,
      roughness: 0.35,
    });
    this.materials.trainCabFront = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    this.materials.trainAccent = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.6,
      roughness: 0.35,
    });
    this.materials.trainRubber = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.85,
      metalness: 0.1,
    });
    this.materials.trainWindshield = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.05,
      metalness: 0.95,
      emissive: 0x0369a1,
      emissiveIntensity: 0.2,
    });
    this.materials.trainWindowTint = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    this.materials.trainInterior = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    this.materials.trainDestinationLed = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    this.materials.trainHeadlightGlow = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    this.materials.headlightBeam = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.materials.trainBogie = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.85,
      roughness: 0.45,
    });
    this.materials.trainWheel = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.12,
    });
    this.materials.hazardStripes = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.4,
      metalness: 0.2,
    });

    // Collectibles & Obstacles
    this.materials.coin = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.92,
      roughness: 0.15,
      emissive: 0xeab308,
      emissiveIntensity: 0.35,
    });
    this.materials.barrierRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4,
      metalness: 0.3,
    });
    this.materials.barrierWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.materials.gantryMetal = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.35,
    });

    // Realistic Character Anatomical Materials
    this.materials.skin = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.materials.sneakerMidsole = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.05,
    });
    this.materials.sneakerOutsole = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.8,
      metalness: 0.2,
    });
    this.materials.strapLeather = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.materials.gloveMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.6,
      metalness: 0.2,
    });
  }

  private setupLightingAndAtmosphere() {
    let bgColor = 0x070b19;
    let fogColor = 0x070b19;
    let sunColor = 0xc7d2fe;
    let groundColor = 0x0f172a;

    if (this.theme === 'cyber') {
      bgColor = 0x090514;
      fogColor = 0x110726;
      sunColor = 0xf472b6;
      groundColor = 0x064e3b;
    } else if (this.theme === 'twilight') {
      bgColor = 0x1a1026;
      fogColor = 0x2e1065;
      sunColor = 0xfbbf24;
      groundColor = 0x1c1917;
    }

    this.scene.background = new THREE.Color(bgColor);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.011);

    this.hemiLight = new THREE.HemisphereLight(sunColor, groundColor, 0.8);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(sunColor, 1.2);
    this.dirLight.position.set(15, 30, -20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.camera.left = -15;
    this.dirLight.shadow.camera.right = 15;
    this.dirLight.shadow.camera.top = 25;
    this.dirLight.shadow.camera.bottom = -15;
    this.scene.add(this.dirLight);

    const ambientLight = new THREE.AmbientLight(sunColor, 0.45);
    this.scene.add(ambientLight);
  }

  private buildPlayerCharacter() {
    this.playerGroup = new THREE.Group();

    const charColor = new THREE.Color(this.characterConfig.color);
    const accentColor = new THREE.Color(this.characterConfig.accentColor);
    const hairColor = new THREE.Color(this.characterConfig.hairColor);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.6,
      metalness: 0.05,
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: charColor,
      roughness: 0.35,
      metalness: 0.25,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.5,
    });
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.6,
      metalness: 0.2,
    });
    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.05,
    });
    const shoeTreadMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.8,
      metalness: 0.1,
    });
    const shoeUpperMat = new THREE.MeshStandardMaterial({
      color: charColor,
      roughness: 0.4,
      metalness: 0.2,
    });

    // 1. Pelvis / Hips (Root of body)
    const pelvisGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.22, 12);
    const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvis.position.y = 0.88;
    pelvis.castShadow = true;
    this.playerGroup.add(pelvis);

    // Belt / waistband
    const beltGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 12);
    const belt = new THREE.Mesh(beltGeo, strapMat);
    belt.position.y = 0.08;
    pelvis.add(belt);

    // 2. Torso Group (Pivots at waist for athletic running lean & spine twist)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.1, 0);
    pelvis.add(torsoGroup);
    this.characterMeshes.torsoGroup = torsoGroup;

    // Athletic tapered chest / jacket
    const chestGeo = new THREE.CylinderGeometry(0.31, 0.24, 0.6, 14);
    chestGeo.scale(1.15, 1, 0.85); // Wider shoulders, flatter front-to-back
    const chest = new THREE.Mesh(chestGeo, jacketMat);
    chest.position.y = 0.32;
    chest.castShadow = true;
    torsoGroup.add(chest);

    // Chrome zipper line along center
    const zipGeo = new THREE.BoxGeometry(0.025, 0.52, 0.02);
    const zipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    const zipper = new THREE.Mesh(zipGeo, zipMat);
    zipper.position.set(0, 0.32, 0.21);
    torsoGroup.add(zipper);

    // Tactical cross-body parkour sling strap & pouch
    const strapGeo = new THREE.BoxGeometry(0.08, 0.65, 0.02);
    const strap = new THREE.Mesh(strapGeo, strapMat);
    strap.position.set(0, 0.32, 0.21);
    strap.rotation.z = -0.55;
    torsoGroup.add(strap);

    const pouchGeo = new THREE.BoxGeometry(0.18, 0.14, 0.08);
    const pouch = new THREE.Mesh(pouchGeo, strapMat);
    pouch.position.set(-0.12, 0.26, 0.23);
    pouch.castShadow = true;
    torsoGroup.add(pouch);

    // Jacket collar / draped hood on back
    const hoodGeo = new THREE.BoxGeometry(0.34, 0.22, 0.14);
    const hood = new THREE.Mesh(hoodGeo, jacketMat);
    hood.position.set(0, 0.52, -0.16);
    hood.castShadow = true;
    torsoGroup.add(hood);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.15, 10);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.68;
    torsoGroup.add(neck);
    this.characterMeshes.neck = neck;

    // 3. Head Group (Pivots on neck)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.78, 0);
    torsoGroup.add(headGroup);
    this.characterMeshes.headGroup = headGroup;

    // Anatomical head shape
    const headGeo = new THREE.SphereGeometry(0.2, 16, 14);
    headGeo.scale(0.88, 1.08, 0.96);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 0.12;
    head.castShadow = true;
    headGroup.add(head);

    // Sculpted hair with volume
    const hairGroup = new THREE.Group();
    const hairBaseGeo = new THREE.SphereGeometry(0.21, 14, 12);
    hairBaseGeo.scale(0.92, 0.75, 1.02);
    const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
    hairBase.position.set(0, 0.22, -0.03);
    hairGroup.add(hairBase);

    // Front styled hair bangs / swoop
    const bangsGeo = new THREE.BoxGeometry(0.24, 0.1, 0.12);
    const bangs = new THREE.Mesh(bangsGeo, hairMat);
    bangs.position.set(0, 0.27, 0.14);
    bangs.rotation.x = -0.25;
    hairGroup.add(bangs);
    headGroup.add(hairGroup);

    // Eyewear / Accessories
    if (this.characterConfig.accessory === 'visor' || this.characterConfig.accessory === 'goggles') {
      const visorFrame = new THREE.BoxGeometry(0.38, 0.08, 0.18);
      const visorLensMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        roughness: 0.1,
        metalness: 0.9,
      });
      const visorMesh = new THREE.Mesh(visorFrame, visorLensMat);
      visorMesh.position.set(0, 0.14, 0.12);
      headGroup.add(visorMesh);
    } else if (this.characterConfig.accessory === 'headphones') {
      const hpBandGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 16, Math.PI);
      const hpBandMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      const hpBand = new THREE.Mesh(hpBandGeo, hpBandMat);
      hpBand.rotation.x = Math.PI / 2;
      hpBand.position.y = 0.26;
      headGroup.add(hpBand);

      // Earcups
      const earcupGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
      const leftCup = new THREE.Mesh(earcupGeo, jacketMat);
      leftCup.rotation.z = Math.PI / 2;
      leftCup.position.set(-0.2, 0.14, 0);
      const rightCup = new THREE.Mesh(earcupGeo, jacketMat);
      rightCup.rotation.z = Math.PI / 2;
      rightCup.position.set(0.2, 0.14, 0);
      headGroup.add(leftCup, rightCup);
    } else if (this.characterConfig.accessory === 'mask') {
      const maskGeo = new THREE.BoxGeometry(0.26, 0.12, 0.14);
      const maskMesh = new THREE.Mesh(maskGeo, strapMat);
      maskMesh.position.set(0, 0.06, 0.13);
      headGroup.add(maskMesh);
    }

    // 4. Arms & Hands Hierarchy (Shoulder -> Bicep -> Elbow -> Forearm -> Gloved Hand)
    // Left Arm
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.35, 0.52, 0);
    torsoGroup.add(leftShoulder);
    this.characterMeshes.leftShoulder = leftShoulder;

    const leftDeltoid = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), jacketMat);
    leftShoulder.add(leftDeltoid);

    const leftUpperArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.32, 10);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, jacketMat);
    leftUpperArm.position.y = -0.16;
    leftUpperArm.castShadow = true;
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.position.set(0, -0.32, 0);
    leftShoulder.add(leftElbow);
    this.characterMeshes.leftElbow = leftElbow;

    const leftForearmGeo = new THREE.CylinderGeometry(0.068, 0.055, 0.28, 10);
    const leftForearm = new THREE.Mesh(leftForearmGeo, skinMat);
    leftForearm.position.y = -0.14;
    leftForearm.castShadow = true;
    leftElbow.add(leftForearm);

    // Left hand glove
    const leftHandGeo = new THREE.BoxGeometry(0.09, 0.12, 0.06);
    const leftHand = new THREE.Mesh(leftHandGeo, gloveMat);
    leftHand.position.set(0, -0.3, 0);
    leftHand.castShadow = true;
    leftElbow.add(leftHand);

    // Right Arm
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.35, 0.52, 0);
    torsoGroup.add(rightShoulder);
    this.characterMeshes.rightShoulder = rightShoulder;

    const rightDeltoid = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), jacketMat);
    rightShoulder.add(rightDeltoid);

    const rightUpperArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.32, 10);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, jacketMat);
    rightUpperArm.position.y = -0.16;
    rightUpperArm.castShadow = true;
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -0.32, 0);
    rightShoulder.add(rightElbow);
    this.characterMeshes.rightElbow = rightElbow;

    const rightForearmGeo = new THREE.CylinderGeometry(0.068, 0.055, 0.28, 10);
    const rightForearm = new THREE.Mesh(rightForearmGeo, skinMat);
    rightForearm.position.y = -0.14;
    rightForearm.castShadow = true;
    rightElbow.add(rightForearm);

    // Right hand glove
    const rightHandGeo = new THREE.BoxGeometry(0.09, 0.12, 0.06);
    const rightHand = new THREE.Mesh(rightHandGeo, gloveMat);
    rightHand.position.set(0, -0.3, 0);
    rightHand.castShadow = true;
    rightElbow.add(rightHand);

    // 5. Legs & Running Sneakers Hierarchy (Hip -> Thigh -> Knee -> Calf -> Sneaker)
    // Left Leg
    const leftHip = new THREE.Group();
    leftHip.position.set(-0.16, -0.06, 0);
    pelvis.add(leftHip);
    this.characterMeshes.leftHip = leftHip;

    const leftThighGeo = new THREE.CylinderGeometry(0.12, 0.095, 0.42, 12);
    const leftThigh = new THREE.Mesh(leftThighGeo, pantsMat);
    leftThigh.position.y = -0.21;
    leftThigh.castShadow = true;
    leftHip.add(leftThigh);

    // Cargo pocket detail
    const pocketGeo = new THREE.BoxGeometry(0.06, 0.14, 0.12);
    const leftPocket = new THREE.Mesh(pocketGeo, pantsMat);
    leftPocket.position.set(-0.1, -0.2, 0);
    leftHip.add(leftPocket);

    const leftKnee = new THREE.Group();
    leftKnee.position.set(0, -0.42, 0);
    leftHip.add(leftKnee);
    this.characterMeshes.leftKnee = leftKnee;

    // Knee cap protector
    const kneeCapGeo = new THREE.BoxGeometry(0.12, 0.1, 0.07);
    const leftKneeCap = new THREE.Mesh(kneeCapGeo, strapMat);
    leftKneeCap.position.set(0, 0, 0.06);
    leftKnee.add(leftKneeCap);

    const leftCalfGeo = new THREE.CylinderGeometry(0.09, 0.072, 0.38, 12);
    const leftCalf = new THREE.Mesh(leftCalfGeo, pantsMat);
    leftCalf.position.y = -0.19;
    leftCalf.castShadow = true;
    leftKnee.add(leftCalf);

    // Left Athletic Running Sneaker
    const leftFoot = new THREE.Group();
    leftFoot.position.set(0, -0.38, 0.05);
    leftKnee.add(leftFoot);
    this.characterMeshes.leftFoot = leftFoot;

    // Sculpted sneaker midsole (thick cushioning)
    const soleGeo = new THREE.BoxGeometry(0.18, 0.09, 0.4);
    const leftSole = new THREE.Mesh(soleGeo, shoeSoleMat);
    leftSole.position.y = -0.02;
    leftSole.castShadow = true;
    leftFoot.add(leftSole);

    // Grippy outsole tread
    const treadGeo = new THREE.BoxGeometry(0.185, 0.03, 0.41);
    const leftTread = new THREE.Mesh(treadGeo, shoeTreadMat);
    leftTread.position.y = -0.065;
    leftFoot.add(leftTread);

    // Upper shoe chassis
    const upperGeo = new THREE.BoxGeometry(0.16, 0.14, 0.34);
    const leftUpper = new THREE.Mesh(upperGeo, shoeUpperMat);
    leftUpper.position.set(0, 0.06, 0.02);
    leftUpper.castShadow = true;
    leftFoot.add(leftUpper);

    // Laces & tongue
    const lacesGeo = new THREE.BoxGeometry(0.09, 0.05, 0.16);
    const leftLaces = new THREE.Mesh(lacesGeo, shoeSoleMat);
    leftLaces.position.set(0, 0.12, 0.06);
    leftFoot.add(leftLaces);

    // Right Leg
    const rightHip = new THREE.Group();
    rightHip.position.set(0.16, -0.06, 0);
    pelvis.add(rightHip);
    this.characterMeshes.rightHip = rightHip;

    const rightThighGeo = new THREE.CylinderGeometry(0.12, 0.095, 0.42, 12);
    const rightThigh = new THREE.Mesh(rightThighGeo, pantsMat);
    rightThigh.position.y = -0.21;
    rightThigh.castShadow = true;
    rightHip.add(rightThigh);

    // Cargo pocket detail
    const rightPocket = new THREE.Mesh(pocketGeo, pantsMat);
    rightPocket.position.set(0.1, -0.2, 0);
    rightHip.add(rightPocket);

    const rightKnee = new THREE.Group();
    rightKnee.position.set(0, -0.42, 0);
    rightHip.add(rightKnee);
    this.characterMeshes.rightKnee = rightKnee;

    const rightKneeCap = new THREE.Mesh(kneeCapGeo, strapMat);
    rightKneeCap.position.set(0, 0, 0.06);
    rightKnee.add(rightKneeCap);

    const rightCalfGeo = new THREE.CylinderGeometry(0.09, 0.072, 0.38, 12);
    const rightCalf = new THREE.Mesh(rightCalfGeo, pantsMat);
    rightCalf.position.y = -0.19;
    rightCalf.castShadow = true;
    rightKnee.add(rightCalf);

    // Right Athletic Running Sneaker
    const rightFoot = new THREE.Group();
    rightFoot.position.set(0, -0.38, 0.05);
    rightKnee.add(rightFoot);
    this.characterMeshes.rightFoot = rightFoot;

    const rightSole = new THREE.Mesh(soleGeo, shoeSoleMat);
    rightSole.position.y = -0.02;
    rightSole.castShadow = true;
    rightFoot.add(rightSole);

    const rightTread = new THREE.Mesh(treadGeo, shoeTreadMat);
    rightTread.position.y = -0.065;
    rightFoot.add(rightTread);

    const rightUpper = new THREE.Mesh(upperGeo, shoeUpperMat);
    rightUpper.position.set(0, 0.06, 0.02);
    rightUpper.castShadow = true;
    rightFoot.add(rightUpper);

    const rightLaces = new THREE.Mesh(lacesGeo, shoeSoleMat);
    rightLaces.position.set(0, 0.12, 0.06);
    rightFoot.add(rightLaces);

    // 6. Sliding Friction Sparks Particles (Active when sliding on track rails)
    const sparkCount = 30;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 0.4;
      sparkPos[i * 3 + 1] = Math.random() * 0.2;
      sparkPos[i * 3 + 2] = Math.random() * 0.8;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const slideSparks = new THREE.Points(sparkGeo, sparkMat);
    slideSparks.position.set(0, 0.05, 0.2);
    slideSparks.visible = false;
    this.playerGroup.add(slideSparks);
    this.characterMeshes.slideSparks = slideSparks;

    // 7. Hoverboard (Aerodynamic carbon deck with dual neon thrusters)
    const boardGroup = new THREE.Group();
    const boardDeckGeo = new THREE.BoxGeometry(0.82, 0.08, 1.95);
    const boardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.hoverboardConfig.color),
      roughness: 0.25,
      metalness: 0.85,
    });
    const boardDeck = new THREE.Mesh(boardDeckGeo, boardMat);
    boardDeck.castShadow = true;
    boardGroup.add(boardDeck);

    // Glowing perimeter rail
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.hoverboardConfig.glowColor) });
    const edgeGeo = new THREE.BoxGeometry(0.88, 0.04, 2.0);
    const glowEdge = new THREE.Mesh(edgeGeo, glowMat);
    boardGroup.add(glowEdge);

    // Dual underside magnetic ion repulsors
    const repulsorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12);
    const leftRepulsor = new THREE.Mesh(repulsorGeo, glowMat);
    leftRepulsor.position.set(-0.25, -0.05, -0.4);
    const rightRepulsor = new THREE.Mesh(repulsorGeo, glowMat);
    rightRepulsor.position.set(0.25, -0.05, -0.4);
    boardGroup.add(leftRepulsor, rightRepulsor);

    boardGroup.position.set(0, 0.08, 0);
    boardGroup.visible = false;
    this.playerGroup.add(boardGroup);
    this.characterMeshes.hoverboard = boardGroup;

    // 8. Jetpack (Dual aerospace grade booster cylinders)
    const jetpackGroup = new THREE.Group();
    const tankGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.62, 14);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
    const nozzleMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    const leftTank = new THREE.Mesh(tankGeo, tankMat);
    leftTank.position.set(-0.16, 0, 0);
    leftTank.castShadow = true;
    const rightTank = new THREE.Mesh(tankGeo, tankMat);
    rightTank.position.set(0.16, 0, 0);
    rightTank.castShadow = true;

    const leftNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), nozzleMat);
    leftNozzle.position.set(-0.16, -0.36, 0);
    leftNozzle.rotation.x = Math.PI;

    const rightNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), nozzleMat);
    rightNozzle.position.set(0.16, -0.36, 0);
    rightNozzle.rotation.x = Math.PI;

    jetpackGroup.add(leftTank, rightTank, leftNozzle, rightNozzle);
    jetpackGroup.position.set(0, 1.25, -0.24);
    jetpackGroup.visible = false;
    this.playerGroup.add(jetpackGroup);
    this.characterMeshes.jetpack = jetpackGroup;

    this.playerGroup.position.set(0, 0, GAME_CONSTANTS.PLAYER_Z);
    this.scene.add(this.playerGroup);
  }

  private initInitialTrack() {
    this.nextChunkZ = 0;
    // Pre-generate 7 chunks ahead
    for (let i = 0; i < GAME_CONSTANTS.SPAWN_AHEAD_CHUNKS; i++) {
      this.generateChunk(i === 0);
    }
  }

  private generateChunk(isFirstChunk = false) {
    const chunk = new THREE.Group();
    const chunkZ = this.nextChunkZ;
    const length = GAME_CONSTANTS.TRACK_CHUNK_LENGTH;

    // 1. Ground ballast bed
    const groundGeo = new THREE.PlaneGeometry(16, length);
    const ground = new THREE.Mesh(groundGeo, this.materials.groundGravel);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, chunkZ - length / 2);
    ground.receiveShadow = true;
    chunk.add(ground);

    // 2. Rails & Cross ties for each of the 3 lanes
    const railGeo = new THREE.BoxGeometry(0.08, 0.14, length);
    const tieGeo = new THREE.BoxGeometry(2.4, 0.1, 0.28);

    GAME_CONSTANTS.LANE_X.forEach((laneX) => {
      // Left rail
      const leftRail = new THREE.Mesh(railGeo, this.materials.rail);
      leftRail.position.set(laneX - 0.75, 0.07, chunkZ - length / 2);
      leftRail.receiveShadow = true;
      chunk.add(leftRail);

      // Right rail
      const rightRail = new THREE.Mesh(railGeo, this.materials.rail);
      rightRail.position.set(laneX + 0.75, 0.07, chunkZ - length / 2);
      rightRail.receiveShadow = true;
      chunk.add(rightRail);

      // Ties every 1.5m
      const tieCount = Math.floor(length / 1.5);
      for (let t = 0; t < tieCount; t++) {
        const tie = new THREE.Mesh(tieGeo, this.materials.railTie);
        tie.position.set(laneX, 0.03, chunkZ - (t * 1.5 + 0.75));
        tie.receiveShadow = true;
        chunk.add(tie);
      }
    });

    // 3. City Skyline buildings on flanks
    this.generateSkylineBuildings(chunk, chunkZ, length);

    // 4. Overhead signal gantry every chunk
    this.generateGantry(chunk, chunkZ - length / 2);

    // 5. Procedural obstacles and coins (skip on the very first starting runway)
    if (!isFirstChunk) {
      this.populateObstaclesAndCoins(chunk, chunkZ, length);
    }

    this.scene.add(chunk);
    this.chunks.push(chunk);
    this.nextChunkZ -= length;
  }

  private generateSkylineBuildings(chunk: THREE.Group, chunkZ: number, length: number) {
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.3,
    });
    const windowMat = new THREE.MeshBasicMaterial({
      color: this.theme === 'cyber' ? 0x06b6d4 : 0xfde047,
    });

    const sides = [-14, 14];
    sides.forEach((sideX) => {
      const numBldgs = 3;
      for (let b = 0; b < numBldgs; b++) {
        const width = 6 + Math.random() * 4;
        const depth = 8 + Math.random() * 6;
        const height = 18 + Math.random() * 32;

        const bldgGeo = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeo, buildingMat);
        const bldgZ = chunkZ - (b * (length / numBldgs) + depth / 2);
        bldg.position.set(sideX + (sideX > 0 ? width / 2 : -width / 2), height / 2, bldgZ);
        chunk.add(bldg);

        // Windows illuminated pattern
        const winGeo = new THREE.PlaneGeometry(width * 0.7, height * 0.6);
        const winMesh = new THREE.Mesh(winGeo, windowMat);
        winMesh.position.set(
          sideX > 0 ? -width / 2 - 0.05 : width / 2 + 0.05,
          0,
          0
        );
        winMesh.rotation.y = sideX > 0 ? -Math.PI / 2 : Math.PI / 2;
        bldg.add(winMesh);
      }
    });
  }

  private generateGantry(chunk: THREE.Group, zPos: number) {
    const gantry = new THREE.Group();
    // Posts
    const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 6.5, 8);
    const leftPost = new THREE.Mesh(postGeo, this.materials.gantryMetal);
    leftPost.position.set(-5.5, 3.25, 0);
    const rightPost = new THREE.Mesh(postGeo, this.materials.gantryMetal);
    rightPost.position.set(5.5, 3.25, 0);

    // Cross beam
    const beamGeo = new THREE.BoxGeometry(11.4, 0.35, 0.35);
    const beam = new THREE.Mesh(beamGeo, this.materials.gantryMetal);
    beam.position.set(0, 6.2, 0);

    // Overhead signal lamps
    GAME_CONSTANTS.LANE_X.forEach((laneX) => {
      const lampGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
      const lamp = new THREE.Mesh(lampGeo, this.materials.trainMetal);
      lamp.position.set(laneX, 5.8, 0);

      const lightGeo = new THREE.CircleGeometry(0.14, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0x22c55e : 0xef4444 });
      const lightBulb = new THREE.Mesh(lightGeo, lightMat);
      lightBulb.position.set(0, 0, 0.16);
      lamp.add(lightBulb);

      gantry.add(lamp);
    });

    gantry.add(leftPost, rightPost, beam);
    gantry.position.z = zPos;
    chunk.add(gantry);
  }

  private populateObstaclesAndCoins(chunk: THREE.Group, chunkZ: number, length: number) {
    const lanes = [-1, 0, 1] as Lane[];
    const pattern = Math.random();

    if (pattern < 0.35) {
      // Train pattern in 1 or 2 lanes
      const trainLane = lanes[Math.floor(Math.random() * lanes.length)];
      const hasRamp = Math.random() > 0.4;
      this.createTrain(chunk, trainLane, chunkZ - length * 0.45, hasRamp);

      // Other lanes get hurdle or coins
      lanes.filter((l) => l !== trainLane).forEach((otherLane) => {
        if (Math.random() > 0.5) {
          this.createBarrier(chunk, otherLane, chunkZ - length * 0.3, 'barrier_low');
          this.createCoinArch(chunk, otherLane, chunkZ - length * 0.3);
        } else {
          this.createCoinLine(chunk, otherLane, chunkZ - length * 0.2, 6);
        }
      });
    } else if (pattern < 0.7) {
      // Barrier combinations
      const blockedLane = lanes[Math.floor(Math.random() * lanes.length)];
      const barrierType = Math.random() > 0.5 ? 'barrier_low' : 'barrier_high';
      this.createBarrier(chunk, blockedLane, chunkZ - length * 0.3, barrierType);

      if (barrierType === 'barrier_low') {
        this.createCoinArch(chunk, blockedLane, chunkZ - length * 0.3);
      } else {
        // High barrier -> slide under with low coin line
        this.createCoinLine(chunk, blockedLane, chunkZ - length * 0.35, 4, 0.3);
      }

      // Collectible power-up chance in open lane
      const openLanes = lanes.filter((l) => l !== blockedLane);
      const chosenOpen = openLanes[0];
      if (Math.random() < 0.25) {
        this.createPowerUp(chunk, chosenOpen, chunkZ - length * 0.5);
      } else {
        this.createCoinLine(chunk, chosenOpen, chunkZ - length * 0.4, 5);
      }
    } else {
      // Full coin rush with moving oncoming train in one lane!
      const oncomingLane = lanes[Math.floor(Math.random() * lanes.length)];
      this.createTrain(chunk, oncomingLane, chunkZ - length * 0.7, false, true);

      lanes.filter((l) => l !== oncomingLane).forEach((l) => {
        this.createCoinLine(chunk, l, chunkZ - length * 0.2, 7);
      });
    }
  }

  private createBarrier(
    chunk: THREE.Group,
    lane: Lane,
    zPos: number,
    type: 'barrier_low' | 'barrier_high'
  ) {
    const laneX = GAME_CONSTANTS.LANE_X[lane + 1];
    const group = new THREE.Group();

    if (type === 'barrier_low') {
      // Jump hurdle (height 0.85m)
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.85, 8);
      const p1 = new THREE.Mesh(postGeo, this.materials.barrierRed);
      p1.position.set(-0.9, 0.42, 0);
      const p2 = new THREE.Mesh(postGeo, this.materials.barrierRed);
      p2.position.set(0.9, 0.42, 0);

      const barGeo = new THREE.BoxGeometry(2.0, 0.35, 0.12);
      const bar = new THREE.Mesh(barGeo, this.materials.barrierWhite);
      bar.position.set(0, 0.55, 0);
      bar.castShadow = true;

      group.add(p1, p2, bar);
    } else {
      // Slide overhead barrier (height ~1.7m, clearance 0.9m)
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8);
      const p1 = new THREE.Mesh(postGeo, this.materials.barrierRed);
      p1.position.set(-0.95, 1.15, 0);
      const p2 = new THREE.Mesh(postGeo, this.materials.barrierRed);
      p2.position.set(0.95, 1.15, 0);

      const signGeo = new THREE.BoxGeometry(2.1, 0.95, 0.14);
      const sign = new THREE.Mesh(signGeo, this.materials.barrierRed);
      sign.position.set(0, 1.75, 0);
      sign.castShadow = true;

      // Neon warning stripes
      const stripeGeo = new THREE.BoxGeometry(1.8, 0.2, 0.16);
      const stripe = new THREE.Mesh(stripeGeo, this.materials.barrierWhite);
      stripe.position.set(0, 1.75, 0);
      sign.add(stripe);

      group.add(p1, p2, sign);
    }

    group.position.set(laneX, 0, zPos);
    chunk.add(group);

    const bBox = new THREE.Box3();
    bBox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z: zPos,
      type,
      boundingBox: bBox,
      width: 2.0,
      height: type === 'barrier_low' ? 0.85 : 2.2,
      depth: 0.3,
      isTrain: false,
      speedZ: 0,
    });
  }

  private createTrain(
    chunk: THREE.Group,
    lane: Lane,
    zPos: number,
    hasRamp = false,
    isOncoming = false
  ) {
    const laneX = GAME_CONSTANTS.LANE_X[lane + 1];
    const group = new THREE.Group();

    const tWidth = 2.45;
    const tHeight = 2.65;
    const tLength = 16.5;

    // 1. Stainless Steel Main Car Body
    const bodyGeo = new THREE.BoxGeometry(tWidth, tHeight * 0.88, tLength);
    const body = new THREE.Mesh(bodyGeo, this.materials.trainStainless);
    body.position.y = tHeight / 2 + 0.32;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Corrugated Lower Fluting Panels (Realistic NYC / Tokyo subway horizontal ribbed side panels)
    const flutingGeo = new THREE.BoxGeometry(tWidth + 0.04, 0.65, tLength * 0.98);
    const fluting = new THREE.Mesh(flutingGeo, this.materials.trainFluting);
    fluting.position.y = 0.85;
    group.add(fluting);

    // Livery Accent Stripe (Subway color line)
    const stripeGeo = new THREE.BoxGeometry(tWidth + 0.05, 0.1, tLength * 0.98);
    const stripe = new THREE.Mesh(stripeGeo, this.materials.trainAccent);
    stripe.position.y = 1.32;
    group.add(stripe);

    // 3. Front Aerodynamic Cab (Tapered rake front)
    const cabGroup = new THREE.Group();
    cabGroup.position.set(0, tHeight / 2 + 0.32, tLength / 2);

    // Sloped cab nose
    const cabNoseGeo = new THREE.BoxGeometry(tWidth * 0.98, tHeight * 0.86, 1.4);
    const cabNose = new THREE.Mesh(cabNoseGeo, this.materials.trainCabFront);
    cabNose.position.z = 0.7;
    cabGroup.add(cabNose);

    // Front windshield glass
    const windshieldGeo = new THREE.PlaneGeometry(tWidth * 0.82, 0.75);
    const windshield = new THREE.Mesh(windshieldGeo, this.materials.trainWindshield);
    windshield.position.set(0, 0.28, 1.42);
    cabGroup.add(windshield);

    // Windshield black rubber gasket frame
    const frameGeo = new THREE.PlaneGeometry(tWidth * 0.86, 0.8);
    const frameMesh = new THREE.Mesh(frameGeo, this.materials.trainRubber);
    frameMesh.position.set(0, 0.28, 1.41);
    cabGroup.add(frameMesh);

    // Wiper blades
    const wiperGeo = new THREE.BoxGeometry(0.4, 0.02, 0.02);
    const wiper = new THREE.Mesh(wiperGeo, this.materials.trainRubber);
    wiper.rotation.z = 0.3;
    wiper.position.set(0.2, 0.15, 1.43);
    cabGroup.add(wiper);

    // Destination LED Matrix Display ("METRO EXP")
    const destLedGeo = new THREE.BoxGeometry(1.2, 0.18, 0.05);
    const destLed = new THREE.Mesh(destLedGeo, this.materials.trainDestinationLed);
    destLed.position.set(0, 0.82, 1.42);
    cabGroup.add(destLed);

    // Projector Headlights with Realistic Volumetric Light Cones
    const hlHousingGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16);
    hlHousingGeo.rotateX(Math.PI / 2);

    const leftHl = new THREE.Mesh(hlHousingGeo, this.materials.trainHeadlightGlow);
    leftHl.position.set(-0.75, -0.32, 1.42);
    const rightHl = new THREE.Mesh(hlHousingGeo, this.materials.trainHeadlightGlow);
    rightHl.position.set(0.75, -0.32, 1.42);
    cabGroup.add(leftHl, rightHl);

    // Volumetric forward light beams illuminating track
    const beamGeo = new THREE.ConeGeometry(1.8, 14, 16, 1, true);
    beamGeo.rotateX(-Math.PI / 2);
    const leftBeam = new THREE.Mesh(beamGeo, this.materials.headlightBeam);
    leftBeam.position.set(-0.75, -0.32, 8.4);
    const rightBeam = new THREE.Mesh(beamGeo, this.materials.headlightBeam);
    rightBeam.position.set(0.75, -0.32, 8.4);
    cabGroup.add(leftBeam, rightBeam);

    // Red clearance marker lights at top corners
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const leftMarker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), markerMat);
    leftMarker.position.set(-1.0, 0.95, 1.41);
    const rightMarker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), markerMat);
    rightMarker.position.set(1.0, 0.95, 1.41);
    cabGroup.add(leftMarker, rightMarker);

    // Front Knuckle Coupler & Cowcatcher Pilot Plow with Hazard Stripes
    const couplerGeo = new THREE.BoxGeometry(0.3, 0.25, 0.5);
    const coupler = new THREE.Mesh(couplerGeo, this.materials.trainBogie);
    coupler.position.set(0, -0.85, 1.45);
    cabGroup.add(coupler);

    const plowGeo = new THREE.BoxGeometry(tWidth * 0.9, 0.35, 0.2);
    const plow = new THREE.Mesh(plowGeo, this.materials.hazardStripes);
    plow.position.set(0, -1.05, 1.35);
    cabGroup.add(plow);

    group.add(cabGroup);

    // 4. Passenger Windows & Doors along the sides
    const numDoors = 3;
    for (let d = 0; d < numDoors; d++) {
      const doorZ = (d - 1) * (tLength * 0.32);

      // Left door
      const doorGeo = new THREE.BoxGeometry(0.04, 1.6, 1.3);
      const leftDoor = new THREE.Mesh(doorGeo, this.materials.trainStainless);
      leftDoor.position.set(-tWidth / 2 - 0.02, 1.35, doorZ);
      group.add(leftDoor);

      // Yellow caution door frame
      const frameStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.62, 0.08), this.materials.hazardStripes);
      frameStripe.position.set(-tWidth / 2 - 0.025, 1.35, doorZ + 0.65);
      group.add(frameStripe);

      // Right door
      const rightDoor = new THREE.Mesh(doorGeo, this.materials.trainStainless);
      rightDoor.position.set(tWidth / 2 + 0.02, 1.35, doorZ);
      group.add(rightDoor);

      const rightFrameStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.62, 0.08), this.materials.hazardStripes);
      rightFrameStripe.position.set(tWidth / 2 + 0.025, 1.35, doorZ + 0.65);
      group.add(rightFrameStripe);
    }

    // Tinted Windows with Warm Illuminated Interior Glow
    const winGeo = new THREE.BoxGeometry(0.05, 0.65, tLength * 0.75);
    const leftWin = new THREE.Mesh(winGeo, this.materials.trainWindowTint);
    leftWin.position.set(-tWidth / 2 - 0.02, 1.7, 0);
    const rightWin = new THREE.Mesh(winGeo, this.materials.trainWindowTint);
    rightWin.position.set(tWidth / 2 + 0.02, 1.7, 0);
    group.add(leftWin, rightWin);

    // Glowing passenger cabin interior core
    const interiorGeo = new THREE.BoxGeometry(tWidth * 0.7, 0.45, tLength * 0.72);
    const interiorMesh = new THREE.Mesh(interiorGeo, this.materials.trainInterior);
    interiorMesh.position.set(0, 1.7, 0);
    group.add(interiorMesh);

    // 5. Undercarriage: Realistic 2-Axle Bogie Trucks with Flanged Steel Wheels
    const bogieZPositions = [tLength * 0.32, -tLength * 0.32];
    bogieZPositions.forEach((bZ) => {
      const bogieGroup = new THREE.Group();
      bogieGroup.position.set(0, 0.28, bZ);

      // Cast steel bogie frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 2.2), this.materials.trainBogie);
      bogieGroup.add(frame);

      // Front & rear axles on this bogie
      [-0.75, 0.75].forEach((axleZ) => {
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), this.materials.trainBogie);
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, -0.05, axleZ);
        bogieGroup.add(axle);

        // Flanged steel wheels resting on track rails
        const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        const leftWheel = new THREE.Mesh(wheelGeo, this.materials.trainWheel);
        leftWheel.position.set(-0.75, -0.05, axleZ);
        leftWheel.castShadow = true;

        const rightWheel = new THREE.Mesh(wheelGeo, this.materials.trainWheel);
        rightWheel.position.set(0.75, -0.05, axleZ);
        rightWheel.castShadow = true;

        bogieGroup.add(leftWheel, rightWheel);
      });

      group.add(bogieGroup);
    });

    // Central Underfloor Air Tanks & Traction Inverter Boxes
    const eqBox1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 3.2), this.materials.trainBogie);
    eqBox1.position.set(0, 0.25, 0);
    const airTank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.5, 12), this.materials.trainBogie);
    airTank.rotation.x = Math.PI / 2;
    airTank.position.set(-0.5, 0.22, 0);
    group.add(eqBox1, airTank);

    // 6. Arched Aerodynamic Roof & HVAC Air Conditioning Units
    const roofCurveGeo = new THREE.CylinderGeometry(tWidth * 0.52, tWidth * 0.52, tLength, 16, 1, false, 0, Math.PI);
    roofCurveGeo.rotateZ(Math.PI / 2);
    roofCurveGeo.rotateY(Math.PI / 2);
    const roofCurve = new THREE.Mesh(roofCurveGeo, this.materials.trainStainless);
    roofCurve.position.set(0, tHeight + 0.32, 0);
    group.add(roofCurve);

    // Roof walkway with non-slip texture (where runner lands)
    const walkwayGeo = new THREE.BoxGeometry(tWidth * 0.75, 0.08, tLength);
    const walkway = new THREE.Mesh(walkwayGeo, this.materials.railTie);
    walkway.position.set(0, tHeight + 0.36, 0);
    walkway.receiveShadow = true;
    group.add(walkway);

    // Rooftop HVAC units with ventilation grilles
    [-3.5, 3.5].forEach((hvacZ) => {
      const hvacGeo = new THREE.BoxGeometry(1.4, 0.35, 2.2);
      const hvac = new THREE.Mesh(hvacGeo, this.materials.trainFluting);
      hvac.position.set(0, tHeight + 0.54, hvacZ);
      hvac.castShadow = true;
      group.add(hvac);

      // Grille top
      const grilleGeo = new THREE.PlaneGeometry(1.1, 1.8);
      const grille = new THREE.Mesh(grilleGeo, this.materials.trainRubber);
      grille.rotation.x = -Math.PI / 2;
      grille.position.set(0, tHeight + 0.72, hvacZ);
      group.add(grille);
    });

    // 7. Heavy-Duty Steel Loading Ramp with Yellow Hazard Chevrons (If Train Has Ramp)
    if (hasRamp) {
      const rampLength = 5.2;
      const rampWidth = tWidth * 0.85;
      const rampHeight = tHeight + 0.36;

      const rampGeo = new THREE.BufferGeometry();
      const hw = rampWidth / 2;
      // Sloped wedge prism
      const vertices = new Float32Array([
        -hw, 0, rampLength, // 0: ground front left
        hw, 0, rampLength,  // 1: ground front right
        -hw, rampHeight, 0, // 2: roof top left
        hw, rampHeight, 0,  // 3: roof top right
      ]);
      const indices = [0, 1, 2, 1, 3, 2];
      rampGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      rampGeo.setIndex(indices);
      rampGeo.computeVertexNormals();

      const rampMesh = new THREE.Mesh(rampGeo, this.materials.hazardStripes);
      rampMesh.position.set(0, 0, tLength / 2);
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      group.add(rampMesh);

      // Side Guide Safety Railings on Ramp
      const railAngle = Math.atan2(rampHeight, rampLength);
      const railLen = Math.sqrt(rampHeight * rampHeight + rampLength * rampLength);

      const railGeo = new THREE.CylinderGeometry(0.04, 0.04, railLen, 8);
      railGeo.rotateX(railAngle);

      const leftRampRail = new THREE.Mesh(railGeo, this.materials.barrierRed);
      leftRampRail.position.set(-hw, rampHeight / 2 + 0.25, tLength / 2 + rampLength / 2);
      const rightRampRail = new THREE.Mesh(railGeo, this.materials.barrierRed);
      rightRampRail.position.set(hw, rampHeight / 2 + 0.25, tLength / 2 + rampLength / 2);
      group.add(leftRampRail, rightRampRail);
    }

    group.position.set(laneX, 0, zPos);
    chunk.add(group);

    const bBox = new THREE.Box3();
    bBox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z: zPos,
      type: hasRamp ? 'train_ramp' : 'train',
      boundingBox: bBox,
      width: tWidth,
      height: tHeight + 0.4,
      depth: tLength,
      isTrain: true,
      speedZ: isOncoming ? 14 : 0, // oncoming moves fast towards player!
      hasRamp,
    });

    // Coins on train roof!
    this.createCoinLine(chunk, lane, zPos, 5, tHeight + 0.95);
  }

  private createCoinArch(chunk: THREE.Group, lane: Lane, centerZ: number) {
    const laneX = GAME_CONSTANTS.LANE_X[lane + 1];
    const coinCount = 5;
    for (let i = 0; i < coinCount; i++) {
      const angle = (i / (coinCount - 1)) * Math.PI;
      const y = 0.8 + Math.sin(angle) * 2.2;
      const z = centerZ - (i - 2) * 1.8;

      const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12), this.materials.coin);
      coinMesh.rotation.x = Math.PI / 2;
      coinMesh.position.set(laneX, y, z);
      coinMesh.castShadow = true;
      chunk.add(coinMesh);

      this.collectibles.push({
        mesh: coinMesh,
        lane,
        z,
        y,
        type: 'coin',
        collected: false,
      });
    }
  }

  private createCoinLine(chunk: THREE.Group, lane: Lane, startZ: number, count: number, yPos = 0.8) {
    const laneX = GAME_CONSTANTS.LANE_X[lane + 1];
    for (let i = 0; i < count; i++) {
      const z = startZ - i * 2.0;
      const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12), this.materials.coin);
      coinMesh.rotation.x = Math.PI / 2;
      coinMesh.position.set(laneX, yPos, z);
      coinMesh.castShadow = true;
      chunk.add(coinMesh);

      this.collectibles.push({
        mesh: coinMesh,
        lane,
        z,
        y: yPos,
        type: 'coin',
        collected: false,
      });
    }
  }

  private createPowerUp(chunk: THREE.Group, lane: Lane, zPos: number) {
    const types: PowerUpType[] = ['magnet', 'sneakers', 'jetpack', 'multiplier', 'hoverboard'];
    const pType = types[Math.floor(Math.random() * types.length)];
    const laneX = GAME_CONSTANTS.LANE_X[lane + 1];

    const group = new THREE.Group();
    // Glowing box container
    const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    let boxColor = 0x38bdf8;
    if (pType === 'magnet') boxColor = 0xef4444;
    else if (pType === 'sneakers') boxColor = 0x22c55e;
    else if (pType === 'jetpack') boxColor = 0xf59e0b;
    else if (pType === 'multiplier') boxColor = 0xa855f7;

    const pMat = new THREE.MeshStandardMaterial({
      color: boxColor,
      emissive: boxColor,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const box = new THREE.Mesh(boxGeo, pMat);
    group.add(box);

    group.position.set(laneX, 1.2, zPos);
    chunk.add(group);

    this.collectibles.push({
      mesh: group,
      lane,
      z: zPos,
      y: 1.2,
      type: pType,
      collected: false,
    });
  }

  // CONTROLS & ACTIONS
  public moveLeft() {
    if (!this.isRunning || this.isPaused) return;
    if (this.currentLane > -1) {
      this.currentLane = (this.currentLane - 1) as Lane;
      this.targetLaneX = GAME_CONSTANTS.LANE_X[this.currentLane + 1];
      sound.playLaneSwitch();
    }
  }

  public moveRight() {
    if (!this.isRunning || this.isPaused) return;
    if (this.currentLane < 1) {
      this.currentLane = (this.currentLane + 1) as Lane;
      this.targetLaneX = GAME_CONSTANTS.LANE_X[this.currentLane + 1];
      sound.playLaneSwitch();
    }
  }

  public jump() {
    if (!this.isRunning || this.isPaused) return;
    if (this.isGrounded && !this.activePowerUps.has('jetpack')) {
      const hasSneakers = this.activePowerUps.has('sneakers');
      this.velocityY = hasSneakers ? GAME_CONSTANTS.SUPER_JUMP_VELOCITY : GAME_CONSTANTS.JUMP_VELOCITY;
      this.isGrounded = false;
      this.isSliding = false;
      sound.playJump();
    }
  }

  public slide() {
    if (!this.isRunning || this.isPaused) return;
    if (!this.activePowerUps.has('jetpack')) {
      // If jumping, fast fall down
      if (!this.isGrounded) {
        this.velocityY = -GAME_CONSTANTS.JUMP_VELOCITY * 1.5;
      }
      this.isSliding = true;
      this.slideTimer = GAME_CONSTANTS.SLIDE_DURATION;
      sound.playSlide();
    }
  }

  public activateHoverboard(): boolean {
    if (!this.isRunning || this.isPaused) return false;
    if (!this.hasHoverboard) {
      this.hasHoverboard = true;
      this.activePowerUps.set('hoverboard', GAME_CONSTANTS.POWERUP_DURATIONS.hoverboard);
      this.characterMeshes.hoverboard!.visible = true;
      sound.playHoverboard();
      this.events.onPowerUpStart('hoverboard', GAME_CONSTANTS.POWERUP_DURATIONS.hoverboard);
      return true;
    }
    return false;
  }

  public startRun() {
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    sound.startMusic();
  }

  public pauseRun() {
    this.isPaused = true;
    sound.stopMusic();
  }

  public resumeRun() {
    this.isPaused = false;
    sound.startMusic();
  }

  public updateCharacterAndHoverboard(char: CharacterItem, board: HoverboardItem) {
    this.characterConfig = char;
    this.hoverboardConfig = board;
    this.scene.remove(this.playerGroup);
    this.buildPlayerCharacter();
  }

  public updateTheme(newTheme: ThemeMode) {
    this.theme = newTheme;
    this.setupLightingAndAtmosphere();
  }

  // MAIN GAME TICK
  private animate() {
    if (this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.isRunning && !this.isPaused) {
      this.updatePhysics(delta);
      this.updatePowerUps(delta);
      this.updateTrackAndObstacles(delta);
      this.updateProceduralAnimations(delta);
      this.updateCamera(delta);

      // Score increment
      const speedBonus = this.characterConfig.speedBonus || 1.0;
      const currentMult = (this.activePowerUps.has('multiplier') ? 2 : 1) * this.multiplier * speedBonus;
      this.score += Math.floor(this.runSpeed * delta * currentMult * 2.2);
      this.distance += this.runSpeed * delta * 0.8;

      // Speed progression
      this.runSpeed = Math.min(
        GAME_CONSTANTS.MAX_SPEED,
        GAME_CONSTANTS.INITIAL_SPEED + (this.distance / 100) * GAME_CONSTANTS.SPEED_ACCELERATION
      );

      this.events.onScoreUpdate(this.score, Math.floor(this.distance), this.coins);
    } else {
      // Idle turntable/breathing animation for menu
      this.playerGroup.position.y = Math.sin(Date.now() * 0.003) * 0.04;
      this.camera.position.set(0, 2.5, 5.5);
      this.camera.lookAt(0, 1.2, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updatePhysics(delta: number) {
    // 1. Lane Lerping (smooth horizontal shift with realistic banking)
    const laneDeltaX = this.targetLaneX - this.playerX;
    this.playerX += laneDeltaX * Math.min(1, 14 * delta);
    this.playerGroup.position.x = this.playerX;

    // Lean bank roll angle into turn with spring damping
    this.playerGroup.rotation.z = -laneDeltaX * 0.24;

    // 2. Vertical Jump / Gravity / Jetpack
    if (this.activePowerUps.has('jetpack')) {
      // Smoothly ascend to high jetpack flight altitude
      this.playerY += (GAME_CONSTANTS.JETPACK_HEIGHT - this.playerY) * Math.min(1, 6 * delta);
      this.isGrounded = false;
    } else {
      // Check if runner is atop a train roof
      let surfaceY = 0;
      for (const obs of this.obstacles) {
        if (obs.isTrain && Math.abs(obs.lane - this.currentLane) < 0.5) {
          const trainZStart = obs.z - obs.depth / 2 - 1.5;
          const trainZEnd = obs.z + obs.depth / 2 + 1.5;
          if (this.playerZ >= trainZStart && this.playerZ <= trainZEnd) {
            if (this.playerY >= obs.height - 0.35) {
              surfaceY = obs.height;
              this.events.onRoofRun();
              break;
            }
          }
        }
      }

      this.playerY += this.velocityY * delta;
      this.velocityY -= GAME_CONSTANTS.GRAVITY * delta;

      if (this.playerY <= surfaceY) {
        this.playerY = surfaceY;
        this.velocityY = 0;
        this.isGrounded = true;

        // Realistic landing impact detection
        if (!this.wasGrounded) {
          this.landingSquash = 0.28;
          sound.playLanding();
          this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.16);
        }
      } else {
        this.isGrounded = false;
      }
      this.wasGrounded = this.isGrounded;
    }

    // Smooth landing squash decay
    this.landingSquash = Math.max(0, this.landingSquash - delta * 4.5);

    this.playerGroup.position.y = this.playerY;

    // 3. Sliding Timer
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 4. Invulnerability Timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      // Flashing mesh visibility
      this.playerGroup.visible = Math.floor(Date.now() / 80) % 2 === 0;
    } else {
      this.playerGroup.visible = true;
    }
  }

  private updatePowerUps(delta: number) {
    for (const [type, remaining] of Array.from(this.activePowerUps.entries())) {
      const nextRemaining = remaining - delta;
      if (nextRemaining <= 0) {
        this.activePowerUps.delete(type);
        if (type === 'hoverboard') {
          this.hasHoverboard = false;
          this.characterMeshes.hoverboard!.visible = false;
        } else if (type === 'jetpack') {
          this.characterMeshes.jetpack!.visible = false;
        }
        this.events.onPowerUpEnd(type);
      } else {
        this.activePowerUps.set(type, nextRemaining);
      }
    }
  }

  private updateTrackAndObstacles(delta: number) {
    const moveZ = this.runSpeed * delta;
    this.playerZ -= moveZ;
    this.playerGroup.position.z = this.playerZ;

    // Move oncoming trains towards the player & trigger horn
    for (const obs of this.obstacles) {
      if (obs.speedZ > 0) {
        obs.z += obs.speedZ * delta;
        obs.mesh.position.z = obs.z;
        obs.boundingBox.setFromObject(obs.mesh);

        // Oncoming train horn warning and track vibration
        if (!this.oncomingHornsTriggered.has(obs) && obs.z > this.playerZ - 45 && obs.z < this.playerZ + 5) {
          this.oncomingHornsTriggered.add(obs);
          sound.playTrainHorn();
          this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.24);
        }
      }
    }

    // Spawn new chunks ahead
    if (this.playerZ - GAME_CONSTANTS.TRACK_CHUNK_LENGTH * 4 < this.nextChunkZ) {
      this.generateChunk();
    }

    // Remove old chunks behind
    if (this.chunks.length > GAME_CONSTANTS.SPAWN_AHEAD_CHUNKS + 2) {
      const oldChunk = this.chunks.shift();
      if (oldChunk) {
        this.scene.remove(oldChunk);
      }
    }

    // Cleanup passed obstacles & check near misses
    this.obstacles = this.obstacles.filter((obs) => {
      // Near miss check: passed an oncoming or stationary train closely
      if (!obs.dodged && obs.z > this.playerZ + 1.0) {
        obs.dodged = true;
        if (obs.isTrain && Math.abs(obs.lane - this.currentLane) <= 1) {
          this.trainsDodged += 1;
          this.events.onTrainDodged();
          sound.playNearMiss();
        }
      }
      return obs.z < this.playerZ + GAME_CONSTANTS.REMOVE_BEHIND_DISTANCE;
    });

    // Check Obstacle Collisions
    const playerBox = new THREE.Box3();
    const colliderHeight = this.isSliding
      ? GAME_CONSTANTS.SLIDE_COLLIDER_HEIGHT
      : GAME_CONSTANTS.NORMAL_COLLIDER_HEIGHT;

    playerBox.min.set(this.playerX - 0.35, this.playerY, this.playerZ - 0.35);
    playerBox.max.set(this.playerX + 0.35, this.playerY + colliderHeight, this.playerZ + 0.35);

    if (this.invulnerableTimer <= 0 && !this.activePowerUps.has('jetpack')) {
      for (const obs of this.obstacles) {
        // Broad phase lane check
        if (Math.abs(obs.lane - this.currentLane) < 0.7) {
          if (playerBox.intersectsBox(obs.boundingBox)) {
            // Check if ramp entry onto train
            if (obs.hasRamp && this.playerZ > obs.z + obs.depth / 2 - 2.5 && this.velocityY >= 0) {
              // Smooth ride up the ramp
              this.playerY = Math.max(this.playerY, obs.height);
              this.isGrounded = true;
              continue;
            }

            // High barrier exception: sliding cleanly under
            if (obs.type === 'barrier_high' && this.isSliding) {
              continue;
            }

            // Top of train exception: running safely on roof
            if (obs.isTrain && this.playerY >= obs.height - 0.25) {
              continue;
            }

            // Fatal Crash Encountered!
            this.handleCrash();
            break;
          }
        }
      }
    }

    // Collectibles & Coin magnet
    const isMagnetActive = this.activePowerUps.has('magnet');
    for (const c of this.collectibles) {
      if (c.collected) continue;

      // Magnet attraction
      if (isMagnetActive && c.type === 'coin') {
        const dx = this.playerX - c.mesh.position.x;
        const dy = this.playerY + 0.8 - c.mesh.position.y;
        const dz = this.playerZ - c.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 18) {
          c.mesh.position.x += dx * Math.min(1, 15 * delta);
          c.mesh.position.y += dy * Math.min(1, 15 * delta);
          c.mesh.position.z += dz * Math.min(1, 15 * delta);
        }
      } else {
        // Normal coin spin
        c.mesh.rotation.z += 3.5 * delta;
      }

      // Collect detection
      const distToPlayer = Math.abs(c.mesh.position.z - this.playerZ);
      const laneDist = Math.abs(c.mesh.position.x - this.playerX);
      const heightDist = Math.abs(c.mesh.position.y - (this.playerY + 0.8));

      if (distToPlayer < 1.2 && laneDist < 1.0 && heightDist < 1.8) {
        c.collected = true;
        c.mesh.visible = false;

        if (c.type === 'coin') {
          const mult = this.activePowerUps.has('multiplier') ? 2 : 1;
          this.coins += 1 * mult;
          sound.playCoin();
        } else {
          // Power up activated
          const duration = GAME_CONSTANTS.POWERUP_DURATIONS[c.type as PowerUpType] || 15;
          this.activePowerUps.set(c.type as PowerUpType, duration);

          if (c.type === 'hoverboard') {
            this.hasHoverboard = true;
            this.characterMeshes.hoverboard!.visible = true;
            sound.playHoverboard();
          } else if (c.type === 'jetpack') {
            this.characterMeshes.jetpack!.visible = true;
            sound.playPowerUp();
          } else {
            sound.playPowerUp();
          }

          this.events.onPowerUpStart(c.type as PowerUpType, duration);
        }
      }
    }

    this.collectibles = this.collectibles.filter(
      (c) => !c.collected && c.mesh.position.z < this.playerZ + GAME_CONSTANTS.REMOVE_BEHIND_DISTANCE
    );
  }

  private handleCrash() {
    if (this.hasHoverboard) {
      // Hoverboard shields the player from death!
      this.hasHoverboard = false;
      this.activePowerUps.delete('hoverboard');
      this.characterMeshes.hoverboard!.visible = false;
      this.invulnerableTimer = 2.0; // 2s grace invulnerability
      this.cameraShakeIntensity = 0.5;
      sound.playCrash();
      this.events.onHoverboardDestroyed();
    } else {
      // Fatal Game Over
      this.isRunning = false;
      sound.playCrash();
      sound.stopMusic();
      this.cameraShakeIntensity = 0.8;

      this.events.onGameOver(
        this.score,
        Math.floor(this.distance),
        this.coins,
        this.trainsDodged,
        this.roofRuns
      );
    }
  }

  private updateProceduralAnimations(delta: number) {
    const meshes = this.characterMeshes;
    if (!meshes.torsoGroup || !meshes.leftHip || !meshes.rightHip) return;

    // Toggle slide friction sparks
    if (meshes.slideSparks) {
      meshes.slideSparks.visible = this.isSliding;
      if (this.isSliding) {
        meshes.slideSparks.rotation.y += 20 * delta;
      }
    }

    if (this.isSliding) {
      // Realistic Baseball / Dive Low Slide Pose
      // Body dropped, leading right leg straight forward, trailing left leg folded
      this.playerGroup.rotation.x = -0.32;
      meshes.torsoGroup.rotation.x = -0.55; // Lean back
      meshes.torsoGroup.rotation.y = 0.25;

      meshes.rightHip.rotation.x = -1.45; // Right leg shoots forward
      meshes.rightKnee!.rotation.x = 0.15;
      meshes.rightFoot!.rotation.x = 0.2;

      meshes.leftHip.rotation.x = -0.35; // Left leg folded underneath
      meshes.leftKnee!.rotation.x = 1.5;
      meshes.leftFoot!.rotation.x = -0.4;

      // Trailing right arm grazes the ground for balance
      meshes.rightShoulder!.rotation.x = 0.65;
      meshes.rightShoulder!.rotation.z = 0.2;
      meshes.rightElbow!.rotation.x = -0.3;

      // Left arm forward for aerodynamic balance
      meshes.leftShoulder!.rotation.x = -0.7;
      meshes.leftShoulder!.rotation.z = -0.4;
      meshes.leftElbow!.rotation.x = -0.8;

      if (meshes.headGroup) {
        meshes.headGroup.rotation.x = 0.35; // Keep eyes fixed forward
      }
    } else if (!this.isGrounded && !this.activePowerUps.has('jetpack')) {
      // Realistic Parkour Vault / Hurdle Leap Pose
      this.playerGroup.rotation.x = 0.08;
      meshes.torsoGroup.rotation.x = 0.15;
      meshes.torsoGroup.rotation.y = 0;

      // Leading leg drives up and forward
      meshes.rightHip.rotation.x = -1.05;
      meshes.rightKnee!.rotation.x = 1.25;
      meshes.rightFoot!.rotation.x = -0.2;

      // Trailing leg sweeps back
      meshes.leftHip.rotation.x = 0.45;
      meshes.leftKnee!.rotation.x = 0.3;
      meshes.leftFoot!.rotation.x = 0.3;

      // Arms flare outward and upward for balance
      meshes.leftShoulder!.rotation.x = -0.4;
      meshes.leftShoulder!.rotation.z = -0.75;
      meshes.leftElbow!.rotation.x = -1.1;

      meshes.rightShoulder!.rotation.x = -0.4;
      meshes.rightShoulder!.rotation.z = 0.75;
      meshes.rightElbow!.rotation.x = -1.1;

      if (meshes.headGroup) {
        meshes.headGroup.rotation.x = -0.12;
      }
    } else if (this.hasHoverboard) {
      // Authentic Skateboard / Surf Stance
      this.playerGroup.rotation.x = 0.04;
      meshes.torsoGroup.rotation.x = 0.05;
      meshes.torsoGroup.rotation.y = 0.42; // Sideways body angle

      // Feet positioned across the board with knees comfortably flexed
      meshes.leftHip.rotation.x = 0.12;
      meshes.leftHip.rotation.z = -0.15;
      meshes.leftKnee!.rotation.x = 0.35;

      meshes.rightHip.rotation.x = -0.1;
      meshes.rightHip.rotation.z = 0.15;
      meshes.rightKnee!.rotation.x = 0.35;

      // Arms relaxed and spread for surf balance
      meshes.leftShoulder!.rotation.x = 0.1;
      meshes.leftShoulder!.rotation.z = -0.55;
      meshes.leftElbow!.rotation.x = -0.6;

      meshes.rightShoulder!.rotation.x = 0.1;
      meshes.rightShoulder!.rotation.z = 0.55;
      meshes.rightElbow!.rotation.x = -0.6;

      if (meshes.headGroup) {
        meshes.headGroup.rotation.y = -0.42; // Head looks straight forward along track
      }
    } else if (this.activePowerUps.has('jetpack')) {
      // Upright Athletic Flight Posture
      this.playerGroup.rotation.x = 0.12;
      meshes.torsoGroup.rotation.x = 0.05;
      meshes.torsoGroup.rotation.y = 0;

      meshes.leftHip.rotation.x = 0.15;
      meshes.leftKnee!.rotation.x = 0.2;
      meshes.rightHip.rotation.x = 0.15;
      meshes.rightKnee!.rotation.x = 0.2;

      meshes.leftShoulder!.rotation.x = 0.5;
      meshes.leftShoulder!.rotation.z = -0.25;
      meshes.leftElbow!.rotation.x = -0.4;

      meshes.rightShoulder!.rotation.x = 0.5;
      meshes.rightShoulder!.rotation.z = 0.25;
      meshes.rightElbow!.rotation.x = -0.4;
    } else {
      // Biomechanically Authentic Human Sprint Kinematics
      const strideFreq = (this.runSpeed / 13) * 12;
      const stridePhase = (Date.now() * 0.001) * strideFreq;

      // 1. Forward Attack Lean (increases with sprint speed)
      const attackLean = 0.2 + (this.runSpeed / GAME_CONSTANTS.MAX_SPEED) * 0.12;
      this.playerGroup.rotation.x = 0;
      meshes.torsoGroup.rotation.x = attackLean;

      // 2. Pelvic & Shoulder Counter-Torque (opposite yaw rotations)
      const pelvicTwist = Math.sin(stridePhase) * 0.12;
      meshes.torsoGroup.rotation.y = -pelvicTwist; // Counter-balanced shoulder torque

      // 3. Leg Kinematics (Forward Knee Drive & Rear Ankle Push-off)
      const legCycle = Math.sin(stridePhase);
      const hipLeft = legCycle * 0.78;
      const hipRight = -legCycle * 0.78;

      meshes.leftHip.rotation.x = hipLeft;
      meshes.rightHip.rotation.x = hipRight;

      // Knees: Forward-swinging leg flexes sharply to lift foot off ground; trailing leg extends
      const kneeFlexLeft = legCycle < 0 ? Math.abs(legCycle) * 1.35 : 0.15;
      const kneeFlexRight = legCycle > 0 ? Math.abs(legCycle) * 1.35 : 0.15;
      meshes.leftKnee!.rotation.x = kneeFlexLeft;
      meshes.rightKnee!.rotation.x = kneeFlexRight;

      // Feet: Ankle plant and push-off
      meshes.leftFoot!.rotation.x = legCycle < 0 ? -0.25 : 0.2;
      meshes.rightFoot!.rotation.x = legCycle > 0 ? -0.25 : 0.2;

      // 4. Arm Pump (Fixed 90° elbow bend, swinging cheek-to-hip)
      const armSwingLeft = -legCycle * 0.82;
      const armSwingRight = legCycle * 0.82;

      meshes.leftShoulder!.rotation.x = armSwingLeft;
      meshes.leftShoulder!.rotation.z = -0.15;
      meshes.leftElbow!.rotation.x = -1.25; // 90° athletic bend

      meshes.rightShoulder!.rotation.x = armSwingRight;
      meshes.rightShoulder!.rotation.z = 0.15;
      meshes.rightElbow!.rotation.x = -1.25;

      // 5. Head Stabilization (Vestibulo-ocular reflex keeping gaze level)
      if (meshes.headGroup) {
        meshes.headGroup.rotation.x = -attackLean * 0.75;
        meshes.headGroup.rotation.y = pelvicTwist * 0.8;
      }

      // 6. Vertical Double-Bounce Oscillation (Impact compression & pushoff)
      const bounce = Math.abs(Math.sin(stridePhase)) * 0.07;
      meshes.torsoGroup.position.y = 0.1 - bounce - this.landingSquash * 0.35;
    }
  }

  private updateCamera(delta: number) {
    // Dynamic chase camera with lerping
    const targetCamX = this.playerX * 0.4;
    const targetCamY = this.playerY + 3.1;
    const targetCamZ = this.playerZ + 6.2;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 10 * delta);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 10 * delta);
    this.camera.position.z = targetCamZ;

    // Camera shake decay
    if (this.cameraShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 2.5);
    }

    // Dynamic FOV widening on high speed
    const targetFOV = 62 + (this.runSpeed / GAME_CONSTANTS.MAX_SPEED) * 12;
    this.camera.fov += (targetFOV - this.camera.fov) * Math.min(1, 5 * delta);
    this.camera.updateProjectionMatrix();

    this.camera.lookAt(this.playerX * 0.2, this.playerY + 1.4, this.playerZ - 10);
  }

  private onWindowResize() {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    this.isDestroyed = true;
    sound.stopMusic();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);

    // Dispose renderer and geometry
    this.renderer.dispose();
    this.scene.clear();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
