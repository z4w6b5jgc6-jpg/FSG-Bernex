# 🏃 Coach Athlé – FSG Bernex

Application web pour construire les entraînements d'athlétisme, les mettre à disposition des athlètes et suivre leurs retours.

**Tout se gère depuis un smartphone, Android comme iPhone** : l'app s'installe sur l'écran d'accueil comme une application (icône, plein écran), sans passer par l'App Store ni le Play Store. Elle marche aussi sur ordinateur.

## Installer l'app sur le téléphone

| | Entraîneur et athlètes |
|---|---|
| **Android** (Chrome) | Ouvrir le site → bouton **« 📲 Installer »** dans l'app, ou menu **⋮ → Installer l'application** |
| **iPhone** (Safari) | Ouvrir le site → bouton **Partager ⬆️ → « Sur l'écran d'accueil »** |

- L'athlète ouvre le lien d'inscription de son groupe reçu sur WhatsApp, crée son compte, puis installe l'app. Ensuite il reste connecté.
- Les données se rafraîchissent automatiquement quand on revient dans l'app.
- Pas de notifications push dans cette version : les annonces passent par WhatsApp (bouton **« Annoncer sur WhatsApp »** ou **« Partager »**).

## Ce que fait l'application

**Côté entraîneur**
- **Séances** : construire des séances types en blocs (échauffement, corps de séance, retour au calme…) avec séries, répétitions, distance, durée, récupération, intensité et consignes. Bibliothèque de 38 exercices (sprint, sauts, haies, demi-fond, lancers, renforcement…).
- **Planning** : vue semaine, attribuer une séance à un groupe et/ou à des athlètes, avec heure, lieu et message. Annonce en un geste sur WhatsApp.
- **Athlètes** : un **lien d'inscription par groupe** (ex. « Rejoins le programme d'entraînement du groupe U18 »), à poster dans le groupe WhatsApp. L'athlète crée son compte et arrive directement dans le bon groupe. Un lien général permet aussi de choisir son groupe. Tu peux ensuite changer un athlète de groupe ou le désactiver.
- **Ta liste d'athlètes** : crée les fiches à la main ou **importe ta liste** par copier-coller depuis Excel (Prénom, Nom, Année, Groupe, Email, Téléphone). Quand un athlète s'inscrit, son compte est **relié automatiquement à sa fiche** : par l'email si tu l'as saisi, sinon par prénom + nom + année de naissance (accents et majuscules ignorés). Chaque inscription apparaît dans « Nouvelles inscriptions » : tu confirmes, tu délies si ce n'est pas la bonne personne, ou tu relies à la bonne fiche (fusion sans perte de données) en cas de faute de frappe.
- **Fiche athlète** : records et résultats de compétition, et **tests physiques**. La batterie du groupe est proposée par défaut : 20 m lancé, 30 m lancé, 40 m départ arrêté, monobond, triple bond, pentabond, décabond et test VMA, plus des tests complémentaires (médecine-ball, 600 m, 1000 m, gainage) pour les lanceurs et demi-fondeurs. Saisie rapide pour tout un groupe le jour du test (chronos longs saisis en « 1'45 »), classement par test, **tableau du groupe** (athlètes × tests) et progression (▲/▼). L'athlète voit ses résultats dans « Mes progrès ».
- **Import de séances** (Planning → « Importer des séances ») : un tableau Excel avec une ligne par exercice (modèle téléchargeable), ou un **plan avec une ligne par séance** (colonnes Date, Cycle, Objectif, puis une colonne par partie de séance), un document Word ou du texte collé.
- **Import des résultats depuis Excel** (Tests → « 📥 Importer ») : l'app reconnaît les feuilles, la date, les colonnes (« Mono (m) », « 20 m essai 1 (s) »…) et les athlètes. Plusieurs colonnes d'un même test sont gardées comme **essais**, et le meilleur est retenu. Une feuille de synthèse (« Points forts », « Axe prioritaire », « Type d'entraînement », « Feedback individuel ») devient le **bilan de tests** que l'athlète lit dans l'app ; « Positionnement » et « Vigilance » vont dans tes notes privées. Les colonnes calculées par le classeur sont ignorées, et réimporter le même fichier ne crée pas de doublons. Les prénoms écrits un peu différemment de ta liste (Sarah / Sara, Nathalia / Natalia) sont rapprochés et surlignés pour que tu vérifies. Une colonne qui n'indique qu'une unité (« Km/h ») est reliée au test qui a cette unité (VMA). Si le fichier n'a pas de date, l'app te la demande.
- **Allures VMA personnalisées** : à partir de la dernière VMA, un tableau d'allures (70 à 105 % : km/h, temps au 200 m, 400 m, 1000 m). Dans une séance, si tu écris l'intensité en « % VMA » (ex. « 90% VMA » sur un 400 m, ou « 100% VMA » sur des 30"/30"), chaque athlète voit **son** allure : « 🎯 Pour toi : 1'35 au 400 m ».
- **Suivi** : retours après séance, check-ins bien-être (sommeil, énergie, courbatures, stress), records, objectifs, alertes sur l'accueil, réponses aux athlètes et notes de suivi privées.
- **Conseils** : 17 conseils fournis (nutrition, hydratation, sommeil, récupération, prévention, mental, hygiène de vie, compétition), rédigés pour les 15 ans et plus. Tu peux ajouter les tiens (infos club, rappels…).

**Côté athlète** (son propre compte)
- **Accueil personnalisé** : son avatar, sa couleur, son objectif de saison, la séance du jour, la série 🔥 de séances, le conseil du jour.
- **Check-in bien-être** quotidien en 30 secondes.
- **Séances** : détail de chaque séance, retour après l'entraînement (effort, forme, plaisir, douleur, commentaire), réponse du coach.
- **Conseils** : par catégorie, avec favoris ⭐.
- **Progrès** : records et résultats (saisis par lui ou par toi), résultats de ses tests avec progression, graphiques d'effort et de sommeil, 12 badges à débloquer.
- **Profil** : choix de l'avatar et de la couleur de l'app, disciplines, objectif.

## Essayer tout de suite (mode démo)

Sans aucune configuration, l'app démarre en **mode démo** avec des données d'exemple, stockées uniquement dans le navigateur.

```bash
cd app
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 :
- **entraîneur** : n'importe quel email ;
- **athlète** : `lea@demo.ch` (athlète d'exemple avec un historique) ;
- **inscription d'un nouvel athlète** : http://localhost:5173/#/rejoindre/DEMO2026

> En mode démo, tout reste dans le navigateur. Pour un vrai usage avec les athlètes, il faut connecter Supabase (ci-dessous).

## Mise en ligne (gratuit) – environ 15 minutes

> À faire une seule fois, de préférence sur un ordinateur (possible sur téléphone mais moins confortable). Ensuite, tout se fait depuis le smartphone.

### 1. Créer la base de données (Supabase)
1. Créer un compte sur https://supabase.com puis **New project** (région : Zurich/Frankfurt).
2. Dans le projet : **SQL Editor → New query**, coller le contenu de [`supabase/schema.sql`](supabase/schema.sql), cliquer **Run** (le script peut être relancé sans risque après une mise à jour de l'app).
3. Dans **Project Settings → API**, noter l'**URL** du projet et la clé **anon public**.

### 2. Héberger le site (Cloudflare Pages)
Le site du club est publié sur **https://entrainementu18.pages.dev** : chaque push sur la branche de production le republie automatiquement.
- Cloudflare : *Workers & Pages → Create → Pages → Connect to Git*, choisir ce dépôt, puis
  **Framework preset = None**, **Build command = `npm run build`**, **Build output directory = `dist`**, **Root directory = `app`**.
- Après un changement d'adresse : dans Supabase, *Authentication → URL Configuration*, mettre la nouvelle adresse en **Site URL** et l'ajouter aux **Redirect URLs** (`https://…/**`).

La connexion à Supabase est définie dans [`app/.env.production`](app/.env.production) (`COACH_SUPABASE_URL` et `COACH_SUPABASE_ANON_KEY`, la clé **publishable**, publique par conception) : aucune variable à saisir chez l'hébergeur. Pour un autre projet Supabase, remplacer ces deux valeurs. Si une valeur est mal renseignée, l'app affiche un écran « Configuration à corriger » qui explique le problème.

Mise à jour de la base après une nouvelle version : ouvrir **`<adresse du site>/#/base`**, copier le script et l'exécuter dans le *SQL Editor* de Supabase.

### 3. Créer son compte entraîneur
1. Ouvrir le site → **Créer un compte**, confirmer via l'email reçu, se connecter, puis **« Je suis entraîneur »** et donner le nom du club.
2. Dans Supabase, **Authentication → URL Configuration** : mettre l'adresse du site comme *Site URL* (pour les emails de confirmation).
3. Importer ta liste d'athlètes (onglet Athlètes → « Importer ma liste », les groupes sont créés automatiquement), puis partager le **lien d'inscription de chaque groupe** dans le groupe WhatsApp correspondant.

> Les inscriptions doivent rester ouvertes (« Allow new users to sign up ») pour que les athlètes puissent créer leur compte. Sans le code du club, un nouveau compte ne voit aucune donnée. Si un lien circule trop, crée-en de nouveaux (bouton « Nouveaux liens ») : les athlètes déjà inscrits ne sont pas touchés.

## Sécurité et données des jeunes
- Chaque club est isolé : un entraîneur ne voit que ses groupes, athlètes, séances et retours (règles *Row Level Security* dans la base).
- Un athlète ne voit que **son** profil, **ses** séances, **ses** retours, records et check-ins, plus les conseils publiés du club. Il ne peut pas changer de groupe ni écrire la réponse du coach.
- Les **notes de suivi** de l'entraîneur sont stockées à part et ne sont jamais envoyées à l'athlète.
- À l'inscription, l'athlète accepte que ses données soient visibles par les entraîneurs du club. Désactiver un athlète bloque son accès ; « Retirer du club » supprime ses données.
- Les conseils sont des repères généraux : ils renvoient vers un médecin ou un·e diététicien·ne pour toute question de santé.

## Technique
- `app/` : React + TypeScript + Vite (site statique).
- `supabase/schema.sql` : tables, règles de sécurité et fonctions d'inscription (`whoami`, `create_club`, `club_by_code`, `join_club` avec liaison à la liste, `merge_athletes`).
- Commandes : `npm run dev`, `npm run build`, `npm run lint`.
