export const IPC_CHANNELS = {
  SELECT_FOLDER: 'folder:select',
  GET_FOLDER_STATS: 'folder:get-stats',
  OPEN_FOLDER_IN_EXPLORER: 'folder:open-in-explorer',
  RUN_SCRIPT: 'script:run',
  STOP_SCRIPT: 'script:stop',
  ON_SCRIPT_LOG: 'script:on-log',
  ON_SCRIPT_EXIT: 'script:on-exit'
} as const
