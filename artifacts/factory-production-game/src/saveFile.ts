export const SAVE_FILE_FORMAT = 'factory-planet-save';
export const SAVE_FILE_VERSION = 1;

type SaveFileObject = Record<string, unknown>;

const isSaveFileObject = (value: unknown): value is SaveFileObject => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const requiredStateKeys = ['raw', 'products', 'storage', 'research', 'gameStartTimestamp', 'sessionId'];
const isSaveState = (value: unknown): value is SaveFileObject =>
  isSaveFileObject(value) && requiredStateKeys.every((key) => key in value);

export const saveFileTextFor = (state: SaveFileObject, exportedAt = Date.now()) => JSON.stringify({
  format: SAVE_FILE_FORMAT,
  version: SAVE_FILE_VERSION,
  exportedAt,
  state,
}, null, 2);

export const stateFromSaveFileText = (text: string): SaveFileObject => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, '')) as unknown;
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (isSaveFileObject(parsed) && parsed.format === SAVE_FILE_FORMAT && parsed.version === SAVE_FILE_VERSION && isSaveState(parsed.state)) {
    return parsed.state;
  }
  if (isSaveState(parsed)) return parsed;
  if (isSaveFileObject(parsed) && parsed.format === SAVE_FILE_FORMAT) {
    throw new Error('This save file is incomplete or from an unsupported version.');
  }
  throw new Error('Select a Factory Planet save file or exported local save.');
};