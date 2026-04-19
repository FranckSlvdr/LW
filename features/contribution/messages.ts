import type { Locale } from '@/lib/i18n/config'

export function getContributionMessages(locale: Locale) {
  const isFrench = locale === 'fr'

  return {
    lockedWeek: isFrench ? 'Semaine verrouillee : les saisies manuelles sont bloquees.' : 'Locked week: manual entries are disabled.',
    activeWeekOnly: isFrench ? 'Les saisies manuelles sont autorisees uniquement sur la semaine active.' : 'Manual entries are only allowed for the active week.',
    form: {
      title: isFrench ? 'Saisie des contributions' : 'Contribution entry',
      subtitle: isFrench ? 'Montant de contribution de chaque joueur pour cette semaine' : 'Contribution amount for each player this week',
      current: isFrench ? 'Actuel' : 'Current',
      notePlaceholder: isFrench ? 'Note (optionnel)' : 'Note (optional)',
      saving: isFrench ? 'Sauvegarde...' : 'Saving...',
      save: isFrench ? 'Sauvegarder' : 'Save',
      retry: isFrench ? 'Reessayer' : 'Retry',
      saveError: isFrench ? 'Erreur lors de la sauvegarde' : 'Failed to save contributions',
      unknownError: isFrench ? 'Erreur inconnue' : 'Unknown error',
      saveSummary: (success: number, failed: number, reason: string) => isFrench
        ? `⚠️ ${success} sauvegardee${success > 1 ? 's' : ''}, ${failed} erreur${failed > 1 ? 's' : ''} - ${reason}`
        : `⚠️ ${success} saved, ${failed} error${failed > 1 ? 's' : ''} - ${reason}`,
      saveSuccess: (count: number) => isFrench
        ? `✅ ${count} contribution${count > 1 ? 's' : ''} sauvegardee${count > 1 ? 's' : ''}`
        : `✅ ${count} contribution${count > 1 ? 's' : ''} saved`,
    },
    table: {
      empty: isFrench ? 'Aucune contribution enregistree' : 'No contribution recorded',
      emptyHint: isFrench ? 'Saisissez les contributions via le formulaire ci-dessus' : 'Enter contributions using the form above',
      title: isFrench ? 'Classement des contributions' : 'Contribution ranking',
      rank: isFrench ? 'Rang' : 'Rank',
      player: isFrench ? 'Joueur' : 'Player',
      contribution: isFrench ? 'Contribution' : 'Contribution',
      amount: isFrench ? 'Montant' : 'Amount',
      note: isFrench ? 'Note' : 'Note',
      selectedTrain: isFrench ? '⭐ Selectionne train' : '⭐ Selected for train',
    },
  }
}
