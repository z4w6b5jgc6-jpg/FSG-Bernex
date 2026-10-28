# Changements entre v10 et v18

## Sources de la comparaison

Comparaison octet par octet des fichiers de code, configuration, ressources et tests des archives locales `bernex-application-connectee-v10.zip` et `bernex-application-connectee-v18.zip`, avant nettoyage de l’export. Les chemins historiques `app/…` sont présentés sans ce préfixe pour correspondre au rangement demandé. Aucune différence provenant seulement du nettoyage de l’export v10 n’est comptée comme une nouvelle fonction v18.

L’archive v18 contient exactement les 25 fichiers construits de `bernex-connecte-v18.zip`. Ces fichiers ont été comparés pour identifier la version ; aucun fichier construit n’est livré. Les fichiers requis existent ; aucune reconstruction de mémoire n’a été nécessaire. L’état actuellement déployé sur le site n’a pas été vérifié.

## Évolutions cumulées

- **v11 — bibliothèque et séances** : huit familles en tuiles ouvrant les séances par date ; musculation ; catalogue descriptif de 62 exercices, dont 24 de musculation. Les séances mixtes restent identifiables.
- **v12 — périodisation et références** : repères Egger (progression extensive, tendance dégressive intensive/explosive, récupération et charge interne), fiches scientifiques avec limites, scénarios et revue locale contrainte. Les pourcentages historiques ne sont pas des prescriptions universelles aux jeunes.
- **v13 — analyse des contenus programmés** : lecture des quantités reconnues, unités séparées, inconnues conservées ; rapprochement des phases déclarées, intensités et récupérations ; revue des variantes individuelles.
- **v14 — lecture de la préparation réelle** : périodes et blocs thématiques tirés des séances enregistrées, histogramme d’indicateurs ; adaptations d’exercices libres ou quantifiés et possibilité de cibler une occurrence sans modifier toutes les autres dates. L’import est retiré de la vue Saison.
- **v15 — dynamique hebdomadaire** : distinction entre intention de progression/dégression/récupération et variation effectivement observée ; intentions du coach par indicateur et périmètre ; comparaisons suspendues si les données ne sont pas comparables. Les hauteurs ne sont pas une courbe de charge idéale inventée.
- **v16–v17 — import Excel** : ne plus confondre la colonne Exercices d’une synthèse avec le tableau détaillé ; modèle généré au clic ; lecteur Excel intégré au module principal pour éviter un chargement différé défaillant ; renouvellement du cache.
- **v18 — assistant externe rétabli sur demande du coach** : propositions directes et discussion sur la séance ; contexte minimal, noms connus masqués, références existantes, aperçu avant/après et application choisie au brouillon. Le service utilise Workers AI de Cloudflare avec un binding `AI`. Le masquage n’est pas une garantie d’anonymisation ; aucune promesse de non-conservation fournisseur. Les références sont des fiches vérifiées, pas des livres intégralement ingérés. L’IA ne modifie ni la base ni le planning elle-même.

## Inventaire exhaustif des différences dans les sources

73 fichiers ajoutés ou modifiés ; aucun fichier de cet ensemble n’a été supprimé. `package-lock.json`, les trois fichiers `supabase/*.sql` et les autres fichiers non listés sont inchangés entre ces deux archives.

| Fichier | État | Changement |
| --- | --- | --- |
| `functions/api/ameliorer.ts` | Modifié | Réactivation de l’analyse directe via le moteur partagé de séance. |
| `functions/api/chat.ts` | Modifié | Réactivation de la discussion via le moteur partagé de séance. |
| `package.json` | Modifié | Ajout des suites de tests des bibliothèques, contenus, périodisation, imports et assistant. |
| `public/modele-seances.xlsx` | Modifié | Nouveau modèle Excel sans prescription ni date inventée, accompagné de son guide. |
| `public/sw.js` | Modifié | Passage du cache applicatif v9 à v18 et ajustement du traitement des assets en cache. |
| `server/session-assistant.ts` | Ajouté | Authentification coach, fiches de référence, prompts des deux modes, contrôle des demandes et réponses, diagnostic du binding Workers AI. |
| `src/api/demoApi.ts` | Modifié | Démo de discussion et de propositions explicitement simulée, sans génération réelle de dosage. |
| `src/api/supabaseApi.ts` | Modifié | Appels authentifiés aux routes de séance rétablis ; timeout et erreurs réseau/JSON explicites. |
| `src/components/AiAdvicePanel.tsx` | Modifié | Analyse directe, discussion, références, avant/après, choix des modifications et application au brouillon. |
| `src/components/ContentAdjustmentDraft.tsx` | Ajouté | Modification justifiée d’un exercice libre ou quantifié, variante individuelle ou copie ciblant une occurrence programmée ; contrôle des changements concurrents. |
| `src/components/CycleDevelopment.tsx` | Modifié | Dynamiques de charge, intégration des nouveaux scénarios et import retiré de la vue Saison. |
| `src/components/EggerLoadGuide.tsx` | Ajouté | Présentation du modèle historique et de ses limites de transposition aux jeunes. |
| `src/components/Icon.tsx` | Modifié | Icônes complémentaires pour les familles de séances et nouvelles vues. |
| `src/components/LocalPeriodizationReview.tsx` | Ajouté | Revue IA locale contrainte des scénarios de périodisation. |
| `src/components/MacrocycleLoadChart.tsx` | Ajouté | Histogramme des scénarios de charge définis par le coach. |
| `src/components/PeriodizationAudit.tsx` | Ajouté | Restitution des points de cohérence et de revue des scénarios. |
| `src/components/PeriodizationOverview.tsx` | Ajouté | Frise des périodes déclarées, blocs thématiques, histogramme et intentions/variations hebdomadaires. |
| `src/components/ProgramContentAI.tsx` | Ajouté | Classement local de points de revue issus des séances réelles et références contrôlées. |
| `src/components/ProgramCycleReview.tsx` | Modifié | Adaptation de la revue des programmes et retrait des liens d’import de cette vue. |
| `src/components/ProgramPeriodization.tsx` | Ajouté | Analyse principale des séances déjà enregistrées, filtres programme/athlète/date, indicateurs, semaines et accès aux adaptations. |
| `src/components/TrainingDesk.tsx` | Modifié | Prise en compte des nouveaux contenus et champs de charge dans les variantes individuelles. |
| `src/components/WeeklyIntentionEditor.tsx` | Ajouté | Intention du coach par semaine, indicateur, programme et athlète ; contrôle de concurrence. |
| `src/components/WorkoutTracker.tsx` | Modifié | Affichage des nouvelles informations de charge/exercice. |
| `src/data/athleticsExercises.ts` | Ajouté | Catalogue initial de 62 fiches descriptives d’exercices, dont 24 de musculation. |
| `src/data/defaults.ts` | Modifié | Ajout/ajustement des familles et catégories d’exercices. |
| `src/data/trainingKnowledge.ts` | Ajouté | Huit fiches vérifiées : Egger, périodisation, sprint, affûtage et développement des jeunes, avec limites et localisateurs. |
| `src/index.css` | Modifié | Styles des tuiles, bibliothèque, frise, analyse des contenus, intentions et ajustements ; adaptations responsive. |
| `src/lib/adaptation.ts` | Modifié | Prise en compte des métadonnées de contenu dans les différences de variantes. |
| `src/lib/contentAdjustment.ts` | Ajouté | Construction des modifications de champ, empreinte de contenu et patch d’attribution ciblée. |
| `src/lib/contentLoad.ts` | Ajouté | Lecture prudente des volumes, durées, répétitions, tonnage, intensités et récupérations ; unités séparées et données inconnues conservées. |
| `src/lib/cycleProjection.ts` | Modifié | Cadence des mésocycles extensifs/intensifs/explosifs, récupération et scénarios bornés par les cibles du coach. |
| `src/lib/importReview.ts` | Modifié | Comparaison des contenus enrichie avec les nouvelles métadonnées, sans perdre les protections de réimport. |
| `src/lib/importSessions.ts` | Modifié | Détection d’un vrai tableau Exercice + Séance ; une synthèse ou feuille vide ne masque plus le Détail. |
| `src/lib/loadDynamics.ts` | Ajouté | Lecture des directions de charge des scénarios et repères historiques. |
| `src/lib/localAssistant.ts` | Modifié | Moteur partagé, contexte de références vérifiées, contrôle de taille et absence de troncature silencieuse. |
| `src/lib/localCycleReview.ts` | Ajouté | Validation de pistes/références autorisées et classement local fondé sur les faits de revue. |
| `src/lib/periodizationAudit.ts` | Ajouté | Points de revue des phases, récupérations, limites de séquence et comparaisons de charge des scénarios. |
| `src/lib/periodizationOverview.ts` | Ajouté | Périodes et thèmes extraits des contenus programmés, durées et allègements explicites. |
| `src/lib/privacy.ts` | Modifié | Message de blocage limité à la lecture documentaire externe ; l’assistant de séance est rétabli. |
| `src/lib/programPeriodization.ts` | Ajouté | Regroupement des séances réellement attribuées par semaine, analyse des contenus/variantes et points de cohérence. |
| `src/lib/redact.ts` | Modifié | Masquage étendu aux autres champs textuels de séance avant transmission au service IA. |
| `src/lib/season.ts` | Modifié | Actualisation et contextualisation des références scientifiques. |
| `src/lib/sessionAI.ts` | Ajouté | Projection minimale de séance et validation des exercices, champs, références et changements proposés par l’IA. |
| `src/lib/sessionLibrary.ts` | Ajouté | Classement des séances par famille, dates et séries, avec gestion des séances mixtes. |
| `src/lib/sessionTemplate.ts` | Ajouté | Génération locale du modèle Excel, avec feuille de guide. |
| `src/lib/settings.ts` | Modifié | Stockage des intentions hebdomadaires du coach. |
| `src/lib/utils.ts` | Modifié | Présentation des nouveaux champs de charge dans les résumés d’exercice. |
| `src/lib/weeklyDynamics.ts` | Ajouté | Intentions et variations constatées, repères Egger, comparabilité des semaines et fusion des intentions concurrentes. |
| `src/pages/Exercises.tsx` | Modifié | Bibliothèque consultable/recherchable, fiches génériques et copies modifiables du club. |
| `src/pages/ImportProfiles.tsx` | Modifié | Lecteur Excel inclus dans le module principal au lieu d’un chargement différé. |
| `src/pages/ImportResults.tsx` | Modifié | Lecteur Excel inclus dans le module principal au lieu d’un chargement différé. |
| `src/pages/ImportSessions.tsx` | Modifié | Lecture corrigée des classeurs ; bouton de génération du modèle et lien de secours ; lecteur inclus dans le module principal. |
| `src/pages/Research.tsx` | Modifié | Intégration des références contrôlées et présentation de leur portée. |
| `src/pages/Season.tsx` | Modifié | Mise en avant de la périodisation réelle jusqu’à Pâques, scénarios annuels secondaires et import retiré de cette vue. |
| `src/pages/SessionEditor.tsx` | Modifié | Sélection d’exercices de bibliothèque, champs de charge et assistant direct/discussion appliquant des blocs au brouillon. |
| `src/pages/Sessions.tsx` | Modifié | Tuiles par type d’entraînement ouvrant des séances par date ; accès musculation et bibliothèque. |
| `src/pages/monday/MondayImport.tsx` | Modifié | Lecteur Excel inclus dans le module principal au lieu d’un chargement différé. |
| `src/types.ts` | Modifié | Métadonnées d’exercices/charge et suggestions IA avec identifiants de champs et références. |
| `tests/browser/assistant-seance-v18.py` | Ajouté | Scénario navigateur de non-régression (réponses IA simulées si concernées). |
| `tests/browser/bibliotheque-v11.py` | Ajouté | Scénario navigateur de non-régression (réponses IA simulées si concernées). |
| `tests/browser/dynamique-cycles-v12.py` | Ajouté | Scénario navigateur de non-régression (réponses IA simulées si concernées). |
| `tests/browser/dynamique-hebdomadaire-v15.py` | Ajouté | Scénario navigateur de non-régression (réponses IA simulées si concernées). |
| `tests/browser/periodes-blocs-v14.py` | Ajouté | Scénario navigateur de non-régression (réponses IA simulées si concernées). |
| `tests/browser/periodisation-contenus-v13.py` | Ajouté | Scénario navigateur de non-régression (réponses IA simulées si concernées). |
| `tests/content-periodization.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/dynamics.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/import-format.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/library.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/overview-periodization.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/session-ai.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/weekly-dynamics.test.mjs` | Ajouté | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `tests/worker.test.mjs` | Modifié | Tests de non-régression du module concerné, avec données techniques synthétiques. |
| `wrangler.toml` | Modifié | Projet de référence bernexdemo et binding Workers AI pour les deux usages de l’assistant. |

## Annexes des archives historiques

Ces documents et captures ne sont pas des sources nécessaires à l’application. Ils ne sont pas copiés dans cet export pour éviter les doublons de guides, captures, anciennes configurations et historiques de patches. Le relevé ci-dessous complète l’inventaire de comparaison ; les documents de livraison nouveaux sont listés ensuite.

| Annexe historique | État v10 → v18 |
| --- | --- |
| `APPUI-SCIENTIFIQUE-BERNEX-V12.txt` | Ajoutée |
| `ASSISTANT-BERNEX-V18.txt` | Ajoutée |
| `DYNAMIQUE-HEBDOMADAIRE-BERNEX-V15.txt` | Ajoutée |
| `IMPORT-BERNEX-V16.txt` | Ajoutée |
| `IMPORT-BERNEX-V17.txt` | Ajoutée |
| `MISE-EN-LIGNE-BERNEX.txt` | Modifiée |
| `PERIODES-BLOCS-BERNEX-V14.txt` | Ajoutée |
| `PERIODISATION-CONTENUS-BERNEX-V13.txt` | Ajoutée |
| `README.md` | Modifiée |
| `apercu-adaptation-programmee-v14.png` | Ajoutée |
| `apercu-analyse-contenus-v13.png` | Ajoutée |
| `apercu-analyse-cycles-v12.png` | Ajoutée |
| `apercu-dynamique-hebdomadaire-v15.png` | Ajoutée |
| `apercu-dynamique-mobile-v15.png` | Ajoutée |
| `apercu-exercices-v11.png` | Ajoutée |
| `apercu-frise-mobile-v14.png` | Ajoutée |
| `apercu-frise-v14.png` | Ajoutée |
| `apercu-intention-ajustee-v15.png` | Ajoutée |
| `apercu-macrocycle-cibles-v12.png` | Ajoutée |
| `apercu-macrocycle-mobile-v12.png` | Ajoutée |
| `apercu-macrocycle-v12.png` | Ajoutée |
| `apercu-periodes-blocs-v14.png` | Ajoutée |
| `apercu-programmes-paques-mobile-v13.png` | Ajoutée |
| `apercu-programmes-paques-v13.png` | Ajoutée |
| `apercu-repere-egger-v12.png` | Ajoutée |
| `apercu-seances-mobile-v11.png` | Ajoutée |
| `apercu-seances-tuiles-v11.png` | Ajoutée |
| `bernex-v10.patch` | Retirée de l’archive v18 |

## Nettoyage et rangement propres à cet export

Ces adaptations expliquent les différences avec les octets de l’archive source v18 ; elles n’ajoutent pas de fonctions au programme.

- Tous les fichiers de l’ancien `app/` sont rangés à la racine, comme dans l’export v10. Les imports SQL et chemins SQL des tests sont ajustés.
- Retrait de tous les fichiers `.env*`, des valeurs intégrées de clé publique/adresse Supabase dans les deux helpers serveur et des fiches individuelles de démonstration préchargées. Les variables d’environnement existantes restent utilisées.
- Les exemples nominatifs de connexion/import sont remplacés par des libellés neutres.
- Tous les fichiers de `tests/`, y compris les scénarios navigateur, sont conservés. Les mots de passe factices de démo ne sont plus fournis (champ vide en démo) ; les noms d’exemple sont remplacés par des identifiants techniques. Les scénarios qui reposaient sur l’ancienne démo peuplée nécessitent une fixture synthétique équivalente pour être rejoués. Ils ne sont pas annoncés exécutables sur la démo désormais vide sans préparation.
- Les données de test restantes sont des cas techniques synthétiques, pas un export de fiches ou résultats du groupe. Aucun accès ni téléchargement de la base Supabase réelle.
- `dist/`, `node_modules/`, caches, fichiers intermédiaires, archives, captures et patches historiques bruts exclus. Les patches pourraient conserver d’anciennes valeurs de configuration supprimées.
- Ajout de `README.md`, `CHANGEMENTS-V10-V18.md`, `PROVENANCE.json`, `VERIFICATION.md` et `MANIFESTE-SHA256.txt`.

### Fichiers existants adaptés pour le nettoyage/rangement

- `server/ai.ts`
- `server/push.ts`
- `tests/database.test.mjs`
- `tests/features.test.mjs`
- `tests/session-ai.test.mjs`
- `src/components/ImportRoster.tsx`
- `src/pages/DbUpdate.tsx`
- `src/pages/Login.tsx`
- `src/api/demoApi.ts`
- `tests/browser/periodisation-contenus-v13.py`
- `tests/browser/periodes-blocs-v14.py`
- `tests/browser/parcours-v8.py`
- `tests/browser/dynamique-cycles-v12.py`
- `tests/browser/assistant-seance-v18.py`
- `tests/browser/programmes-accueil-v9.py`
- `tests/browser/dynamique-hebdomadaire-v15.py`
- `tests/browser/bibliotheque-v11.py`
