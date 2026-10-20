export const IPC_CHANNELS = {
  SELECT_FOLDER: 'folder:select',
  GET_FOLDER_STATS: 'folder:get-stats',
  OPEN_FOLDER_IN_EXPLORER: 'folder:open-in-explorer',
  RUN_SCRIPT: 'script:run',
  STOP_SCRIPT: 'script:stop',
  ON_SCRIPT_LOG: 'script:on-log',
  ON_SCRIPT_EXIT: 'script:on-exit',

  // Full System Discovery & App Intelligence
  SCAN_GET_ROOTS: 'scanner:get-roots',
  SCAN_GET_VOLUMES: 'scanner:get-volumes',
  SCAN_START: 'scanner:start',
  SCAN_CANCEL: 'scanner:cancel',
  SCAN_GET_STATUS: 'scanner:get-status',
  SCAN_GET_APPLICATIONS: 'scanner:get-applications',
  SCAN_GET_APP_REPORT: 'scanner:get-app-report',
  SCAN_GET_FILES: 'scanner:get-files',
  ON_SCAN_PROGRESS: 'scanner:on-progress',
  ON_SCAN_COMPLETED: 'scanner:on-completed',

  // Feature 2: AI File Understanding & Semantic Classification
  AI_START_ANALYSIS: 'ai:start-analysis',
  AI_CANCEL_ANALYSIS: 'ai:cancel-analysis',
  AI_GET_RESULTS: 'ai:get-results',
  AI_GET_SETTINGS: 'ai:get-settings',
  AI_UPDATE_SETTINGS: 'ai:update-settings',
  AI_TEST_CONNECTION: 'ai:test-connection',
  ON_AI_PROGRESS: 'ai:on-progress',
  ON_AI_COMPLETED: 'ai:on-completed'
} as const


