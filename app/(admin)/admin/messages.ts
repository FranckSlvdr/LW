import type { Locale } from '@/lib/i18n/config'
import type { AuditAction, AuditEntityType, Permission, UserRole } from '@/types/domain'

const ROLE_LABELS: Record<Locale, Record<UserRole, string>> = {
  fr: {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    viewer: 'Viewer',
  },
  en: {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    viewer: 'Viewer',
  },
}

const ACTION_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    LOGIN: 'Connexion',
    LOGOUT: 'Deconnexion',
    LOGIN_FAILED: 'Echec de connexion',
    INVITE_SENT: 'Invitation envoyee',
    INVITE_ACCEPTED: 'Invitation acceptee',
    PASSWORD_RESET_REQUESTED: 'Reinitialisation demandee',
    PASSWORD_RESET_COMPLETED: 'Mot de passe reinitialise',
    USER_DEACTIVATED: 'Utilisateur desactive',
    USER_ACTIVATED: 'Utilisateur active',
    ROLE_CHANGED: 'Role modifie',
    CREATE: 'Creation',
    UPDATE: 'Modification',
    DELETE: 'Suppression',
  },
  en: {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    LOGIN_FAILED: 'Failed login',
    INVITE_SENT: 'Invitation sent',
    INVITE_ACCEPTED: 'Invitation accepted',
    PASSWORD_RESET_REQUESTED: 'Password reset requested',
    PASSWORD_RESET_COMPLETED: 'Password reset completed',
    USER_DEACTIVATED: 'User deactivated',
    USER_ACTIVATED: 'User activated',
    ROLE_CHANGED: 'Role changed',
    CREATE: 'Creation',
    UPDATE: 'Update',
    DELETE: 'Deletion',
  },
}

const ENTITY_LABELS: Record<Locale, Record<AuditEntityType | '', string>> = {
  fr: {
    '': 'Tous les types',
    user: 'Utilisateurs',
    player: 'Joueurs',
    week: 'Semaines',
    daily_score: 'Scores',
    import: 'Imports',
    rating_rule: 'Regles de notation',
    rating_run: 'Calculs de notation',
  },
  en: {
    '': 'All types',
    user: 'Users',
    player: 'Players',
    week: 'Weeks',
    daily_score: 'Scores',
    import: 'Imports',
    rating_rule: 'Rating rules',
    rating_run: 'Rating runs',
  },
}

const PERMISSION_GROUP_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    navigation: 'Navigation',
    imports: 'Imports & Scores',
    weeks: 'Semaines',
    trains: 'Trains',
    players: 'Joueurs & Notation',
    admin: 'Administration',
  },
  en: {
    navigation: 'Navigation',
    imports: 'Imports & Scores',
    weeks: 'Weeks',
    trains: 'Trains',
    players: 'Players & Rating',
    admin: 'Administration',
  },
}

const PERMISSION_LABELS: Record<Locale, Record<Permission, string>> = {
  fr: {
    'dashboard:view': 'Acces dashboard',
    'admin:view': 'Acces espace admin',
    'players:import': 'Importer des joueurs',
    'scores:import': 'Importer des scores',
    'scores:edit': 'Editer des scores',
    'weeks:manage': 'Gerer les semaines VS',
    'trains:trigger': 'Declencher le tirage des trains',
    'trains:configure': 'Configurer les trains',
    'players:manage': 'Gerer les joueurs',
    'rating:configure': 'Configurer la notation',
    'rating:recalculate': 'Recalculer les notes',
    'audit:view': "Voir le journal d'audit",
    'users:invite': 'Inviter un utilisateur',
    'users:manage': 'Gerer les utilisateurs',
    'users:promote_admin': 'Promouvoir en admin/super admin',
    'settings:configure': "Configurer l'application",
  },
  en: {
    'dashboard:view': 'Access dashboard',
    'admin:view': 'Access admin area',
    'players:import': 'Import players',
    'scores:import': 'Import scores',
    'scores:edit': 'Edit scores',
    'weeks:manage': 'Manage VS weeks',
    'trains:trigger': 'Trigger train draws',
    'trains:configure': 'Configure trains',
    'players:manage': 'Manage players',
    'rating:configure': 'Configure rating',
    'rating:recalculate': 'Recalculate ratings',
    'audit:view': 'View audit log',
    'users:invite': 'Invite a user',
    'users:manage': 'Manage users',
    'users:promote_admin': 'Promote to admin/super admin',
    'settings:configure': 'Configure the application',
  },
}

export function getAdminMessages(locale: Locale) {
  const roleLabels = ROLE_LABELS[locale]
  const actionLabels = ACTION_LABELS[locale]
  const entityLabels = ENTITY_LABELS[locale]
  const permissionGroupLabels = PERMISSION_GROUP_LABELS[locale]
  const permissionLabels = PERMISSION_LABELS[locale]

  return {
    roleLabels,
    actionLabels,
    entityLabels,
    permissionGroupLabels,
    permissionLabels,
    sidebar: locale === 'fr'
      ? {
          title: 'Administration',
          subtitle: 'Last War Tracker',
          overview: "Vue d'ensemble",
          users: 'Utilisateurs',
          roles: 'Roles & Droits',
          security: 'Securite',
          audit: "Journal d'audit",
          backToApp: "Retour a l'application",
        }
      : {
          title: 'Administration',
          subtitle: 'Last War Tracker',
          overview: 'Overview',
          users: 'Users',
          roles: 'Roles & Permissions',
          security: 'Security',
          audit: 'Audit log',
          backToApp: 'Back to app',
        },
    dashboard: locale === 'fr'
      ? {
          title: 'Administration',
          connectedAs: 'Connecte en tant que',
          role: 'role',
          totalUsers: 'Utilisateurs total',
          active: 'Actifs',
          inactive: 'Inactifs',
          superAdmins: 'Super admins',
          roleBreakdown: 'Repartition par role',
          recentActivity: 'Activite recente',
          viewAll: 'Voir tout',
          noEvents: 'Aucun evenement enregistre.',
          manageUsers: 'Gerer les utilisateurs',
          viewPermissions: 'Voir les droits',
          securityConfig: 'Configuration securite',
          fullAuditLog: "Journal d'audit complet",
        }
      : {
          title: 'Administration',
          connectedAs: 'Signed in as',
          role: 'role',
          totalUsers: 'Total users',
          active: 'Active',
          inactive: 'Inactive',
          superAdmins: 'Super admins',
          roleBreakdown: 'Role breakdown',
          recentActivity: 'Recent activity',
          viewAll: 'View all',
          noEvents: 'No events recorded.',
          manageUsers: 'Manage users',
          viewPermissions: 'View permissions',
          securityConfig: 'Security settings',
          fullAuditLog: 'Full audit log',
        },
    users: locale === 'fr'
      ? {
          title: 'Utilisateurs',
          registeredAccounts: 'comptes enregistres',
          user: 'Utilisateur',
          role: 'Role',
          status: 'Statut',
          createdAt: 'Cree le',
          actions: 'Actions',
          you: 'vous',
          active: 'Actif',
          inactive: 'Inactif',
          roleChangeHint: 'Le changement de role prend effet immediatement et invalide les sessions existantes.',
          resetHint: "Forcer un reset genere un lien valable 1h. S'il n'y a pas de serveur SMTP configure, le lien est affiche directement.",
        }
      : {
          title: 'Users',
          registeredAccounts: 'registered accounts',
          user: 'User',
          role: 'Role',
          status: 'Status',
          createdAt: 'Created on',
          actions: 'Actions',
          you: 'you',
          active: 'Active',
          inactive: 'Inactive',
          roleChangeHint: 'Role changes take effect immediately and invalidate existing sessions.',
          resetHint: 'Force reset generates a link valid for 1 hour. If SMTP is not configured, the link is shown directly.',
        },
    inviteForm: locale === 'fr'
      ? {
          addUser: '+ Inviter un utilisateur',
          newUser: 'Nouvel utilisateur',
          email: 'Email',
          name: 'Nom',
          role: 'Role',
          inviteError: "Erreur lors de l'invitation.",
          sendInvitation: "Envoyer l'invitation",
          sending: 'Envoi...',
          cancel: 'Annuler',
        }
      : {
          addUser: '+ Invite a user',
          newUser: 'New user',
          email: 'Email',
          name: 'Name',
          role: 'Role',
          inviteError: 'Failed to send invitation.',
          sendInvitation: 'Send invitation',
          sending: 'Sending...',
          cancel: 'Cancel',
        },
    userActions: locale === 'fr'
      ? {
          error: 'Erreur',
          unknownError: 'Erreur inconnue',
          generateResetConfirm: 'Generer un lien de reinitialisation pour cet utilisateur ?',
          resetEmailSent: 'Email de reinitialisation envoye.',
          deactivate: 'Desactiver',
          activate: 'Activer',
          forceReset: 'Forcer reset mdp',
          copied: 'Copie',
          copy: 'Copier',
        }
      : {
          error: 'Error',
          unknownError: 'Unknown error',
          generateResetConfirm: 'Generate a reset link for this user?',
          resetEmailSent: 'Password reset email sent.',
          deactivate: 'Deactivate',
          activate: 'Activate',
          forceReset: 'Force password reset',
          copied: 'Copied',
          copy: 'Copy',
        },
    roles: locale === 'fr'
      ? {
          title: 'Roles & Droits',
          subtitle: 'Matrice des permissions par role. Oui = autorise, Non = refuse.',
          viewerDescription: 'Lecture seule. Peut consulter le dashboard.',
          managerDescription: 'Peut importer, editer les scores, gerer les joueurs, configurer trains et notation.',
          adminDescription: 'Gere les joueurs, la notation et peut inviter des utilisateurs.',
          superAdminDescription: 'Acces complet. Seul a pouvoir promouvoir en admin ou super admin.',
          permission: 'Permission',
          yes: 'Oui',
          no: 'Non',
        }
      : {
          title: 'Roles & Permissions',
          subtitle: 'Permission matrix by role. Yes = allowed, No = denied.',
          viewerDescription: 'Read-only access. Can view the dashboard.',
          managerDescription: 'Can import data, edit scores, manage players, and configure trains and rating.',
          adminDescription: 'Manages players and rating, and can invite users.',
          superAdminDescription: 'Full access. Only role allowed to promote another admin or super admin.',
          permission: 'Permission',
          yes: 'Yes',
          no: 'No',
        },
    audit: locale === 'fr'
      ? {
          title: "Journal d'audit",
          eventsRegistered: 'evenements enregistres',
          action: 'Action',
          actor: 'Acteur',
          type: 'Type',
          context: 'Contexte',
          ip: 'IP',
          date: 'Date',
          noEvents: 'Aucun evenement correspondant.',
          previous: 'Precedent',
          next: 'Suivant',
          page: 'Page',
          reset: 'Reinitialiser',
          allActions: 'Toutes les actions',
        }
      : {
          title: 'Audit log',
          eventsRegistered: 'recorded events',
          action: 'Action',
          actor: 'Actor',
          type: 'Type',
          context: 'Context',
          ip: 'IP',
          date: 'Date',
          noEvents: 'No matching events.',
          previous: 'Previous',
          next: 'Next',
          page: 'Page',
          reset: 'Reset',
          allActions: 'All actions',
        },
  }
}

export const AUDIT_FILTER_ACTIONS: AuditAction[] = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'INVITE_SENT',
  'INVITE_ACCEPTED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'USER_DEACTIVATED',
  'USER_ACTIVATED',
  'ROLE_CHANGED',
  'CREATE',
  'UPDATE',
  'DELETE',
]

export const AUDIT_FILTER_ENTITIES: AuditEntityType[] = [
  'user',
  'player',
  'week',
  'daily_score',
  'import',
  'rating_rule',
  'rating_run',
]
