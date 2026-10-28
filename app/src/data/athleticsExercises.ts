import type { Exercise } from '../types'
import { DEFAULT_EXERCISES } from './defaults'

/** Descriptive exercise library, not a prescribed programme or a claim of optimal transfer.
 * No fixed loads, volumes or intensities: those are entered by the coach. */
export const ATHLETICS_STRENGTH = [
  ['Goblet squat', 'Haltère ou kettlebell tenu devant le buste. Descendre en gardant les pieds stables et les genoux dans leur axe ; amplitude adaptée au contrôle.'],
  ['Squat avec barre', 'Barre et supports sécurisés. Maintenir le tronc stable et une trajectoire contrôlée. Apprentissage et charge supervisés par le coach.'],
  ['Fente arrière', 'Reculer un pied et fléchir les jambes en gardant le bassin stable. Revenir avec contrôle sur la jambe avant.'],
  ['Split squat', 'Pieds décalés, fléchir puis tendre les jambes sans perdre l’alignement du genou avant. Appui de la main possible pendant l’apprentissage.'],
  ['Montée sur banc', 'Monter sur un support stable avec un pied, contrôler le bassin puis la descente. Hauteur et charge choisies par le coach.'],
  ['Soulevé de terre roumain', 'Reculer les hanches en gardant la charge près des jambes et le tronc stable. Arrêter la descente à l’amplitude maîtrisée.'],
  ['Charnière de hanche sur une jambe', 'Incliner le buste depuis la hanche sur un appui, bassin contrôlé. Utiliser un support si nécessaire avant d’ajouter une charge.'],
  ['Hip thrust', 'Haut du dos sur un banc stable, pieds au sol. Étendre les hanches sans accentuer la cambrure lombaire.'],
  ['Pont fessier au sol', 'Allongé sur le dos, pieds au sol. Relever le bassin en contrôlant les hanches, puis redescendre.'],
  ['Flexion des jambes avec serviettes', 'Sur un sol adapté, talons sur des serviettes ou patins. Fléchir et étendre les jambes en gardant le bassin contrôlé.'],
  ['Nordic ischio-jambiers assisté', 'À genoux sur un tapis, chevilles maintenues et assistance disponible. Incliner le corps avec contrôle dans une amplitude maîtrisée. Exercice à apprendre avec le coach.'],
  ['Élévation de mollets debout', 'Monter sur l’avant-pied puis redescendre avec contrôle, genou tendu sans verrouillage forcé. Un support aide l’équilibre.'],
  ['Élévation de mollets assis', 'Assis, pieds stables, relever les talons puis redescendre avec contrôle. Installation et charge validées par le coach.'],
  ['Relevé de pointe de pied', 'Talons au sol, relever l’avant-pied avec contrôle. Se placer près d’un support stable.'],
  ['Tirage horizontal avec élastique', 'Élastique fixé sur un ancrage adapté. Tirer les coudes vers l’arrière sans basculer le tronc.'],
  ['Traction assistée', 'Sur une barre sécurisée, tirer sans élan avec une assistance adaptée. Contrôler la descente.'],
  ['Développé avec haltères au sol', 'Allongé sur le dos, pousser les haltères avec contrôle. Garder les appuis et le tronc stables.'],
  ['Rotation externe avec élastique', 'Coude près du corps, faire tourner l’avant-bras vers l’extérieur sans déplacer le tronc. Résistance et amplitude adaptées.'],
  ['Pallof press', 'Debout de côté à un élastique fixé, tendre les bras devant soi en résistant à la rotation du tronc.'],
  ['Dead bug', 'Allongé sur le dos, déplacer un bras et la jambe opposée en conservant le contrôle du bassin et du tronc.'],
  ['Gainage latéral', 'En appui sur l’avant-bras, aligner le tronc et le bassin. Adapter la position des jambes au contrôle disponible.'],
  ['Porté de charge unilatéral', 'Marcher avec une charge d’un côté, tronc stable et épaules contrôlées. Prévoir un espace dégagé.'],
  ['Lancer de médecine-ball depuis la poitrine', 'Pousser le médecine-ball à deux mains vers une zone ou un mur adapté. Vérifier l’espace et le matériel avant le lancer.'],
  ['Lancer de médecine-ball en rotation', 'Tourner les hanches et le tronc pour lancer latéralement vers une zone sécurisée. Engin et amplitude adaptés par le coach.'],
].map(([name, description]) => ({ name, category: 'Musculation', description }))

const key = (name: string) => name.trim().toLocaleLowerCase('fr')
export const EXERCISE_CATALOG: Exercise[] = [...DEFAULT_EXERCISES, ...ATHLETICS_STRENGTH].map((e, i) => ({...e, id: `catalog:${i}`}))
export const isCatalogExercise = (exercise: Exercise) => exercise.id.startsWith('catalog:')
/** Club entries replace the built-in description of the same name; no remote writes. */
export function exerciseLibrary(saved: Exercise[]): Exercise[] {
  const existing = new Set(saved.map(e => key(e.name)))
  return [...saved, ...EXERCISE_CATALOG.filter(e => !existing.has(key(e.name)))]
}
