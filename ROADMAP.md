# Seed of Life — Roadmap vivant

## Vision
Construire un MMORPG chill solo-first en Phaser 3, performant mobile, extensible vers Socket.io.

## Phase 0 — Fondation (terminée)
- [x] Structure initiale `index.html` + `game.js`.
- [x] Pipeline scènes: Boot, Preload, Menu, CharacterCreation, MainWorld, UIOverlay.
- [x] Persistance locale (auto-save / load) via `localStorage`.
- [x] Contrôles clavier + touch joystick + boutons tactiles de skills.

## Phase 1 — v1 Playable & Beautiful (terminée)
- [x] Parallax artistique placeholder + feedback eco + premier loop Lumberjack.

## Phase 2 — Top-Down 2.5D Wakfu Loop (en cours)
- [x] Passage en vrai top-down 2.5D avec 3 layers visuels.
- [x] Layering gameplay principal avec depth sorting par Y (arbres/joueur/monstres/récoltables).
- [x] Parallax ultra léger uniquement pour éléments très lointains.
- [x] Foreground vivant (fleurs/herbes/buissons) avec perception de profondeur caméra.
- [x] Refonte repousse naturelle arbres: 15-30 minutes selon ecoBalance.
- [x] Plantation de graine sur emplacement vide: pousse 8-15s + particules + animation.
- [x] Bonus arbres plantés: +50% bois et +2 graines à la prochaine récolte.
- [x] ÉcoBalance logique corrigée:
  - coupe arbre = pénalité éco
  - kill monstre = gain éco
  - plantation = gros gain éco
- [x] UI EcoBalance dynamique (barre + messages humeur + floating text).
- [x] Joystick 40% gauche / interactions 60% droite conservés.
- [x] Caméra follow encore plus smooth.

## Phase 3 — Boucle durable
- [ ] Faune passive quand ecoBalance > 80 avec interactions.
- [ ] Crafting stations + recettes concrètes + stockage.
- [ ] Quêtes écosystème légères répétables.
- [ ] Mini-map dynamique réelle.
- [ ] Audio design chill (ambiances + feedback métiers).

## Phase 4 — Pré-multijoueur
- [ ] Couche réseau abstraite (`LocalAdapter` -> `SocketAdapter`).
- [ ] Snapshot world state et synchronisation entités.
- [ ] Chat local/global et présence joueurs.
- [ ] Autorité serveur et anti-cheat minimal.

## Règle d'update continue
Ce fichier est maintenu à chaque itération de features pour garder une trajectoire claire.
