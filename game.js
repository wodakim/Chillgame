/*
 * Seed of Life - Starter vertical slice architecture.
 * Pure JS with TypeScript-like JSDoc comments for readability and future migration.
 * Target: Phaser 3.55+, mobile-friendly WebView Android, solo-first with future multiplayer-ready structure.
 */

const GAME_VERSION = "0.1.0-prototype";
const SAVE_KEY = "seed_of_life_save_v1";

/** @typedef {{x:number,y:number}} Vec2 */

const PROFESSIONS = {
  gathering: ["Farmer", "Fisherman", "Herbalist", "Lumberjack", "Miner", "Trapper"],
  crafting: ["Armorer", "Baker", "Chef", "Handyman", "Jeweler", "Carver", "Tailor", "Weaponsmith"]
};

const CLASSES = [
  { id: "sprout", name: "Sprout Warden", color: 0x92d36e },
  { id: "river", name: "River Keeper", color: 0x6eb7d3 },
  { id: "ember", name: "Ember Druid", color: 0xd39e6e }
];

/**
 * Persistence helper.
 */
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

/**
 * Tracks ecosystem global health and emits events for reactive systems.
 */
class EcosystemManager {
  constructor(scene, value = 72) {
    this.scene = scene;
    this.ecoBalance = Phaser.Math.Clamp(value, 0, 100);
  }

  /** @param {number} delta */
  changeBalance(delta) {
    this.ecoBalance = Phaser.Math.Clamp(this.ecoBalance + delta, 0, 100);
    this.scene.events.emit("eco:changed", this.ecoBalance);
  }

  getStateTag() {
    if (this.ecoBalance > 70) return "thriving";
    if (this.ecoBalance < 30) return "angered";
    return "fragile";
  }
}

/**
 * Professions system with independent XP/levels, gathering and crafting placeholders.
 */
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

  /** @param {string} profession */
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

  gather(profession) {
    this.gainXp(profession, 12);
    if (Phaser.Math.Between(1, 100) > 65) {
      this.scene.events.emit("inventory:add", "Life Seed", 1);
      this.scene.events.emit("floating:text", "+1 Graine de Vie", 0x9ee25f);
    }
  }

  craft(profession) {
    this.gainXp(profession, 18);
    this.scene.events.emit("floating:text", `Craft ${profession} +XP`, 0xf3d28d);
  }

  serialize() {
    return this.professions;
  }
}

/**
 * Lightweight parallax manager for 2.5D depth feeling.
 */
class ParallaxBackgroundManager {
  constructor(scene) {
    this.scene = scene;
    this.layers = [];
    this.makeLayers();
  }

  makeLayers() {
    const { width, height } = this.scene.scale;

    // TODO: replace with sprite 'assets/bg_sky_far.png'
    const sky = this.scene.add.rectangle(width / 2, height / 2, width * 4, height, 0x7cc6f2).setScrollFactor(0.02, 0.02);
    const mountains = this.scene.add.rectangle(width / 2, height * 0.64, width * 4, height * 0.55, 0x5887a9).setScrollFactor(0.1, 0.08);
    const trees = this.scene.add.rectangle(width / 2, height * 0.76, width * 4, height * 0.45, 0x2f6d43).setScrollFactor(0.25, 0.2);
    const ground = this.scene.add.rectangle(width / 2, height * 1.02, width * 4, height * 0.75, 0x5f8f57).setScrollFactor(0.45, 0.45);

    this.layers.push(sky, mountains, trees, ground);
  }
}

/**
 * Player entity.
 */
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, color = 0x92d36e) {
    // TODO: replace with sprite 'assets/player_idle.png' and atlas key 'player'
    super(scene, x, y, "player_placeholder");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDrag(700, 700);
    this.speed = 170;
    this.autoAttackRange = 90;
    this.targetPoint = null;

    const body = scene.add.rectangle(0, 0, 30, 44, color).setStrokeStyle(2, 0xefffe0);
    const rt = scene.make.renderTexture({ width: 34, height: 48, add: false });
    rt.draw(body, 17, 24);
    rt.saveTexture("player_placeholder");
    body.destroy();

    this.setDepth(10);
  }

  moveToPoint(point) {
    this.targetPoint = point;
  }

  updateFromInput(cursors, joystickVec) {
    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown) vx = -1;
    else if (cursors.right.isDown) vx = 1;

    if (cursors.up.isDown) vy = -1;
    else if (cursors.down.isDown) vy = 1;

    if (joystickVec) {
      vx = Math.abs(joystickVec.x) > 0.1 ? joystickVec.x : vx;
      vy = Math.abs(joystickVec.y) > 0.1 ? joystickVec.y : vy;
    }

    if (vx !== 0 || vy !== 0) {
      const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(this.speed);
      this.setVelocity(vec.x, vec.y);
      this.targetPoint = null;
      return;
    }

    if (this.targetPoint) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetPoint.x, this.targetPoint.y);
      if (dist <= 6) {
        this.targetPoint = null;
        this.setVelocity(0, 0);
      } else {
        this.scene.physics.moveTo(this, this.targetPoint.x, this.targetPoint.y, this.speed);
      }
    }
  }
}

/**
 * Basic combat: target acquisition, auto-attack cadence, skill cooldown state.
 */
class CombatSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.lastAttack = 0;
    this.attackSpeedMs = 550;
    this.skillCooldowns = Array.from({ length: 8 }, () => 0);
  }

  update(time, monsters) {
    const nearby = monsters.getChildren().find((m) => m.active && Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y) <= this.player.autoAttackRange);

    if (nearby && time - this.lastAttack > this.attackSpeedMs) {
      this.lastAttack = time;
      nearby.hp -= 10;
      this.scene.events.emit("floating:text", "-10", 0xff8080, nearby.x, nearby.y - 24);
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
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.text(w * 0.5, h * 0.5, "Seed of Life\nLoading...", { fontSize: "24px", color: "#ecffd6", align: "center" }).setOrigin(0.5);
    // TODO: preload atlas placeholders: this.load.atlas('player', 'assets/player.png', 'assets/player.json')
  }
  create() { this.scene.start("Menu"); }
}

class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }
  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor("#13281f");

    this.add.text(w * 0.5, h * 0.2, "SEED OF LIFE", { fontSize: "54px", color: "#d8ffb9", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(
      w * 0.5,
      h * 0.45,
      "2432 : Grande Multi-Éruption.\n7369 : Naissance de la pousse originelle.\n8374 : Vous naissez de la dernière graine.\nVous êtes le Gardien de l'Écosystème.",
      { fontSize: "20px", color: "#e5f2d8", align: "center", lineSpacing: 10 }
    ).setOrigin(0.5);

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

    this.bgManager = new ParallaxBackgroundManager(this);

    this.ground = this.add.tileSprite(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, null, 0x4f7f52);

    const save = SaveManager.load();
    this.playerData = save?.player || this.playerMeta || { playerName: "Gardien", classId: "sprout", color: 0x92d36e };
    this.ecosystem = new EcosystemManager(this, save?.ecoBalance ?? 72);
    this.professions = new ProfessionSystem(this, save?.professions);

    this.player = new Player(this, save?.position?.x || 400, save?.position?.y || 300, this.playerData.color || 0x92d36e);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,E");

    this.joystickState = { active: false, origin: null, delta: { x: 0, y: 0 } };
    this.setupTouchControls();

    this.monsters = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 40, runChildUpdate: false });
    this.spawnTimer = this.time.addEvent({ delay: 1300, loop: true, callback: this.spawnMonster, callbackScope: this });

    this.combat = new CombatSystem(this, this.player);
    this.input.on("pointerdown", (pointer) => {
      if (!pointer.wasTouch) {
        this.player.moveToPoint({ x: pointer.worldX, y: pointer.worldY });
      }
    });

    this.time.addEvent({ delay: 8000, loop: true, callback: this.autoSave, callbackScope: this });

    this.events.on("inventory:add", (item, qty) => {
      this.scene.get("UIOverlay")?.addInventory(item, qty);
    });

    this.events.emit("world:ready", {
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.professions
    });
  }

  setupTouchControls() {
    this.stickBase = this.add.circle(110, this.scale.height - 110, 62, 0x000000, 0.25).setScrollFactor(0).setDepth(1000).setVisible(false);
    this.stickThumb = this.add.circle(110, this.scale.height - 110, 34, 0xb4df8f, 0.85).setScrollFactor(0).setDepth(1001).setVisible(false);

    this.input.on("pointerdown", (p) => {
      if (p.x < this.scale.width * 0.45 && p.wasTouch) {
        this.joystickState.active = true;
        this.joystickState.origin = { x: p.x, y: p.y };
        this.stickBase.setPosition(p.x, p.y).setVisible(true);
        this.stickThumb.setPosition(p.x, p.y).setVisible(true);
      }
    });

    this.input.on("pointermove", (p) => {
      if (!this.joystickState.active || !p.isDown) return;
      const dx = p.x - this.joystickState.origin.x;
      const dy = p.y - this.joystickState.origin.y;
      const v = new Phaser.Math.Vector2(dx, dy);
      const clamped = v.clone().limit(44);
      this.stickThumb.setPosition(this.joystickState.origin.x + clamped.x, this.joystickState.origin.y + clamped.y);
      this.joystickState.delta.x = Phaser.Math.Clamp(dx / 44, -1, 1);
      this.joystickState.delta.y = Phaser.Math.Clamp(dy / 44, -1, 1);
    });

    const clearStick = () => {
      this.joystickState.active = false;
      this.joystickState.delta.x = 0;
      this.joystickState.delta.y = 0;
      this.stickBase.setVisible(false);
      this.stickThumb.setVisible(false);
    };
    this.input.on("pointerup", clearStick);
    this.input.on("gameout", clearStick);
  }

  spawnMonster() {
    const ecoTag = this.ecosystem.getStateTag();
    const aggressionMultiplier = ecoTag === "angered" ? 2.2 : ecoTag === "fragile" ? 1.2 : 0.6;
    if (Math.random() > aggressionMultiplier * 0.45) return;

    let monster = this.monsters.get();
    if (!monster) return;

    if (!monster.texture.key || monster.texture.key === "__MISSING") {
      // TODO: replace with sprite 'assets/monster_idle.png' atlas key 'monster'
      const body = this.add.rectangle(0, 0, 26, 26, 0xb45b5b).setStrokeStyle(2, 0xf7cfcf);
      const rt = this.make.renderTexture({ width: 30, height: 30, add: false });
      rt.draw(body, 15, 15);
      rt.saveTexture("monster_placeholder");
      body.destroy();
      monster.setTexture("monster_placeholder");
    }

    monster.enableBody(true, Phaser.Math.Between(120, this.worldWidth - 120), Phaser.Math.Between(120, this.worldHeight - 120), true, true);
    monster.hp = 24;
    monster.setDepth(9);
    monster.body.setSize(22, 22);
    monster.body.setCollideWorldBounds(true);
  }

  autoSave() {
    const state = {
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.serialize(),
      position: { x: this.player.x, y: this.player.y }
    };
    SaveManager.save(state);
  }

  update(time) {
    const joystick = this.joystickState.active ? this.joystickState.delta : null;
    const cursors = {
      left: { isDown: this.cursors.left.isDown || this.keys.A.isDown },
      right: { isDown: this.cursors.right.isDown || this.keys.D.isDown },
      up: { isDown: this.cursors.up.isDown || this.keys.W.isDown },
      down: { isDown: this.cursors.down.isDown || this.keys.S.isDown }
    };

    this.player.updateFromInput(cursors, joystick);

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.professions.gather("Herbalist");
      this.ecosystem.changeBalance(+1);
    }

    const skillKeys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE, this.keys.SIX, this.keys.SEVEN, this.keys.EIGHT];
    skillKeys.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k)) this.combat.castSkill(i, time);
    });

    this.combat.update(time, this.monsters);

    // Culling for mobile perf.
    this.monsters.children.iterate((m) => {
      if (!m || !m.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      if (dist > 850) {
        this.monsters.killAndHide(m);
        m.body.enable = false;
      }
    });
  }
}

class UIOverlayScene extends Phaser.Scene {
  constructor() { super("UIOverlay"); }
  create() {
    this.inventory = {};

    const panel = this.add.rectangle(220, 90, 430, 160, 0x2b3f2e, 0.8).setOrigin(0, 0).setScrollFactor(0).setStrokeStyle(3, 0x9fbe7c);
    panel.setDepth(2000);
    this.ecoText = this.add.text(238, 108, "EcoBalance: --", { fontSize: "20px", color: "#e8f7dc" }).setScrollFactor(0).setDepth(2001);
    this.profText = this.add.text(238, 138, "Profession: --", { fontSize: "18px", color: "#d3eec6" }).setScrollFactor(0).setDepth(2001);
    this.invText = this.add.text(238, 168, "Inventaire: vide", { fontSize: "18px", color: "#d8efd0" }).setScrollFactor(0).setDepth(2001);

    this.miniMap = this.add.rectangle(this.scale.width - 160, 24, 140, 140, 0x1e3024, 0.8).setOrigin(0, 0).setScrollFactor(0).setStrokeStyle(2, 0xaed18b).setDepth(2000);
    this.add.text(this.miniMap.x + 12, this.miniMap.y + 8, "Mini-map", { fontSize: "16px", color: "#f2ffe9" }).setScrollFactor(0).setDepth(2001);

    this.skillButtons = [];
    for (let i = 0; i < 8; i += 1) {
      const btn = this.add.rectangle(this.scale.width - (i + 1) * 74, this.scale.height - 54, 64, 64, 0x344c3b, 0.9)
        .setScrollFactor(0)
        .setStrokeStyle(2, 0xa9ca86)
        .setDepth(2001)
        .setInteractive();
      this.add.text(btn.x, btn.y, `${i + 1}`, { fontSize: "20px", color: "#f3ffea" }).setOrigin(0.5).setDepth(2002).setScrollFactor(0);
      btn.on("pointerdown", () => {
        const world = this.scene.get("MainWorld");
        if (world && world.combat) world.combat.castSkill(i, world.time.now);
      });
      this.skillButtons.push(btn);
    }

    this.floatingGroup = this.add.group();

    const world = this.scene.get("MainWorld");
    if (world) {
      world.events.on("world:ready", (state) => {
        this.setEcoText(state.ecoBalance);
        this.profText.setText(`Gardien: ${state.player.playerName || "Seed"}`);
      });
      world.events.on("eco:changed", (value) => this.setEcoText(value));
      world.events.on("floating:text", (text, color, x, y) => this.spawnFloatingText(text, color, x, y));
      world.events.on("profession:levelup", (name, lvl) => this.spawnFloatingText(`${name} lvl ${lvl}!`, 0xffea9d));
    }
  }

  setEcoText(value) {
    const mood = value > 70 ? "(Florissant)" : value < 30 ? "(Colère)" : "(Fragile)";
    this.ecoText.setText(`EcoBalance: ${value} ${mood}`);
  }

  addInventory(item, qty) {
    this.inventory[item] = (this.inventory[item] || 0) + qty;
    const txt = Object.entries(this.inventory).map(([k, v]) => `${k} x${v}`).join(" | ");
    this.invText.setText(`Inventaire: ${txt}`);
  }

  spawnFloatingText(text, color = 0xffffff, x = null, y = null) {
    const t = this.add.text(x || this.scale.width * 0.5, y || this.scale.height - 180, text, { fontSize: "18px", color: Phaser.Display.Color.IntegerToColor(color).rgba })
      .setDepth(2200)
      .setScrollFactor(0.2);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#17261d",
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

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
