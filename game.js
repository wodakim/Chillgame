/*
 * Seed of Life - v1 Playable & Beautiful
 * Pure JS + TypeScript-like JSDoc for future TS migration.
 * Mobile-first Phaser 3 architecture with light CPU/GPU footprint.
 */

const GAME_VERSION = "0.2.0-playable-beautiful";
const SAVE_KEY = "seed_of_life_save_v1";

const PROFESSIONS = {
  gathering: ["Farmer", "Fisherman", "Herbalist", "Lumberjack", "Miner", "Trapper"],
  crafting: ["Armorer", "Baker", "Chef", "Handyman", "Jeweler", "Carver", "Tailor", "Weaponsmith"]
};

const CLASSES = [
  { id: "sprout", name: "Sprout Warden", color: 0x92d36e },
  { id: "river", name: "River Keeper", color: 0x6eb7d3 },
  { id: "ember", name: "Ember Druid", color: 0xd39e6e }
];

class SaveManager {
  static load() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn("Save load failed", e);
      return null;
    }
  }

  static save(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Save write failed", e);
    }
  }
}

class EcosystemManager {
  constructor(scene, value = 72) {
    this.scene = scene;
    this.ecoBalance = Phaser.Math.Clamp(value, 0, 100);
    this.lastMood = this.getMood();
  }

  changeBalance(delta) {
    const previous = this.ecoBalance;
    this.ecoBalance = Phaser.Math.Clamp(this.ecoBalance + delta, 0, 100);
    this.scene.events.emit("eco:changed", this.ecoBalance, previous);

    const mood = this.getMood();
    if (mood !== this.lastMood) {
      this.lastMood = mood;
      if (mood === "thriving") {
        this.scene.events.emit("eco:message", "L’Arbre de Vie est satisfait !", 0xb5f27f);
      } else if (mood === "angered") {
        this.scene.events.emit("eco:message", "L’Arbre est en colère…", 0xff8b73);
      }
    }
  }

  getMood() {
    if (this.ecoBalance > 70) return "thriving";
    if (this.ecoBalance < 40) return "angered";
    return "fragile";
  }
}

class ProfessionSystem {
  constructor(scene, persisted = null) {
    this.scene = scene;
    this.professions = {};
    [...PROFESSIONS.gathering, ...PROFESSIONS.crafting].forEach((name) => {
      this.professions[name] = persisted?.[name] || {
        xp: 0,
        level: 1,
        tool: this.getDefaultTool(name)
      };
    });

    this.recipeBook = {
      Baker: [{ id: "bread_seed", label: "Pain de graine", requires: [{ item: "Seed Flour", qty: 2 }] }],
      Chef: [{ id: "river_stew", label: "Ragoût rivière", requires: [{ item: "Fish", qty: 1 }] }],
      Armorer: [{ id: "bark_guard", label: "Armure d'écorce", requires: [{ item: "Hard Bark", qty: 3 }] }],
      Handyman: [{ id: "eco_box", label: "Coffre écologique", requires: [{ item: "Plank", qty: 3 }] }],
      Jeweler: [{ id: "seed_ring", label: "Anneau de graine", requires: [{ item: "Crystal", qty: 1 }] }],
      Carver: [{ id: "wooden_focus", label: "Catalyseur taillé", requires: [{ item: "Ancient Wood", qty: 2 }] }],
      Tailor: [{ id: "fiber_cloak", label: "Cape de fibres", requires: [{ item: "Fiber", qty: 2 }] }],
      Weaponsmith: [{ id: "sap_blade", label: "Lame de sève", requires: [{ item: "Iron Ore", qty: 2 }] }]
    };
  }

  getDefaultTool(name) {
    const tools = {
      Farmer: "Hoe", Fisherman: "Rod", Herbalist: "Gloves", Lumberjack: "Axe", Miner: "Pickaxe", Trapper: "Trap Kit",
      Armorer: "Anvil Hammer", Baker: "Oven Peel", Chef: "Pan", Handyman: "Toolkit", Jeweler: "Gem Chisel", Carver: "Knife",
      Tailor: "Needle", Weaponsmith: "Forge Hammer"
    };
    return tools[name] || "Basic Tool";
  }

  gainXp(profession, amount) {
    const p = this.professions[profession];
    if (!p) return;
    p.xp += amount;
    const needed = p.level * 100;
    if (p.xp >= needed) {
      p.xp -= needed;
      p.level += 1;
      this.scene.events.emit("profession:levelup", profession, p.level);
    }
    this.scene.events.emit("profession:xp", profession, p);
  }

  serialize() {
    return this.professions;
  }
}

/**
 * 5-layer painterly parallax manager with eco-reactive tinting and sun filtering.
 */
class ParallaxBackgroundManager {
  constructor(scene, worldWidth, worldHeight) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.time = 0;
    this.layers = [];

    this.createTextures();
    this.createLayers();
    this.createSunLight();
    this.applyEcoTint(72);
  }

  createTextures() {
    this.paintSkyTex();
    this.paintMountainTex();
    this.paintForestTex();
    this.paintTreesTex();
    this.paintForegroundTex();
    this.paintSunTex();
  }

  paintSkyTex() {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x86ddd2, 1);
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 20; i += 1) {
      const x = 50 + i * 50;
      const y = Phaser.Math.Between(40, 220);
      g.fillStyle(0xd7f3f5, 0.24);
      g.fillEllipse(x, y, Phaser.Math.Between(90, 180), Phaser.Math.Between(24, 52));
    }
    g.generateTexture("parallax_sky", 1024, 512);
    g.destroy();
  }

  paintMountainTex() {
    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0x2f5c4a, 0.95);
    g.beginPath();
    g.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 120) g.lineTo(x, Phaser.Math.Between(180, 360));
    g.lineTo(1024, 512);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xb7d6c8, 0.14);
    for (let i = 0; i < 8; i += 1) g.fillEllipse(Phaser.Math.Between(0, 1024), Phaser.Math.Between(220, 360), 240, 60);
    g.generateTexture("parallax_mountains", 1024, 512);
    g.destroy();
  }

  paintForestTex() {
    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0x214d37, 0.9);
    g.fillRect(0, 330, 1024, 182);
    for (let i = 0; i < 120; i += 1) {
      const x = Phaser.Math.Between(0, 1024);
      const y = Phaser.Math.Between(240, 370);
      g.fillStyle(0x2e6b47, 0.55);
      g.fillTriangle(x, y, x - 18, y + 70, x + 18, y + 70);
    }
    g.generateTexture("parallax_forest_far", 1024, 512);
    g.destroy();
  }

  paintTreesTex() {
    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0x28563a, 0.95);
    g.fillRect(0, 300, 1024, 212);
    for (let i = 0; i < 42; i += 1) {
      const x = 24 + i * 24;
      const trunkH = Phaser.Math.Between(34, 58);
      g.fillStyle(0x4d2f1e, 0.92);
      g.fillRect(x, 330 - trunkH, 9, trunkH + 40);
      g.fillStyle(0x3b8a4d, 0.9);
      g.fillCircle(x + 5, 292 - trunkH, Phaser.Math.Between(18, 26));
    }
    g.generateTexture("parallax_trees_mid", 1024, 512);
    g.destroy();
  }

  paintForegroundTex() {
    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(0x487d45, 0.85);
    g.fillRect(0, 380, 1024, 132);
    for (let i = 0; i < 190; i += 1) {
      const x = Phaser.Math.Between(0, 1024);
      const y = Phaser.Math.Between(380, 510);
      g.fillStyle(0x7ccf64, Phaser.Math.FloatBetween(0.45, 0.95));
      g.fillRect(x, y, 2, Phaser.Math.Between(8, 18));
      if (Math.random() > 0.8) {
        g.fillStyle(0xf1c27d, 0.8);
        g.fillCircle(x + 2, y - 2, 2);
      }
    }
    g.generateTexture("parallax_foreground", 1024, 512);
    g.destroy();
  }

  paintSunTex() {
    const c = this.scene.textures.createCanvas("sun_filter", 512, 512);
    const ctx = c.getContext();
    const grad = ctx.createRadialGradient(256, 80, 30, 256, 80, 260);
    grad.addColorStop(0, "rgba(255,246,200,0.45)");
    grad.addColorStop(1, "rgba(255,246,200,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    c.refresh();
  }

  createLayer(texture, factorX, factorY, alpha, y, depth) {
    const tile = this.scene.add.tileSprite(this.worldWidth * 0.5, y, this.worldWidth, this.worldHeight, texture)
      .setOrigin(0.5)
      .setScrollFactor(0, 0)
      .setAlpha(alpha)
      .setDepth(depth);
    this.layers.push({ tile, factorX, factorY, floating: Phaser.Math.FloatBetween(0.08, 0.22), baseY: y });
  }

  createLayers() {
    this.createLayer("parallax_sky", 0.06, 0.04, 0.95, this.scene.scale.height * 0.5, -200);
    this.createLayer("parallax_mountains", 0.14, 0.08, 0.85, this.scene.scale.height * 0.58, -180);
    this.createLayer("parallax_forest_far", 0.22, 0.12, 0.88, this.scene.scale.height * 0.66, -150);
    this.createLayer("parallax_trees_mid", 0.35, 0.18, 0.93, this.scene.scale.height * 0.76, -120);
    this.createLayer("parallax_foreground", 0.52, 0.28, 0.97, this.scene.scale.height * 0.88, 40);
  }

  createSunLight() {
    this.sunFilter = this.scene.add.image(this.scene.scale.width * 0.52, this.scene.scale.height * 0.1, "sun_filter")
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setAlpha(0.55)
      .setDepth(200);
  }

  applyEcoTint(ecoBalance) {
    let tint = 0xa8dba6;
    if (ecoBalance > 70) tint = 0xc8f0a0;
    if (ecoBalance < 40) tint = 0x7f5345;
    this.layers.forEach((l) => l.tile.setTint(tint));
    this.sunFilter.setTint(ecoBalance < 40 ? 0xcc8b73 : 0xfff4c9);
    this.sunFilter.setAlpha(ecoBalance < 40 ? 0.35 : 0.55);
  }

  update(camera, delta, ecoBalance) {
    this.time += delta * 0.001;
    this.layers.forEach((l, idx) => {
      l.tile.tilePositionX = camera.scrollX * l.factorX;
      l.tile.tilePositionY = camera.scrollY * l.factorY;
      l.tile.y = l.baseY + Math.sin(this.time * l.floating + idx) * 6;
    });
    this.sunFilter.x = this.scene.scale.width * 0.52 + Math.sin(this.time * 0.2) * 22;
    this.applyEcoTint(ecoBalance);
  }
}

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, color = 0x92d36e) {
    // TODO: replace with sprite 'assets/player_idle.png' and atlas key 'player'
    if (!scene.textures.exists("player_placeholder")) {
      const body = scene.add.rectangle(0, 0, 30, 44, color).setStrokeStyle(2, 0xefffe0);
      const rt = scene.make.renderTexture({ width: 34, height: 48, add: false });
      rt.draw(body, 17, 24);
      rt.saveTexture("player_placeholder");
      body.destroy();
    }
    super(scene, x, y, "player_placeholder");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(50);
    this.targetPoint = null;
    this.maxSpeed = 185;
    this.accel = 980;
    this.decel = 860;
    this.autoAttackRange = 96;
    this.woodcutBusy = false;
  }

  moveToPoint(point) {
    if (this.woodcutBusy) return;
    this.targetPoint = point;
  }

  updateFromInput(cursors, joystickVec, dt) {
    if (this.woodcutBusy) {
      this.setVelocity(0, 0);
      return;
    }

    let ax = 0;
    let ay = 0;

    if (cursors.left.isDown) ax = -1;
    else if (cursors.right.isDown) ax = 1;
    if (cursors.up.isDown) ay = -1;
    else if (cursors.down.isDown) ay = 1;

    if (joystickVec) {
      if (Math.abs(joystickVec.x) > 0.08) ax = joystickVec.x;
      if (Math.abs(joystickVec.y) > 0.08) ay = joystickVec.y;
    }

    const vel = this.body.velocity;
    const deltaFactor = dt / 1000;

    if (ax !== 0 || ay !== 0) {
      const dir = new Phaser.Math.Vector2(ax, ay).normalize();
      const targetVX = dir.x * this.maxSpeed;
      const targetVY = dir.y * this.maxSpeed;
      vel.x = Phaser.Math.Linear(vel.x, targetVX, this.accel * 0.001 * deltaFactor * 6);
      vel.y = Phaser.Math.Linear(vel.y, targetVY, this.accel * 0.001 * deltaFactor * 6);
      this.targetPoint = null;
    } else if (this.targetPoint) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetPoint.x, this.targetPoint.y);
      if (dist < 8) {
        this.targetPoint = null;
      } else {
        const dir = new Phaser.Math.Vector2(this.targetPoint.x - this.x, this.targetPoint.y - this.y).normalize();
        vel.x = Phaser.Math.Linear(vel.x, dir.x * this.maxSpeed, this.accel * 0.001 * deltaFactor * 6);
        vel.y = Phaser.Math.Linear(vel.y, dir.y * this.maxSpeed, this.accel * 0.001 * deltaFactor * 6);
      }
    } else {
      vel.x = Phaser.Math.Linear(vel.x, 0, this.decel * 0.001 * deltaFactor * 6);
      vel.y = Phaser.Math.Linear(vel.y, 0, this.decel * 0.001 * deltaFactor * 6);
    }

    this.setVelocity(vel.x, vel.y);
  }
}

class CombatSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.lastAttack = 0;
    this.attackSpeedMs = 560;
    this.skillCooldowns = Array.from({ length: 8 }, () => 0);
  }

  update(time, monsters) {
    const nearby = monsters.getChildren().find((m) => m.active && Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y) <= this.player.autoAttackRange);
    if (nearby && time - this.lastAttack > this.attackSpeedMs) {
      this.lastAttack = time;
      nearby.hp -= 10;
      this.scene.events.emit("floating:text", "-10", 0xff8080, nearby.x, nearby.y - 22);
      if (nearby.hp <= 0) {
        monsters.killAndHide(nearby);
        nearby.body.enable = false;
        this.scene.events.emit("inventory:add", "Monster Essence", 1);
      }
    }
  }

  castSkill(index, time) {
    if (time < this.skillCooldowns[index]) return false;
    this.skillCooldowns[index] = time + (1200 + index * 180);
    this.scene.events.emit("floating:text", `Skill ${index + 1}`, 0x8fd7ff);
    return true;
  }
}

class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }
  create() {
    this.scale.scaleMode = Phaser.Scale.RESIZE;
    this.scene.start("Preload");
  }
}

class PreloadScene extends Phaser.Scene {
  constructor() { super("Preload"); }
  preload() {
    this.cameras.main.setBackgroundColor("#000000");
    this.add.text(this.scale.width * 0.5, this.scale.height * 0.5, "Seed of Life\nLoading...", { fontSize: "24px", color: "#ecffd6", align: "center" }).setOrigin(0.5);
    // TODO: preload atlas placeholders: this.load.atlas('player', 'assets/player.png', 'assets/player.json')
  }
  create() { this.scene.start("Menu"); }
}

class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }
  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor("#10140f");
    this.add.text(w * 0.5, h * 0.2, "SEED OF LIFE", { fontSize: "54px", color: "#d8ffb9", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(w * 0.5, h * 0.45, "2432 : Grande Multi-Éruption.\n7369 : Naissance de la pousse originelle.\n8374 : Vous naissez de la dernière graine.\nVous êtes le Gardien de l'Écosystème.", { fontSize: "20px", color: "#e5f2d8", align: "center", lineSpacing: 10 }).setOrigin(0.5);

    const start = this.add.rectangle(w * 0.5, h * 0.78, 260, 72, 0x4f7f52).setStrokeStyle(4, 0xa4d07f).setInteractive();
    this.add.text(start.x, start.y, "Commencer", { fontSize: "28px", color: "#f3ffe7" }).setOrigin(0.5);
    start.on("pointerdown", () => this.scene.start("CharacterCreation"));
  }
}

class CharacterCreationScene extends Phaser.Scene {
  constructor() { super("CharacterCreation"); }
  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor("#1b3025");
    this.add.text(w * 0.5, 70, "Création du Gardien", { fontSize: "36px", color: "#e7ffd6" }).setOrigin(0.5);

    this.playerName = "Gardien";
    this.classIndex = 0;

    const nameLabel = this.add.text(w * 0.5, 160, `Nom: ${this.playerName}`, { fontSize: "26px", color: "#d5f0c4" }).setOrigin(0.5);
    const randomBtn = this.add.rectangle(w * 0.5, 210, 200, 44, 0x30503d).setInteractive();
    this.add.text(w * 0.5, 210, "Nom aléatoire", { fontSize: "20px", color: "#d9f6cc" }).setOrigin(0.5);
    randomBtn.on("pointerdown", () => {
      this.playerName = `Seed-${Phaser.Math.Between(100, 999)}`;
      nameLabel.setText(`Nom: ${this.playerName}`);
    });

    this.preview = this.add.rectangle(w * 0.5, h * 0.56, 88, 110, CLASSES[0].color).setStrokeStyle(4, 0xffffff);
    this.classLabel = this.add.text(w * 0.5, h * 0.69, CLASSES[0].name, { fontSize: "24px", color: "#efffe5" }).setOrigin(0.5);

    const prev = this.add.rectangle(w * 0.35, h * 0.56, 60, 60, 0x2a4333).setInteractive();
    const next = this.add.rectangle(w * 0.65, h * 0.56, 60, 60, 0x2a4333).setInteractive();
    this.add.text(prev.x, prev.y, "<", { fontSize: "34px", color: "#d8edc6" }).setOrigin(0.5);
    this.add.text(next.x, next.y, ">", { fontSize: "34px", color: "#d8edc6" }).setOrigin(0.5);
    prev.on("pointerdown", () => this.changeClass(-1));
    next.on("pointerdown", () => this.changeClass(1));

    const create = this.add.rectangle(w * 0.5, h * 0.84, 300, 70, 0x628b49).setStrokeStyle(4, 0xc7ef9f).setInteractive();
    this.add.text(create.x, create.y, "Entrer dans le monde", { fontSize: "26px", color: "#f5ffe9" }).setOrigin(0.5);
    create.on("pointerdown", () => {
      this.scene.start("MainWorld", {
        playerName: this.playerName,
        classId: CLASSES[this.classIndex].id,
        color: CLASSES[this.classIndex].color
      });
      this.scene.launch("UIOverlay");
    });
  }

  changeClass(dir) {
    this.classIndex = Phaser.Math.Wrap(this.classIndex + dir, 0, CLASSES.length);
    this.preview.setFillStyle(CLASSES[this.classIndex].color);
    this.classLabel.setText(CLASSES[this.classIndex].name);
  }
}

class MainWorldScene extends Phaser.Scene {
  constructor() { super("MainWorld"); }

  init(data) {
    this.playerMeta = data;
  }

  create() {
    this.worldWidth = 3800;
    this.worldHeight = 2400;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBackgroundColor("#000000");

    const save = SaveManager.load();
    this.playerData = save?.player || this.playerMeta || { playerName: "Gardien", classId: "sprout", color: 0x92d36e };
    this.ecosystem = new EcosystemManager(this, save?.ecoBalance ?? 72);
    this.professions = new ProfessionSystem(this, save?.professions);

    this.bgManager = new ParallaxBackgroundManager(this, this.worldWidth, this.worldHeight);
    this.player = new Player(this, save?.position?.x || 400, save?.position?.y || 300, this.playerData.color || 0x92d36e);

    this.cameras.main.startFollow(this.player, true, 0.055, 0.055); // smooth follow with tiny lag
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setZoom(1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,E");

    this.joystickState = { active: false, origin: null, delta: { x: 0, y: 0 }, pointerId: null };
    this.setupTouchControls();

    this.monsters = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 56, runChildUpdate: false });
    this.createMonsterTexture();
    this.createTreeTextures();

    this.treeNodes = [];
    this.populateTrees();

    this.combat = new CombatSystem(this, this.player);

    this.input.on("pointerdown", (pointer) => {
      const isTouch = pointer.pointerType === "touch" || pointer.wasTouch;
      if (isTouch && pointer.x <= this.scale.width * 0.4) return; // left side reserved for joystick

      this.player.moveToPoint({ x: pointer.worldX, y: pointer.worldY });
      this.tryLumberjackAction(pointer.worldX, pointer.worldY);
    });

    this.time.addEvent({ delay: 8000, loop: true, callback: this.autoSave, callbackScope: this });
    this.time.addEvent({ delay: 1300, loop: true, callback: this.maintainEcoMonsters, callbackScope: this });

    this.events.on("inventory:add", (item, qty) => this.scene.get("UIOverlay")?.addInventory(item, qty));
    this.events.on("eco:changed", (value) => this.bgManager.applyEcoTint(value));
    this.events.on("eco:message", (msg, color) => {
      this.events.emit("floating:text", msg, color, this.player.x, this.player.y - 70);
      this.emitEcoParticles(color);
    });

    this.events.emit("world:ready", {
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.professions
    });
  }

  createMonsterTexture() {
    if (this.textures.exists("monster_placeholder")) return;
    const body = this.add.rectangle(0, 0, 26, 26, 0xc05454).setStrokeStyle(2, 0xf7cfcf);
    const rt = this.make.renderTexture({ width: 30, height: 30, add: false });
    rt.draw(body, 15, 15);
    rt.saveTexture("monster_placeholder");
    body.destroy();
  }

  createTreeTextures() {
    if (this.textures.exists("tree_placeholder")) return;
    const g = this.make.graphics({ add: false });

    // TODO: replace with sprite 'assets/tree_oak.png' atlas key 'tree_oak'
    g.fillStyle(0x1b1b1b, 0.22);
    g.fillEllipse(44, 84, 54, 18);
    g.fillStyle(0x6b3d20, 1);
    g.fillRoundedRect(36, 40, 16, 40, 4);
    g.fillStyle(0x2f8e4f, 1);
    g.fillCircle(44, 34, 28);
    g.fillStyle(0x46a861, 0.8);
    g.fillCircle(32, 32, 14);
    g.fillCircle(55, 30, 12);
    g.generateTexture("tree_placeholder", 88, 96);
    g.destroy();

    const axe = this.make.graphics({ add: false });
    axe.fillStyle(0x8e6a47, 1);
    axe.fillRect(8, 6, 3, 20);
    axe.fillStyle(0xb3c4cf, 1);
    axe.fillTriangle(11, 9, 20, 5, 20, 16);
    axe.generateTexture("axe_icon", 24, 30);
    axe.destroy();
  }

  populateTrees() {
    const count = Phaser.Math.Between(8, 12);
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(260, this.worldWidth - 260);
      const y = Phaser.Math.Between(220, this.worldHeight - 220);
      this.treeNodes.push(this.createTreeNode(x, y));
    }
  }

  createTreeNode(x, y) {
    const tree = this.add.image(x, y, "tree_placeholder").setDepth(y + 6);
    tree.setDataEnabled();
    tree.setData({ active: true, respawnAt: 0, chopping: false });
    return tree;
  }

  tryLumberjackAction(worldX, worldY) {
    const closest = this.treeNodes
      .filter((t) => t.getData("active") && !t.getData("chopping"))
      .sort((a, b) => Phaser.Math.Distance.Between(worldX, worldY, a.x, a.y) - Phaser.Math.Distance.Between(worldX, worldY, b.x, b.y))[0];
    if (!closest) return;

    const clickDist = Phaser.Math.Distance.Between(worldX, worldY, closest.x, closest.y);
    const playerDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, closest.x, closest.y);
    if (clickDist > 110 || playerDist > 80) return;

    this.startChoppingTree(closest);
  }

  startChoppingTree(tree) {
    tree.setData("chopping", true);
    this.player.woodcutBusy = true;
    this.player.setVelocity(0, 0);

    const axe = this.add.image(this.player.x + 18, this.player.y - 8, "axe_icon").setDepth(110);
    this.tweens.add({
      targets: axe,
      angle: { from: -35, to: 45 },
      duration: 220,
      yoyo: true,
      repeat: 5,
      ease: "Sine.inOut"
    });

    this.emitWoodParticles(tree.x, tree.y);

    this.time.delayedCall(1500, () => {
      axe.destroy();
      this.harvestTree(tree);
      this.player.woodcutBusy = false;
    });
  }

  harvestTree(tree) {
    const wood = Phaser.Math.Between(4, 10);
    const seeds = Phaser.Math.Between(1, 3);
    const ecoGain = Phaser.Math.Between(2, 8);

    tree.setData("active", false);
    tree.setData("chopping", false);
    tree.setData("respawnAt", this.time.now + 30000);
    tree.setVisible(false);

    this.events.emit("inventory:add", "Bois", wood);
    this.events.emit("inventory:add", "Graines", seeds);
    this.events.emit("floating:text", `+${wood} Bois 🌳`, 0xffd28e, tree.x, tree.y - 22);
    this.events.emit("floating:text", `+${ecoGain} Eco 🌱`, 0x8fea8c, tree.x, tree.y - 48);

    this.professions.gainXp("Lumberjack", wood * 6);
    this.ecosystem.changeBalance(ecoGain);
  }

  emitWoodParticles(x, y) {
    for (let i = 0; i < 10; i += 1) {
      const leaf = this.add.circle(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), Phaser.Math.Between(2, 4), i % 2 ? 0x72c45b : 0x8a5b3d)
        .setDepth(120);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-40, 40),
        y: leaf.y + Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: Phaser.Math.Between(600, 950),
        onComplete: () => leaf.destroy()
      });
    }
  }

  emitEcoParticles(color) {
    for (let i = 0; i < 16; i += 1) {
      const p = this.add.circle(this.player.x, this.player.y - 30, Phaser.Math.Between(2, 5), color).setDepth(120);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-80, 80),
        y: p.y + Phaser.Math.Between(-120, -20),
        alpha: 0,
        duration: Phaser.Math.Between(700, 1200),
        onComplete: () => p.destroy()
      });
    }
  }

  maintainEcoMonsters() {
    const eco = this.ecosystem.ecoBalance;
    if (eco >= 40) return;
    const active = this.monsters.countActive(true);
    const target = Phaser.Math.Between(2, 4);
    for (let i = active; i < target; i += 1) this.spawnMonsterNearPlayer();
  }

  spawnMonsterNearPlayer() {
    const monster = this.monsters.get();
    if (!monster) return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(220, 380);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * radius, 50, this.worldWidth - 50);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * radius, 50, this.worldHeight - 50);

    monster.enableBody(true, x, y, true, true);
    monster.setTexture("monster_placeholder");
    monster.setDepth(y + 4);
    monster.hp = 26;
    monster.body.setCollideWorldBounds(true);
    monster.body.setSize(22, 22);
  }

  setupTouchControls() {
    this.stickBase = this.add.circle(110, this.scale.height - 110, 62, 0x000000, 0.3).setScrollFactor(0).setDepth(2500).setVisible(false);
    this.stickThumb = this.add.circle(110, this.scale.height - 110, 34, 0xb4df8f, 0.9).setScrollFactor(0).setDepth(2501).setVisible(false);

    this.input.on("pointerdown", (p) => {
      const isTouch = p.pointerType === "touch" || p.wasTouch;
      if (!isTouch || p.x > this.scale.width * 0.4 || this.joystickState.active) return;
      this.joystickState.active = true;
      this.joystickState.pointerId = p.id;
      this.joystickState.origin = { x: p.x, y: p.y };
      this.stickBase.setPosition(p.x, p.y).setVisible(true);
      this.stickThumb.setPosition(p.x, p.y).setVisible(true);
    });

    this.input.on("pointermove", (p) => {
      if (!this.joystickState.active || p.id !== this.joystickState.pointerId) return;
      const dx = p.x - this.joystickState.origin.x;
      const dy = p.y - this.joystickState.origin.y;
      const vec = new Phaser.Math.Vector2(dx, dy);
      const clamped = vec.clone().limit(44);
      this.stickThumb.setPosition(this.joystickState.origin.x + clamped.x, this.joystickState.origin.y + clamped.y);
      this.joystickState.delta.x = Phaser.Math.Clamp(dx / 44, -1, 1);
      this.joystickState.delta.y = Phaser.Math.Clamp(dy / 44, -1, 1);
    });

    this.input.on("pointerup", (p) => {
      if (p.id !== this.joystickState.pointerId) return;
      this.clearStick();
    });

    this.input.on("gameout", () => this.clearStick());
  }

  clearStick() {
    this.joystickState.active = false;
    this.joystickState.pointerId = null;
    this.joystickState.delta.x = 0;
    this.joystickState.delta.y = 0;
    this.stickBase.setVisible(false);
    this.stickThumb.setVisible(false);
  }

  updateTrees() {
    const now = this.time.now;
    this.treeNodes.forEach((tree) => {
      if (!tree.getData("active") && now >= tree.getData("respawnAt")) {
        tree.setVisible(true);
        tree.setScale(0.1);
        tree.setData("active", true);
        this.tweens.add({ targets: tree, scale: 1, duration: 900, ease: "Back.Out" });
      }

      // simple culling on visibility
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.x, tree.y) < 1200;
      tree.setActive(inRange);
      tree.setVisible(tree.getData("active") && inRange);
    });
  }

  updateMonsters() {
    this.monsters.children.iterate((m) => {
      if (!m || !m.active) return;
      const dist = Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y);
      if (dist > 1100) {
        this.monsters.killAndHide(m);
        m.body.enable = false;
        return;
      }

      // soft chase only if ecosystem angry
      if (this.ecosystem.ecoBalance < 40) {
        const dir = new Phaser.Math.Vector2(this.player.x - m.x, this.player.y - m.y).normalize();
        m.setVelocity(dir.x * 58, dir.y * 58);
      } else {
        m.setVelocity(0, 0);
      }
      m.setDepth(m.y + 4);
    });
  }

  autoSave() {
    SaveManager.save({
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.serialize(),
      position: { x: this.player.x, y: this.player.y }
    });
  }

  update(time, delta) {
    const joystick = this.joystickState.active ? this.joystickState.delta : null;
    const cursors = {
      left: { isDown: this.cursors.left.isDown || this.keys.A.isDown },
      right: { isDown: this.cursors.right.isDown || this.keys.D.isDown },
      up: { isDown: this.cursors.up.isDown || this.keys.W.isDown },
      down: { isDown: this.cursors.down.isDown || this.keys.S.isDown }
    };

    this.player.updateFromInput(cursors, joystick, delta);

    const skillKeys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE, this.keys.SIX, this.keys.SEVEN, this.keys.EIGHT];
    skillKeys.forEach((k, i) => { if (Phaser.Input.Keyboard.JustDown(k)) this.combat.castSkill(i, time); });

    this.combat.update(time, this.monsters);
    this.updateTrees();
    this.updateMonsters();
    this.bgManager.update(this.cameras.main, delta, this.ecosystem.ecoBalance);
  }
}

class UIOverlayScene extends Phaser.Scene {
  constructor() { super("UIOverlay"); }

  create() {
    this.inventory = {};

    const panel = this.add.rectangle(18, 18, 460, 190, 0x2b3f2e, 0.82)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0x9fbe7c)
      .setDepth(3000);

    this.ecoText = this.add.text(34, 34, "EcoBalance: --", { fontSize: "20px", color: "#e8f7dc" }).setScrollFactor(0).setDepth(3001);
    this.profText = this.add.text(34, 62, "Profession: --", { fontSize: "18px", color: "#d3eec6" }).setScrollFactor(0).setDepth(3001);
    this.invText = this.add.text(34, 88, "Inventaire: vide", { fontSize: "17px", color: "#d8efd0" }).setScrollFactor(0).setDepth(3001);

    this.ecoBarBg = this.add.rectangle(34, 122, 250, 18, 0x4a2e2b, 0.9).setOrigin(0, 0.5).setDepth(3001).setScrollFactor(0);
    this.ecoBarFill = this.add.rectangle(34, 122, 250, 18, 0x67d06a, 0.95).setOrigin(0, 0.5).setDepth(3002).setScrollFactor(0);

    this.miniMap = this.add.rectangle(this.scale.width - 160, 24, 140, 140, 0x1e3024, 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xaed18b)
      .setDepth(3000);
    this.add.text(this.miniMap.x + 12, this.miniMap.y + 8, "Mini-map", { fontSize: "16px", color: "#f2ffe9" }).setScrollFactor(0).setDepth(3001);

    for (let i = 0; i < 8; i += 1) {
      const btn = this.add.rectangle(this.scale.width - (i + 1) * 74, this.scale.height - 54, 64, 64, 0x344c3b, 0.9)
        .setScrollFactor(0)
        .setStrokeStyle(2, 0xa9ca86)
        .setDepth(3001)
        .setInteractive();
      this.add.text(btn.x, btn.y, `${i + 1}`, { fontSize: "20px", color: "#f3ffea" }).setOrigin(0.5).setDepth(3002).setScrollFactor(0);
      btn.on("pointerdown", () => {
        const world = this.scene.get("MainWorld");
        if (world && world.combat) world.combat.castSkill(i, world.time.now);
      });
    }

    const world = this.scene.get("MainWorld");
    if (!world) return;

    world.events.on("world:ready", (state) => {
      this.setEco(state.ecoBalance);
      this.profText.setText(`Gardien: ${state.player.playerName || "Seed"} | Lumberjack L${state.professions.Lumberjack.level}`);
    });
    world.events.on("eco:changed", (value) => this.setEco(value));
    world.events.on("floating:text", (text, color, x, y) => this.spawnFloatingText(text, color, x, y));
    world.events.on("profession:levelup", (name, lvl) => this.spawnFloatingText(`${name} lvl ${lvl}!`, 0xffea9d));
    world.events.on("profession:xp", (name, data) => {
      if (name === "Lumberjack") this.profText.setText(`Gardien: ${world.playerData.playerName} | Lumberjack L${data.level}`);
    });
  }

  setEco(value) {
    const mood = value > 70 ? "Florissant" : value < 40 ? "Colère" : "Fragile";
    this.ecoText.setText(`EcoBalance: ${value} (${mood})`);

    const ratio = Phaser.Math.Clamp(value / 100, 0, 1);
    this.tweens.add({ targets: this.ecoBarFill, width: 250 * ratio, duration: 220, ease: "Sine.Out" });
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xc74b45),
      Phaser.Display.Color.IntegerToColor(0x5ddb67),
      100,
      value
    );
    this.ecoBarFill.fillColor = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
  }

  addInventory(item, qty) {
    this.inventory[item] = (this.inventory[item] || 0) + qty;
    const txt = Object.entries(this.inventory).map(([k, v]) => `${k} x${v}`).join(" | ");
    this.invText.setText(`Inventaire: ${txt}`);
  }

  spawnFloatingText(text, color = 0xffffff, x = null, y = null) {
    const strColor = Phaser.Display.Color.IntegerToColor(color).rgba;
    const t = this.add.text(x || this.scale.width * 0.5, y || this.scale.height - 180, text, { fontSize: "18px", color: strColor })
      .setDepth(3200)
      .setScrollFactor(1);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, MenuScene, CharacterCreationScene, MainWorldScene, UIOverlayScene]
};

const game = new Phaser.Game(config);
window.addEventListener("resize", () => game.scale.resize(window.innerWidth, window.innerHeight));
