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
