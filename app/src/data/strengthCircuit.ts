import type {Block} from '../types'
import {uid,emptyItem} from '../lib/utils'
/** Circuit transcrit et précisé par le coach ; aucune dose ajoutée aux dessins. */
export function confirmedStrengthCircuit():Block{
 const definitions=[
 ['Abdominaux croisés, coude vers genou opposé','G1 · Rapprocher le coude du genou opposé selon la position illustrée.'],
 ['Relevé de buste vers les pieds, jambes relevées','G2 · Sur le dos, jambes relevées ; rapprocher le haut du buste des pieds.'],
 ['Remontée de bassin','G3 · Mouvement confirmé par le coach : remontée de bassin avec un pied sur le banc. Modalités techniques à montrer.'],
 ['Enroulement du buste au sol','G4 · Sur le dos, genoux fléchis ; relever puis reposer le haut du buste.'],
 ['Extensions du tronc sur banc, jambes maintenues','G5 · Position représentée avec un partenaire maintenant les jambes. Amplitude à montrer par le coach.'],
 ['Gainage latéral avec élévation du bassin','G6 · Élever puis abaisser le bassin en appui latéral. Appui du bras à préciser.'],
 ['Gainage ventral en appui sur les avant-bras','G7 · Position de maintien sur avant-bras et pointes de pieds.'],
 ['Rotation avec blocage du tronc','G8 · Mouvement confirmé par le coach : rotation avec blocage du tronc, assis jambes relevées, avec partenaire. Modalité de blocage et amplitude à montrer avant utilisation.'],
 ]
 return{id:uid(),title:'Renforcement illustré — circuit commun',items:definitions.map(([name,notes])=>({...emptyItem(name),notes:notes+' Tours, répétitions, durée, récupération et intensité à définir.'}))}
}
