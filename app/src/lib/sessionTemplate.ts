import { writeXlsx } from './xlsx'

/** Modèle généré localement au clic : indépendant du routage et du cache des fichiers statiques. */
export function sessionTemplate(): Uint8Array {
  return writeXlsx([{name:'Détail',rows:[
    ['Date','Séance','Cycle','Phase','Bloc','Exercice','Séries','Répétitions','Distance','Durée','Récupération','Intensité','Consignes'],
    [null,'Ma séance',null,null,'Échauffement','Exercice à renseigner',null,null,null,null,null,null,'Exemple à remplacer : renseigner uniquement les valeurs prévues.'],
  ]},{name:'Guide',rows:[['Champ','Utilisation'],['Séance','Même titre et même date pour regrouper les exercices. Une ligne par exercice.'],['Date','Date Excel ou AAAA-MM-JJ. Facultative pour une séance de bibliothèque.'],['Dosages','Laisser vides les valeurs inconnues ; aucun dosage n’est déduit.'],['Import','Vérifier l’aperçu. La planification et les destinataires sont choisis dans l’application.']]}])
}
