export const CATEGORIES = [
  'Échauffement',
  'Gammes / éducatifs',
  'Vitesse',
  'Endurance',
  'Haies',
  'Sauts',
  'Lancers',
  'Renforcement',
  'Musculation',
  'Mobilité / étirements',
  'Jeux',
  'Autre',
]

export const FOCUSES = [
  'Vitesse',
  'Endurance',
  'Haies',
  'Sauts',
  'Lancers',
  'Renforcement',
  'Musculation',
  'Technique',
  'Multi-disciplines',
  'Compétition',
  'Récupération',
]

export const DEFAULT_EXERCISES: { name: string; category: string; description: string }[] = [
  { name: 'Footing léger', category: 'Échauffement', description: 'Course lente en aisance respiratoire.' },
  { name: 'Mobilisation articulaire', category: 'Échauffement', description: 'Chevilles, genoux, hanches, épaules, nuque.' },
  { name: 'Montées de genoux', category: 'Gammes / éducatifs', description: 'Genoux à l’horizontale, appuis sur l’avant du pied, buste droit.' },
  { name: 'Talons-fesses', category: 'Gammes / éducatifs', description: 'Talons qui montent sous les fesses, fréquence élevée.' },
  { name: 'Skipping', category: 'Gammes / éducatifs', description: 'Petites foulées rapides, pied actif sous le centre de gravité.' },
  { name: 'Pas chassés', category: 'Gammes / éducatifs', description: 'Déplacements latéraux, bras actifs.' },
  { name: 'Foulées bondissantes', category: 'Gammes / éducatifs', description: 'Recherche d’amplitude et de temps de vol.' },
  { name: 'Lignes droites', category: 'Vitesse', description: 'Accélérations progressives sur 60–80 m.' },
  { name: 'Départs en position', category: 'Vitesse', description: 'Départs debout / 3 appuis / blocs, réaction au signal.' },
  { name: 'Sprint lancé', category: 'Vitesse', description: 'Zone d’élan puis vitesse maximale sur la distance indiquée.' },
  { name: 'Course en côte', category: 'Vitesse', description: 'Sprints courts en montée, retour en marchant.' },
  { name: 'Fractionné court', category: 'Endurance', description: 'Ex. 30"/30" à allure soutenue.' },
  { name: 'Fractionné long', category: 'Endurance', description: 'Répétitions de 400 m à 1000 m.' },
  { name: 'Footing continu', category: 'Endurance', description: 'Course continue à allure modérée.' },
  { name: 'Fartlek', category: 'Endurance', description: 'Variations d’allure libres pendant la course.' },
  { name: 'Éducatifs de haies (jambe d’attaque)', category: 'Haies', description: 'Passage de la jambe d’attaque, haies basses.' },
  { name: 'Éducatifs de haies (jambe d’esquive)', category: 'Haies', description: 'Travail de la jambe d’esquive le long des haies.' },
  { name: 'Rythme 3 appuis entre haies', category: 'Haies', description: 'Haies basses rapprochées, régularité du rythme.' },
  { name: 'Multibonds', category: 'Sauts', description: 'Bonds enchaînés pied droit / pied gauche.' },
  { name: 'Élan réduit en longueur', category: 'Sauts', description: '6 à 8 foulées d’élan, impulsion et réception.' },
  { name: 'Ciseaux en hauteur', category: 'Sauts', description: 'Impulsion pied extérieur, travail de la course en courbe.' },
  { name: 'Sauts de haies basses', category: 'Sauts', description: 'Pieds joints, réactivité au sol.' },
  { name: 'Lancer de médecine-ball', category: 'Lancers', description: 'Lancers avant / arrière / rotation.' },
  { name: 'Poussée de poids', category: 'Lancers', description: 'Poussée depuis le cou, coude haut.' },
  { name: 'Lancer de vortex / javelot', category: 'Lancers', description: 'Lancer en ligne, bras au-dessus de l’épaule.' },
  { name: 'Répétitions à allure 800 m', category: 'Endurance', description: 'Ex. 4 × 300 m à l’allure cible du 800 m, récup 3–4 min.' },
  { name: 'Seuil / tempo run', category: 'Endurance', description: '10 à 20 min à allure « confortablement difficile ».' },
  { name: 'Côtes longues', category: 'Endurance', description: 'Montées de 150–200 m, retour en trottinant.' },
  { name: 'Poussée de poids en rotation', category: 'Lancers', description: 'Travail de la rotation et du placement du bloc gauche.' },
  { name: 'Éducatifs de disque', category: 'Lancers', description: 'Lâchers, demi-tour, tour complet sans engin puis avec.' },
  { name: 'Lancers de médecine-ball spécifiques', category: 'Lancers', description: 'Lancers latéraux en rotation, enchaînés.' },
  { name: 'Gainage', category: 'Renforcement', description: 'Face, côtés, dos. Corps aligné.' },
  { name: 'Squats', category: 'Renforcement', description: 'Dos droit, genoux dans l’axe des pieds.' },
  { name: 'Fentes', category: 'Renforcement', description: 'Fentes avant ou marchées.' },
  { name: 'Pompes', category: 'Renforcement', description: 'Corps gainé, adaptées sur les genoux si besoin.' },
  { name: 'Étirements', category: 'Mobilité / étirements', description: 'Étirements doux, 20–30 s par muscle.' },
  { name: 'Retour au calme', category: 'Mobilité / étirements', description: 'Footing très lent puis marche.' },
  { name: 'Relais / jeu de poursuite', category: 'Jeux', description: 'Jeu ludique pour la réactivité et la vitesse.' },
]

export interface TestTemplate { name: string; unit: string; higher_is_better: boolean; category: string; description: string }

/** Batterie de tests du groupe (proposée par défaut, modifiable dans l'app) */
export const DEFAULT_TESTS: TestTemplate[] = [
  { name: '20 m lancé', unit: 's', higher_is_better: false, category: 'Vitesse', description: '20 m d’accélération + 20 m chronométrés. Deux essais séparés d’environ 5 min ; troisième essai si l’écart dépasse 3 %.' },
  { name: '30 m lancé', unit: 's', higher_is_better: false, category: 'Vitesse', description: 'Zone d’élan puis 30 m chronométrés. Même élan à chaque test pour pouvoir comparer.' },
  { name: '40 m départ arrêté', unit: 's', higher_is_better: false, category: 'Vitesse', description: 'Départ arrêté (debout ou 3 appuis, toujours le même), chrono au premier mouvement.' },
  { name: 'Monobond', unit: 'm', higher_is_better: true, category: 'Bondissement', description: 'Un bond depuis l’arrêt, pieds joints. Meilleur de 3 essais.' },
  { name: 'Triple bond', unit: 'm', higher_is_better: true, category: 'Bondissement', description: '3 bonds enchaînés depuis l’arrêt. Meilleur de 2–3 essais.' },
  { name: 'Pentabond', unit: 'm', higher_is_better: true, category: 'Bondissement', description: '5 bonds enchaînés depuis l’arrêt. Meilleur de 2 essais.' },
  { name: 'Décabond', unit: 'm', higher_is_better: true, category: 'Bondissement', description: '10 bonds enchaînés depuis l’arrêt.' },
  { name: 'Test VMA', unit: 'km/h', higher_is_better: true, category: 'Endurance', description: 'Vitesse du dernier palier complété (VAMEVAL, Léger ou équivalent – toujours le même protocole).' },
]

/** Tests complémentaires proposés (lancers, demi-fond) */
export const EXTRA_TESTS: TestTemplate[] = [
  { name: 'Médecine-ball arrière (3 kg)', unit: 'm', higher_is_better: true, category: 'Lancers', description: 'Dos à la zone, lancer par-dessus la tête, pieds au sol.' },
  { name: 'Médecine-ball avant (3 kg)', unit: 'm', higher_is_better: true, category: 'Lancers', description: 'Face à la zone, lancer à deux mains depuis la poitrine.' },
  { name: '600 m', unit: 's', higher_is_better: false, category: 'Endurance', description: 'Chrono en secondes (ex. 1\'45 = 105 s).' },
  { name: '1000 m', unit: 's', higher_is_better: false, category: 'Endurance', description: 'Chrono en secondes (ex. 3\'05 = 185 s).' },
  { name: 'Gainage ventral', unit: 's', higher_is_better: true, category: 'Force', description: 'Tenue maximale en position correcte.' },
]

/** Lieux d'entraînement du groupe (proposés dans les champs « Lieu ») */
export const VENUES = ['Evaux', 'Pavillon des sports au Bout-du-Monde']
/** Anciens libellés proposés par l'app, remplacés lors d'une mise à jour */
export const OLD_VENUES = ['École de Cressy', 'Stade des Evaux', 'Pavillon des sports du Bout-du-Monde']
