/**
 * Global application configuration.
 * Values that may change per environment should come from process.env.
 */

export const APP_CONFIG = {
  name: 'Last War Tracker',
  version: '1.0.0',

  /** Maximum players per alliance (game constraint) */
  maxPlayersPerAlliance: 100,

  /** VS week spans Monday (day 1) to Saturday (day 6) */
  vsWeekDays: 6 as const,

  /** Maximum accepted CSV file size */
  maxImportFileSizeBytes: 5 * 1024 * 1024, // 5 MB

  /** Default pagination limit for list endpoints */
  paginationDefaultLimit: 50,

  /** Top N / Flop N players shown on dashboard */
  dashboardTopFlopCount: 5,

  /** VS eco-day score cap (game rule) */
  ecoScoreCap: 7_200_000,
} as const

export type AppConfig = typeof APP_CONFIG
