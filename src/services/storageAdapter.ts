import type { AppState } from '../types/domain';

export interface StorageAdapter<T> {
  load(): T | null;
  save(data: T): boolean;
  clear(): void;
  getStorageInfo(): { driver: string; key: string; available: boolean };
}

const STORAGE_KEY = 'medair_logistics_v1_demo_state';

class LocalStorageAdapter<T> implements StorageAdapter<T> {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  private isAvailable(): boolean {
    try {
      const testKey = '__medair_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  load(): T | null {
    if (!this.isAvailable()) return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  save(data: T): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // Ignore storage clear errors in constrained environments
    }
  }

  getStorageInfo() {
    return {
      driver: 'localStorage (navegador)',
      key: this.key,
      available: this.isAvailable(),
    };
  }
}

export const appStorageAdapter: StorageAdapter<AppState> =
  new LocalStorageAdapter<AppState>(STORAGE_KEY);
