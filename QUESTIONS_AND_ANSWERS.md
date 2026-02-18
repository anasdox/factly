# Questions and Answers

## M7: Real-Time Collaborative Sessions

### Q1: What synchronization strategy should be used for concurrent edits?
- **Date:** 2026-02-06
- **Context:** Multiple analysts can modify the same discovery simultaneously.
- **Answer:** Last-write-wins (full-state replacement). No merge or conflict resolution.
- **Rationale:** Simplicity for MVP. Documented as non-goal in `collaborative-session.feature`.
- **FSID:** FS-ConcurrentUpdateLastWriteWins

## M9: Input Validation and Error Handling

### Q1: Quel niveau de validation pour POST /rooms ?
- **Date:** 2026-02-06
- **Context:** POST /rooms reçoit un body DiscoveryData complet.
- **Answer:** Schema strict — valider tous les champs de DiscoveryData : discovery_id, title, goal, date obligatoires (strings) + les 5 tableaux (inputs, facts, insights, recommendations, outputs) doivent être des arrays.

### Q2: Comment afficher les erreurs backend dans le frontend ?
- **Date:** 2026-02-06
- **Context:** Actuellement les erreurs sont uniquement loggées dans console.error.
- **Answer:** Toast notification — notification temporaire en haut de l'écran qui disparaît après quelques secondes. Léger, pas de dépendance externe.

## M18: Conversational Chat on Discovery

### Q1: Comment l'analyste accède-t-il au chat dans l'interface ?
- **Date:** 2026-02-18
- **Context:** Le chat doit être accessible depuis un discovery ouvert.
- **Options:** 1) Panneau latéral droit, 2) Panneau en bas, 3) Modal flottant style widget
- **Answer:** Option 3 — Modal flottant en bas à droite (style Intercom/support widget). Permet de garder le pipeline entièrement visible.

### Q2: Comment le chat communique-t-il avec le LLM pour les actions ?
- **Date:** 2026-02-18
- **Context:** Le chat doit pouvoir déclencher des actions (ajout/suppression/modification) en plus de répondre.
- **Options:** 1) Tool calling LLM natif, 2) Réponse JSON parsée, 3) Texte libre + détection d'intent backend
- **Answer:** Option 1 — Tool calling natif. Le LLM reçoit des tools déclarés (add_fact, delete_item, edit_item...) et décide quand les appeler. Format garanti, fiable, extensible.

### Q3: Le chat doit-il supporter le streaming ?
- **Date:** 2026-02-18
- **Context:** Expérience utilisateur lors de l'attente des réponses LLM.
- **Options:** 1) Streaming SSE (token par token), 2) Réponse complète (attente)
- **Answer:** Option 1 — Streaming SSE. Réponse affichée progressivement, expérience fluide type ChatGPT.

### Q4: Quelle est la portée du contexte envoyé au LLM ?
- **Date:** 2026-02-18
- **Context:** Les gros discoveries peuvent dépasser les limites de contexte du LLM.
- **Options:** 1) Discovery complète toujours, 2) Contexte adaptatif, 3) Complète + résumé au-delà d'un seuil
- **Answer:** Option 3 — Discovery complète envoyée en détail sous un seuil d'items. Au-delà, un résumé est généré pour rester dans les limites de contexte.
