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

## M20: AI-Assisted Reformulation Suggestions

### Q1: Le LLM doit-il recevoir le contexte des items liés ou seulement le texte de l'item ?
- **Date:** 2026-03-12
- **Context:** Le bouton "Reformuler" dans la modale de création/édition envoie le texte au LLM.
- **Options:** 1) Texte seul, 2) Texte + contexte des items liés, 3) Autre
- **Answer:** Option 2 — Texte + contexte des items liés. Permet des reformulations plus cohérentes avec le reste de l'analyse.

### Q2: Les suggestions doivent-elles inclure une justification ?
- **Date:** 2026-03-12
- **Context:** Présentation des reformulations proposées dans la modale.
- **Options:** 1) Texte alternatif seul, 2) Texte + courte justification, 3) Autre
- **Answer:** Option 2 — Texte + courte justification. Aide l'analyste à choisir en connaissance de cause.

### Q3: Comportement du bouton "Reformuler" quand le champ texte est vide ?
- **Date:** 2026-03-12
- **Context:** Le bouton pourrait servir à générer un brouillon ou être désactivé.
- **Options:** 1) Désactivé si vide, 2) Actif même si vide (suggérer un brouillon), 3) Autre
- **Answer:** Option 1 — Désactivé si vide. Le bouton sert uniquement à reformuler un texte existant.

## M21: Internet Research for Input Discovery

### Q1: Quel mécanisme de recherche Internet utiliser ?
- **Date:** 2026-03-13
- **Context:** Le système doit rechercher sur Internet des sources pertinentes par rapport à l'objectif de la discovery.
- **Options:** 1) Web Search API (Brave Search, Google Custom Search), 2) LLM avec accès web intégré (tool use), 3) Scraping direct
- **Answer:** Option 1 — API de recherche dédiée. Plus fiable et découplé du LLM. Le LLM se concentre sur le filtrage et la structuration des résultats.

### Q2: Combien de résultats proposer à l'analyste par recherche ?
- **Date:** 2026-03-13
- **Context:** Nombre de suggestions d'inputs à présenter après une recherche.
- **Options:** 1) 5 max, 2) 10 max, 3) Configurable
- **Answer:** Option 2 — 10 suggestions maximum. Plus de couverture pour l'analyste, qui peut relancer s'il en veut davantage.

### Q3: Que contient chaque suggestion d'input proposée ?
- **Date:** 2026-03-13
- **Context:** Niveau de détail des résultats de recherche présentés à l'analyste.
- **Options:** 1) Snippet + URL (léger, rapide), 2) Contenu extrait + URL (le backend récupère la page, le LLM en extrait un résumé structuré)
- **Answer:** Option 2 — Contenu extrait. Le backend récupère le contenu de chaque page, le LLM en extrait les points clés pertinents par rapport à l'objectif. Plus riche et exploitable que les simples snippets.

## M22: User Management and Authentication

### Q1: Comment l'authentification s'intègre-t-elle avec les discoveries existantes ?
- **Date:** 2026-03-14
- **Context:** Les discoveries sont actuellement publiques et accessibles par lien.
- **Options:** 1) Discoveries privées par utilisateur, 2) Discoveries restent partagées mais nécessitent une auth, 3) Propriétaire auto + sauvegarde de discoveries visitées
- **Answer:** Option 1 (simplifié) — Propriétaire automatique à la création uniquement. L'utilisateur retrouve les discoveries qu'il a créées dans son espace personnel. Pas de bookmark/sauvegarde de discoveries d'autres utilisateurs. Les discoveries restent publiques, accessibles et modifiables par tout le monde (authentifié ou anonyme) via le lien.

### Q2: Quel mécanisme d'authentification et de session ?
- **Date:** 2026-03-14
- **Context:** Choix entre JWT, cookies, ou combinaison.
- **Options:** 1) JWT stateless (header Authorization), 2) Cookie HTTP-only, 3) JWT en cookie HTTP-only
- **Answer:** Option 1 — JWT stateless. Simple, s'intègre avec l'architecture REST + SSE existante. Les routes restent accessibles sans token (anonyme).

### Q3: Format de la commande Make pour ajouter un utilisateur ?
- **Date:** 2026-03-14
- **Context:** Besoin d'un moyen CLI de créer des utilisateurs.
- **Options:** 1) Interactif (prompt), 2) Paramètres en ligne (`USER=login PASS=password`), 3) Les deux
- **Answer:** Option 2 — `make add-user USER=login PASS=password`. Simple et scriptable.

### Q4: Où stocker les utilisateurs ?
- **Date:** 2026-03-14
- **Context:** Choix entre fichier JSON et SQLite.
- **Options:** 1) Fichier JSON (`data/users.json`), 2) SQLite
- **Answer:** Option 1 — Fichier JSON, cohérent avec l'architecture de stockage existante.
