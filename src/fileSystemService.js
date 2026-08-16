/**
 * FileSystemService - Zarządzanie zdjęciami w lokalnym systemie plików
 * Używa @capacitor/filesystem do zapisu/odczytu plików
 * Fallback: Base64 w localStorage na web
 */

import ImageCompression from './imageCompression';

let Filesystem = null;
let Directory = null;
let Encoding = null;
let useLocalStorage = true;

// Dynamiczny import Capacitor (jeśli dostępny)
async function loadCapacitor() {
  try {
    if (useLocalStorage) return; // Już zdecydowaliśmy na localStorage
    
    // Jeśli już załadowany
    if (Filesystem) return;
    
    // Spróbuj załadować z window
    if (window.__CAPACITOR__ && window.__CAPACITOR__.Filesystem) {
      Filesystem = window.__CAPACITOR__.Filesystem;
      Directory = window.__CAPACITOR__.Directory;
      Encoding = window.__CAPACITOR__.Encoding;
      useLocalStorage = false;
      console.log('✓ Capacitor loaded');
      return;
    }
  } catch (error) {
    console.log('ℹ️  Capacitor not available, using localStorage for photos');
  }
}

class FileSystemService {
  constructor() {
    this.photosDirectory = 'vehicle_photos';
  }

  /**
   * Zapis zdjęcia do lokalnego systemu plików
   * Automatycznie kompresuje zdjęcie przed zapisem
   * @param {File} imageFile - Plik zdjęcia
   * @param {string} vehicleId - ID pojazdu (folder)
   * @param {Object} options - Opcje kompresji
   * @returns {Promise<{success: boolean, path: string, error?: any}>}
   */
  async savePhotoLocally(imageFile, vehicleId, options = {}) {
    try {
      const {
        maxWidth = 1024,
        maxHeight = 1024,
        quality = 0.8
      } = options;

      // Sprawdzenie, czy to zdjęcie
      if (!ImageCompression.isImageFile(imageFile)) {
        return { 
          success: false, 
          error: 'Plik nie jest zdjęciem' 
        };
      }

      // Sprawdzenie rozmiaru przed kompresją
      if (!ImageCompression.isSizeValid(imageFile, 50)) {
        return { 
          success: false, 
          error: 'Plik jest zbyt duży (max 50MB)' 
        };
      }

      // Kompresja zdjęcia
      const compressedBlob = await ImageCompression.compressFile(
        imageFile,
        maxWidth,
        maxHeight,
        quality
      );

      // Konwersja Blob na Base64
      const base64Data = await this.blobToBase64(compressedBlob);

      // Generowanie nazwy pliku
      const timestamp = Date.now();
      const fileName = `photo_${timestamp}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const dirPath = `${this.photosDirectory}/${vehicleId}`;
      const fullPath = `${dirPath}/${fileName}`;

      // Spróbuj zapisać do Capacitor Filesystem (mobile)
      if (Filesystem && !useLocalStorage) {
        try {
          await loadCapacitor();
          
          if (Filesystem) {
            await Filesystem.writeFile({
              path: fullPath,
              data: base64Data,
              directory: Directory.Documents,
              recursive: true,
            });
            console.log(`✓ Photo saved locally (Filesystem): ${fullPath}`);
          } else {
            throw new Error('Filesystem not available');
          }
        } catch (error) {
          console.warn('Filesystem save failed, falling back to localStorage:', error);
          useLocalStorage = true;
        }
      }

      // Fallback: localStorage (web)
      if (useLocalStorage) {
        const photosKey = `photos_${vehicleId}`;
        const photos = JSON.parse(localStorage.getItem(photosKey) || '{}');
        photos[fileName] = {
          base64: base64Data,
          timestamp: timestamp,
          size: compressedBlob.size
        };
        localStorage.setItem(photosKey, JSON.stringify(photos));
        console.log(`✓ Photo saved to localStorage: ${fullPath}`);
      }

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
   * Odczyt zdjęcia z lokalnego systemu plików
   * @param {string} filePath - Ścieżka do pliku
   * @returns {Promise<{success: boolean, data?: string, error?: any}>}
   */
  async readPhoto(filePath) {
    try {
      // Spróbuj przeczytać z Filesystem (mobile)
      if (Filesystem && !useLocalStorage) {
        try {
          await loadCapacitor();
          
          if (Filesystem) {
            const result = await Filesystem.readFile({
              path: filePath,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });

            return {
              success: true,
              data: result.data, // Base64 string
              mimeType: 'image/jpeg'
            };
          } else {
            throw new Error('Filesystem not available');
          }
        } catch (error) {
          console.warn('Filesystem read failed, falling back to localStorage:', error);
          useLocalStorage = true;
        }
      }

      // Fallback: localStorage (web)
      // Parse filePath: "vehicle_photos/{vehicleId}/{fileName}"
      const parts = filePath.split('/');
      const fileName = parts[parts.length - 1];
      const vehicleId = parts[parts.length - 2];
      
      const photosKey = `photos_${vehicleId}`;
      const photos = JSON.parse(localStorage.getItem(photosKey) || '{}');
      
      if (photos[fileName] && photos[fileName].base64) {
        return {
          success: true,
          data: photos[fileName].base64.split(',')[1] || photos[fileName].base64, // Remove data:image/jpeg;base64, if present
          mimeType: 'image/jpeg'
        };
      } else {
        return { success: false, error: 'Photo not found in localStorage' };
      }
    } catch (error) {
      console.error('Error reading photo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pobranie URL do wyświetlenia zdjęcia
   * @param {string} filePath - Ścieżka do pliku
   * @returns {Promise<string>} - Data URL
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
   * @param {string} filePath - Ścieżka do pliku
   * @returns {Promise<{success: boolean, error?: any}>}
   */
  async deletePhoto(filePath) {
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Documents,
      });

      console.log(`✓ Photo deleted: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting photo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Listowanie wszystkich zdjęć pojazdu
   * @param {string} vehicleId - ID pojazdu
   * @returns {Promise<{success: boolean, files?: Array, error?: any}>}
   */
  async listVehiclePhotos(vehicleId) {
    try {
      const dirPath = `${this.photosDirectory}/${vehicleId}`;
      const result = await Filesystem.readdir({
        path: dirPath,
        directory: Directory.Documents,
      });

      const files = result.files.map(file => ({
        name: file.name,
        path: `${dirPath}/${file.name}`,
        type: file.type
      }));

      return { success: true, files };
    } catch (error) {
      if (error.code === 'ENOENT' || error.message?.includes('not found')) {
        return { success: true, files: [] };
      }
      console.error('Error listing photos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Usunięcie całego folderu z zdjęciami pojazdu
   * @param {string} vehicleId - ID pojazdu
   * @returns {Promise<{success: boolean, error?: any}>}
   */
  async deleteVehiclePhotosDirectory(vehicleId) {
    try {
      const dirPath = `${this.photosDirectory}/${vehicleId}`;
      await Filesystem.rmdir({
        path: dirPath,
        directory: Directory.Documents,
        recursive: true,
      });

      console.log(`✓ Vehicle photos directory deleted: ${dirPath}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting photos directory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Konwersja Blob na Base64
   * @param {Blob} blob - Blob do konwersji
   * @returns {Promise<string>}
   */
  private async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Pobieranie informacji o zdjęciu
   * @param {string} filePath - Ścieżka do pliku
   * @returns {Promise<{success: boolean, info?: Object, error?: any}>}
   */
  async getPhotoInfo(filePath) {
    try {
      const result = await Filesystem.stat({
        path: filePath,
        directory: Directory.Documents,
      });

      return {
        success: true,
        info: {
          size: result.size,
          ctime: result.ctime,
          mtime: result.mtime,
          uri: result.uri
        }
      };
    } catch (error) {
      console.error('Error getting photo info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obliczanie całkowitego rozmiaru zdjęć pojazdu
   * @param {string} vehicleId - ID pojazdu
   * @returns {Promise<{success: boolean, totalSize?: number, count?: number, error?: any}>}
   */
  async getVehiclePhotosSize(vehicleId) {
    try {
      const filesResult = await this.listVehiclePhotos(vehicleId);
      if (!filesResult.success || filesResult.files.length === 0) {
        return { success: true, totalSize: 0, count: 0 };
      }

      let totalSize = 0;
      for (const file of filesResult.files) {
        const infoResult = await this.getPhotoInfo(file.path);
        if (infoResult.success) {
          totalSize += infoResult.info.size || 0;
        }
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
}

export const fileSystemService = new FileSystemService();
