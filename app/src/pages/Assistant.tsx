import { Link } from 'react-router-dom'
import { ChatPanel } from '../components/ChatPanel'

/** Assistant entraîneur : discussion libre avec l'IA (noms d'athlètes masqués avant l'envoi) */
export function Assistant() {
  return (
    <div>
      <h1>Assistant</h1>
      <p className="small muted">Pose une question ou demande une séance (période, météo, intention). Pour améliorer une séance existante : ouvre-la dans Séances, puis « Améliorer et ajuster avec l’IA » ou « Discuter et ajuster cette séance ».</p>
      <ChatPanel storageKey="athle-chat-general" />
      <p className="small"><Link to="/methodes">Méthodes et publications scientifiques →</Link></p>
    </div>
  )
}
