import type { Locale } from '@/lib/i18n/config'
import type { PlayerRank } from '@/types/domain'

export function getPlayersMessages(locale: Locale) {
  const isFrench = locale === 'fr'

  return {
    rankShort: (isFrench
      ? {
          R5: 'R5 Leader',
          R4: 'R4 Officier',
          R3: 'R3 Actif',
          R2: 'R2 Occasionnel',
          R1: 'R1 Inactif',
        }
      : {
          R5: 'R5 Leader',
          R4: 'R4 Officer',
          R3: 'R3 Active',
          R2: 'R2 Occasional',
          R1: 'R1 Inactive',
        }) as Record<PlayerRank, string>,
    rankLabels: (isFrench
      ? {
          R5: 'R5 - Leader',
          R4: 'R4 - Officier',
          R3: 'R3 - Membre actif',
          R2: 'R2 - Membre occasionnel',
          R1: 'R1 - Inactif / A revoir',
        }
      : {
          R5: 'R5 - Leader',
          R4: 'R4 - Officer',
          R3: 'R3 - Active member',
          R2: 'R2 - Occasional member',
          R1: 'R1 - Inactive / Review',
        }) as Record<PlayerRank, string>,
    stats: {
      active: isFrench ? 'Actifs' : 'Active',
      inactive: isFrench ? 'Inactifs' : 'Inactive',
      unranked: isFrench ? 'Non classes' : 'Unranked',
    },
    levelDistributionTitle: isFrench ? 'Repartition par level' : 'Level distribution',
    levelDistributionSubtitle: isFrench ? 'Joueurs actifs uniquement' : 'Active players only',
    noLevelValue: isFrench ? 'sans level' : 'without level',
    noLevel: isFrench ? 'Aucun level renseigne' : 'No level recorded',
    levelLabel: 'Lvl',
    playersCount: isFrench ? 'joueur' : 'player',
    singlePlayer: isFrench ? 'Liste des joueurs' : 'Players list',
    statusFilters: {
      all: isFrench ? 'Tous' : 'All',
      active: isFrench ? 'Actifs' : 'Active',
      inactive: isFrench ? 'Inactifs' : 'Inactive',
    },
    addPlayer: isFrench ? '+ Ajouter' : '+ Add',
    columns: {
      player: isFrench ? 'Joueur' : 'Player',
      currentRank: isFrench ? 'Rang actuel' : 'Current rank',
      suggestedRank: isFrench ? 'Suggestion app' : 'App suggestion',
      profession: isFrench ? 'Profession' : 'Profession',
      generalLevel: isFrench ? 'Niv. general' : 'General lvl',
      joinedAt: isFrench ? 'Arrivee' : 'Joined',
      status: isFrench ? 'Statut' : 'Status',
      actions: isFrench ? 'Actions' : 'Actions',
    },
    status: {
      active: isFrench ? 'Actif' : 'Active',
      inactive: isFrench ? 'Inactif' : 'Inactive',
    },
    clickToEdit: isFrench ? 'Cliquer pour modifier' : 'Click to edit',
    clickToAdd: isFrench ? 'Cliquer pour ajouter' : 'Click to add',
    addInline: isFrench ? '+ ajouter' : '+ add',
    deletePrompt: isFrench ? 'Supprimer ?' : 'Delete?',
    confirm: isFrench ? 'Confirmer' : 'Confirm',
    cancel: isFrench ? 'Annuler' : 'Cancel',
    deactivate: isFrench ? 'Desactiver' : 'Deactivate',
    reactivate: isFrench ? 'Reactiver' : 'Reactivate',
    delete: isFrench ? 'Supprimer' : 'Delete',
    noPlayers: isFrench ? 'Aucun joueur correspondant' : 'No matching players',
    unranked: isFrench ? 'Non classe' : 'Unranked',
    addForm: {
      name: isFrench ? 'Nom *' : 'Name *',
      placeholder: isFrench ? 'Pseudo in-game' : 'In-game nickname',
      initialRank: isFrench ? 'Rang initial' : 'Initial rank',
      joinedAt: isFrench ? "Date d'arrivee" : 'Join date',
      create: isFrench ? 'Creer' : 'Create',
      createError: isFrench ? 'Erreur lors de la creation' : 'Failed to create player',
      invalidResponse: isFrench ? 'Reponse invalide du serveur' : 'Invalid server response',
    },
    errors: {
      update: isFrench ? 'Erreur lors de la mise a jour' : 'Failed to update',
      updateRank: isFrench ? 'Erreur lors de la mise a jour du rang' : 'Failed to update rank',
      updateProfession: isFrench ? 'Erreur lors de la mise a jour de la profession' : 'Failed to update profession',
      delete: isFrench ? 'Erreur lors de la suppression' : 'Failed to delete',
      network: isFrench ? 'Erreur reseau, veuillez reessayer' : 'Network error, please try again',
      unknown: isFrench ? 'Erreur inconnue' : 'Unknown error',
      fallbackDeactivate: isFrench
        ? 'Suppression impossible car ce joueur a un historique. Il a ete desactive a la place.'
        : 'Deletion is not possible because this player has history. The player was deactivated instead.',
    },
  }
}
