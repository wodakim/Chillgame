# Seed of Life — Roadmap vivant

## Vision
Construire un MMORPG chill solo-first en Phaser 3, performant mobile, extensible vers Socket.io.

## Phase 0 — Fondation (terminée)
- [x] Structure initiale `index.html` + `game.js`.
- [x] Pipeline scènes: Boot, Preload, Menu, CharacterCreation, MainWorld, UIOverlay.
- [x] Persistance locale (auto-save / load) via `localStorage`.
- [x] Combat réactif de base (auto-attack + skills 1-8).
- [x] Contrôles clavier + touch joystick + boutons tactiles de skills.

## Phase 1 — v1 Playable & Beautiful (en cours)
- [x] Suppression du rendu debug/grille et fond propre prêt prod.
- [x] Parallax 2.5D Wakfu-like en 5 layers + lumière douce + teinte dynamique ecoBalance.
- [x] Joystick mobile corrigé: 40% gauche réservé movement, 60% droite interaction/clic.
- [x] Mouvement plus naturel (accélération/décélération type Ragnarok).
- [x] Métier jouable: Lumberjack (arbres interactifs, récolte, drops, XP, eco gain).
- [x] Respawn arbres à 30s avec animation de pousse.
- [x] Barre eco dynamique UI + feedback humeur de l’Arbre de Vie.
- [x] Spawn monstres agressifs doux quand ecoBalance < 40 (chase léger).
- [ ] Polissage audio (ambiances + chop + UI).
- [ ] UI inventaire détaillé et tooltip ressources.

## Phase 2 — Boucle durable
- [ ] Génération procédurale de biomes (forêt/plaine/rivière/montagne).
- [ ] Nodes de récolte persistants avancés (pooling/culling par chunk).
- [ ] Ateliers de craft placés dans le monde.
- [ ] Quêtes écosystème légères et répétables.
- [ ] Mini-map dynamique réelle.

## Phase 3 — Profondeur systèmes
- [ ] Inventaire catégorisé + poids + stockage coffre.
- [ ] Outils équipables et progression qualité des outils.
- [ ] Formules de rendement avancées liées à `ecoBalance`.
- [ ] Arbre de talents métiers.

## Phase 4 — Pré-multijoueur
- [ ] Couche réseau abstraite (`LocalAdapter` -> `SocketAdapter`).
- [ ] Snapshot world state et synchronisation entités.
- [ ] Chat local/global et présence joueurs.
- [ ] Autorité serveur et anti-cheat minimal.

## Règle d'update continue
Ce fichier est maintenu à chaque itération de features pour garder une trajectoire claire.
