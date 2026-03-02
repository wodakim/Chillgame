# Seed of Life — Roadmap vivant

## Vision
Créer un MMORPG chill solo-first style Wakfu en Phaser 3, mobile-first, extensible vers le multi.

## Phase 0 — Fondation (terminée)
- [x] Bootstrap Phaser, scènes, save/load local, contrôles desktop+tactile.

## Phase 1 — Prototype jouable (terminée)
- [x] Top-down 2.5D de base, écosystème, premiers monstres, premier loop Lumberjack.

## Phase 2 — Wakfu Cohérence & UX (terminée)
- [x] Refonte UI organique (bois/feuilles/vert doré) : HUD + inventaire + mini-map stylisée.
- [x] Main menu animé (Arbre de Vie + particules + bouton "Nouvelle Graine" animé).
- [x] Introduction histoire animée (2432 -> 7369 -> 8374) avec transitions et narration progressive.
- [x] Inventaire réel en grille 4x4 avec stacks d’items.
- [x] Sélection d’item (Graines) pour activer un vrai mode Planting.
- [x] Plantation cohérente : spots vides valides uniquement, un arbre max par spot.
- [x] Animation de plantation complète (graine, pousse 8-12s, particules, croissance).
- [x] Progression réaliste early-game : pas d’outil au départ, ressources Branches/Pierres au sol.
- [x] Crafting initial : 5 Branches + 2 Pierres = Wooden Axe (auto-équipée).
- [x] Arbres coupables uniquement avec hache équipée.
- [x] Nettoyage visuel monde (sol moins chaotique, arbres organiques espacés, depth sorting Y conservé).

## Phase 3 — Boucle durable (en cours)
- [ ] Crafting étendu (outils tiers 2+, ateliers, recettes métiers).
- [ ] Quêtes écosystème et progression narrative légère.
- [ ] Faune passive (état luxuriant) + comportements contextuels.
- [ ] Audio dynamique (ambiances, actions métiers, UI).

## Phase 4 — Pré-multijoueur
- [ ] Adapter réseau abstrait (`LocalAdapter` -> `SocketAdapter`).
- [ ] Sync d’entités et snapshot d’état monde.
- [ ] Chat + présence + autorité serveur minimale.

## Règle d’update continue
Le roadmap est mis à jour à chaque itération pour garder une direction produit claire.
