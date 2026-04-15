/**
 * UI & Logic Constants
 */
export const SETTINGS = {
  // Feedback & Delay timeouts
  ERROR_FLASH_DURATION: 2000,
  SUCCESS_ADVANCE_DELAY: 1500,
  FAST_ADVANCE_DELAY: 120,
  MCQ_WRONG_DELAY: 800,
  TIMED_WRONG_DELAY: 380,
  TIMER_INTERVAL: 1000,

  // Transitions
  MATCH_ERROR_FLASH: 500,
  GP_AUTO_ADVANCE_DELAY: 350, // guided-problem: pause before advancing to next step

  // Storage Keys
  LOCAL_STORAGE_KEY: 'melimee_v1',
  SESSION_STORAGE_EX_KEY: 'ex',

  // Levels & Categories
  LEVELS_MAP: { 1: 'CP', 2: 'CE1', 3: 'CE2', 4: 'CM1', 5: 'CM2' },
  DIFFS_MAP: { 1: 'facile', 2: 'moyen', 3: 'difficile' },
  FOLDERS_MAP: { e: 'exercices', a: 'applications', d: 'defis' },
};
