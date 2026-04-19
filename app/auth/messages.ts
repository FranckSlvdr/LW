import type { Locale } from '@/lib/i18n/config'

export function getAuthMessages(locale: Locale) {
  const isFrench = locale === 'fr'

  return {
    login: {
      title: 'Last War VS',
      subtitle: isFrench ? 'Alliance tracker - acces prive' : 'Alliance tracker - private access',
      password: isFrench ? 'Mot de passe' : 'Password',
      invalidCredentials: isFrench ? 'Identifiants incorrects' : 'Invalid credentials',
      unknownError: isFrench ? 'Erreur inconnue' : 'Unknown error',
      loading: isFrench ? 'Connexion...' : 'Signing in...',
      submit: isFrench ? 'Se connecter' : 'Sign in',
      forgotPassword: isFrench ? 'Mot de passe oublie ?' : 'Forgot your password?',
    },
    forgotPassword: {
      title: isFrench ? 'Mot de passe oublie' : 'Forgot password',
      subtitle: isFrench ? 'Recevez un lien de reinitialisation' : 'Receive a reset link',
      genericError: isFrench ? 'Une erreur est survenue. Reessayez plus tard.' : 'Something went wrong. Please try again later.',
      success: isFrench
        ? 'Si un compte existe pour cet email, vous recevrez un lien sous peu.'
        : 'If an account exists for this email, you will receive a link shortly.',
      backToLogin: isFrench ? 'Retour a la connexion' : 'Back to sign in',
      loading: isFrench ? 'Envoi...' : 'Sending...',
      submit: isFrench ? 'Envoyer le lien' : 'Send link',
    },
    acceptInvite: {
      mismatch: isFrench ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.',
      invalidLink: isFrench ? 'Lien invalide ou expire.' : 'Invalid or expired link.',
      unknownError: isFrench ? 'Erreur inconnue' : 'Unknown error',
      invalidInvitation: isFrench ? "Lien d'invitation invalide." : 'Invalid invitation link.',
      title: isFrench ? 'Creer votre compte' : 'Create your account',
      subtitle: isFrench ? 'Choisissez un mot de passe (min. 12 caracteres)' : 'Choose a password (min. 12 characters)',
      password: isFrench ? 'Mot de passe' : 'Password',
      confirmPassword: isFrench ? 'Confirmer le mot de passe' : 'Confirm password',
      loading: isFrench ? 'Creation...' : 'Creating...',
      submit: isFrench ? 'Creer mon compte' : 'Create my account',
    },
    resetPassword: {
      mismatch: isFrench ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.',
      resetError: isFrench ? 'Erreur lors de la reinitialisation.' : 'Failed to reset password.',
      unknownError: isFrench ? 'Erreur inconnue' : 'Unknown error',
      invalidLink: isFrench ? 'Lien invalide ou expire.' : 'Invalid or expired link.',
      requestNewLink: isFrench ? 'Demander un nouveau lien' : 'Request a new link',
      title: isFrench ? 'Nouveau mot de passe' : 'New password',
      subtitle: isFrench ? 'Minimum 12 caracteres' : 'Minimum 12 characters',
      success: isFrench ? 'Mot de passe mis a jour. Redirection...' : 'Password updated. Redirecting...',
      password: isFrench ? 'Nouveau mot de passe' : 'New password',
      confirmPassword: isFrench ? 'Confirmer le mot de passe' : 'Confirm password',
      loading: isFrench ? 'Enregistrement...' : 'Saving...',
      submit: isFrench ? 'Changer le mot de passe' : 'Change password',
    },
  }
}
