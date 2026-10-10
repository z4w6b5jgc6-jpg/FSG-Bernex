# 🏃 Coach Athlé – FSG Bernex

Application web pour construire les entraînements d'athlétisme, les mettre à disposition des athlètes et suivre leurs retours.

Fonctionne sur ordinateur et sur téléphone (on peut l'ajouter à l'écran d'accueil comme une app).

## Ce que fait l'application

**Côté entraîneur**
- **Séances** : construire des séances types en blocs (échauffement, corps de séance, retour au calme…) avec pour chaque exercice séries, répétitions, distance, durée, récupération, intensité et consignes. Dupliquer une séance pour la faire évoluer.
- **Bibliothèque d'exercices** : 32 exercices d'athlétisme fournis (gammes, vitesse, haies, sauts, lancers, renfo…), à compléter.
- **Planning** : vue semaine, attribuer une séance à une date / heure / lieu pour un groupe et/ou des athlètes précis, avec un message.
  Bouton **« Annoncer sur WhatsApp »** pour prévenir le groupe.
- **Athlètes et groupes** (U14, U16, Sprint…) : chaque athlète a un **lien personnel** à envoyer **par WhatsApp** (bouton dédié). Pas de compte, pas de mot de passe, pas d'email nécessaire pour les jeunes.
- **Retours** : tableau de bord avec les derniers retours, taux de réponse, alertes (douleur, grosse fatigue, effort maximal), possibilité de **répondre** à chaque athlète, historique et graphique d'effort par athlète.

**Côté athlète** (via son lien)
- Voir ses séances à venir et passées, avec le détail.
- Après la séance : « Séance faite ? », difficulté ressentie (1–10), forme/fatigue et humeur (emojis), douleur éventuelle, commentaire.
- Lire la réponse de l'entraîneur.

## Essayer tout de suite (mode démo)

Sans aucune configuration, l'app démarre en **mode démo** avec des données d'exemple, stockées uniquement dans le navigateur.

```bash
cd app
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 et se connecter avec n'importe quel email.

> En mode démo, le lien athlète ne marche que dans le même navigateur. Pour un vrai usage avec les athlètes, il faut connecter Supabase (ci-dessous).

## Mise en ligne (gratuit) – environ 15 minutes

### 1. Créer la base de données (Supabase)
1. Créer un compte sur https://supabase.com puis **New project** (région : Zurich/Frankfurt).
2. Dans le projet : **SQL Editor → New query**, coller le contenu de [`supabase/schema.sql`](supabase/schema.sql), cliquer **Run**.
3. Dans **Project Settings → API**, noter l'**URL** du projet et la clé **anon public**.

### 2. Héberger le site (Netlify ou Vercel)
- **Netlify** : *Add new site → Import from GitHub*, choisir ce dépôt (le fichier `netlify.toml` configure tout).
- **Vercel** : *New Project*, choisir ce dépôt, mettre **Root Directory = `app`**.

Dans les deux cas, ajouter ces variables d'environnement puis redéployer :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | l'URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | la clé *anon public* |

### 3. Créer son compte entraîneur
1. Ouvrir le site, cliquer **« Créer un compte entraîneur »**, confirmer via l'email reçu.
2. Dans Supabase, **Authentication → Sign In / Providers → désactiver « Allow new users to sign up »** pour que personne d'autre ne puisse créer de compte (chaque compte ne voit de toute façon que ses propres données).
3. Dans **Authentication → URL Configuration**, mettre l'adresse du site comme *Site URL*.

## Sécurité et données des jeunes
- Chaque entraîneur ne voit que ses propres groupes, athlètes, séances et retours (règles *Row Level Security* dans la base).
- Un athlète n'accède qu'à **ses** séances et **ses** retours, grâce à son lien personnel (identifiant aléatoire impossible à deviner). Les notes privées de l'entraîneur ne lui sont jamais envoyées.
- Si un lien est partagé par erreur : fiche athlète → **« Nouveau lien »** (l'ancien cesse de fonctionner). Désactiver un athlète coupe aussi son accès.
- Seuls le prénom, le nom, l'année de naissance et les retours sont stockés. Pense à informer les parents de l'utilisation de l'app.

## Technique
- `app/` : React + TypeScript + Vite (site statique).
- `supabase/schema.sql` : tables, sécurité, et fonctions `athlete_portal` / `athlete_submit_feedback` utilisées par l'espace athlète.
- Commandes : `npm run dev`, `npm run build`, `npm run lint`.
