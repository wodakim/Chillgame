/*
 * Seed of Life - v0.5 Milestone: Variété des métiers + Combat fluide
 * Pure JS with TS-like comments to ease future modularization.
 */

const GAME_VERSION = "0.5.0-professions-combat";
const SAVE_KEY = "seed_of_life_save_v1";

const CLASSES = [
  { id: "sprout", name: "Sprout Warden", color: 0x92d36e },
  { id: "river", name: "River Keeper", color: 0x6eb7d3 },
  { id: "ember", name: "Ember Druid", color: 0xd39e6e }
];

class SaveManager {
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
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
      if (mood === "weakened") this.scene.events.emit("eco:message", "L’Arbre est affaibli…", 0xff8b70);
      if (mood === "blooming") this.scene.events.emit("eco:message", "La vie renaît ! 🌱", 0xa6ef84);
    }
  }
}

class ProfessionSystem {
  constructor(scene, persisted = null) {
    this.scene = scene;
    this.professions = {
      Lumberjack: persisted?.Lumberjack || { xp: 0, level: 1 },
      Fisherman: persisted?.Fisherman || { xp: 0, level: 1 },
      Miner: persisted?.Miner || { xp: 0, level: 1 }
    };
  }

  gainXp(name, amount) {
    const p = this.professions[name];
    if (!p) return;
    p.xp += amount;
    const cap = p.level * 100;
    if (p.xp >= cap) {
      p.xp -= cap;
      p.level += 1;
      this.scene.events.emit("profession:levelup", name, p.level);
    }
    this.scene.events.emit("profession:xp", name, p);
  }

  serialize() {
    return this.professions;
  }
}

class ParallaxBackgroundManager {
  constructor(scene, worldWidth, worldHeight) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.time = 0;
    this.createTextures();
    this.createLayers();
  }

  createTextures() {
    const g = this.scene.make.graphics({ add: false });

    // Cleaner top-down ground texture with soft variation.
    g.fillStyle(0x4e8257, 1);
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1900; i += 1) {
      g.fillStyle([0x5a8f61, 0x477950, 0x679f6d][Phaser.Math.Between(0, 2)], Phaser.Math.FloatBetween(0.08, 0.5));
      g.fillCircle(Phaser.Math.Between(0, 1024), Phaser.Math.Between(0, 1024), Phaser.Math.Between(1, 3));
    }
    for (let i = 0; i < 70; i += 1) {
      g.fillStyle(0x6e4f3a, Phaser.Math.FloatBetween(0.12, 0.24));
      g.fillEllipse(Phaser.Math.Between(0, 1024), Phaser.Math.Between(0, 1024), Phaser.Math.Between(45, 140), Phaser.Math.Between(22, 74));
    }
    g.generateTexture("td_ground", 1024, 1024);
    g.clear();

    g.fillStyle(0x96d2cd, 1);
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle(0x3f634d, 0.75);
    g.beginPath();
    g.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 100) g.lineTo(x, Phaser.Math.Between(210, 365));
    g.lineTo(1024, 512);
    g.closePath();
    g.fillPath();
    g.generateTexture("td_far_mountains", 1024, 512);
    g.clear();

    g.fillStyle(0x6cae64, 0.65);
    g.fillRect(0, 360, 1024, 152);
    for (let i = 0; i < 230; i += 1) {
      const x = Phaser.Math.Between(0, 1024);
      const y = Phaser.Math.Between(370, 510);
      g.fillStyle([0x83ca75, 0x98d689, 0x7abf6d][Phaser.Math.Between(0, 2)], Phaser.Math.FloatBetween(0.4, 0.95));
      g.fillRect(x, y, 2, Phaser.Math.Between(10, 24));
      if (Math.random() > 0.8) {
        g.fillStyle(0xeecf8d, 0.6);
        g.fillCircle(x + 2, y - 1, 2);
      }
    }
    g.generateTexture("td_foreground", 1024, 512);
    g.destroy();
  }

  createLayers() {
    this.sky = this.scene.add.tileSprite(this.worldWidth * 0.5, 250, this.worldWidth, 760, "td_far_mountains")
      .setDepth(-200)
      .setScrollFactor(0.92, 0.95)
      .setAlpha(0.92);

    this.ground = this.scene.add.tileSprite(this.worldWidth * 0.5, this.worldHeight * 0.5, this.worldWidth, this.worldHeight, "td_ground")
      .setDepth(-150)
      .setScrollFactor(1, 1);

    this.front = this.scene.add.tileSprite(this.worldWidth * 0.5, this.worldHeight * 0.5, this.worldWidth, this.worldHeight, "td_foreground")
      .setDepth(7000)
      .setAlpha(0.62)
      .setScrollFactor(1.04, 1.02);
  }

  applyEcoTint(eco) {
    let rear = 0xbde6c4;
    let mid = 0xccebc2;
    let front = 0xdff2cc;
    if (eco < 40) {
      rear = 0x9f6455;
      mid = 0x8f5f4e;
      front = 0xb17965;
    } else if (eco > 80) {
      rear = 0xd9f9cb;
      mid = 0xe8ffd4;
      front = 0xf0ffdb;
    }
    this.sky.setTint(rear);
    this.ground.setTint(mid);
    this.front.setTint(front);
  }

  update(camera, delta, eco) {
    this.time += delta * 0.001;
    this.sky.tilePositionX = camera.scrollX * 0.022;
    this.sky.tilePositionY = camera.scrollY * 0.018;
    this.sky.y = 250 + Math.sin(this.time * 0.08) * 4;
    this.applyEcoTint(eco);
  }
}

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, color = 0x92d36e) {
    if (!scene.textures.exists("player_placeholder")) {
      const g = scene.make.graphics({ add: false });
      // TODO: replace with sprite 'assets/player_idle.png' atlas key 'player'
      g.fillStyle(color, 1);
      g.fillRoundedRect(8, 10, 24, 30, 8);
      g.fillStyle(0xeeffe0, 1);
      g.fillCircle(20, 8, 7);
      g.generateTexture("player_placeholder", 40, 44);
      g.destroy();
    }

    super(scene, x, y, "player_placeholder");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.targetPoint = null;
    this.maxSpeed = 190;
    this.decel = 0.14;
    this.autoAttackRange = 92;
    this.woodcutBusy = false;
    this.hp = 100;
    this.maxHp = 100;
    this.hasAxe = false;
    this.hasRod = false;
    this.hasPickaxe = false;
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
      vel.x = Phaser.Math.Linear(vel.x, dir.x * this.maxSpeed, 0.17 * f);
      vel.y = Phaser.Math.Linear(vel.y, dir.y * this.maxSpeed, 0.17 * f);
      this.targetPoint = null;
    } else if (this.targetPoint) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.targetPoint.x, this.targetPoint.y);
      if (d < 8) this.targetPoint = null;
      else {
        const dir = new Phaser.Math.Vector2(this.targetPoint.x - this.x, this.targetPoint.y - this.y).normalize();
        vel.x = Phaser.Math.Linear(vel.x, dir.x * this.maxSpeed, 0.13 * f);
        vel.y = Phaser.Math.Linear(vel.y, dir.y * this.maxSpeed, 0.13 * f);
      }
    } else {
      vel.x = Phaser.Math.Linear(vel.x, 0, this.decel * f);
      vel.y = Phaser.Math.Linear(vel.y, 0, this.decel * f);
    }

    this.setVelocity(vel.x, vel.y);
  }
}

class CombatSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.currentTarget = null;
    this.lastAttack = 0;
    this.attackSpeedMs = 540;
    this.skillCooldowns = [0, 0, 0, 0, 0, 0, 0, 0];
  }

  setTarget(monster) {
    this.currentTarget = monster && monster.active ? monster : null;
  }

  castSkill(index, time) {
    if (index > 3) {
      // keep 1-8 UI but advanced skills placeholder
      this.scene.events.emit("floating:text", `Skill ${index + 1} (placeholder)`, 0x9dd8ff);
      return false;
    }
    if (time < this.skillCooldowns[index]) return false;
    this.skillCooldowns[index] = time + [1400, 2200, 3000, 4200][index];

    const bonus = [8, 14, 20, 28][index];
    if (this.currentTarget && this.currentTarget.active) {
      this.currentTarget.hp -= bonus;
      this.scene.events.emit("floating:text", `-${bonus}`, 0xff6f6f, this.currentTarget.x, this.currentTarget.y - 34);
      console.log("[audio-placeholder] woosh");
    }
    return true;
  }

  update(time, monsters) {
    if (this.currentTarget && (!this.currentTarget.active || this.currentTarget.hp <= 0)) this.currentTarget = null;

    const target = this.currentTarget;
    if (!target) return;

    const dist = Phaser.Math.Distance.Between(target.x, target.y, this.player.x, this.player.y);
    if (dist > this.player.autoAttackRange + 10) return;

    if (time - this.lastAttack > this.attackSpeedMs) {
      this.lastAttack = time;
      target.hp -= 10;
      this.scene.events.emit("floating:text", "-10", 0xff8c8c, target.x, target.y - 22);
      console.log("[audio-placeholder] hit");

      if (target.hp <= 0) {
        monsters.killAndHide(target);
        target.body.enable = false;
        const ecoGain = Phaser.Math.Between(8, 18);
        const seeds = Phaser.Math.Between(1, 3);
        this.scene.events.emit("inventory:add", "Monster Essence", 1);
        this.scene.events.emit("inventory:add", "Graines", seeds);
        this.scene.events.emit("floating:text", `+${seeds} Graines`, 0xabe89a, target.x, target.y - 44);
        this.scene.events.emit("floating:text", `+${ecoGain} Eco 🌱`, 0xa2ed8d, target.x, target.y - 62);
        this.scene.events.emit("eco:delta", ecoGain, "monster_kill");
      }
    }
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
    this.cameras.main.setBackgroundColor("#040704");
    this.add.text(this.scale.width * 0.5, this.scale.height * 0.5, "Seed of Life\nLoading...", { fontSize: "24px", color: "#e6f5d2", align: "center" }).setOrigin(0.5);
  }
  create() {
    console.log("[audio-placeholder] intro ambient start");
    this.scene.start("Menu");
  }
}

class IntroScene extends Phaser.Scene {
  constructor() { super("Intro"); }
  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#000000");
    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 1).setOrigin(0).setDepth(50);

    const redSky = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x2b0606).setAlpha(0.1);
    const text1 = this.add.text(w * 0.5, h * 0.25, "2432 — La Grande Multi-Éruption…", { fontSize: "32px", color: "#ff8f8f", fontStyle: "bold" }).setOrigin(0.5).setAlpha(0);

    const deadGround = this.add.rectangle(w * 0.5, h * 0.75, w * 0.9, 160, 0x2d1610).setAlpha(0);
    const sprout = this.add.circle(w * 0.5, h * 0.68, 8, 0x65c95e).setScale(0.1).setAlpha(0);
    const treeTrunk = this.add.rectangle(w * 0.5, h * 0.62, 26, 160, 0x6c4024).setOrigin(0.5, 1).setScale(0.1).setAlpha(0);
    const treeCrown = this.add.circle(w * 0.5, h * 0.43, 95, 0x58a958).setScale(0.1).setAlpha(0);

    const txt2 = this.add.text(w * 0.5, h * 0.18, "7369 — Une pousse renaît.", { fontSize: "30px", color: "#baf7a8" }).setOrigin(0.5).setAlpha(0);
    const txt3 = this.add.text(w * 0.5, h * 0.23, "8374 — La dernière graine éclot.", { fontSize: "30px", color: "#dcffcb" }).setOrigin(0.5).setAlpha(0);

    const seed = this.add.circle(w * 0.5, h * 0.52, 10, 0xe9cb7b).setAlpha(0).setScale(0.2);
    const playerEcho = this.add.rectangle(w * 0.5, h * 0.57, 40, 54, 0xb7f08f).setAlpha(0).setScale(0.6);

    const guardianBtn = this.add.rectangle(w * 0.5, h * 0.84, 320, 70, 0x5e8a4a).setStrokeStyle(3, 0xd8f3b5).setAlpha(0).setInteractive();
    const btnText = this.add.text(guardianBtn.x, guardianBtn.y, "Je suis le Gardien", { fontSize: "28px", color: "#f4ffe6" }).setOrigin(0.5).setAlpha(0).setDepth(40);

    let sparkles = false;
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        if (!sparkles) return;
        const p = this.add.circle(
          Phaser.Math.Between(w * 0.2, w * 0.8),
          Phaser.Math.Between(h * 0.2, h * 0.7),
          Phaser.Math.Between(2, 4),
          [0xffe69a, 0xcaf49f][Phaser.Math.Between(0, 1)]
        ).setAlpha(0.7);
        this.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(20, 45), alpha: 0, duration: 900, onComplete: () => p.destroy() });
      }
    });

    this.tweens.add({ targets: overlay, alpha: 0, duration: 1200 });
    this.tweens.add({ targets: [redSky, deadGround], alpha: 0.95, duration: 1400, delay: 500 });
    this.tweens.add({ targets: text1, alpha: 1, duration: 800, delay: 1300 });
    this.tweens.add({ targets: text1, alpha: 0, duration: 900, delay: 3200 });

    this.time.delayedCall(3800, () => {
      this.tweens.add({ targets: redSky, alpha: 0.35, duration: 1400 });
      this.tweens.add({ targets: sprout, alpha: 1, scale: 1, duration: 1300, ease: "Back.Out" });
      this.tweens.add({ targets: txt2, alpha: 1, duration: 900 });
    });

    this.time.delayedCall(5200, () => {
      sparkles = true;
      this.tweens.add({ targets: [treeTrunk, treeCrown], alpha: 1, scale: 1, duration: 1800, ease: "Sine.Out" });
    });

    this.time.delayedCall(7600, () => {
      this.tweens.add({ targets: txt3, alpha: 1, duration: 900 });
      this.tweens.add({ targets: seed, alpha: 1, scale: 1, duration: 1100, yoyo: true, repeat: 1 });
    });

    this.time.delayedCall(9000, () => this.tweens.add({ targets: playerEcho, alpha: 1, scale: 1, duration: 1000 }));
    this.time.delayedCall(10300, () => this.tweens.add({ targets: [guardianBtn, btnText], alpha: 1, duration: 700 }));

    guardianBtn.on("pointerdown", () => {
      console.log("[audio-placeholder] intro confirm");
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(520, () => this.scene.start("CharacterCreation"));
    });
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }
  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#0f1a11");
    this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x102918);

    const trunk = this.add.rectangle(w * 0.5, h * 0.74, 42, 230, 0x6f4427).setOrigin(0.5, 1);
    const crown = this.add.circle(w * 0.5, h * 0.44, 140, 0x58a95b).setAlpha(0.92);
    const crown2 = this.add.circle(w * 0.5 - 110, h * 0.46, 72, 0x67bb67).setAlpha(0.8);
    const crown3 = this.add.circle(w * 0.5 + 108, h * 0.47, 74, 0x67bb67).setAlpha(0.8);
    this.tweens.add({ targets: [trunk, crown, crown2, crown3], scaleX: 1.03, scaleY: 1.03, yoyo: true, duration: 3000, repeat: -1, ease: "Sine.InOut" });

    this.time.addEvent({
      delay: 130,
      loop: true,
      callback: () => {
        const p = this.add.circle(
          Phaser.Math.Between(w * 0.35, w * 0.65),
          Phaser.Math.Between(h * 0.4, h * 0.7),
          Phaser.Math.Between(2, 4),
          [0xffe69d, 0xbff293][Phaser.Math.Between(0, 1)]
        ).setAlpha(0.45);
        this.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(24, 52), alpha: 0, duration: 1300, onComplete: () => p.destroy() });
      }
    });

    this.add.text(w * 0.5, h * 0.2, "Seed of Life", { fontSize: "72px", color: "#f1ffd8", fontFamily: "Georgia, serif", fontStyle: "bold" }).setOrigin(0.5);

    const btn = this.add.rectangle(w * 0.5, h * 0.82, 320, 78, 0x628a4f).setStrokeStyle(4, 0xe6f8be).setInteractive();
    this.add.text(btn.x, btn.y, "Nouvelle Graine", { fontSize: "34px", color: "#f9ffea", fontFamily: "Georgia, serif" }).setOrigin(0.5);

    btn.on("pointerover", () => {
      btn.setFillStyle(0x76a35d);
      this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 120, yoyo: true });
    });
    btn.on("pointerout", () => btn.setFillStyle(0x628a4f));
    btn.on("pointerdown", () => {
      console.log("[audio-placeholder] menu click");
      this.scene.start("Intro");
    });
  }
}

class CharacterCreationScene extends Phaser.Scene {
  constructor() { super("CharacterCreation"); }
  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#1a2f24");
    this.add.text(w * 0.5, 66, "Création du Gardien", { fontSize: "36px", color: "#e8ffd4", fontFamily: "Georgia, serif" }).setOrigin(0.5);

    this.playerName = "Gardien";
    this.classIndex = 0;

    const nameLabel = this.add.text(w * 0.5, 152, `Nom : ${this.playerName}`, { fontSize: "26px", color: "#daf2ca" }).setOrigin(0.5);
    const randomBtn = this.add.rectangle(w * 0.5, 206, 210, 44, 0x355843).setInteractive();
    this.add.text(w * 0.5, 206, "Nom aléatoire", { fontSize: "20px", color: "#d9f6cc" }).setOrigin(0.5);
    randomBtn.on("pointerdown", () => {
      this.playerName = `Seed-${Phaser.Math.Between(100, 999)}`;
      nameLabel.setText(`Nom : ${this.playerName}`);
    });

    this.preview = this.add.rectangle(w * 0.5, h * 0.56, 90, 114, CLASSES[0].color).setStrokeStyle(4, 0xffffff);
    this.classLabel = this.add.text(w * 0.5, h * 0.69, CLASSES[0].name, { fontSize: "24px", color: "#efffe5" }).setOrigin(0.5);

    const prev = this.add.rectangle(w * 0.35, h * 0.56, 62, 62, 0x2a4333).setInteractive();
    const next = this.add.rectangle(w * 0.65, h * 0.56, 62, 62, 0x2a4333).setInteractive();
    this.add.text(prev.x, prev.y, "<", { fontSize: "34px", color: "#d8edc6" }).setOrigin(0.5);
    this.add.text(next.x, next.y, ">", { fontSize: "34px", color: "#d8edc6" }).setOrigin(0.5);
    prev.on("pointerdown", () => this.changeClass(-1));
    next.on("pointerdown", () => this.changeClass(1));

    const create = this.add.rectangle(w * 0.5, h * 0.84, 320, 72, 0x6b9551).setStrokeStyle(4, 0xc7ef9f).setInteractive();
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
    this.worldWidth = 4200;
    this.worldHeight = 2700;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    const save = SaveManager.load();
    this.playerData = save?.player || this.playerMeta || { playerName: "Gardien", classId: "sprout", color: 0x92d36e };

    this.ecosystem = new EcosystemManager(this, save?.ecoBalance ?? 72);
    this.professions = new ProfessionSystem(this, save?.professions);
    this.inventory = save?.inventory || {
      Graines: Phaser.Math.Between(3, 5),
      Branches: 0,
      Pierres: 0,
      Fibres: 2,
      Bois: 0,
      Cuivre: 0,
      Poissons: 0,
      "Wooden Axe": 0,
      Pickaxe: 0,
      "Fishing Rod": 0,
      "Monster Essence": 0
    };

    this.selectedItem = null;
    this.isPlantingMode = false;
    this.craftingTarget = "Wooden Axe";

    this.bgManager = new ParallaxBackgroundManager(this, this.worldWidth, this.worldHeight);
    this.entityLayer = this.add.container(0, 0).setDepth(0);

    this.createTextures();

    // rivers and zones first for world readability
    this.riverZones = [];
    this.createRivers();

    this.player = new Player(this, save?.position?.x || 500, save?.position?.y || 420, this.playerData.color || 0x92d36e);
    this.player.hasAxe = (this.inventory["Wooden Axe"] || 0) > 0;
    this.player.hasRod = (this.inventory["Fishing Rod"] || 0) > 0;
    this.player.hasPickaxe = (this.inventory.Pickaxe || 0) > 0;
    this.entityLayer.add(this.player);

    this.axeVisual = this.add.image(this.player.x + 16, this.player.y - 8, "axe_icon").setVisible(this.player.hasAxe);
    this.rodVisual = this.add.image(this.player.x - 16, this.player.y - 8, "rod_icon").setVisible(false);
    this.pickVisual = this.add.image(this.player.x + 16, this.player.y - 8, "pickaxe_icon").setVisible(false);
    this.entityLayer.add(this.axeVisual);
    this.entityLayer.add(this.rodVisual);
    this.entityLayer.add(this.pickVisual);

    this.treeNodes = [];
    this.spawnOrganicTrees();

    this.rocks = [];
    this.spawnRocks();

    this.fishingSpots = [];
    this.spawnFishingSpots();

    this.flowers = [];
    this.spawnFlowers();

    this.gatherables = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 90 });
    this.spawnStartingGroundResources();

    this.monsters = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 75 });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,I");
    this.joystickState = { active: false, origin: null, delta: { x: 0, y: 0 }, pointerId: null };
    this.setupTouchControls();

    this.combat = new CombatSystem(this, this.player);

    this.cameras.main.startFollow(this.player, true, 0.03, 0.03);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.input.on("pointerdown", (pointer) => this.handleWorldClick(pointer));

    this.events.on("eco:delta", (delta, reason) => this.ecosystem.changeBalance(delta, reason));
    this.events.on("inventory:add", (item, qty) => this.addInventory(item, qty));

    this.time.addEvent({ delay: 1400, loop: true, callback: this.maintainEcoMonsters, callbackScope: this });
    this.time.addEvent({ delay: 9000, loop: true, callback: this.autoSave, callbackScope: this });

    this.events.emit("world:ready", {
      player: this.playerData,
      ecoBalance: this.ecosystem.ecoBalance,
      professions: this.professions.serialize(),
      inventory: this.inventory,
      hasAxe: this.player.hasAxe,
      hasRod: this.player.hasRod,
      hasPickaxe: this.player.hasPickaxe,
      hp: this.player.hp
    });
  }

  createTextures() {
    const createIfMissing = (key, paint) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ add: false });
      paint(g);
      g.generateTexture(key, 64, 64);
      g.destroy();
    };

    createIfMissing("tree_placeholder", (g) => {
      // TODO: replace with sprite 'assets/tree_oak.png'
      g.fillStyle(0x1a1a1a, 0.22); g.fillEllipse(32, 58, 38, 10);
      g.fillStyle(0x6d4022, 1); g.fillRoundedRect(26, 28, 12, 28, 4);
      g.fillStyle(0x2d8e4e, 1); g.fillCircle(32, 22, 18);
      g.fillStyle(0x46ad65, 0.8); g.fillCircle(24, 22, 9); g.fillCircle(40, 20, 8);
    });

    createIfMissing("sapling_placeholder", (g) => {
      g.fillStyle(0x5c361f, 1); g.fillRect(30, 28, 4, 16);
      g.fillStyle(0x59b155, 1); g.fillCircle(32, 24, 8);
    });

    createIfMissing("axe_icon", (g) => {
      // TODO: replace with sprite 'assets/tool_axe_wooden.png'
      g.fillStyle(0x8f6b47, 1); g.fillRect(28, 10, 3, 22);
      g.fillStyle(0xb6c4d0, 1); g.fillTriangle(31, 13, 43, 8, 43, 19);
    });

    createIfMissing("rod_icon", (g) => {
      g.lineStyle(3, 0x8d6a49, 1);
      g.beginPath(); g.moveTo(20, 46); g.lineTo(44, 14); g.strokePath();
      g.fillStyle(0xb8d7ef, 1); g.fillCircle(46, 16, 2);
    });

    createIfMissing("pickaxe_icon", (g) => {
      g.fillStyle(0x8a6244, 1); g.fillRect(29, 9, 4, 26);
      g.fillStyle(0xbec8d1, 1); g.fillRect(21, 12, 20, 5);
    });

    createIfMissing("monster_green", (g) => {
      g.fillStyle(0x66c15f, 1); g.fillRoundedRect(16, 16, 32, 30, 10);
    });
    createIfMissing("monster_wolf", (g) => {
      g.fillStyle(0x9e7d6e, 1); g.fillRoundedRect(14, 18, 34, 26, 8);
    });
    createIfMissing("monster_imp", (g) => {
      g.fillStyle(0xcd6558, 1); g.fillRoundedRect(16, 16, 32, 30, 8);
    });
    createIfMissing("monster_shroom", (g) => {
      g.fillStyle(0xa255b8, 1); g.fillRoundedRect(16, 18, 32, 28, 8);
    });
    createIfMissing("monster_bat", (g) => {
      g.fillStyle(0x7e6faa, 1); g.fillRoundedRect(14, 20, 34, 22, 8);
    });
    createIfMissing("monster_seedling", (g) => {
      g.fillStyle(0x7fbb73, 1); g.fillRoundedRect(16, 16, 32, 30, 8);
    });

    createIfMissing("branch_placeholder", (g) => {
      g.fillStyle(0x7a4e2c, 1); g.fillRoundedRect(12, 28, 40, 6, 2);
    });
    createIfMissing("stone_placeholder", (g) => {
      g.fillStyle(0x8f959d, 1); g.fillCircle(32, 32, 12);
    });
    createIfMissing("rock_placeholder", (g) => {
      g.fillStyle(0x777d85, 1); g.fillRoundedRect(10, 20, 44, 30, 8);
      g.lineStyle(2, 0xd19a5f, 0.8); g.beginPath(); g.moveTo(18, 26); g.lineTo(30, 44); g.moveTo(36, 24); g.lineTo(44, 42); g.strokePath();
    });
    createIfMissing("fishspot_placeholder", (g) => {
      g.fillStyle(0x6bc8f0, 0.7); g.fillCircle(32, 32, 18);
      g.fillStyle(0xd6f9ff, 0.85); g.fillCircle(26, 26, 3); g.fillCircle(38, 36, 2);
    });
    createIfMissing("flower_placeholder", (g) => {
      g.fillStyle(0x53a55a, 1); g.fillRect(30, 26, 4, 26);
      g.fillStyle(0xe7b3e9, 0.9); g.fillCircle(32, 24, 6);
    });
    createIfMissing("plant_marker", (g) => {
      g.fillStyle(0x4f2f1f, 0.6); g.fillEllipse(32, 42, 40, 14);
    });

    if (!this.textures.exists("river_tile")) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x4aa8d8, 0.95); g.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 22; i += 1) {
        g.fillStyle(0x8be0ff, Phaser.Math.FloatBetween(0.12, 0.35));
        g.fillEllipse(Phaser.Math.Between(0, 128), Phaser.Math.Between(0, 64), Phaser.Math.Between(8, 26), Phaser.Math.Between(3, 9));
      }
      g.generateTexture("river_tile", 128, 64);
      g.destroy();
    }
  }

  createRivers() {
    const riverDefs = [
      { x: 900, y: 560, w: 900, h: 140 },
      { x: 2100, y: 980, w: 1100, h: 160 },
      { x: 3100, y: 1500, w: 820, h: 130 },
      { x: 1500, y: 1900, w: 1000, h: 150 }
    ];

    riverDefs.forEach((r) => {
      const water = this.add.tileSprite(r.x, r.y, r.w, r.h, "river_tile").setDepth(-80).setAlpha(0.84);
      this.riverZones.push({ rect: new Phaser.Geom.Rectangle(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h), water });
    });
  }

  spawnOrganicTrees() {
    const count = 11;
    const points = [];
    const minDist = 210;

    while (points.length < count) {
      const x = Phaser.Math.Between(260, this.worldWidth - 260);
      const y = Phaser.Math.Between(220, this.worldHeight - 220);
      const safeFromRiver = this.riverZones.every((rz) => !rz.rect.contains(x, y));
      const okDist = points.every((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) > minDist);
      if (safeFromRiver && okDist) points.push({ x, y });
    }

    points.forEach((p) => {
      const size = Phaser.Math.Between(1, 3);
      const tree = this.add.image(p.x, p.y, "tree_placeholder").setScale(0.88 + size * 0.17);
      tree.setDataEnabled();
      tree.setData({ x: p.x, y: p.y, size, active: true, chopping: false, plantedByPlayer: false, respawnAt: 0 });
      this.treeNodes.push(tree);
      this.entityLayer.add(tree);
    });
  }

  spawnRocks() {
    const count = Phaser.Math.Between(8, 12);
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(260, this.worldWidth - 260);
      const y = Phaser.Math.Between(220, this.worldHeight - 220);
      if (this.riverZones.some((rz) => rz.rect.contains(x, y))) continue;

      const rock = this.add.image(x, y, "rock_placeholder").setScale(Phaser.Math.FloatBetween(0.8, 1.3));
      rock.setDataEnabled();
      rock.setData({ x, y, active: true, mining: false, respawnAt: 0 });
      this.rocks.push(rock);
      this.entityLayer.add(rock);
    }
  }

  spawnFishingSpots() {
    this.riverZones.forEach((rz) => {
      const spots = Phaser.Math.Between(1, 2);
      for (let i = 0; i < spots; i += 1) {
        const x = Phaser.Math.Between(rz.rect.x + 50, rz.rect.x + rz.rect.width - 50);
        const y = Phaser.Math.Between(rz.rect.y + 30, rz.rect.y + rz.rect.height - 30);
        const spot = this.add.image(x, y, "fishspot_placeholder").setScale(0.9);
        spot.setDataEnabled();
        spot.setData({ x, y, active: true, fishing: false });
        this.fishingSpots.push(spot);
        this.entityLayer.add(spot);
      }
    });
  }

  spawnFlowers() {
    for (let i = 0; i < 14; i += 1) {
      const x = Phaser.Math.Between(220, this.worldWidth - 220);
      const y = Phaser.Math.Between(200, this.worldHeight - 200);
      const flower = this.add.image(x, y, "flower_placeholder").setScale(Phaser.Math.FloatBetween(0.8, 1.2));
      flower.setDataEnabled();
      flower.setData({ x, y, active: true });
      this.flowers.push(flower);
      this.entityLayer.add(flower);
    }
  }

  spawnStartingGroundResources() {
    const total = Phaser.Math.Between(15, 20);
    for (let i = 0; i < total; i += 1) {
      const kind = Math.random() > 0.45 ? "Branches" : "Pierres";
      const texture = kind === "Branches" ? "branch_placeholder" : "stone_placeholder";
      const item = this.gatherables.get();
      if (!item) continue;

      const x = Phaser.Math.Between(180, this.worldWidth - 180);
      const y = Phaser.Math.Between(160, this.worldHeight - 160);
      item.enableBody(true, x, y, true, true);
      item.setTexture(texture);
      item.kind = kind;
      item.setScale(kind === "Branches" ? 1 : Phaser.Math.FloatBetween(0.85, 1.12));
      this.entityLayer.add(item);
    }
  }

  handleWorldClick(pointer) {
    const isTouch = pointer.pointerType === "touch" || pointer.wasTouch;
    if (isTouch && pointer.x <= this.scale.width * 0.4) return; // 40% left reserved for joystick

    const wx = pointer.worldX;
    const wy = pointer.worldY;

    // combat click target first
    const clickedMonster = this.monsters.getChildren().find((m) => m.active && Phaser.Math.Distance.Between(wx, wy, m.x, m.y) < 42);
    if (clickedMonster) {
      this.combat.setTarget(clickedMonster);
      this.player.moveToPoint({ x: wx, y: wy });
      return;
    }

    if (this.tryGatherGroundResource(wx, wy)) return;
    if (this.tryFishingAction(wx, wy)) return;
    if (this.tryMiningAction(wx, wy)) return;
    if (this.tryLumberjackAction(wx, wy)) return;
    if (this.isPlantingMode && this.tryPlantSeed(wx, wy)) return;

    this.player.moveToPoint({ x: wx, y: wy });
  }

  tryGatherGroundResource(wx, wy) {
    const target = this.gatherables.getChildren().find((g) => g.active && Phaser.Math.Distance.Between(wx, wy, g.x, g.y) < 44);
    if (!target) return false;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    if (d > 82) return false;

    this.addInventory(target.kind, 1);
    this.events.emit("floating:text", `+1 ${target.kind}`, 0xd4f0b2, target.x, target.y - 20);
    this.gatherables.killAndHide(target);
    target.body.enable = false;
    return true;
  }

  tryLumberjackAction(wx, wy) {
    const tree = this.treeNodes.find((t) => t.getData("active") && !t.getData("chopping") && Phaser.Math.Distance.Between(wx, wy, t.x, t.y) < 96);
    if (!tree) return false;

    if (!this.player.hasAxe) {
      this.events.emit("floating:text", "Il faut une Wooden Axe", 0xffb798, this.player.x, this.player.y - 42);
      return true;
    }

    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.x, tree.y);
    if (d > 84) return false;

    this.startChopTree(tree);
    return true;
  }

  startChopTree(tree) {
    tree.setData("chopping", true);
    this.player.woodcutBusy = true;
    this.player.setVelocity(0, 0);
    console.log("[audio-placeholder] chop");

    const swing = this.add.image(this.player.x + 18, this.player.y - 8, "axe_icon");
    this.entityLayer.add(swing);
    this.tweens.add({ targets: swing, angle: { from: -35, to: 55 }, duration: 220, yoyo: true, repeat: 5, ease: "Sine.InOut" });

    for (let i = 0; i < 12; i += 1) {
      const p = this.add.circle(tree.x + Phaser.Math.Between(-12, 12), tree.y - 12 + Phaser.Math.Between(-8, 8), Phaser.Math.Between(2, 4), i % 2 ? 0x7dcf68 : 0x8a5b40);
      this.entityLayer.add(p);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-45, 45), y: p.y + Phaser.Math.Between(30, 70), alpha: 0, duration: Phaser.Math.Between(620, 980), onComplete: () => p.destroy() });
    }

    this.time.delayedCall(1500, () => {
      swing.destroy();
      this.finishChopTree(tree);
      this.player.woodcutBusy = false;
    });
  }

  getNaturalRespawnMsTree() {
    const eco = this.ecosystem.ecoBalance;
    const t = Phaser.Math.Clamp((100 - eco) / 100, 0, 1);
    return Phaser.Math.Linear(900000, 1800000, t);
  }

  finishChopTree(tree) {
    const size = tree.getData("size");
    const ecoLoss = -Phaser.Math.Between(3, 8 + size);
    const baseWood = Phaser.Math.Between(4, 10 + size);
    const planted = !!tree.getData("plantedByPlayer");
    const wood = Math.round(baseWood * (planted ? 1.5 : 1));
    const seeds = Phaser.Math.Between(1, 2) + (planted ? 2 : 0);

    tree.setData("active", false);
    tree.setData("chopping", false);
    tree.setData("plantedByPlayer", false);
    tree.setData("respawnAt", this.time.now + this.getNaturalRespawnMsTree());
    tree.setVisible(false);

    this.addInventory("Bois", wood);
    this.addInventory("Graines", seeds);
    this.professions.gainXp("Lumberjack", wood * 6);

    this.events.emit("floating:text", `${ecoLoss} Eco ⚠️`, 0xffa27e, tree.x, tree.y - 62);
    this.events.emit("floating:text", `+${wood} Bois 🌳`, 0xffdca0, tree.x, tree.y - 42);
    this.events.emit("floating:text", `+${seeds} Graines`, 0xa2ed8d, tree.x, tree.y - 22);
    this.events.emit("eco:delta", ecoLoss, "tree_cut");
  }

  tryMiningAction(wx, wy) {
    const rock = this.rocks.find((r) => r.getData("active") && !r.getData("mining") && Phaser.Math.Distance.Between(wx, wy, r.x, r.y) < 82);
    if (!rock) return false;

    if (!this.player.hasPickaxe) {
      this.events.emit("floating:text", "Il faut une Pickaxe", 0xffb798, this.player.x, this.player.y - 42);
      return true;
    }

    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, rock.x, rock.y);
    if (d > 84) return false;

    rock.setData("mining", true);
    this.player.woodcutBusy = true;
    console.log("[audio-placeholder] hit");

    const swing = this.add.image(this.player.x + 16, this.player.y - 8, "pickaxe_icon");
    this.entityLayer.add(swing);
    this.tweens.add({ targets: swing, angle: { from: -45, to: 35 }, duration: 210, yoyo: true, repeat: 5, ease: "Sine.InOut" });

    for (let i = 0; i < 10; i += 1) {
      const spark = this.add.circle(rock.x + Phaser.Math.Between(-10, 10), rock.y + Phaser.Math.Between(-8, 8), Phaser.Math.Between(2, 3), [0xffd798, 0xe0f2ff][Phaser.Math.Between(0, 1)]);
      this.entityLayer.add(spark);
      this.tweens.add({ targets: spark, x: spark.x + Phaser.Math.Between(-36, 36), y: spark.y - Phaser.Math.Between(6, 34), alpha: 0, duration: Phaser.Math.Between(450, 700), onComplete: () => spark.destroy() });
    }

    this.time.delayedCall(1400, () => {
      swing.destroy();
      this.player.woodcutBusy = false;

      const stone = Phaser.Math.Between(1, 3);
      const copper = Phaser.Math.Between(0, 2);
      const seeds = Phaser.Math.Between(1, 3);
      this.addInventory("Pierres", stone);
      if (copper > 0) this.addInventory("Cuivre", copper);
      this.addInventory("Graines", seeds);
      this.professions.gainXp("Miner", 14 + stone * 4 + copper * 6);

      this.events.emit("floating:text", "+Minerai", 0xd7dbe4, rock.x, rock.y - 56);
      this.events.emit("floating:text", `+${seeds} Graines`, 0xa2ed8d, rock.x, rock.y - 38);
      this.events.emit("floating:text", "-2 Eco ⚠️", 0xffb28e, rock.x, rock.y - 20);
      this.events.emit("eco:delta", -2, "mining_extract");

      rock.setData("active", false);
      rock.setData("mining", false);
      rock.setVisible(false);
      rock.setData("respawnAt", this.time.now + Phaser.Math.Between(1200000, 2400000)); // 20-40 min
    });

    return true;
  }

  tryFishingAction(wx, wy) {
    const spot = this.fishingSpots.find((s) => s.getData("active") && !s.getData("fishing") && Phaser.Math.Distance.Between(wx, wy, s.x, s.y) < 92);
    if (!spot) return false;

    if (!this.player.hasRod) {
      this.events.emit("floating:text", "Il faut une Fishing Rod", 0xffb798, this.player.x, this.player.y - 42);
      return true;
    }

    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y);
    if (d > 110) return false;

    spot.setData("fishing", true);
    this.player.woodcutBusy = true;
    this.rodVisual.setVisible(true);
    console.log("[audio-placeholder] splash");

    const prompt = this.add.text(spot.x, spot.y - 48, "Pêche ! Clique 3x rapidement", { fontSize: "16px", color: "#e8fbff" }).setOrigin(0.5);
    this.entityLayer.add(prompt);

    let clicks = 0;
    const onClick = () => { clicks += 1; };
    this.input.on("pointerdown", onClick);

    for (let i = 0; i < 12; i += 1) {
      const splash = this.add.circle(spot.x + Phaser.Math.Between(-18, 18), spot.y + Phaser.Math.Between(-12, 12), Phaser.Math.Between(2, 4), 0xcaf6ff);
      this.entityLayer.add(splash);
      this.tweens.add({ targets: splash, y: splash.y - Phaser.Math.Between(8, 28), alpha: 0, duration: Phaser.Math.Between(500, 900), onComplete: () => splash.destroy() });
    }

    this.time.delayedCall(1700, () => {
      this.input.off("pointerdown", onClick);
      prompt.destroy();
      this.player.woodcutBusy = false;
      this.rodVisual.setVisible(false);
      spot.setData("fishing", false);

      if (clicks < 3) {
        this.events.emit("floating:text", "Le poisson s'échappe...", 0xffc19f, spot.x, spot.y - 30);
        return;
      }

      const fish = Phaser.Math.Between(1, 4);
      const seeds = Phaser.Math.Between(1, 3);
      const ecoGain = Phaser.Math.Between(3, 8);
      this.addInventory("Poissons", fish);
      this.addInventory("Graines", seeds);
      this.professions.gainXp("Fisherman", fish * 8);

      this.events.emit("floating:text", `+${fish} Poissons 🐟`, 0x9fe9ff, spot.x, spot.y - 54);
      this.events.emit("floating:text", `+${seeds} Graines`, 0xa2ed8d, spot.x, spot.y - 34);
      this.events.emit("floating:text", `+${ecoGain} Eco 🌱`, 0x9aed90, spot.x, spot.y - 16);
      this.events.emit("eco:delta", ecoGain, "fishing_balance");
    });

    return true;
  }

  isTreeSpotValidForPlant(tree) {
    return !tree.getData("active") && !tree.getData("chopping");
  }

  tryPlantSeed(wx, wy) {
    const target = this.treeNodes.find((t) => Phaser.Math.Distance.Between(wx, wy, t.getData("x"), t.getData("y")) < 76 && this.isTreeSpotValidForPlant(t));
    if (!target) return false;
    if ((this.inventory.Graines || 0) <= 0) return false;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.getData("x"), target.getData("y"));
    if (dist > 92) return false;

    this.consumeInventory("Graines", 1);
    this.spawnPlantingSequence(target);
    return true;
  }

  spawnPlantingSequence(treeSpot) {
    const x = treeSpot.getData("x");
    const y = treeSpot.getData("y");

    const seedDrop = this.add.circle(x, y - 35, 4, 0xd9bc6f);
    this.entityLayer.add(seedDrop);
    this.tweens.add({ targets: seedDrop, y: y + 6, duration: 250, ease: "Quad.In" });

    this.time.delayedCall(260, () => {
      seedDrop.destroy();
      const patch = this.add.image(x, y + 18, "plant_marker").setAlpha(0.85);
      this.entityLayer.add(patch);
      const sap = this.add.image(x, y + 14, "sapling_placeholder").setScale(0.2).setAlpha(0.9);
      this.entityLayer.add(sap);

      for (let i = 0; i < 18; i += 1) {
        const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), [0x9cea89, 0xffe6a5][Phaser.Math.Between(0, 1)]);
        this.entityLayer.add(p);
        this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-60, 60), y: y + Phaser.Math.Between(-75, 15), alpha: 0, duration: Phaser.Math.Between(700, 1250), onComplete: () => p.destroy() });
      }

      const ecoGain = Phaser.Math.Between(15, 30);
      this.events.emit("floating:text", `+${ecoGain} Eco 🌱`, 0x9af089, x, y - 38);
      this.events.emit("eco:delta", ecoGain, "seed_planted");

      const growMs = Phaser.Math.Between(8000, 12000);
      this.time.delayedCall(growMs, () => {
        patch.destroy();
        sap.destroy();
        treeSpot.setVisible(true).setScale(0.12);
        treeSpot.setData("active", true);
        treeSpot.setData("plantedByPlayer", true);
        treeSpot.setData("size", Phaser.Math.Between(1, 2));
        this.tweens.add({ targets: treeSpot, scale: 0.95 + treeSpot.getData("size") * 0.16, duration: 1200, ease: "Back.Out" });
      });
    });
  }

  craftItem(item) {
    const recipes = {
      "Wooden Axe": { needs: { Branches: 5, Pierres: 2 }, equip: "axe" },
      "Fishing Rod": { needs: { Branches: 8, Fibres: 3 }, equip: "rod" },
      Pickaxe: { needs: { Pierres: 6, Bois: 4 }, equip: "pickaxe" }
    };

    const recipe = recipes[item];
    if (!recipe) return false;

    const canCraft = Object.entries(recipe.needs).every(([k, v]) => (this.inventory[k] || 0) >= v);
    if (!canCraft) {
      const list = Object.entries(recipe.needs).map(([k, v]) => `${v} ${k}`).join(" + ");
      this.events.emit("floating:text", `Recette: ${list}`, 0xffc59f, this.player.x, this.player.y - 42);
      return false;
    }

    Object.entries(recipe.needs).forEach(([k, v]) => this.consumeInventory(k, v));
    this.addInventory(item, 1);

    if (recipe.equip === "axe") this.player.hasAxe = true;
    if (recipe.equip === "rod") this.player.hasRod = true;
    if (recipe.equip === "pickaxe") this.player.hasPickaxe = true;

    this.events.emit("floating:text", `${item} équipée !`, 0xc5f6a4, this.player.x, this.player.y - 48);
    this.events.emit("equipment:changed", { hasAxe: this.player.hasAxe, hasRod: this.player.hasRod, hasPickaxe: this.player.hasPickaxe });
    return true;
  }

  addInventory(item, qty) {
    this.inventory[item] = (this.inventory[item] || 0) + qty;
    this.scene.get("UIOverlay")?.syncInventory(this.inventory);
  }

  consumeInventory(item, qty) {
    const cur = this.inventory[item] || 0;
    if (cur < qty) return false;
    this.inventory[item] = cur - qty;
    this.scene.get("UIOverlay")?.syncInventory(this.inventory);
    return true;
  }

  setSelectedItem(item) {
    this.selectedItem = item;
    this.isPlantingMode = item === "Graines";
  }

  maintainEcoMonsters() {
    const eco = this.ecosystem.ecoBalance;
    const targetCount = eco < 50 ? Phaser.Math.Between(5, 9) : Phaser.Math.Between(1, 3);
    const active = this.monsters.countActive(true);
    for (let i = active; i < targetCount; i += 1) this.spawnMonsterNearPlayer();
  }

  spawnMonsterNearPlayer() {
    const m = this.monsters.get();
    if (!m) return;

    const textures = ["monster_green", "monster_wolf", "monster_imp", "monster_shroom", "monster_bat", "monster_seedling"];
    const tex = textures[Phaser.Math.Between(0, textures.length - 1)];

    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const r = Phaser.Math.Between(220, 380);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * r, 40, this.worldWidth - 40);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * r, 40, this.worldHeight - 40);

    m.enableBody(true, x, y, true, true);
    m.setTexture(tex);
    m.hp = Phaser.Math.Between(30, 60);
    m.maxHp = m.hp;
    m.monsterType = tex;
    this.entityLayer.add(m);
  }

  setupTouchControls() {
    this.stickBase = this.add.circle(110, this.scale.height - 110, 62, 0x000000, 0.3).setScrollFactor(0).setDepth(9500).setVisible(false);
    this.stickThumb = this.add.circle(110, this.scale.height - 110, 34, 0xb4df8f, 0.9).setScrollFactor(0).setDepth(9501).setVisible(false);

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
      const v = new Phaser.Math.Vector2(dx, dy).limit(44);
      this.stickThumb.setPosition(this.joystickState.origin.x + v.x, this.joystickState.origin.y + v.y);
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
      if (!tree.getData("active") && tree.getData("respawnAt") > 0 && now >= tree.getData("respawnAt")) {
        tree.setData("active", true);
        tree.setData("respawnAt", 0);
        tree.setScale(0.12).setVisible(true);
        this.tweens.add({ targets: tree, scale: 0.95 + tree.getData("size") * 0.16, duration: 1200, ease: "Back.Out" });
      }
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.getData("x"), tree.getData("y")) < 1200;
      tree.setActive(inRange);
      tree.setVisible(tree.getData("active") && inRange);
    });
  }

  updateRocks() {
    const now = this.time.now;
    this.rocks.forEach((rock) => {
      if (!rock.getData("active") && rock.getData("respawnAt") > 0 && now >= rock.getData("respawnAt")) {
        rock.setData("active", true);
        rock.setData("respawnAt", 0);
        rock.setScale(0.1).setVisible(true);
        this.tweens.add({ targets: rock, scale: Phaser.Math.FloatBetween(0.9, 1.25), duration: 1100, ease: "Back.Out" });
      }
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, rock.getData("x"), rock.getData("y")) < 1200;
      rock.setActive(inRange);
      rock.setVisible(rock.getData("active") && inRange);
    });
  }

  updateFishingSpots() {
    this.fishingSpots.forEach((s, idx) => {
      s.alpha = 0.75 + Math.sin(this.time.now * 0.002 + idx) * 0.15;
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.getData("x"), s.getData("y")) < 1200;
      s.setActive(inRange);
      s.setVisible(inRange);
    });
  }

  updateFlowers() {
    this.flowers.forEach((f, idx) => {
      f.scaleY = 0.95 + Math.sin(this.time.now * 0.001 + idx) * 0.08;
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.getData("x"), f.getData("y")) < 1200;
      f.setActive(inRange);
      f.setVisible(inRange);
    });
  }

  updateGatherables() {
    this.gatherables.children.iterate((g) => {
      if (!g || !g.active) return;
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y) < 1000;
      g.setActive(inRange);
      g.setVisible(inRange);
    });
  }

  updateMonsters() {
    this.monsters.children.iterate((m) => {
      if (!m || !m.active) return;
      const dist = Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y);
      if (dist > 1300) {
        this.monsters.killAndHide(m);
        m.body.enable = false;
        return;
      }

      const chaseMult = this.ecosystem.ecoBalance < 50 ? 74 : 38;
      const dir = new Phaser.Math.Vector2(this.player.x - m.x, this.player.y - m.y).normalize();
      m.setVelocity(dir.x * chaseMult, dir.y * chaseMult);

      // simple monster contact damage
      if (dist < 26 && this.time.now % 18 < 1) {
        this.player.hp -= 2;
        this.events.emit("player:hp", this.player.hp, this.player.maxHp);
        if (this.player.hp <= 0) this.onPlayerDeath();
      }
    });
  }

  onPlayerDeath() {
    this.player.hp = this.player.maxHp;
    this.player.setPosition(500, 420);
    this.events.emit("floating:text", "Vous êtes tombé...", 0xffa5a5, this.player.x, this.player.y - 46);
    this.events.emit("eco:delta", -8, "player_death");
    this.events.emit("player:hp", this.player.hp, this.player.maxHp);
  }

  updatePlantMarkers() {
    if (!this.isPlantingMode) {
      if (this.plantMarkers) this.plantMarkers.forEach((m) => m.setVisible(false));
      return;
    }

    if (!this.plantMarkers) {
      this.plantMarkers = this.treeNodes.map((tree) => {
        const marker = this.add.image(tree.getData("x"), tree.getData("y") + 18, "plant_marker").setAlpha(0.65).setVisible(false);
        this.entityLayer.add(marker);
        return marker;
      });
    }

    this.treeNodes.forEach((tree, idx) => {
      const valid = this.isTreeSpotValidForPlant(tree);
      const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.getData("x"), tree.getData("y")) < 360;
      this.plantMarkers[idx].setVisible(valid && inRange);
    });
  }

  depthSortLayer2() {
    this.entityLayer.list.forEach((e) => {
      if (!e || !e.active || typeof e.y !== "number") return;
      e.setDepth(Math.floor(e.y));
    });
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

    if (Phaser.Input.Keyboard.JustDown(this.keys.I)) this.scene.get("UIOverlay")?.toggleInventory();

    this.player.updateFromInput(cursors, joystick, delta);

    // tool visuals
    this.axeVisual.setPosition(this.player.x + 16, this.player.y - 8).setVisible(this.player.hasAxe && !this.player.woodcutBusy);
    this.pickVisual.setPosition(this.player.x + 16, this.player.y - 8).setVisible(this.player.hasPickaxe && false);
    this.rodVisual.setPosition(this.player.x - 16, this.player.y - 8).setVisible(false);

    const keys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE, this.keys.SIX, this.keys.SEVEN, this.keys.EIGHT];
    keys.forEach((k, i) => { if (Phaser.Input.Keyboard.JustDown(k)) this.combat.castSkill(i, time); });

    this.combat.update(time, this.monsters);
    this.updateTrees();
    this.updateRocks();
    this.updateFishingSpots();
    this.updateFlowers();
    this.updateGatherables();
    this.updateMonsters();
    this.updatePlantMarkers();
    this.depthSortLayer2();
    this.bgManager.update(this.cameras.main, delta, this.ecosystem.ecoBalance);
  }
}

class UIOverlayScene extends Phaser.Scene {
  constructor() { super("UIOverlay"); }

  create() {
    this.inventory = {};
    this.slots = [];
    this.selectedSlot = -1;

    this.createHud();
    this.createInventoryPanel();

    const world = this.scene.get("MainWorld");
    if (!world) return;

    world.events.on("world:ready", (state) => {
      this.setEco(state.ecoBalance);
      this.syncInventory(state.inventory);
      this.profText.setText(`Lumberjack L${state.professions.Lumberjack.level} | Fisherman L${state.professions.Fisherman.level} | Miner L${state.professions.Miner.level}`);
      this.updateTools(state.hasAxe, state.hasRod, state.hasPickaxe);
      this.setHP(state.hp, 100);
    });

    world.events.on("eco:changed", (value) => this.setEco(value));
    world.events.on("eco:message", (msg, color) => this.spawnFloatingText(msg, color));
    world.events.on("floating:text", (txt, color, x, y) => this.spawnFloatingText(txt, color, x, y));
    world.events.on("profession:xp", () => {
      const p = world.professions.professions;
      this.profText.setText(`Lumberjack L${p.Lumberjack.level} | Fisherman L${p.Fisherman.level} | Miner L${p.Miner.level}`);
    });
    world.events.on("equipment:changed", (eq) => this.updateTools(eq.hasAxe, eq.hasRod, eq.hasPickaxe));
    world.events.on("player:hp", (hp, maxHp) => this.setHP(hp, maxHp));
  }

  createHud() {
    const wood = 0x5c3c2a;
    const leaf = 0xa8cf78;

    this.add.rectangle(18, 18, 500, 155, wood, 0.85).setOrigin(0, 0).setStrokeStyle(3, leaf).setDepth(9500).setScrollFactor(0);
    this.ecoText = this.add.text(34, 30, "EcoBalance: --", { fontSize: "20px", color: "#eef9e1", fontFamily: "Georgia, serif" }).setDepth(9501).setScrollFactor(0);
    this.profText = this.add.text(34, 56, "Métiers --", { fontSize: "16px", color: "#d9efc5" }).setDepth(9501).setScrollFactor(0);
    this.toolText = this.add.text(34, 78, "Outils: aucun", { fontSize: "15px", color: "#e8efdc" }).setDepth(9501).setScrollFactor(0);
    this.hpText = this.add.text(34, 98, "PV: 100/100", { fontSize: "15px", color: "#ffe4d0" }).setDepth(9501).setScrollFactor(0);

    this.ecoBarBg = this.add.rectangle(34, 132, 280, 16, 0x4e2d25, 0.95).setOrigin(0, 0.5).setDepth(9501).setScrollFactor(0);
    this.ecoBarFill = this.add.rectangle(34, 132, 280, 16, 0x6ad76a, 0.98).setOrigin(0, 0.5).setDepth(9502).setScrollFactor(0);

    this.miniMap = this.add.rectangle(this.scale.width - 168, 18, 150, 150, wood, 0.82).setOrigin(0, 0).setStrokeStyle(2, leaf).setDepth(9500).setScrollFactor(0);
    this.add.text(this.miniMap.x + 14, this.miniMap.y + 10, "Mini-map", { fontSize: "16px", color: "#f2ffe9", fontFamily: "Georgia, serif" }).setDepth(9501).setScrollFactor(0);

    this.invToggle = this.add.rectangle(18, this.scale.height - 74, 150, 56, wood, 0.9).setOrigin(0, 0).setStrokeStyle(3, leaf).setDepth(9500).setScrollFactor(0).setInteractive();
    this.add.text(this.invToggle.x + 75, this.invToggle.y + 28, "Inventaire", { fontSize: "22px", color: "#f3ffe8", fontFamily: "Georgia, serif" }).setOrigin(0.5).setDepth(9501).setScrollFactor(0);
    this.invToggle.on("pointerdown", () => this.toggleInventory());

    for (let i = 0; i < 8; i += 1) {
      const btn = this.add.rectangle(this.scale.width - (i + 1) * 70, this.scale.height - 48, 58, 58, 0x36513c, 0.9).setDepth(9501).setScrollFactor(0).setStrokeStyle(2, 0xa7cc80).setInteractive();
      this.add.text(btn.x, btn.y, `${i + 1}`, { fontSize: "19px", color: "#f3ffea" }).setOrigin(0.5).setDepth(9502).setScrollFactor(0);
      btn.on("pointerdown", () => {
        const world = this.scene.get("MainWorld");
        if (world && world.combat) world.combat.castSkill(i, world.time.now);
      });
    }
  }

  createInventoryPanel() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.invPanel = this.add.rectangle(w * 0.5 - 250, h - 410, 500, 390, 0x2b241d, 0.94).setOrigin(0, 0).setStrokeStyle(3, 0x9cc56e).setDepth(9600).setScrollFactor(0).setVisible(false);
    this.invTitle = this.add.text(this.invPanel.x + 18, this.invPanel.y + 12, "Sac du Gardien", { fontSize: "24px", color: "#efffdd", fontFamily: "Georgia, serif" }).setDepth(9601).setScrollFactor(0).setVisible(false);
    this.invHint = this.add.text(this.invPanel.x + 18, this.invPanel.y + 350, "Clique sur Graines pour planter", { fontSize: "14px", color: "#d6efc2" }).setDepth(9601).setScrollFactor(0).setVisible(false);

    const cols = 4;
    const rows = 4;
    const slotSize = 74;
    const sx = this.invPanel.x + 20;
    const sy = this.invPanel.y + 48;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const idx = r * cols + c;
        const slot = this.add.rectangle(sx + c * (slotSize + 8), sy + r * (slotSize + 8), slotSize, slotSize, 0x3a3025, 0.95)
          .setOrigin(0, 0).setStrokeStyle(2, 0x9bc06f).setDepth(9601).setScrollFactor(0).setInteractive().setVisible(false);
        const t = this.add.text(slot.x + 8, slot.y + 8, "", { fontSize: "14px", color: "#eafad8", wordWrap: { width: slotSize - 14 } })
          .setDepth(9602).setScrollFactor(0).setVisible(false);
        slot.on("pointerdown", () => this.onSlotClicked(idx));
        this.slots.push({ slot, text: t, item: null });
      }
    }

    const mkCraftBtn = (x, label, item) => {
      const b = this.add.rectangle(x, this.invPanel.y + 340, 144, 38, 0x5d8d4a, 0.95).setStrokeStyle(2, 0xd5f3ad).setDepth(9601).setScrollFactor(0).setInteractive().setVisible(false);
      const t = this.add.text(b.x, b.y, label, { fontSize: "15px", color: "#f4ffe6", fontFamily: "Georgia, serif" }).setOrigin(0.5).setDepth(9602).setScrollFactor(0).setVisible(false);
      b.on("pointerdown", () => this.scene.get("MainWorld")?.craftItem(item));
      return { b, t };
    };

    this.craftAxe = mkCraftBtn(this.invPanel.x + 86, "Craft Axe", "Wooden Axe");
    this.craftRod = mkCraftBtn(this.invPanel.x + 250, "Craft Rod", "Fishing Rod");
    this.craftPick = mkCraftBtn(this.invPanel.x + 414, "Craft Pickaxe", "Pickaxe");
  }

  toggleInventory() {
    const v = !this.invPanel.visible;
    this.invPanel.setVisible(v);
    this.invTitle.setVisible(v);
    this.invHint.setVisible(v);
    this.slots.forEach((s) => { s.slot.setVisible(v); s.text.setVisible(v); });
    [this.craftAxe, this.craftRod, this.craftPick].forEach((x) => { x.b.setVisible(v); x.t.setVisible(v); });
  }

  onSlotClicked(idx) {
    const slot = this.slots[idx];
    if (!slot.item) return;

    this.selectedSlot = idx;
    this.slots.forEach((s, i) => s.slot.setStrokeStyle(2, i === idx ? 0xfff0b0 : 0x9bc06f));

    const world = this.scene.get("MainWorld");
    if (!world) return;

    if (slot.item.name === "Graines") {
      world.setSelectedItem("Graines");
      this.invHint.setText("Mode Planting actif : clique une zone vide");
    } else {
      world.setSelectedItem(null);
      this.invHint.setText(`Sélection: ${slot.item.name}`);
    }
  }

  syncInventory(inv) {
    this.inventory = { ...inv };
    const entries = Object.entries(inv).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, qty: v }));
    for (let i = 0; i < this.slots.length; i += 1) {
      const e = entries[i];
      this.slots[i].item = e || null;
      this.slots[i].text.setText(e ? `${e.name}\nx${e.qty}` : "");
    }
  }

  setEco(value) {
    const mood = value > 80 ? "Luxuriant" : value < 40 ? "Affaibli" : "Stable";
    this.ecoText.setText(`EcoBalance: ${value} (${mood})`);
    const ratio = Phaser.Math.Clamp(value / 100, 0, 1);
    this.tweens.add({ targets: this.ecoBarFill, width: 280 * ratio, duration: 240, ease: "Sine.Out" });
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xca4f46),
      Phaser.Display.Color.IntegerToColor(0x62dc67),
      100,
      value
    );
    this.ecoBarFill.fillColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  }

  setHP(hp, maxHp) {
    this.hpText.setText(`PV: ${Math.max(0, Math.floor(hp))}/${maxHp}`);
  }

  updateTools(hasAxe, hasRod, hasPickaxe) {
    const list = [];
    if (hasAxe) list.push("Axe");
    if (hasRod) list.push("Rod");
    if (hasPickaxe) list.push("Pickaxe");
    this.toolText.setText(`Outils: ${list.length ? list.join(", ") : "aucun"}`);
  }

  spawnFloatingText(text, color = 0xffffff, x = null, y = null) {
    const col = Phaser.Display.Color.IntegerToColor(color).rgba;
    const t = this.add.text(x || this.scale.width * 0.5, y || this.scale.height * 0.32, text, { fontSize: "18px", color: col, fontFamily: "Georgia, serif" })
      .setDepth(9800)
      .setScrollFactor(x ? 1 : 0);
    this.tweens.add({ targets: t, y: t.y - 28, alpha: 0, duration: 900, onComplete: () => t.destroy() });
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
  scene: [BootScene, PreloadScene, MenuScene, IntroScene, CharacterCreationScene, MainWorldScene, UIOverlayScene]
};

const game = new Phaser.Game(config);
window.addEventListener("resize", () => game.scale.resize(window.innerWidth, window.innerHeight));
