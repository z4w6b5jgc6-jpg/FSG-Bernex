import {unzipSync,strFromU8} from 'fflate'
import type {SessionIllustration} from '../types'
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const base64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
function mimeOf(b:Uint8Array):string|null{
 if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)return 'image/png'
 if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg'
 if(String.fromCharCode(...b.subarray(0,6)).match(/^GIF8[79]a$/))return 'image/gif'
 if(String.fromCharCode(...b.subarray(0,4))==='RIFF'&&String.fromCharCode(...b.subarray(8,12))==='WEBP')return 'image/webp'
 return null
}
/** Lecture locale uniquement ; ne suit aucun lien d’image externe au document. */
export function docxContent(data:ArrayBuffer):{lines:string[];images:Record<string,SessionIllustration>;warnings:string[]}{
 const warnings:string[]=[],files=unzipSync(new Uint8Array(data),{filter:f=>{
  const wanted=f.name==='word/document.xml'||f.name==='word/_rels/document.xml.rels'||/^word\/media\//.test(f.name)
  if(wanted&&f.originalSize>2*1024*1024){warnings.push(`Élément trop volumineux non lu : ${f.name}`);return false}return wanted
 }})
 if(!files['word/document.xml'])throw new Error('Document Word illisible ou XML trop volumineux.')
 const doc=new DOMParser().parseFromString(strFromU8(files['word/document.xml']),'application/xml')
 if(doc.querySelector('parsererror'))throw new Error('XML du document Word invalide.')
 const relations=new Map<string,string>()
 if(files['word/_rels/document.xml.rels']){
  const rel=new DOMParser().parseFromString(strFromU8(files['word/_rels/document.xml.rels']),'application/xml')
  for(const el of Array.from(rel.getElementsByTagName('Relationship'))){const target=el.getAttribute('Target')??'';if(el.getAttribute('TargetMode')!=='External'&&/^media\/[^/]+$/.test(target))relations.set(el.getAttribute('Id')??'','word/'+target)}
 }
 const lines:string[]=[],images:Record<string,SessionIllustration>={};let bytes=0
 for(const p of Array.from(doc.getElementsByTagNameNS(W,'p'))){
  let text=''
  const walk=(el:Element)=>{for(const c of Array.from(el.children)){if(c.namespaceURI!==W)continue;if(c.localName==='t')text+=c.textContent??'';else if(c.localName==='tab')text+='\t';else if(c.localName==='br'||c.localName==='cr')text+='\n';else if(!['pPr','rPr'].includes(c.localName))walk(c)}}
  walk(p)
  const bullet=p.getElementsByTagNameNS(W,'numPr').length>0
  for(const line of text.split('\n'))if(line.trim())lines.push((bullet?'• ':'')+line)
  const refs=[...Array.from(p.getElementsByTagNameNS(A,'blip')).map(el=>el.getAttributeNS(R,'embed')), ...Array.from(p.getElementsByTagNameNS('urn:schemas-microsoft-com:vml','imagedata')).map(el=>el.getAttributeNS(R,'id'))]
  for(const ref of refs){const source=relations.get(ref??''),b=source&&files[source];if(!b){warnings.push('Une illustration liée ou non prise en charge reste à consulter dans le Word.');continue}
   const mime=mimeOf(b);if(!mime||b.length>512*1024||bytes+b.length>2*1024*1024){warnings.push(`Illustration non intégrée (format ou taille) : ${source}`);continue}
   bytes+=b.length;const id=`image-${Object.keys(images).length+1}`;images[id]={id,dataUrl:`data:${mime};base64,${base64(b)}`,caption:'Illustration originale du document ; transcription des mouvements à vérifier.',sourceName:source!};lines.push(`[[ILLUSTRATION:${id}]]`)
  }
 }
 return{lines,images,warnings:[...new Set(warnings)]}
}

/** Compte les médias du classeur sans décompresser leurs pixels. */
export function spreadsheetImageCount(data:ArrayBuffer):number{let count=0;unzipSync(new Uint8Array(data),{filter:f=>{if(/^xl\/media\//.test(f.name))count++;return false}});return count}
