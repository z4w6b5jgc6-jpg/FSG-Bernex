export const EXTERNAL_AI_DISABLED = 'La lecture de documents par une IA externe reste désactivée. Les imports Excel et Word sont lus dans le navigateur. Pour analyser une séance ou en discuter, ouvre son éditeur et utilise l’assistant de séance.'
export function blockExternalAI(): never { throw new Error(EXTERNAL_AI_DISABLED) }
