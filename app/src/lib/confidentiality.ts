import type { PrivacyAcceptance } from '../types'
import type { PrivacySettings } from './settings'
export const DRAFT_PRIVACY: PrivacySettings = { organization: '', contact: '', address: '', version: '2027-1', published: false, retention_months: 12, health_retention_months: 3 }
export function healthConsent(athleteId: string, rows: PrivacyAcceptance[], policy?: PrivacySettings): boolean {
  if (!policy?.published) return false
  const latest = rows.filter((r) => r.athlete_id === athleteId && r.version === policy.version)
    .sort((a,b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id.localeCompare(a.id))[0]
  return latest?.health_consent === true
}
export function validatePrivacy(p: PrivacySettings): string | null {
  if (p.published && !(p.hosting_details ?? '').trim()) return 'Précise les lieux de traitement et les garanties avant publication.'
  if (!p.organization.trim() || !p.address.trim() || !/^\S+@\S+\.\S+$/.test(p.contact) || !p.version.trim()) return 'Complète le responsable du traitement, son adresse, son contact et la version.'
  if (![p.retention_months,p.health_retention_months].every((n) => Number.isInteger(n) && n > 0 && n <= 120)) return 'Choisis des durées de conservation entre 1 et 120 mois, à justifier et valider.'
  if (p.health_retention_months > p.retention_months) return 'La conservation du suivi de santé ne doit pas dépasser celle du suivi sportif.'
  return null
}
export function downloadData(name: string, value: unknown, mime='application/json') {
  const blob = new Blob([typeof value === 'string' ? value : JSON.stringify(value,null,2)], { type:mime })
  const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
/** Export chiffré sur l'appareil ; le mot de passe n'est pas transmis ni enregistré. */
export async function encryptExport(value: unknown, password: string): Promise<object> {
  if (password.length < 12) throw new Error('Utilise au moins 12 caractères pour protéger l’export.')
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12))
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey'])
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},material,{name:'AES-GCM',length:256},false,['encrypt'])
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)))
  const base64=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
  return {format:'coach-athle-encrypted-v1',kdf:'PBKDF2-SHA256',iterations:310000,salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(cipher))}
}
export async function decryptExport(value: Record<string,unknown>, password:string):Promise<unknown> {
  if(value.format!=='coach-athle-encrypted-v1'||value.iterations!==310000)throw new Error('Format d’export inconnu.')
  const bytes=(s:unknown)=>Uint8Array.from(atob(String(s)),c=>c.charCodeAt(0))
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey'])
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(value.salt),iterations:310000},material,{name:'AES-GCM',length:256},false,['decrypt'])
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(value.iv)},key,bytes(value.ciphertext))
  return JSON.parse(new TextDecoder().decode(plain))
}
