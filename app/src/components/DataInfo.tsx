/** Information courte sur les données (version légère) : affichée à l'inscription et dans « Confidentialité » */
export function DataInfo({ club }: { club?: string }) {
  return (
    <div className="card data-info small">
      <b>Tes données{club ? ` · ${club}` : ''}</b>
      <p><b>Lesquelles ?</b> Ton nom, ton année, ton groupe, tes contacts, tes séances, tes retours et tes résultats. Si tu le remplis, ton suivi de forme (sommeil, fatigue, douleurs).</p>
      <p><b>Pourquoi ?</b> Organiser les entraînements et les adapter à toi.</p>
      <p><b>Qui les voit ?</b> Toi et les coachs de ton groupe, personne d’autre. Les autres athlètes ne voient pas tes données.</p>
      <p><b>Où ?</b> Dans la base de données Supabase et sur le site Cloudflare. Aucune donnée personnelle n’est envoyée à une intelligence artificielle.</p>
      <p><b>Tes droits :</b> tu peux demander à ton coach de corriger ou de supprimer tes données à tout moment. Le suivi de forme est facultatif.</p>
    </div>
  )
}
