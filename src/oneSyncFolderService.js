import { registerPlugin } from '@capacitor/core';

const OneSyncFolder = registerPlugin('OneSyncFolder');

function isNativeAndroid() {
  return typeof window !== 'undefined'
    && window.Capacitor
    && window.Capacitor.getPlatform
    && window.Capacitor.getPlatform() === 'android';
}

export const oneSyncFolderService = {
  isNativeAndroid,

  async selectFolder() {
    if (!isNativeAndroid()) {
      throw new Error(
        'Wybór folderu OneSync jest na razie dostępny tylko w aplikacji Android.'
      );
    }

    return OneSyncFolder.selectFolder();
  },

  async getFolderStatus() {
    if (!isNativeAndroid()) {
      return {
        selected: false,
        accessible: false,
        treeUri: null,
        unsupported: true,
      };
    }

    const result = await OneSyncFolder.getFolderStatus();

    if (!result.selected) {
      return {
        selected: false,
        accessible: false,
        treeUri: null,
      };
    }

    return OneSyncFolder.checkFolderAccess();
  },

  async clearFolder() {
    if (!isNativeAndroid()) {
      throw new Error(
        'Zmiana folderu OneSync jest na razie dostępna tylko w aplikacji Android.'
      );
    }

    return OneSyncFolder.clearFolder();
  },

    async initializeStorage() {
    if (!isNativeAndroid()) {
      throw new Error(
        'Inicjalizacja folderu OneSync jest na razie dostępna tylko w aplikacji Android.'
      );
    }

    return OneSyncFolder.initializeStorage();
  },

  async readDataFile() {
    if (!isNativeAndroid()) {
      throw new Error(
        'Odczyt danych OneSync jest na razie dostępny tylko w aplikacji Android.'
      );
    }

    return OneSyncFolder.readDataFile();
  },

  async writeDataFile(content) {
    if (!isNativeAndroid()) {
      throw new Error(
        'Zapis danych OneSync jest na razie dostępny tylko w aplikacji Android.'
      );
    }

    return OneSyncFolder.writeDataFile({ content });
  },
};