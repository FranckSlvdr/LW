import type { Locale } from '@/lib/i18n/config'

export function getWeeksMessages(locale: Locale) {
  const isFrench = locale === 'fr'

  return {
    title: isFrench ? 'Gestion des semaines VS' : 'VS week management',
    subtitle: isFrench ? 'Creer, verrouiller ou cloturer une semaine' : 'Create, lock, or close a week',
    nextWeek: isFrench ? 'Semaine suivante' : 'Next week',
    startsOn: isFrench ? 'Debute le' : 'Starts on',
    creating: isFrench ? 'Creation...' : 'Creating...',
    create: isFrench ? '+ Creer' : '+ Create',
    closingTitle: isFrench ? 'Cloture de semaine' : 'Week closing',
    closingHint: (label: string, nextMonday: string) => isFrench
      ? `Verrouille ${label} puis cree la semaine du ${nextMonday}`
      : `Locks ${label} then creates the week starting on ${nextMonday}`,
    closing: isFrench ? 'Cloture...' : 'Closing...',
    closeAndAdvance: isFrench ? 'Clore et avancer' : 'Close and advance',
    loading: isFrench ? 'Chargement...' : 'Loading...',
    empty: isFrench ? 'Aucune semaine disponible.' : 'No week available.',
    active: isFrench ? 'Active' : 'Active',
    locked: isFrench ? 'Verrouillee' : 'Locked',
    unlockTitle: isFrench ? 'Deverrouiller' : 'Unlock',
    lockTitle: isFrench ? 'Verrouiller' : 'Lock',
    open: isFrench ? 'Ouvrir' : 'Open',
    lock: isFrench ? 'Verrouiller' : 'Lock',
    errors: {
      load: isFrench ? 'Erreur chargement semaines' : 'Failed to load weeks',
      create: isFrench ? 'Erreur creation' : 'Failed to create week',
      lock: isFrench ? 'Erreur verrouillage' : 'Failed to update lock state',
      unknown: isFrench ? 'Erreur inconnue' : 'Unknown error',
    },
  }
}
