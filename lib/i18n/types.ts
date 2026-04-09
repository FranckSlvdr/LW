/**
 * Dictionary — full shape of all UI strings.
 *
 * Rules:
 * - All values are plain strings (serializable — safe to pass through I18nProvider context)
 * - Templates use {key} placeholders, resolved by interpolate()
 * - Plurals use {s} = '' | 's' passed from caller (works for fr + en)
 */

export interface Dictionary {
  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    dashboard: string
    players: string
    imports: string
    events: string
    professions: string
    ranking: string
    settings: string
  }

  // ── App shell ───────────────────────────────────────────────────────────────
  app: {
    name: string
    tagline: string
    live: string
    demo: string
  }

  // ── KPI Cards ───────────────────────────────────────────────────────────────
  kpi: {
    totalScore: string
    avgPerPlayer: string
    activePlayers: string
    participation: string
    avgPerWeek: string
    /** "Out of {total} registered" */
    outOf: string
    /** "{n} / {total} players" */
    playersRatio: string
    /** "{delta} vs prev. week" */
    vsLastWeek: string
  }

  // ── Top / Flop panel ────────────────────────────────────────────────────────
  topFlop: {
    top5Title: string
    top5Subtitle: string
    flop5Title: string
    flop5Subtitle: string
    absent: string
    /** "{n} eco" */
    ecoLabel: string
    noData: string
  }

  // ── Score Heatmap ───────────────────────────────────────────────────────────
  heatmap: {
    title: string
    subtitle: string
    colPlayer: string
    colTotal: string
    /** 6 abbreviated day labels — Mon through Sat */
    days: [string, string, string, string, string, string]
    legendAbsent: string
    legendEco: string
    /** "Low → High" */
    legendRange: string
    absent: string
    eco: string
    /** "{player} · {day} · {absentWord}" */
    tooltipAbsent: string
    /** "{player} · {day} · {score}" */
    tooltipScore: string
    /** "{player} · {day} · {score} ({ecoWord})" */
    tooltipScoreEco: string
    /** "{player} · {day} · {score} → {adjusted} ({ecoWord})" */
    tooltipScoreEcoCapped: string
  }

  // ── Insights panel ──────────────────────────────────────────────────────────
  insights: {
    title: string
    /** "{count} detection{s} this week" */
    subtitle: string
    empty: string
    // --- message templates (used by insightEngine) ---
    /** "🏆 {player} is top player this week with {score} pts{trend}." */
    topPerformer: string
    /** " — progressing ↑" */
    topPerformerUp: string
    /** " — stable this week" */
    topPerformerStable: string
    /** "📈 {player} gained {gain} place{s} (rank {prevRank} → {rank})." */
    mostImproved: string
    /** "📉 {player} dropped {drop} place{s} (rank {prevRank} → {rank})." */
    decliningPlayer: string
    /** "✅ Perfect participation (6/6 days): {names}." */
    perfectParticipation: string
    /** "⚠️ No score this week: {names}." */
    absentPlayers: string
    /** "⚠️ {count} player{s} with low participation (≤ {threshold} days)." */
    lowParticipation: string
    /** "💤 Heavy eco days: {names}." */
    ecoDayPattern: string
    /** " ({days} days)" — appended to a player name in eco pattern */
    ecoSuffix: string
    /** "📊 Alliance score up {pct}{weekLabel} (+{delta} pts)." */
    weekImprovement: string
    /** "📊 Alliance score down {pct}{weekLabel} (−{delta} pts)." */
    weekDecline: string
    /** " for " — prepended to weekLabel, e.g. " for S1-W3" */
    weekLabelPrefix: string
    /** "{n} players" — used when too many to list individually */
    manyPlayers: string
  }

  // ── Import status ───────────────────────────────────────────────────────────
  imports: {
    title: string
    subtitle: string
    empty: string
    /** "{imported} / {total} lines" */
    lines: string
    /** "· {n} skipped" */
    skipped: string
    statusSuccess: string
    statusPartial: string
    statusError: string
    statusPending: string
    typePlayers: string
    typeScores: string
    importPrefix: string
  }

  // ── Ranking table ───────────────────────────────────────────────────────────
  ranking: {
    title: string
    /** "{count} players · click a header to sort" */
    subtitle: string
    colRank: string
    colPlayer: string
    colTotal: string
    colAvgDay: string
    colParticipation: string
    colTrend: string
    colEco: string
    absent: string
  }

  // ── Events page ─────────────────────────────────────────────────────────────
  events: {
    pageTitle: string
    statsParticipations: string
    statsDistinct: string
    statsPlayers: string
    tableTitle: string
    /** "{n} entry{s}" */
    tableSubtitle: string
    colPlayer: string
    colEvent: string
    colDate: string
    colScore: string
    colStatus: string
    statusParticipated: string
    statusAbsent: string
    empty: string
    emptyHint: string
  }

  // ── Professions page ─────────────────────────────────────────────────────────
  professions: {
    pageTitle: string
    statsConfigured: string
    statsAvgLevel: string
    statsActive: string
    legendLabel: string
    tableTitle: string
    /** "{n} player{s} configured" */
    tableSubtitle: string
    colPlayer: string
    colProfession: string
    colLevel: string
    colRawScore: string
    empty: string
    emptyHint: string
    /** "Lv {n}" */
    levelBadge: string
    professionLabels: Record<string, string>
  }

  // ── Dashboard empty states ───────────────────────────────────────────────────
  dashboard: {
    noWeeks: string
    noWeeksHint: string
    /** "No scores for {weekLabel}." */
    noScores: string
    noScoresHint: string
  }

  // ── Trains page ──────────────────────────────────────────────────────────────
  trains: {
    pageTitle: string
    // TrainSelector
    selectorTitle: string
    /** "Semaine : {label}" */
    selectorSubtitle: string
    /** 7 day labels Mon–Sun */
    days: [string, string, string, string, string, string, string]
    /** 6 short day labels Mon–Sat (VS day picker) */
    daysShort: [string, string, string, string, string, string]
    btnDrawDay: string      // "🚂 Tirer {day}"
    btnRedrawDay: string    // "🔄 Refaire ce jour"
    btnDrawWeek: string     // "🗓️ Tirer toute la semaine"
    btnRedrawWeek: string   // "🔄 Refaire toute la semaine"
    btnDrawing: string      // "⏳ Tirage en cours…"
    btnWeekDrawing: string  // "⏳ Tirage semaine…"
    /** "{n} conducteur{s} / jour" */
    driversPerDay: string
    /** "Exclusion {n} sem. préc." */
    exclusionBadge: string
    dsReservedBadge: string
    contribReservedBadge: string
    /** "Conducteurs sélectionnés — {day}" */
    selectedDrivers: string
    /** "Joueurs exclus ({n})" */
    excludedPlayers: string
    /** "(−{n} sem.)" */
    weeksAgo: string
    /** "Sélectionné {n} semaine{s} en arrière" */
    excludedTooltip: string
    reasonDs: string
    reasonContrib: string
    reasonRandom: string
    reasonManual: string
    // TrainHistory
    historyTitle: string
    historySubtitle: string  // "{n} tirage{s}"
    historyEmpty: string
    historyEmptyHint: string
    historyExcluded: string  // "{n} exclu{s}"
    // TrainSettingsPanel
    settingsTitle: string
    settingsSubtitle: string
    exclusionWindowLabel: string
    exclusionWindowNone: string
    /** "{n} sem. préc." */
    exclusionWindowN: string
    driversPerDayLabel: string
    reservedSlotsLabel: string
    dsTop2Label: string
    bestContribLabel: string
    vsRestrictionLabel: string
    vsRestrictionHint: string
    vsTopNLabel: string
    vsDaysLabel: string
    vsDaysHint: string
    btnSave: string
    btnSaving: string
    btnSaved: string
    btnSaveError: string
  }

  // ── Contribution page ────────────────────────────────────────────────────────
  contribution: {
    pageTitle: string
    statEntered: string
    statTotal: string
    statAvg: string
  }

  // ── Desert Storm page ────────────────────────────────────────────────────────
  desertStorm: {
    pageTitle: string
    statRecorded: string
    statMissing: string
    statBest: string
  }

  // ── OCR importer ─────────────────────────────────────────────────────────────
  ocr: {
    importTitle: string
    importSubtitle: string
    weekLabel: string
    dayLabel: string
    textLabel: string
    textPlaceholder: string
    textHint: string
    btnAnalyze: string
    /** "{n} lignes" */
    lineCount: string
    analyzing: string
    /** "Validation — {day}, {week}" */
    validationTitle: string
    btnNewAnalysis: string
    btnBack: string
    /** "✅ {count} score{s} importé{s} avec succès" */
    importSuccess: string
    // OcrValidationTable
    colConf: string
    colPlayer: string
    colScore: string
    colIssues: string
    summaryTotal: string
    summaryHigh: string
    summaryMedium: string
    summaryLow: string
    summaryUnresolved: string
    summaryDiscarded: string
    playerUnresolved: string
    rawTextLabel: string
    /** "Corrections : {list}" */
    correctionsLabel: string
    rawExpandTitle: string
    /** "{n} / {total} ligne{s} sélectionnée{s}" */
    selectedLines: string
    /** "Importer {n} ligne{s}" */
    btnImport: string
    importing: string
    /** "{n} ligne{s} ignorée{s}" */
    discardedLines: string
    // Issue labels
    issueLowConfidence: string
    issueUnresolvedPlayer: string
    issueInvalidScore: string
    issuePossibleOcrNoise: string
    issueDuplicateRow: string
    issueScoreTooSmall: string
    issueMergedLines: string
    issueNameTruncated: string
    issueAmbiguousPlayer: string
  }
}
