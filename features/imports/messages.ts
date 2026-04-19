import type { Locale } from '@/lib/i18n/config'

export function getImportsMessages(locale: Locale) {
  const isFrench = locale === 'fr'

  return {
    uploader: {
      title: isFrench ? 'Nouvel import CSV' : 'New CSV import',
      subtitle: isFrench
        ? 'Importez des joueurs ou des scores depuis un fichier CSV'
        : 'Import players or scores from a CSV file',
      importTypes: {
        scores: isFrench ? 'Scores VS' : 'VS scores',
        players: isFrench ? 'Joueurs' : 'Players',
      },
      week: isFrench ? 'Semaine' : 'Week',
      template: isFrench ? 'Modele :' : 'Template:',
      file: isFrench ? 'Fichier CSV' : 'CSV file',
      importing: isFrench ? 'Import en cours...' : 'Importing...',
      submit: isFrench ? 'Importer' : 'Import',
      errors: {
        import: isFrench ? "Erreur lors de l'import" : 'Import failed',
        unknown: isFrench ? 'Erreur inconnue' : 'Unknown error',
      },
      success: (rowsImported: number, rowsSkipped: number) => {
        if (isFrench) {
          return `OK ${rowsImported} lignes importees${rowsSkipped ? ` · ${rowsSkipped} ignorees` : ''}`
        }
        return `OK ${rowsImported} rows imported${rowsSkipped ? ` · ${rowsSkipped} skipped` : ''}`
      },
    },
    history: {
      subtitle: (count: number) => isFrench ? `${count} imports` : `${count} imports`,
      columns: {
        file: isFrench ? 'Fichier' : 'File',
        type: isFrench ? 'Type' : 'Type',
        lines: isFrench ? 'Lignes' : 'Rows',
        status: isFrench ? 'Statut' : 'Status',
        date: isFrench ? 'Date' : 'Date',
      },
    },
    exports: {
      filename: isFrench ? 'imports-historique' : 'imports-history',
      sheetName: isFrench ? 'Imports' : 'Imports',
      columns: {
        date: isFrench ? 'Date' : 'Date',
        time: isFrench ? 'Heure' : 'Time',
        type: isFrench ? 'Type' : 'Type',
        file: isFrench ? 'Fichier' : 'File',
        status: isFrench ? 'Statut' : 'Status',
        total: isFrench ? 'Total' : 'Total',
        imported: isFrench ? 'Importees' : 'Imported',
        skipped: isFrench ? 'Ignorees' : 'Skipped',
        by: isFrench ? 'Par' : 'By',
      },
    },
  }
}
