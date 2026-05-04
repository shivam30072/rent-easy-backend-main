export const SWIPE_MESSAGES = {
  RECORDED: 'Swipe recorded.',
  MUTUAL_MATCH: 'It\'s a match!',
  ALREADY_SWIPED: 'You already swiped on this user.',
  UNDONE: 'Swipe undone.',
  NOT_UNDOABLE: 'Cannot undo (over 5 seconds old).',
  SUPER_LIKE_LIMIT: 'Daily super-like limit reached.',
}

export const SWIPE_ACTIONS = ['like', 'skip', 'super_like']
export const SUPER_LIKE_DAILY_LIMIT = 3
export const UNDO_WINDOW_MS = 5000
