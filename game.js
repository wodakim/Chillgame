/*
 * Seed of Life - v0.3 Top-Down 2.5D loop
 * Pure JS + TS-like comments for readability and future split into modules.
 */

const GAME_VERSION = "0.3.0-topdown-eco-loop";
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

  getMood() {
    if (this.ecoBalance > 80) return "blooming";
    if (this.ecoBalance < 40) return "weakened";
    return "stable";
  }

  changeBalance(delta, reason = "") {
    const previous = this.ecoBalance;
    this.ecoBalance = Phaser.Math.Clamp(this.ecoBalance + delta, 0, 100);
    this.scene.events.emit("eco:changed", this.ecoBalance, previous, reason);

    const mood = this.getMood();
    if (mood !== this.lastMood) {
      this.lastMood = mood;
      if (mood === "weakened") {
        this.scene.events.emit("eco:message", "L’Arbre est affaibli…", 0xff8c72);
      } else if (mood === "blooming") {
        this.scene.events.emit("eco:message", "La vie renaît ! 🌱", 0xa5f07f);
      }
    }
  }
}

class ProfessionSystem {
  constructor(scene, persisted = null) {
    this.scene = scene;
    this.professions = {};
    [...PROFESSIONS.gathering, ...PROFESSIONS.crafting].forEach((name) => {
      this.professions[name] = persisted?.[name] || { xp: 0, level: 1, tool: this.getDefaultTool(name) };
    });
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
 * Top-down 2.5D world layering
 * - Layer 1: distant floor + very far mountains (tiny parallax)
 * - Layer 2: gameplay entities depth-sorted by Y
 * - Layer 3: foreground foliage slightly faster camera factor
 */
class ParallaxBackgroundManager {
  constructor(scene, worldWidth, worldHeight) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.time = 0;

    this.createTextures();
    this.createLayers();
    this.applyEcoTint(72);
  }

  createTextures() {
    const g1 = this.scene.make.graphics({ add: false });
    g1.fillStyle(0x365e44, 1);
    g1.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 700; i += 1) {
      g1.fillStyle(Phaser.Math.Between(0, 1) ? 0x3f6d4d : 0x477855, Phaser.Math.FloatBetween(0.2, 0.7));
      g1.fillCircle(Phaser.Math.Between(0, 1024), Phaser.Math.Between(0, 1024), Phaser.Math.Between(1, 3));
    }
    g1.generateTexture("td_ground", 1024, 1024);
    g1.destroy();

    const g2 = this.scene.make.graphics({ add: false });
    g2.fillStyle(0x7dcfca, 1);
    g2.fillRect(0, 0, 1024, 512);
    g2.fillStyle(0x3d6850, 0.75);
    g2.beginPath();
    g2.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 100) g2.lineTo(x, Phaser.Math.Between(210, 370));
    g2.lineTo(1024, 512);
    g2.closePath();
    g2.fillPath();
    g2.generateTexture("td_far_mountains", 1024, 512);
    g2.destroy();

    const g3 = this.scene.make.graphics({ add: false });
    g3.fillStyle(0x4c8a55, 0.8);
    g3.fillRect(0, 420, 1024, 92);
    for (let i = 0; i < 180; i += 1) {
      const x = Phaser.Math.Between(0, 1024);
      const y = Phaser.Math.Between(420, 510);
      g3.fillStyle(Phaser.Math.Between(0, 1) ? 0x75ba63 : 0x8ed375, Phaser.Math.FloatBetween(0.5, 1));
      g3.fillRect(x, y, 2, Phaser.Math.Between(8, 22));
      if (Math.random() > 0.75) g3.fillCircle(x + 1, y - 2, 2);
    }
    g3.generateTexture("td_foreground", 1024, 512);
    g3.destroy();
  }

  createLayers() {
    // Layer 1 (rear)
    this.skyMountains = this.scene.add.tileSprite(this.worldWidth * 0.5, 260, this.worldWidth, 760, "td_far_mountains")
      .setScrollFactor(0.92, 0.95)
      .setDepth(-200)
      .setAlpha(0.9);

    this.ground = this.scene.add.tileSprite(this.worldWidth * 0.5, this.worldHeight * 0.5, this.worldWidth, this.worldHeight, "td_ground")
      .setScrollFactor(1, 1)
      .setDepth(-150);

    // Layer 2 handled in MainWorld via this.entityLayer container depth sorting.

    // Layer 3 (front)
    this.foreground = this.scene.add.tileSprite(this.worldWidth * 0.5, this.worldHeight * 0.5, this.worldWidth, this.worldHeight, "td_foreground")
      .setScrollFactor(1.04, 1.02)
      .setDepth(5000)
      .setAlpha(0.65);
  }

  applyEcoTint(eco) {
    let tintRear = 0xa7d8ad;
    let tintGround = 0xb7deb0;
    let tintFront = 0xcbe8ba;
    if (eco < 40) {
      tintRear = 0x8f5a4b;
      tintGround = 0x7d4f42;
      tintFront = 0x9f6b58;
    } else if (eco > 80) {
      tintRear = 0xcff3be;
      tintGround = 0xd9f7c7;
      tintFront = 0xecffce;
    }
    this.skyMountains.setTint(tintRear);
    this.ground.setTint(tintGround);
    this.foreground.setTint(tintFront);
  }

  update(camera, delta, eco) {
    this.time += delta * 0.001;
    this.skyMountains.tilePositionX = camera.scrollX * 0.025; // very slight parallax only for distant elements
    this.skyMountains.tilePositionY = camera.scrollY * 0.02;
    this.skyMountains.y = 260 + Math.sin(this.time * 0.07) * 4;
    this.applyEcoTint(eco);
  }
}

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, color = 0x92d36e) {
    if (!scene.textures.exists("player_placeholder")) {
      const b = scene.add.rectangle(0, 0, 30, 44, color).setStrokeStyle(2, 0xefffe0);
      const rt = scene.make.renderTexture({ width: 34, height: 48, add: false });
      rt.draw(b, 17, 24);
      rt.saveTexture("player_placeholder");
      b.destroy();
    }
    super(scene, x, y, "player_placeholder");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.targetPoint = null;
    this.maxSpeed = 195;
    this.accel = 920;
    this.decel = 820;
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
      if (Math.abs(joystickVec.x) > 0.06) ax = joystickVec.x;
      if (Math.abs(joystickVec.y) > 0.06) ay = joystickVec.y;
    }

    const vel = this.body.velocity;
    const f = dt / 16.67;

    if (ax !== 0 || ay !== 0) {
      const dir = new Phaser.Math.Vector2(ax, ay).normalize();
      vel.x = Phaser.Math.Linear(vel.x, dir.x * this.maxSpeed, 0.16 * f);
      vel.y = Phaser.Math.Linear(vel.y, dir.y * this.maxSpeed, 0.16 * f);
      this.targetPoint = null;
    } else if (this.targetPoint) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.targetPoint.x, this.targetPoint.y);
      if (d <= 8) {
        this.targetPoint = null;
      } else {
        const dir = new Phaser.Math.Vector2(this.targetPoint.x - this.x, this.targetPoint.y - this.y).normalize();
        vel.x = Phaser.Math.Linear(vel.x, dir.x * this.maxSpeed, 0.13 * f);
        vel.y = Phaser.Math.Linear(vel.y, dir.y * this.maxSpeed, 0.13 * f);
      }
    } else {
      vel.x = Phaser.Math.Linear(vel.x, 0, 0.14 * f);
      vel.y = Phaser.Math.Linear(vel.y, 0, 0.14 * f);
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
      this.scene.events.emit("floating:text", "-10", 0xff8080, nearby.x, nearby.y - 20);
      if (nearby.hp <= 0) {
        monsters.killAndHide(nearby);
        nearby.body.enable = false;
        this.scene.events.emit("inventory:add", "Monster Essence", 1);

        const ecoGain = Phaser.Math.Between(4, 12);
        this.scene.events.emit("floating:text", `+${ecoGain} Eco 🌱`, 0x9aeb88, nearby.x, nearby.y - 36);
        this.scene.events.emit("eco:delta", ecoGain, "monster_kill");
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
    this.inventory = save?.inventory || { Graines: 10, Bois: 0, "Monster Essence": 0 };

    this.bgManager = new ParallaxBackgroundManager(this, this.worldWidth, this.worldHeight);

    // Layer 2 main gameplay container (depth sorting by y)
    this.entityLayer = this.add.container(0, 0).setDepth(0);

    this.createMonsterTexture();
    this.createTreeTextures();

    this.player = new Player(this, save?.position?.x || 400, save?.position?.y || 300, this.playerData.color || 0x92d36e);
    this.entityLayer.add(this.player);

    this.cameras.main.startFollow(this.player, true, 0.035, 0.035);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT");

    this.joystickState = { active: false, origin: null, delta: { x: 0, y: 0 }, pointerId: null };
    this.setupTouchControls();

    this.monsters = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 56 });
    this.treeNodes = [];
    this.populateTrees();

    this.combat = new CombatSystem(this, this.player);

    this.input.on("pointerdown", (pointer) => {
      const isTouch = pointer.pointerType === "touch" || pointer.wasTouch;
      if (isTouch && pointer.x <= this.scale.width * 0.4) return; // left 40% reserved joystick

      const wx = pointer.worldX;
      const wy = pointer.worldY;
      this.player.moveToPoint({ x: wx, y: wy });

      if (this.tryLumberjackAction(wx, wy)) return;
      this.tryPlantSeed(wx, wy);
    });

    this.time.addEvent({ delay: 1400, loop: true, callback: this.maintainEcoMonsters, callbackScope: this });
    this.time.addEvent({ delay: 8000, loop: true, callback: this.autoSave, callbackScope: this });

    this.events.on("inventory:add", (item, qty) => this.addInventory(item, qty));
    this.events.on("eco:delta", (delta, reason) => this.ecosystem.changeBalance(delta, reason));

    this.events.emit("world:ready", {
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.professions,
      inventory: this.inventory
    });
  }

  addInventory(item, qty) {
    this.inventory[item] = (this.inventory[item] || 0) + qty;
    this.scene.get("UIOverlay")?.addInventory(item, qty, this.inventory);
  }

  consumeInventory(item, qty) {
    const current = this.inventory[item] || 0;
    if (current < qty) return false;
    this.inventory[item] = current - qty;
    this.scene.get("UIOverlay")?.syncInventory(this.inventory);
    return true;
  }

  createMonsterTexture() {
    if (this.textures.exists("monster_placeholder")) return;
    const b = this.add.rectangle(0, 0, 26, 26, 0xc05454).setStrokeStyle(2, 0xf7cfcf);
    const rt = this.make.renderTexture({ width: 30, height: 30, add: false });
    rt.draw(b, 15, 15);
    rt.saveTexture("monster_placeholder");
    b.destroy();
  }

  createTreeTextures() {
    if (!this.textures.exists("tree_placeholder")) {
      const g = this.make.graphics({ add: false });
      // TODO: replace with sprite 'assets/tree_oak.png' atlas key 'tree_oak'
      g.fillStyle(0x1b1b1b, 0.2);
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
    }

    if (!this.textures.exists("sapling_placeholder")) {
      const g2 = this.make.graphics({ add: false });
      g2.fillStyle(0x5f381e, 1);
      g2.fillRect(20, 20, 4, 18);
      g2.fillStyle(0x58af54, 1);
      g2.fillCircle(22, 16, 8);
      g2.generateTexture("sapling_placeholder", 44, 44);
      g2.destroy();
    }

    if (!this.textures.exists("axe_icon")) {
      const axe = this.make.graphics({ add: false });
      axe.fillStyle(0x8e6a47, 1);
      axe.fillRect(8, 6, 3, 20);
      axe.fillStyle(0xb3c4cf, 1);
      axe.fillTriangle(11, 9, 20, 5, 20, 16);
      axe.generateTexture("axe_icon", 24, 30);
      axe.destroy();
    }
  }

  populateTrees() {
    const count = Phaser.Math.Between(8, 12);
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(260, this.worldWidth - 260);
      const y = Phaser.Math.Between(220, this.worldHeight - 220);
      const size = Phaser.Math.Between(1, 3);
      const tree = this.createTreeNode(x, y, size);
      this.treeNodes.push(tree);
    }
  }

  createTreeNode(x, y, size = 1) {
    const tree = this.add.image(x, y, "tree_placeholder").setScale(0.9 + size * 0.15);
    tree.setDataEnabled();
    tree.setData({
      active: true,
      chopping: false,
      plantedByPlayer: false,
      respawnAt: 0,
      size,
      x,
      y
    });
    this.entityLayer.add(tree);
    return tree;
  }

  getNaturalRespawnMs() {
    // eco high = faster natural repousse in range 900-1800 sec
    const eco = this.ecosystem.ecoBalance;
    const t = Phaser.Math.Clamp((100 - eco) / 100, 0, 1);
    return Phaser.Math.Linear(900000, 1800000, t);
  }

  tryLumberjackAction(wx, wy) {
    const target = this.treeNodes.find((t) => t.getData("active") && !t.getData("chopping") && Phaser.Math.Distance.Between(wx, wy, t.x, t.y) < 110);
    if (!target) return false;
    const playerDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    if (playerDist > 80) return false;

    this.startChoppingTree(target);
    return true;
  }

  startChoppingTree(tree) {
    tree.setData("chopping", true);
    this.player.woodcutBusy = true;
    this.player.setVelocity(0, 0);

    const axe = this.add.image(this.player.x + 18, this.player.y - 8, "axe_icon");
    this.entityLayer.add(axe);
    this.tweens.add({ targets: axe, angle: { from: -35, to: 45 }, duration: 210, yoyo: true, repeat: 5, ease: "Sine.inOut" });

    this.emitWoodParticles(tree.x, tree.y);

    this.time.delayedCall(1500, () => {
      axe.destroy();
      this.harvestTree(tree);
      this.player.woodcutBusy = false;
    });
  }

  harvestTree(tree) {
    const ecoPenalty = -Phaser.Math.Between(3, 8 + tree.getData("size"));
    const baseWood = Phaser.Math.Between(4, 10 + tree.getData("size"));
    const plantedBonus = tree.getData("plantedByPlayer") ? 1.5 : 1;
    const wood = Math.round(baseWood * plantedBonus);
    const seeds = Phaser.Math.Between(1, 2) + (tree.getData("plantedByPlayer") ? 2 : 0);

    tree.setData("active", false);
    tree.setData("chopping", false);
    tree.setData("plantedByPlayer", false);
    tree.setData("respawnAt", this.time.now + this.getNaturalRespawnMs());
    tree.setVisible(false);

    this.addInventory("Bois", wood);
    this.addInventory("Graines", seeds);
    this.professions.gainXp("Lumberjack", wood * 6);

    this.events.emit("floating:text", `${ecoPenalty} Eco ⚠️`, 0xffa27b, tree.x, tree.y - 60);
    this.events.emit("floating:text", `+${wood} Bois 🌳`, 0xffd28e, tree.x, tree.y - 35);
    this.events.emit("floating:text", `+${seeds} Graines`, 0x9be78b, tree.x, tree.y - 15);
    this.events.emit("eco:delta", ecoPenalty, "tree_cut");
  }

  tryPlantSeed(wx, wy) {
    const emptySpot = this.treeNodes.find((t) => !t.getData("active") && !t.getData("chopping") && Phaser.Math.Distance.Between(wx, wy, t.getData("x"), t.getData("y")) < 90);
    if (!emptySpot) return false;

    const playerDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, emptySpot.getData("x"), emptySpot.getData("y"));
    if (playerDist > 90) return false;
    if (!this.consumeInventory("Graines", 1)) return false;

    const growMs = Phaser.Math.Between(8000, 15000);
    const x = emptySpot.getData("x");
    const y = emptySpot.getData("y");

    const sap = this.add.image(x, y + 14, "sapling_placeholder").setScale(0.25).setAlpha(0.9);
    this.entityLayer.add(sap);
    this.emitPlantParticles(x, y);

    this.events.emit("floating:text", "Plantation...", 0xc5f29a, x, y - 25);
    const ecoGain = Phaser.Math.Between(10, 25);
    this.events.emit("floating:text", `+${ecoGain} Eco 🌱`, 0x9cee86, x, y - 45);
    this.events.emit("eco:delta", ecoGain, "seed_planted");

    this.time.delayedCall(growMs, () => {
      sap.destroy();
      emptySpot.setScale(0.12).setVisible(true);
      emptySpot.setData("active", true);
      emptySpot.setData("plantedByPlayer", true);
      emptySpot.setData("size", Phaser.Math.Between(1, 2));
      this.tweens.add({ targets: emptySpot, scale: 0.95 + emptySpot.getData("size") * 0.15, duration: 1200, ease: "Back.Out" });
      this.emitPlantParticles(x, y);
    });

    return true;
  }

  emitWoodParticles(x, y) {
    for (let i = 0; i < 10; i += 1) {
      const p = this.add.circle(x + Phaser.Math.Between(-12, 12), y - 10 + Phaser.Math.Between(-8, 10), Phaser.Math.Between(2, 4), i % 2 ? 0x79c261 : 0x8d5d3e);
      this.entityLayer.add(p);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-34, 34),
        y: p.y + Phaser.Math.Between(24, 70),
        alpha: 0,
        duration: Phaser.Math.Between(620, 980),
        onComplete: () => p.destroy()
      });
    }
  }

  emitPlantParticles(x, y) {
    for (let i = 0; i < 16; i += 1) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0x9feb87);
      this.entityLayer.add(p);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-75, 10),
        alpha: 0,
        duration: Phaser.Math.Between(650, 1150),
        onComplete: () => p.destroy()
      });
    }
  }

  maintainEcoMonsters() {
    const eco = this.ecosystem.ecoBalance;
    if (eco >= 40) return;
    const active = this.monsters.countActive(true);
    const target = Phaser.Math.Between(3, 6);
    for (let i = active; i < target; i += 1) this.spawnMonsterNearPlayer();
  }

  spawnMonsterNearPlayer() {
    const m = this.monsters.get();
    if (!m) return;
    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const r = Phaser.Math.Between(220, 380);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * r, 50, this.worldWidth - 50);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * r, 50, this.worldHeight - 50);

    m.enableBody(true, x, y, true, true);
    m.setTexture("monster_placeholder");
    m.hp = 26;
    m.body.setCollideWorldBounds(true);
    m.body.setSize(22, 22);
    this.entityLayer.add(m);
  }

  setupTouchControls() {
    this.stickBase = this.add.circle(110, this.scale.height - 110, 62, 0x000000, 0.3).setScrollFactor(0).setDepth(7000).setVisible(false);
    this.stickThumb = this.add.circle(110, this.scale.height - 110, 34, 0xb4df8f, 0.9).setScrollFactor(0).setDepth(7001).setVisible(false);

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
      if (!tree.getData("active") && now >= tree.getData("respawnAt") && tree.getData("respawnAt") > 0) {
        tree.setVisible(true);
        tree.setScale(0.1);
        tree.setData("active", true);
        tree.setData("respawnAt", 0);
        this.tweens.add({ targets: tree, scale: 0.95 + tree.getData("size") * 0.15, duration: 1100, ease: "Back.Out" });
      }

      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.getData("x"), tree.getData("y")) < 1200;
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

      if (this.ecosystem.ecoBalance < 40) {
        const dir = new Phaser.Math.Vector2(this.player.x - m.x, this.player.y - m.y).normalize();
        m.setVelocity(dir.x * 65, dir.y * 65);
      } else {
        m.setVelocity(0, 0);
      }
    });
  }

  depthSortEntities() {
    // Layer 2 depth sorting based on Y for top-down 2.5D
    const list = this.entityLayer.list;
    for (let i = 0; i < list.length; i += 1) {
      const e = list[i];
      if (!e || !e.active) continue;
      if (typeof e.y === "number") e.setDepth(Math.floor(e.y));
    }
  }

  autoSave() {
    SaveManager.save({
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.serialize(),
      inventory: this.inventory,
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
    skillKeys.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k)) this.combat.castSkill(i, time);
    });

    this.combat.update(time, this.monsters);
    this.updateTrees();
    this.updateMonsters();
    this.depthSortEntities();
    this.bgManager.update(this.cameras.main, delta, this.ecosystem.ecoBalance);
  }
}

class UIOverlayScene extends Phaser.Scene {
  constructor() { super("UIOverlay"); }

  create() {
    this.inventory = {};

    this.add.rectangle(18, 18, 480, 195, 0x2b3f2e, 0.84)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0x9fbe7c)
      .setDepth(9000);

    this.ecoText = this.add.text(34, 34, "EcoBalance: --", { fontSize: "20px", color: "#e8f7dc" }).setScrollFactor(0).setDepth(9001);
    this.profText = this.add.text(34, 62, "Lumberjack: --", { fontSize: "18px", color: "#d3eec6" }).setScrollFactor(0).setDepth(9001);
    this.invText = this.add.text(34, 89, "Inventaire: --", { fontSize: "17px", color: "#d8efd0" }).setScrollFactor(0).setDepth(9001);

    this.ecoBarBg = this.add.rectangle(34, 125, 260, 18, 0x4a2e2b, 0.9).setOrigin(0, 0.5).setDepth(9001).setScrollFactor(0);
    this.ecoBarFill = this.add.rectangle(34, 125, 260, 18, 0x67d06a, 0.95).setOrigin(0, 0.5).setDepth(9002).setScrollFactor(0);

    for (let i = 0; i < 8; i += 1) {
      const btn = this.add.rectangle(this.scale.width - (i + 1) * 74, this.scale.height - 54, 64, 64, 0x344c3b, 0.9)
        .setScrollFactor(0).setStrokeStyle(2, 0xa9ca86).setDepth(9001).setInteractive();
      this.add.text(btn.x, btn.y, `${i + 1}`, { fontSize: "20px", color: "#f3ffea" }).setOrigin(0.5).setDepth(9002).setScrollFactor(0);
      btn.on("pointerdown", () => {
        const world = this.scene.get("MainWorld");
        if (world && world.combat) world.combat.castSkill(i, world.time.now);
      });
    }

    const world = this.scene.get("MainWorld");
    if (!world) return;

    world.events.on("world:ready", (state) => {
      this.setEco(state.ecoBalance);
      this.syncInventory(state.inventory);
      this.profText.setText(`Lumberjack L${state.professions.Lumberjack.level}`);
    });

    world.events.on("eco:changed", (value) => this.setEco(value));
    world.events.on("eco:message", (msg, color) => this.spawnFloatingText(msg, color));
    world.events.on("floating:text", (text, color, x, y) => this.spawnFloatingText(text, color, x, y));
    world.events.on("profession:levelup", (name, lvl) => this.spawnFloatingText(`${name} lvl ${lvl}!`, 0xffea9d));
    world.events.on("profession:xp", (name, data) => {
      if (name === "Lumberjack") this.profText.setText(`Lumberjack L${data.level}`);
    });
  }

  setEco(value) {
    const mood = value > 80 ? "Luxuriant" : value < 40 ? "Affaibli" : "Stable";
    this.ecoText.setText(`EcoBalance: ${value} (${mood})`);
    const ratio = Phaser.Math.Clamp(value / 100, 0, 1);
    this.tweens.add({ targets: this.ecoBarFill, width: 260 * ratio, duration: 220, ease: "Sine.Out" });
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xc74b45),
      Phaser.Display.Color.IntegerToColor(0x5ddb67),
      100,
      value
    );
    this.ecoBarFill.fillColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  }

  addInventory(item, qty, fullInventory = null) {
    if (fullInventory) this.inventory = { ...fullInventory };
    else this.inventory[item] = (this.inventory[item] || 0) + qty;
    this.syncInventory(this.inventory);
  }

  syncInventory(inv) {
    this.inventory = { ...inv };
    const txt = Object.entries(this.inventory).map(([k, v]) => `${k} x${v}`).join(" | ");
    this.invText.setText(`Inventaire: ${txt || "vide"}`);
  }

  spawnFloatingText(text, color = 0xffffff, x = null, y = null) {
    const col = Phaser.Display.Color.IntegerToColor(color).rgba;
    const t = this.add.text(x || this.scale.width * 0.5, y || this.scale.height * 0.35, text, { fontSize: "18px", color: col })
      .setDepth(9200)
      .setScrollFactor(0);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 950, onComplete: () => t.destroy() });
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
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, MenuScene, CharacterCreationScene, MainWorldScene, UIOverlayScene]
};

const game = new Phaser.Game(config);
window.addEventListener("resize", () => game.scale.resize(window.innerWidth, window.innerHeight));
