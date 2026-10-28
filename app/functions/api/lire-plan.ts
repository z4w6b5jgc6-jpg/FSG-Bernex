// Privacy boundary: no document, profile or session text is sent to Workers AI.
export const onRequestPost = async () => new Response(JSON.stringify({
  error: 'IA externe désactivée. Les imports standards et la revue locale des cycles restent disponibles.',
}), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
