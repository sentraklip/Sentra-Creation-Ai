import type {
  AffiliateProject,
  CharacterProfile,
  StudioSettings,
} from '../types/studio';
import { createSeedProject, DEFAULT_SETTINGS, SEED_CHARACTERS } from '../data/seedProject';

const DB_NAME = 'SentraCreationDB';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  CHARACTERS: 'characters',
  COST_LOGS: 'cost_logs',
  SETTINGS: 'settings',
} as const;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
        db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.COST_LOGS)) {
        db.createObjectStore(STORES.COST_LOGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function initializeStudioDatabase(): Promise<{
  projects: AffiliateProject[];
  characters: CharacterProfile[];
  settings: StudioSettings;
}> {
  let projects = await getAllFromStore<AffiliateProject>(STORES.PROJECTS);
  if (projects.length === 0) {
    const seed = createSeedProject();
    await putInStore(STORES.PROJECTS, seed);
    projects = [seed];
  }

  let characters = await getAllFromStore<CharacterProfile>(STORES.CHARACTERS);
  if (characters.length === 0) {
    for (const c of SEED_CHARACTERS) {
      await putInStore(STORES.CHARACTERS, c);
    }
    characters = [...SEED_CHARACTERS];
  }

  const db = await openDb();
  const settings = await new Promise<StudioSettings>((resolve, reject) => {
    const tx = db.transaction(STORES.SETTINGS, 'readonly');
    const req = tx.objectStore(STORES.SETTINGS).get('studio_settings');
    req.onsuccess = () => {
      if (req.result && req.result.value) {
        resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    req.onerror = () => reject(req.error);
  });

  projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { projects, characters, settings };
}

export async function saveProjectToDb(project: AffiliateProject): Promise<void> {
  await putInStore(STORES.PROJECTS, project);
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  await deleteFromStore(STORES.PROJECTS, projectId);
}

export async function saveCharacterToDb(character: CharacterProfile): Promise<void> {
  await putInStore(STORES.CHARACTERS, character);
}

export async function deleteCharacterFromDb(characterId: string): Promise<void> {
  await deleteFromStore(STORES.CHARACTERS, characterId);
}

export async function saveSettingsToDb(settings: StudioSettings): Promise<void> {
  await putInStore(STORES.SETTINGS, { key: 'studio_settings', value: settings });
}

export async function clearLocalStudioData(): Promise<void> {
  const db = await openDb();
  const storeNames = [STORES.PROJECTS, STORES.CHARACTERS, STORES.COST_LOGS, STORES.SETTINGS];
  for (const name of storeNames) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(name, 'readwrite');
      const req = tx.objectStore(name).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
