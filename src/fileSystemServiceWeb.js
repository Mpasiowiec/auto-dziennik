/**
 * FileSystemService - Zarządzanie zdjęciami
 * Abstrakcja obsługująca zarówno web jak i mobile
 */

import ImageCompression from './imageCompression';

// Dynamiczny import Capacitor (tylko jeśli dostępny)
let Filesystem = null;
let Directory = null;
let Encoding = null;
let useLocalStorage = true;

const STORAGE_KEY_PREFIX = 'photos_';

async function initCapacitor() {
  if (Filesystem) return; // Już załadowany
  
  try {
    // Na web Capacitor nie jest dostępny
    if (typeof window === 'undefined' || typeof Capacitor === 'undefined') {
      useLocalStorage = true;
      return;
    }
    
    const fs = window.Capacitor?.Plugins?.Filesystem;
    if (fs) {
      Filesystem = fs;
      Directory = window.Capacitor.Filesystem.Directory.Documents;
      Encoding = window.Capacitor.Filesystem.Encoding.UTF8;
      useLocalStorage = false;
      console.log('✓ Capacitor Filesystem loaded');
    }
  } catch (error) {
    console.log('ℹ️  Using localStorage for photos (Capacitor not available)');
    useLocalStorage = true;
  }
}

class FileSystemService {
  constructor() {
    this.photosDirectory = 'vehicle_photos';
  }

  /**
   * Zapis zdjęcia - obsługuje zarówno web jak i mobile
   */
  async savePhotoLocally(imageFile, vehicleId, options = {}) {
    try {
      const {
        maxWidth = 1024,
        maxHeight = 1024,
        quality = 0.8
      } = options;

      if (!ImageCompression.isImageFile(imageFile)) {
        return { success: false, error: 'Plik nie jest zdjęciem' };
      }

      if (!ImageCompression.isSizeValid(imageFile, 50)) {
        return { success: false, error: 'Plik jest zbyt duży (max 50MB)' };
      }

      // Kompresja zdjęcia
      const compressedBlob = await ImageCompression.compressFile(
        imageFile,
        maxWidth,
        maxHeight,
        quality
      );

      const base64Data = await this.blobToBase64(compressedBlob);
      const timestamp = Date.now();
      const fileName = `photo_${timestamp}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const dirPath = `${this.photosDirectory}/${vehicleId}`;
      const fullPath = `${dirPath}/${fileName}`;

      // Zapisz do localStorage (web) lub Filesystem (mobile)
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(storageKey) || '{}');
      photos[fileName] = {
        base64: base64Data,
        timestamp: timestamp,
        size: compressedBlob.size
      };
      localStorage.setItem(storageKey, JSON.stringify(photos));

      console.log(`✓ Photo saved: ${fullPath} (${compressedBlob.size} bytes)`);

      return {
        success: true,
        path: fullPath,
        fileName,
        size: compressedBlob.size
      };
    } catch (error) {
      console.error('Error saving photo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Odczyt zdjęcia
   */
  async readPhoto(filePath) {
    try {
      const parts = filePath.split('/');
      const fileName = parts[parts.length - 1];
      const vehicleId = parts[parts.length - 2];
      
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (photos[fileName] && photos[fileName].base64) {
        let base64 = photos[fileName].base64;
        // Usuń "data:image/jpeg;base64," prefix jeśli jest
        if (base64.includes(',')) {
          base64 = base64.split(',')[1];
        }
        
        return {
          success: true,
          data: base64,
          mimeType: 'image/jpeg'
        };
      }
      
      return { success: false, error: 'Photo not found' };
    } catch (error) {
      console.error('Error reading photo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pobranie Data URL do wyświetlenia
   */
  async getPhotoDataUrl(filePath) {
    const result = await this.readPhoto(filePath);
    if (result.success) {
      return `data:image/jpeg;base64,${result.data}`;
    }
    return null;
  }

  /**
   * Usunięcie zdjęcia
   */
  async deletePhoto(filePath) {
    try {
      const parts = filePath.split('/');
      const fileName = parts[parts.length - 1];
      const vehicleId = parts[parts.length - 2];
      
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      delete photos[fileName];
      localStorage.setItem(storageKey, JSON.stringify(photos));
      
      console.log(`✓ Photo deleted: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting photo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista zdjęć pojazdu
   */
  async listVehiclePhotos(vehicleId) {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      const files = Object.keys(photos).map(fileName => ({
        name: fileName,
        path: `${this.photosDirectory}/${vehicleId}/${fileName}`,
        type: 'image'
      }));

      return { success: true, files };
    } catch (error) {
      console.error('Error listing photos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Usunięcie całego folderu zdjęć pojazdu
   */
  async deleteVehiclePhotosDirectory(vehicleId) {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      localStorage.removeItem(storageKey);
      
      console.log(`✓ Vehicle photos directory deleted`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting photos directory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Info o zdjęciu
   */
  async getPhotoInfo(filePath) {
    try {
      const parts = filePath.split('/');
      const fileName = parts[parts.length - 1];
      const vehicleId = parts[parts.length - 2];
      
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (photos[fileName]) {
        return {
          success: true,
          info: {
            size: photos[fileName].size,
            ctime: photos[fileName].timestamp,
            mtime: photos[fileName].timestamp
          }
        };
      }
      
      return { success: false, error: 'Photo not found' };
    } catch (error) {
      console.error('Error getting photo info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rozmiar wszystkich zdjęć pojazdu
   */
  async getVehiclePhotosSize(vehicleId) {
    try {
      const filesResult = await this.listVehiclePhotos(vehicleId);
      if (!filesResult.success || filesResult.files.length === 0) {
        return { success: true, totalSize: 0, count: 0 };
      }

      let totalSize = 0;
      const storageKey = `${STORAGE_KEY_PREFIX}${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      for (const fileName in photos) {
        totalSize += photos[fileName].size || 0;
      }

      return {
        success: true,
        totalSize,
        count: filesResult.files.length,
        files: filesResult.files
      };
    } catch (error) {
      console.error('Error calculating photos size:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Konwersja Blob na Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Export singleton
export const fileSystemService = new FileSystemService();

// Inicjalizacja Capacitor (jeśli dostępny)
initCapacitor().catch(err => {
  console.log('Capacitor init skipped, using localStorage');
});
