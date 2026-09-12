export const SAVE_FILE_FORMAT = 'factory-planet-save';
export const SAVE_FILE_VERSION = 1;

type SaveFileObject = Record<string, unknown>;

const isSaveFileObject = (value: unknown): value is SaveFileObject => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const saveFileTextFor = (state: SaveFileObject, exportedAt = Date.now()) => JSON.stringify({
  format: SAVE_FILE_FORMAT,
  version: SAVE_FILE_VERSION,
  exportedAt,
  state,
}, null, 2);

export const stateFromSaveFileText = (text: string): SaveFileObject => {
  const parsed = JSON.parse(text) as unknown;
  if (!isSaveFileObject(parsed) || parsed.format !== SAVE_FILE_FORMAT || parsed.version !== SAVE_FILE_VERSION || !isSaveFileObject(parsed.state)) {
    throw new Error('Unsupported save file.');
  }
  const state = parsed.state;
  const requiredKeys = ['raw', 'products', 'storage', 'research', 'gameStartTimestamp', 'sessionId'];
  if (!requiredKeys.every((key) => key in state)) throw new Error('Invalid save file.');
  return state;
};