import type { Tip } from '../types'

// Conseils fournis avec l'app, pour des athlètes de 15 ans et plus.
// Ce sont des repères généraux : en cas de question de santé, de blessure
// ou de régime particulier, on s'adresse à un médecin ou à un·e diététicien·ne.

export const TIP_CATEGORIES: { name: string; emoji: string }[] = [
  { name: 'Nutrition', emoji: '🥗' },
  { name: 'Hydratation', emoji: '💧' },
  { name: 'Sommeil', emoji: '😴' },
  { name: 'Récupération', emoji: '🧘' },
  { name: 'Prévention', emoji: '🩹' },
  { name: 'Mental', emoji: '🧠' },
  { name: 'Hygiène de vie', emoji: '🌱' },
  { name: 'Compétition', emoji: '🏅' },
  { name: 'Club', emoji: '📣' },
]

const t = (id: string, category: string, emoji: string, title: string, summary: string, body: string): Tip => ({
  id: `builtin-${id}`, category, emoji, title, summary, body: body.trim(), published: true, builtin: true,
})

export const BUILTIN_TIPS: Tip[] = [
  t('assiette', 'Nutrition', '🍽️', 'L’assiette de l’athlète', 'Construire un repas équilibré sans se prendre la tête.', `
À ton âge, ton corps grandit **et** s’entraîne : il a besoin de plus d’énergie que celui d’un ado sédentaire. Le but n’est pas de « manger moins » mais de **manger assez et varié**.

## La méthode de l’assiette
- **½ assiette de légumes** (crus ou cuits) et/ou fruits
- **¼ de féculents** : pâtes, riz, pommes de terre, pain complet, quinoa… Augmente la portion les jours d’entraînement intense
- **¼ de protéines** : viande, poisson, œufs, tofu, légumineuses (lentilles, pois chiches)
- Un **produit laitier** (ou alternative enrichie en calcium) et un peu de **bonnes graisses** (huile de colza ou d’olive, noix)

## Les bons réflexes
- 3 repas + 1 à 2 collations par jour, sans sauter le petit-déjeuner
- Pas d’aliment interdit : un dessert ou une pizza de temps en temps, c’est normal
- Mange à ta faim : la faim est un signal, pas un ennemi

⚠️ Faire un régime ou « sécher » à ton âge peut freiner ta croissance, augmenter le risque de blessure et de fractures de fatigue. Si tu veux changer ton alimentation, parles-en d’abord à ton entraîneur ou à un·e diététicien·ne.
`),
  t('petitdej', 'Nutrition', '🥣', 'Le petit-déjeuner qui fait la différence', 'Recharger les batteries après la nuit.', `
Après une nuit de jeûne, ton corps a besoin de carburant pour l’école **et** l’entraînement du soir.

## Un bon petit-déj contient
- **Des glucides** : pain complet, flocons d’avoine, muesli peu sucré
- **Une protéine** : yaourt, fromage blanc, lait, œuf
- **Un fruit** (ou jus 100 % fruit)
- **De l’eau**, un thé ou un lait

## Idées rapides (5 minutes)
- Bircher : flocons d’avoine + yaourt + pomme râpée (préparé la veille)
- Tartines de pain complet + fromage + une banane
- Porridge au lait + fruits rouges + quelques noix

Pas faim le matin ? Commence petit (un yaourt et une banane) et prends une collation à la récré.
`),
  t('avant', 'Nutrition', '⏰', 'Que manger avant l’entraînement ?', 'Avoir de l’énergie sans avoir le ventre lourd.', `
## 2 à 3 heures avant
Un vrai repas avec des féculents, peu gras et pas trop riche en fibres : pâtes, riz, pain + une protéine + légumes cuits.

## 30 à 60 minutes avant (si tu as faim)
Une petite collation facile à digérer :
- une banane
- une barre de céréales ou une compote
- quelques biscuits secs ou une tranche de pain d’épices

## À éviter juste avant
- Les plats gras (frites, fast-food)
- Les grandes quantités
- Les boissons énergisantes

Le soir après l’école, l’entraînement arrive souvent loin du repas de midi : **prévois toujours une collation dans ton sac** vers 16 h.
`),
  t('apres', 'Nutrition', '🔋', 'Bien récupérer en mangeant', 'La fenêtre après la séance compte autant que la séance.', `
Après l’effort, tes muscles ont besoin de **glucides** (refaire le plein d’énergie) et de **protéines** (se réparer).

## Dans l’heure qui suit
- Un verre de lait chocolaté (un classique très efficace)
- Un yaourt + une banane
- Un sandwich jambon / fromage / thon

## Puis le repas du soir
Un repas complet selon la méthode de l’assiette. Ne le saute pas, même s’il est tard.

💡 Inutile d’acheter des poudres de protéines : une alimentation normale et variée couvre largement tes besoins.
`),
  t('collations', 'Nutrition', '🍎', 'Collations malines', 'Des idées faciles à glisser dans le sac.', `
Les collations évitent d’arriver « à vide » à l’entraînement et complètent tes repas.

## À avoir dans le sac
- Fruits (banane, pomme, abricots secs)
- Une poignée de noix ou d’amandes
- Barre de céréales, pain d’épices
- Yaourt à boire, petit fromage
- Pain + chocolat (oui oui !)

## Moins intéressant au quotidien
Chips, sodas, bonbons : ce n’est pas interdit, mais ça cale peu et n’apporte pas grand-chose à tes muscles.
`),
  t('hydratation', 'Hydratation', '💧', 'Bien s’hydrater', 'Boire avant d’avoir soif.', `
Une perte d’eau de seulement 2 % de ton poids peut déjà faire baisser tes performances et ta concentration.

## Au quotidien
- Environ **1,5 à 2 litres** par jour, plus quand il fait chaud
- Garde une **gourde** avec toi à l’école
- Indicateur simple : une urine claire = bien hydraté·e ; foncée = bois davantage

## Pendant l’entraînement
- Quelques gorgées toutes les 15–20 minutes
- L’eau suffit pour les séances de moins d’une heure
- Pour les séances longues ou par grosse chaleur : eau + un peu de sirop ou boisson isotonique

## Les boissons énergisantes
Elles contiennent beaucoup de caféine et de sucre : palpitations, troubles du sommeil, nervosité. **À éviter**, surtout avant ou après le sport.
`),
  t('sommeil', 'Sommeil', '😴', 'Le sommeil, ton meilleur coéquipier', 'C’est pendant la nuit que tu progresses.', `
C’est en dormant que ton corps **récupère, grandit et fixe les progrès** de l’entraînement. Entre 15 et 18 ans, il faut en moyenne **8 à 10 heures** par nuit.

## Les signes d’un manque de sommeil
- Fatigue en journée, difficulté à se concentrer
- Moins de vitesse et de coordination
- Plus de blessures et de petits rhumes
- Humeur en dents de scie

## Pour mieux dormir
- Des heures de coucher et de lever **régulières**, même le week-end (± 1 h)
- Une chambre **sombre, calme et fraîche**
- Pas de repas lourd juste avant de dormir
- Pas de caféine (café, thé noir, cola, boissons énergisantes) après 16 h
- Une petite sieste de 20 minutes peut aider, mais pas après 17 h
`),
  t('ecrans', 'Sommeil', '📱', 'Écrans et sommeil', 'Le téléphone, ennemi n°1 de tes nuits.', `
La lumière des écrans et les notifications retardent l’endormissement et rendent le sommeil moins profond.

## Le défi « 30 minutes sans écran »
- Pose ton téléphone **30 à 60 minutes avant de dormir**
- Laisse-le **hors de la chambre** ou loin du lit (achète un petit réveil 😉)
- Active le mode « Ne pas déranger » la nuit
- Remplace par : lecture, musique calme, douche chaude, étirements doux

Essaie une semaine et note dans ton check-in comment tu dors : tu verras la différence !
`),
  t('recup', 'Récupération', '🧘', 'Récupérer entre les séances', 'Progresser, c’est s’entraîner ET récupérer.', `
L’entraînement fatigue, c’est la **récupération** qui te rend plus fort·e. Sans repos, tu stagnes et tu te blesses.

## Les piliers
1. **Le sommeil** (le plus important)
2. **L’alimentation** et l’hydratation après l’effort
3. **Le retour au calme** : footing lent, marche, mobilité
4. **Au moins 1 jour de repos complet** par semaine

## Écoute ton corps
Si pendant plusieurs jours tu te sens très fatigué·e, sans envie, avec des courbatures qui ne passent pas : dis-le à ton entraîneur (et note-le dans tes retours). On adaptera la charge.
`),
  t('prevention', 'Prévention', '🩹', 'Douleurs : quand faut-il s’inquiéter ?', 'Courbature ou blessure ? Apprends à faire la différence.', `
## Courbatures (normales)
- Apparaissent 24–48 h après une séance inhabituelle
- Diffuses, dans les deux jambes
- Disparaissent en 2–3 jours

## Signaux d’alerte (à signaler)
- Douleur **localisée** et précise (un point qui fait mal)
- Douleur qui **augmente pendant l’effort** ou qui te fait boiter
- Douleur qui revient à chaque séance ou qui dure plus d’une semaine
- Gonflement, craquement, douleur la nuit

## Que faire ?
- **Ne force pas** et préviens ton entraîneur (tu peux le noter dans ton retour)
- En cas de doute, consulte un médecin ou un physio
- Ta croissance rend certaines zones fragiles (genoux, talons, dos) : une douleur qui traîne n’est jamais « normale »
`),
  t('echauffement', 'Prévention', '🔥', 'Pourquoi l’échauffement est obligatoire', '15 minutes qui évitent des semaines d’arrêt.', `
L’échauffement prépare tes muscles, tendons, articulations **et ton cerveau** à l’effort.

## Un bon échauffement
1. **5–10 min de footing** léger
2. **Mobilité** : chevilles, hanches, épaules
3. **Gammes** : montées de genoux, talons-fesses, skipping
4. **Accélérations progressives**

Avant une compétition, garde le même échauffement qu’à l’entraînement : pas de surprise le jour J.
`),
  t('stress', 'Mental', '🧠', 'Gérer le stress avant une compétition', 'Le trac, c’est normal — et ça s’apprivoise.', `
Le stress avant une course ou un concours est **normal** : c’est ton corps qui se prépare. L’objectif n’est pas de le supprimer mais de le canaliser.

## La respiration 4-6
Inspire par le nez pendant 4 secondes, expire lentement par la bouche pendant 6 secondes. Répète 5 fois. Ça calme le cœur en une minute.

## Avant la compétition
- Prépare ton sac **la veille** (liste !)
- Visualise ta course ou ton saut, du début à la fin
- Concentre-toi sur **ce que tu contrôles** : ton échauffement, ta technique, ton attitude — pas sur les adversaires

## Après
Note ce qui a bien marché et ce que tu veux améliorer. Un résultat ne définit pas ta valeur.
`),
  t('ecole', 'Hygiène de vie', '📚', 'Concilier école et sport', 'S’organiser pour tout faire sans s’épuiser.', `
## Quelques astuces
- Utilise un **agenda** (ou ton téléphone) pour voir tes entraînements, examens et devoirs sur la semaine
- Fais les devoirs **avant** l’entraînement quand c’est possible, ou dans les transports
- Préviens ton entraîneur en période d’examens : on peut alléger la charge
- Garde du temps pour tes amis et le repos : le sport doit rester un plaisir

Le sport aide à mieux se concentrer à l’école. Mais si tu te sens débordé·e, parles-en : il y a toujours des solutions.
`),
  t('substances', 'Hygiène de vie', '🚭', 'Alcool, tabac, vape et performance', 'Ce qu’ils font vraiment à ton corps.', `
## Tabac et vape
La nicotine et la fumée réduisent l’oxygène transporté par ton sang : moins d’endurance, récupération plus lente. La nicotine crée une dépendance très rapidement.

## Alcool
Il déshydrate, perturbe le sommeil, ralentit la récupération musculaire et augmente le risque de blessure. Les effets se font sentir **jusqu’à plusieurs jours** après.

## Boissons énergisantes
Beaucoup de caféine et de sucre : nervosité, palpitations, mauvais sommeil.

Tu as des questions ou tu veux en parler en toute confidentialité ? Tu peux t’adresser à ton médecin ou à des services comme ciao.ch.
`),
  t('complements', 'Nutrition', '💊', 'Compléments alimentaires : en as-tu besoin ?', 'Spoiler : très probablement pas.', `
Les poudres de protéines, « brûleurs de graisse » et autres compléments sont très présents sur les réseaux sociaux. Pour un·e jeune athlète, **une alimentation variée suffit**.

## Pourquoi se méfier
- Ils n’apportent rien de plus qu’une alimentation équilibrée
- Certains produits achetés en ligne contiennent des **substances interdites** (dopage) non indiquées sur l’étiquette
- Ils coûtent cher

## Exceptions
Une carence (fer, vitamine D…) se détecte par une prise de sang **chez le médecin**, qui décidera d’un éventuel traitement. Ne prends jamais rien sans son avis.
`),
  t('energie', 'Nutrition', '⚖️', 'Assez d’énergie pour grandir et performer', 'Manger suffisamment, c’est aussi protéger sa santé.', `
Quand on dépense beaucoup d’énergie à l’entraînement sans manger assez, le corps se met en « mode économie ». Les médecins du sport appellent ça le **déficit énergétique relatif (RED-S)**. Il touche les filles comme les garçons.

## Les signes possibles
- Fatigue persistante, baisse de performance
- Blessures à répétition, fractures de fatigue
- Chez les filles : règles irrégulières ou qui s’arrêtent (ce n’est **jamais** normal chez une sportive)
- Avoir souvent froid, être irritable, penser beaucoup à la nourriture ou au poids

## Ce qu’il faut retenir
- Ton poids et ta silhouette changent pendant l’adolescence : c’est normal
- La performance vient de l’entraînement, du sommeil et d’une alimentation suffisante, pas d’un poids « idéal »
- Si tu te reconnais dans ces signes, parles-en à ton entraîneur, à un adulte de confiance ou à un médecin
`),
  t('jourj', 'Compétition', '🏅', 'Le jour de la compétition', 'Ta check-list pour être prêt·e.', `
## La veille
- Repas habituel riche en féculents (pas de nouveauté !)
- Sac prêt : licence, dossard/épingles, pointes et clé, tenue du club, gourde, collations, vêtements chauds
- Au lit à l’heure habituelle

## Le jour J
- Dernier repas **3 h avant** l’épreuve ; collation légère 1 h avant si besoin
- Arrive tôt pour repérer les lieux et confirmer ton inscription
- Échauffement comme à l’entraînement, 30–45 min avant
- Entre les épreuves : boire, manger un peu, rester au chaud

## Après
Récupération (boisson, collation), retour au calme, puis note ta perf dans **Mes records** si c’est un nouveau record 🎉
`),
]
