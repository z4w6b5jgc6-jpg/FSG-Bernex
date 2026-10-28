# Vérification de l’export source v18

## Référence retrouvée

L’archive source `bernex-application-connectee-v18.zip` existe. Ses 25 fichiers de `app/dist/` sont identiques octet pour octet à ceux de `bernex-connecte-v18.zip`. Les empreintes de ces deux archives figurent dans `PROVENANCE.json`. Aucun fichier construit n’est embarqué. L’état actuellement déployé en ligne n’a pas été contrôlé.

## Complétude

- Tous les fichiers des dossiers `src/` (167), `public/`, `functions/`, `server/`, `scripts/` et `tests/` (28) de la v18 sont présents dans l’export, après les adaptations de nettoyage listées dans le changelog.
- Tous les fichiers de projet demandés existent, dont `package-lock.json`, les trois `tsconfig*.json` et `wrangler.toml`.
- `supabase/schema.sql`, `supabase/migration-season-2027.sql`, `supabase/migration-complete-2027.sql` et le schéma technique des tests sont présents. Les trois fichiers SQL de `supabase/` sont inchangés par l’export.
- Aucun fichier requis n’est perdu ; aucun source n’a été reconstruit de mémoire.

## Validation exécutée

- `npm run build` : TypeScript et Vite réussis, avec l’avertissement existant sur la taille des bundles.
- `npm test` : suite complète réussie, y compris les tests SQL locaux, imports, contenu/périodisation et contrôles serveur de l’assistant.
- Les dépendances déjà disponibles dans l’environnement ont été utilisées pour cette vérification ; `npm ci` n’a pas été relancé.
- Aucune connexion à la base Supabase réelle, aucune publication distante et aucun appel réel à Workers AI pour cet export.
- Les scénarios navigateur sont conservés mais n’ont pas été rejoués pour cet export ; certains nécessitent de préparer des fixtures techniques depuis que les fiches de démo ont été retirées.

## Nettoyage

Valeurs de clés Supabase intégrées retirées, absence de fichiers `.env*`, de `dist/`, de `node_modules/`, d’archives imbriquées et de caches. Pas de fiches d’athlètes préchargées, pas de données du groupe ni d’export de la base. Les tests contiennent uniquement des cas techniques synthétiques. Les noms de variables et préfixes de formats de clés sont conservés parce qu’ils font partie du code de configuration/validation ; ce ne sont pas des valeurs de clé.

`MANIFESTE-SHA256.txt` contient l’empreinte de chaque fichier livré, à l’exception du manifeste lui-même.
