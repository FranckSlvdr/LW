import type { Locale } from '@/lib/i18n/config'

export function getDesertStormMessages(locale: Locale) {
  const isFrench = locale === 'fr'

  return {
    manage: {
      registered: isFrench ? 'inscrits' : 'registered',
      absent: isFrench ? 'absent' : 'absent',
      starters: isFrench ? 'Titulaires' : 'Starters',
      substitutes: isFrench ? 'Remplacants' : 'Substitutes',
      noPlayer: isFrench ? 'Aucun joueur inscrit' : 'No registered player',
      choosePlayer: isFrench ? 'Choisir un joueur...' : 'Choose a player...',
      add: isFrench ? 'Ajouter' : 'Add',
      addPlayer: isFrench ? '+ Ajouter un joueur' : '+ Add a player',
      maxReached: isFrench ? 'Capacite max atteinte' : 'Maximum capacity reached',
      present: isFrench ? 'Present' : 'Present',
      absentBadge: isFrench ? 'Absent' : 'Absent',
      remove: isFrench ? 'Retirer' : 'Remove',
      top3Empty: '—',
      top3Labels: isFrench ? { '': '—', '1': '1er', '2': '2e', '3': '3e' } : { '': '—', '1': '1st', '2': '2nd', '3': '3rd' },
      error: isFrench ? 'Erreur' : 'Error',
    },
    scores: {
      title: isFrench ? 'Saisie des scores' : 'Score entry',
      subtitle: isFrench ? 'Entrez les scores Desert Storm de chaque joueur pour cette semaine' : 'Enter each player Desert Storm score for this week',
      current: isFrench ? 'Actuel' : 'Current',
      saving: isFrench ? 'Sauvegarde...' : 'Saving...',
      save: isFrench ? 'Sauvegarder tous les scores' : 'Save all scores',
      retry: isFrench ? 'Reessayer' : 'Retry',
      saveError: isFrench ? 'Erreur lors de la sauvegarde' : 'Failed to save scores',
      unknownError: isFrench ? 'Erreur inconnue' : 'Unknown error',
      saveSummary: (success: number, failed: number, reason: string) => isFrench
        ? `⚠️ ${success} sauvegarde${success > 1 ? 's' : ''}, ${failed} erreur${failed > 1 ? 's' : ''} - ${reason}`
        : `⚠️ ${success} saved, ${failed} error${failed > 1 ? 's' : ''} - ${reason}`,
      saveSuccess: (count: number) => isFrench
        ? `✅ ${count} score${count > 1 ? 's' : ''} sauvegarde${count > 1 ? 's' : ''}`
        : `✅ ${count} score${count > 1 ? 's' : ''} saved`,
    },
  }
}
