# Bernex connecté — sources v18

Sources modifiables de l’archive existante `bernex-application-connectee-v18.zip`, dont le dossier construit correspond octet pour octet aux **25 fichiers de `bernex-connecte-v18.zip`**. Ce ZIP ne contient pas ces fichiers construits. Voir `PROVENANCE.json`.

## Rangement

Extraire dans un dossier dédié : `src/`, `public/`, `functions/`, `server/`, `scripts/`, `tests/`, `supabase/` et les fichiers de projet sont directement à sa racine, comme l’export v10. Le préfixe historique `app/` a été retiré et les chemins SQL adaptés. Aucun fichier requis ne manque.

## Développement

Avec une version de Node compatible avec le verrou de dépendances (Node 22.12+ ou 24) :

```sh
npm ci
npm run dev
npm run build
npm test
```

Sans configuration Supabase, la démo locale démarre sans fiche ni relevé d’athlète préchargé. Les définitions génériques d’exercices et de tests sont conservées. Les tests unitaires/SQL utilisent des jeux techniques synthétiques. Les scénarios navigateur conservés qui dépendaient de l’ancienne démo peuplée nécessitent une fixture de test équivalente ; aucune donnée du groupe n’est livrée.

## Configuration connectée et assistant IA

Aucun fichier `.env*`, aucune valeur de clé, aucun mot de passe et aucun export Supabase ne sont fournis. Définir dans l’environnement de compilation, avec les valeurs de ton projet :

- `COACH_SUPABASE_URL` ;
- `COACH_SUPABASE_ANON_KEY` (clé publique, jamais une clé de service).

Le code reconnaît aussi `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Les noms de variables et préfixes de formats dans les validateurs ne sont pas des valeurs de clés.

```sh
npm run build:connected
```

Cette commande compile l’interface puis le worker depuis `server/pages-worker.ts` et produit `dist/` sur ta machine. Elle ne publie rien et ne modifie pas de base distante. Elle refuse de continuer sans configuration publique valide. Le script injecte cette configuration publique dans le worker construit ; en utilisant les Functions séparément, fournir aussi les variables `COACH_*` au serveur.

Le fichier `wrangler.toml` cible le projet existant **bernexdemo**. Les propositions directes et la discussion de séance requièrent le binding **Workers AI nommé `AI`**. Le quota et la disponibilité dépendent du compte Cloudflare ; ils ne sont pas inclus ou garantis par le code source. Les éventuels secrets Web Push restent à configurer séparément, hors de ce ZIP.

L’assistant traite le contenu de séance et la conversation dans Cloudflare. Les noms connus sont masqués côté navigateur, sans garantie d’anonymisation ; profils, historique de santé, cibles individuelles et illustrations ne sont pas ajoutés automatiquement. Les ajustements retenus sont appliqués au brouillon, puis enregistrés par le coach. Les huit fiches de référence ne remplacent pas la lecture intégrale des ouvrages et n’établissent pas un dosage individuel optimal.

## SQL

- `supabase/schema.sql` ;
- `supabase/migration-season-2027.sql` ;
- `supabase/migration-complete-2027.sql` ;
- `tests/fixtures/schema-original.sql`, schéma technique historique des tests.

Les trois fichiers de `supabase/` sont identiques à ceux de la v10. Leur présence ne signifie pas qu’il faut les réexécuter sur une base existante. Aucune donnée utilisateur n’est contenue dans ces migrations.

## Traçabilité

`CHANGEMENTS-V10-V18.md` distingue les différences des versions archivées des adaptations de nettoyage de cet export. `VERIFICATION.md` indique les vérifications exécutées et leurs limites. `MANIFESTE-SHA256.txt` permet de contrôler l’intégrité des fichiers livrés. Les archives locales sont la référence ; l’état actuellement publié sur le site n’a pas été vérifié.
