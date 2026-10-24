import type { Feedback, Message } from '../types'

export const threadKey = (assignmentId: string, athleteId: string) => `${assignmentId}|${athleteId}`
export const threadOf = (messages: Message[], assignmentId: string, athleteId: string) =>
  messages.filter((m) => m.assignment_id === assignmentId && m.athlete_id === athleteId).sort((a, b) => a.created_at.localeCompare(b.created_at))

/** Messages non lus par le coach (écrits par les athlètes) */
export const unreadByCoach = (messages: Message[]) => messages.filter((m) => !m.from_coach && !m.read_at)
/** Messages non lus par l'athlète (écrits par un coach) */
export const unreadByAthlete = (messages: Message[]) => messages.filter((m) => m.from_coach && !m.read_at)

/** Retours avec un commentaire ou une douleur, encore sans réponse du coach */
export const feedbackToAnswer = (feedback: Feedback[], messages: Message[]) =>
  feedback.filter((f) => (f.comment || f.pain) && !f.coach_reply
    && !messages.some((m) => m.from_coach && m.assignment_id === f.assignment_id && m.athlete_id === f.athlete_id))

/** Un retour mérite-t-il de prévenir le coach ? (commentaire, douleur, forte fatigue ou effort) */
export const feedbackWorthNotice = (f: Pick<Feedback, 'comment' | 'pain' | 'fatigue' | 'rpe'>) =>
  !!(f.comment?.trim() || f.pain?.trim() || (f.fatigue ?? 0) >= 4 || (f.rpe ?? 0) >= 9)
