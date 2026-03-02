# Seed of Life — Roadmap vivant

## Vision
Créer un MMORPG chill solo-first style Wakfu en Phaser 3, mobile-first, extensible vers le multi.

## Phase 0 — Fondation (terminée)
- [x] Bootstrap Phaser, scènes, save/load local, contrôles desktop+tactile.

## Phase 1 — Prototype jouable (terminée)
- [x] Top-down 2.5D de base, écosystème, premier loop Lumberjack.

## Phase 2 — Wakfu Cohérence & UX (terminée)
- [x] UI organique (HUD + inventaire + mini-map stylisée).
- [x] Menu animé + intro histoire + progression early-game réaliste.
- [x] Plantation cohérente avec slots valides et crafting de démarrage.

## Phase 3 — Variété des métiers + Combat fluide (terminée)
- [x] Métier Fisherman jouable complet:
  - rivière en plusieurs zones
  - spots de pêche interactifs
  - mini-jeu de rythme placeholder
  - craft Fishing Rod (8 Branches + 3 Fibres)
  - drops poissons + graines + gain éco
- [x] Métier Miner jouable complet:
  - rochers/minéraux interactifs
  - craft Pickaxe (6 Pierres + 4 Bois)
  - animation + particules étincelles
  - drops minerais (Pierre/Cuivre) + graines + coût éco
  - repousse 20-40 min
- [x] Combat plus Ragnarok-like:
  - 4-6 types de monstres placeholders
  - clic monstre = ciblage + auto-attack
  - skills 1-4 avec cooldowns
  - dégâts flottants + barre de vie monstre
  - drops Monster Essence + graines + gain éco
  - mort joueur + respawn proche Arbre + perte éco
- [x] Satisfaction monde:
  - rivière + zones rocheuses + fleurs interactives (base Herbalist)
  - feedback particules généralisé
  - logs audio placeholders (`woosh`, `chop`, `splash`, `hit`)
- [x] Perf mobile:
  - pooling groupes (monstres/ressources)
  - culling distance
  - joystick 40% gauche / zone droite libre

## Phase 4 — Boucle durable
- [ ] Métiers de craft complets (stations + recettes + outils tiers 2+).
- [ ] Faune passive et comportements éco-dépendants.
- [ ] Quêtes écosystème et progression narrative légère.
- [ ] Audio dynamique réel (assets + mixage).

## Phase 5 — Pré-multijoueur
- [ ] Adapter réseau abstrait (`LocalAdapter` -> `SocketAdapter`).
- [ ] Sync d’entités et snapshot d’état monde.
- [ ] Chat + présence + autorité serveur minimale.

## Règle d’update continue
Le roadmap est mis à jour à chaque itération pour garder une direction produit claire.
