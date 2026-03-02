# Seed of Life — Roadmap vivant

## Vision
Construire un MMORPG chill solo-first en Phaser 3, performant mobile, extensible vers Socket.io.

## Phase 0 — Fondation (en cours)
- [x] Structure initiale `index.html` + `game.js`.
- [x] Pipeline scènes: Boot, Preload, Menu, CharacterCreation, MainWorld, UIOverlay.
- [x] Persistance locale (auto-save / load) via `localStorage`.
- [x] Parallax 2.5D placeholder.
- [x] Système de professions complet (liste métiers + XP + niveaux + recettes placeholder).
- [x] Combat réactif de base (auto-attack + skills 1-8).
- [x] Contrôles clavier + touch joystick + boutons tactiles de skills.

## Phase 1 — Boucle de jeu durable
- [ ] Génération procédurale de biomes (forêt/plaine/rivière/montagne).
- [ ] Nodes de récolte persistants et respawn écologique.
- [ ] Ateliers de craft placés dans le monde.
- [ ] Quêtes écosystème légères et répétables.
- [ ] Mini-map dynamique réelle (pas seulement widget).

## Phase 2 — Profondeur systèmes
- [ ] Inventaire catégorisé + poids + stockage coffre.
- [ ] Outils équipables et progression qualité des outils.
- [ ] Formules de rendement liées à `ecoBalance`.
- [ ] Arbre de talents métiers.
- [ ] Mobs comportementaux (passif/agressif selon écosystème).

## Phase 3 — Pré-multijoueur
- [ ] Couche réseau abstraite (`LocalAdapter` -> `SocketAdapter`).
- [ ] Snapshot world state et synchronisation entités.
- [ ] Chat local/global et présence joueurs.
- [ ] Autorité serveur et anti-cheat minimal.

## Règle d'update continue
Ce fichier est maintenu à chaque itération de features pour garder une trajectoire claire.
