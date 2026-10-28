import {useEffect,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {api} from '../api'
import type {ClubInfo} from '../types'
import {PolicyDocument} from './Privacy'
export function PublicPrivacy(){const [params]=useSearchParams();const code=params.get('code')??'';const [club,setClub]=useState<ClubInfo|null|undefined>(undefined);useEffect(()=>{let active=true;api.clubByCode(code).then(c=>{if(active)setClub(c)}).catch(()=>{if(active)setClub(null)});return()=>{active=false}},[code]);return <main className="container"><h1>Information sur les données</h1>{club===undefined?<p>Chargement…</p>:club?.privacy?.published?<><h2>{club.name}</h2><PolicyDocument policy={club.privacy}/></>:<p className="alert warn">L’information n’est pas encore publiée pour ce lien. Contacte ton coach.</p>}<Link className="btn" to={`/rejoindre/${encodeURIComponent(code)}`}>Retour à l’inscription</Link></main>}
