# Changements — Bernex connecté v10

## Provenance et périmètre

- Source : archive **existante** `bernex-application-connectee-v10.zip`. Pas de reconstitution de mémoire, pas de substitution par la v18.
- Les 26 fichiers construits de cette archive correspondent octet pour octet à ceux de `bernex-connecte-v10.zip`. Ces fichiers construits sont exclus de l’export.
- Point de départ du relevé : état d’origine récupéré mécaniquement par application inverse de `bernex-v10.patch`, après vérification que cette application était possible. Le relevé concerne les sources de l’application, le SQL et le README.
- Tous les fichiers demandés existent dans l’archive v10. Aucun fichier source requis n’a dû être réécrit faute d’original. L’ancien ZIP uploadé initialement n’est pas utilisé comme source : la comparaison repose sur le patch conservé.
- L’état du site en ligne aujourd’hui n’est pas certifié par cet export.

## Changements fonctionnels cumulés entre le départ et la v10

1. **Saison, cycles et programmes** : plan 2026–2027, phases extensives/intensives/explosives, histogramme de saison, récupération, vacances genevoises, camp de Pâques, jalons compétitifs à confirmer, développement des cycles, projections et rapprochement des programmes importés avec les cycles. Les hypothèses de planification sont distinguées des données confirmées.
2. **Cockpit coach et planning** : vue de gestion du groupe, préparation de séance, lecture de la semaine, état individuel et navigation entre ces vues ; accès aux séances et athlètes via panneaux latéraux.
3. **Individualisation** : variantes de séance justifiées, suivi des présences, charge déclarée, données manquantes distinctes de zéro, disponibilités et notes de revue.
4. **Suivi de séance** : saisie des séries/résultats, récupération chronométrée, historique comparable d’exercice, retours des athlètes et réponses du coach ; présentation de l’accueil athlète et des objectifs.
5. **Imports Excel et Word** : aperçu, correspondances de séries/dates/destinataires, doublons et modifications concurrentes, récupération des illustrations Word et circuit de renforcement confirmé, séparation des remarques privées. Les correctifs Excel v16/v17 sont postérieurs et ne sont pas inclus.
6. **Données et confidentialité** : information et consentement, retrait, contrôles de publication des séances, notes privées du coach, filtrage d’accès, export chiffré et prévisualisation de conservation/suppression ; schéma et migrations complémentaires. Ce code ne constitue pas une certification LIPAD/LPD.
7. **Recherche et IA dans la v10** : recherche documentaire publique, classement facultatif, revue locale contrainte et désactivation des routes d’IA externe traitant les contenus individuels. Le rétablissement de la discussion externe est une modification v18, absente de cet export.
8. **Interface et infrastructure** : ajustements ordinateur/tablette/téléphone, styles et navigation, en-têtes de sécurité, compilation d’un worker Pages connecté depuis ses sources, diagnostic de configuration et tests de non-régression.

## Inventaire exhaustif des fichiers sources modifiés ou ajoutés

Les chemins ci-dessous utilisent le rangement de cet export : le préfixe historique `app/` est retiré. « Ajouté » et « Modifié » décrivent l’écart du code v10 avec le point de départ, avant nettoyage de l’export.

| Fichier | État au passage vers v10 |
| --- | --- |
| `README.md` | Modifié |
| `functions/api/ameliorer.ts` | Modifié |
| `functions/api/chat.ts` | Modifié |
| `functions/api/lire-plan.ts` | Modifié |
| `functions/api/research.ts` | Ajouté |
| `package-lock.json` | Modifié |
| `package.json` | Modifié |
| `public/_headers` | Ajouté |
| `scripts/build-connected.mjs` | Ajouté |
| `server/ai.ts` | Modifié |
| `server/pages-worker.ts` | Ajouté |
| `server/research.ts` | Ajouté |
| `src/App.tsx` | Modifié |
| `src/api/demoApi.ts` | Modifié |
| `src/api/supabaseApi.ts` | Modifié |
| `src/api/types.ts` | Modifié |
| `src/components/AiAdvicePanel.tsx` | Modifié |
| `src/components/AssignmentForm.tsx` | Modifié |
| `src/components/AthleteMonitoring.tsx` | Ajouté |
| `src/components/CoachAthletePanel.tsx` | Ajouté |
| `src/components/CoachWeekBoard.tsx` | Ajouté |
| `src/components/CycleDevelopment.tsx` | Ajouté |
| `src/components/FeedbackCard.tsx` | Modifié |
| `src/components/Icon.tsx` | Modifié |
| `src/components/LocalAssistant.tsx` | Ajouté |
| `src/components/PlanningCycles.tsx` | Ajouté |
| `src/components/ProgramCycleReview.tsx` | Ajouté |
| `src/components/SeasonHistogram.tsx` | Ajouté |
| `src/components/SessionIllustrations.tsx` | Ajouté |
| `src/components/SessionView.tsx` | Modifié |
| `src/components/SidePanel.tsx` | Ajouté |
| `src/components/TrainingDesk.tsx` | Ajouté |
| `src/components/TrainingInfo.tsx` | Modifié |
| `src/components/WellnessCheckin.tsx` | Modifié |
| `src/components/WorkoutTracker.tsx` | Ajouté |
| `src/components/ui.tsx` | Modifié |
| `src/data/strengthCircuit.ts` | Ajouté |
| `src/index.css` | Modifié |
| `src/lib/adaptation.ts` | Ajouté |
| `src/lib/confidentiality.ts` | Ajouté |
| `src/lib/cycleProjection.ts` | Ajouté |
| `src/lib/data.tsx` | Modifié |
| `src/lib/docxContent.ts` | Ajouté |
| `src/lib/importReview.ts` | Ajouté |
| `src/lib/importSessions.ts` | Modifié |
| `src/lib/localAssistant.ts` | Ajouté |
| `src/lib/managerCockpit.ts` | Ajouté |
| `src/lib/planningPhases.ts` | Ajouté |
| `src/lib/privacy.ts` | Ajouté |
| `src/lib/programCycles.ts` | Ajouté |
| `src/lib/release.ts` | Modifié |
| `src/lib/research.ts` | Ajouté |
| `src/lib/season.ts` | Ajouté |
| `src/lib/sessionText.ts` | Modifié |
| `src/lib/settings.ts` | Modifié |
| `src/lib/utils.ts` | Modifié |
| `src/lib/weeklyReview.ts` | Ajouté |
| `src/lib/workout.ts` | Ajouté |
| `src/lib/workoutHistory.ts` | Ajouté |
| `src/pages/AssignmentDetail.tsx` | Modifié |
| `src/pages/Assistant.tsx` | Modifié |
| `src/pages/AthleteDetail.tsx` | Modifié |
| `src/pages/Athletes.tsx` | Modifié |
| `src/pages/Competitions.tsx` | Modifié |
| `src/pages/Dashboard.tsx` | Modifié |
| `src/pages/DbUpdate.tsx` | Modifié |
| `src/pages/ImportSessions.tsx` | Modifié |
| `src/pages/Imports.tsx` | Ajouté |
| `src/pages/Join.tsx` | Modifié |
| `src/pages/Login.tsx` | Modifié |
| `src/pages/Messages.tsx` | Modifié |
| `src/pages/Planning.tsx` | Modifié |
| `src/pages/Privacy.tsx` | Ajouté |
| `src/pages/PublicPrivacy.tsx` | Ajouté |
| `src/pages/Research.tsx` | Ajouté |
| `src/pages/Season.tsx` | Ajouté |
| `src/pages/SessionEditor.tsx` | Modifié |
| `src/pages/Sessions.tsx` | Modifié |
| `src/pages/Settings.tsx` | Modifié |
| `src/pages/WeeklyReview.tsx` | Ajouté |
| `src/pages/athlete/AthleteHome.tsx` | Modifié |
| `src/pages/athlete/AthleteProfile.tsx` | Modifié |
| `src/pages/athlete/AthleteProgress.tsx` | Modifié |
| `src/pages/athlete/AthleteSessions.tsx` | Modifié |
| `src/types.ts` | Modifié |
| `tests/browser/parcours-v8.py` | Ajouté |
| `tests/browser/programmes-accueil-v9.py` | Ajouté |
| `tests/cockpit.test.mjs` | Ajouté |
| `tests/cycles.test.mjs` | Ajouté |
| `tests/database-upgrade.test.mjs` | Ajouté |
| `tests/database.test.mjs` | Ajouté |
| `tests/features.test.mjs` | Ajouté |
| `tests/fixtures/schema-original.sql` | Ajouté |
| `tests/history.test.mjs` | Ajouté |
| `tests/import.test.mjs` | Ajouté |
| `tests/planning.test.mjs` | Ajouté |
| `tests/programs.test.mjs` | Ajouté |
| `tests/season.test.mjs` | Ajouté |
| `tests/weekly.test.mjs` | Ajouté |
| `tests/worker.test.mjs` | Ajouté |
| `wrangler.toml` | Modifié |
| `supabase/migration-complete-2027.sql` | Ajouté |
| `supabase/migration-season-2027.sql` | Ajouté |
| `supabase/schema.sql` | Modifié |

## Nettoyage spécifique de cet export

Ces adaptations sont limitées à la préparation du ZIP demandé ; elles ne sont pas présentées comme l’état binaire exact d’un déploiement.

- Déplacement du contenu de `app/` à la racine du projet extrait. Les trois imports SQL de `src/pages/DbUpdate.tsx` et les chemins SQL de `tests/database.test.mjs` sont ajustés ; le contenu des trois fichiers SQL reste inchangé.
- `server/ai.ts` et `server/push.ts` : retrait des valeurs intégrées d’URL et de clé publique Supabase ; les variables d’environnement existantes restent utilisées.
- `src/api/demoApi.ts` : remplacement du préchargement des fiches de démonstration et de leurs données personnelles/sportives par des tables individuelles vides. Le moteur démo et les catalogues génériques d’exercices/tests restent présents.
- `src/pages/Login.tsx` : retrait de la mention d’un compte athlète de démonstration préchargé.
- `src/components/ImportRoster.tsx` : remplacement des noms, années et adresse d’exemple du placeholder par des libellés de colonnes.
- `tests/features.test.mjs` : remplacement d’un prénom dans un cas de refus de texte libre par un texte neutre.
- `README-V10.md` : copie du README archivé, avec suppression des identifiants de démonstration. Ses chemins `app/` et indications historiques sont à lire avec le README d’export.
- Ajout des fichiers de livraison `README.md`, `CHANGEMENTS.md`, `PROVENANCE.json`, `VERIFICATION.md` et `MANIFESTE-SHA256.txt`.

Fichiers de l’archive dont le contenu est adapté pour cet export :

- `server/ai.ts`
- `server/push.ts`
- `tests/database.test.mjs`
- `tests/features.test.mjs`
- `src/components/ImportRoster.tsx`
- `src/pages/DbUpdate.tsx`
- `src/pages/Login.tsx`
- `src/api/demoApi.ts`

## Exclusions volontaires

- Tous les fichiers `.env*`, y compris ceux portant une configuration publique.
- `dist/`, `node_modules/`, caches, fichiers de compilation intermédiaires, captures et archives imbriquées.
- Le patch historique brut : il peut contenir d’anciennes valeurs de configuration supprimées, donc n’est pas embarqué.
- Les comptes rendus de connexion et documents opérationnels à la racine de l’ancienne archive, ainsi que les captures/exportations de programmes : ils ne sont pas nécessaires au code modifiable.
- Les deux scénarios `tests/browser/parcours-v8.py` et `tests/browser/programmes-accueil-v9.py` : ils dépendent des fiches de démonstration retirées et contiennent un mot de passe factice. Les tests unitaires et SQL sont conservés ; leurs jeux techniques synthétiques ne sont pas des données du groupe.

Les fichiers exclus existent dans les archives conservées ; ils ne sont pas déclarés perdus. Aucune donnée réelle de Supabase n’a été téléchargée pour cet export.

### Annexes historiques ajoutées, hors code de l’application

Ces chemins figurent aussi dans le patch v10 ; ils ne sont pas embarqués dans le ZIP de sources, pour éviter les comptes rendus de configuration et conserver une livraison centrée sur le code demandé.

- `.github/workflows/verification.yml`
- `CONTROLE-CONNEXION.json`
- `INSTRUCTIONS-CLAUDE-CODE.txt`
- `LISEZ-MOI-ADAPTATION.txt`
- `MISE-EN-LIGNE-BERNEX.txt`
- `PREPRODUCTION.txt`
- `VERIFICATIONS.txt`
