/**
 * ImageCompression - Kompresja zdjęć przed zapisem
 * Zmniejsza rozdzielczość i wagę pliku
 */

class ImageCompression {
  /**
   * Kompresja zdjęcia z pliku
   * @param {File} file - Plik zdjęcia
   * @param {number} maxWidth - Maksymalna szerokość (px)
   * @param {number} maxHeight - Maksymalna wysokość (px)
   * @param {number} quality - Jakość (0-1), domyślnie 0.8
   * @returns {Promise<Blob>} - Skompresowany plik
   */
  static async compressFile(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            
            // Obliczanie nowych wymiarów z zachowaniem proporcji
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Konwersja na blob
            canvas.toBlob(
              (blob) => {
                const originalSize = (file.size / 1024).toFixed(2);
                const compressedSize = (blob.size / 1024).toFixed(2);
                console.log(
                  `✓ Image compressed: ${originalSize}KB → ${compressedSize}KB (${Math.round((blob.size / file.size) * 100)}%)`
                );
                resolve(blob);
              },
              'image/jpeg',
              quality
            );
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Kompresja zdjęcia z URL
   * @param {string} imageUrl - URL zdjęcia
   * @param {number} maxWidth - Maksymalna szerokość
   * @param {number} maxHeight - Maksymalna wysokość
   * @param {number} quality - Jakość
   * @returns {Promise<Blob>}
   */
  static async compressFromUrl(imageUrl, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              console.log(`✓ Image from URL compressed to ${(blob.size / 1024).toFixed(2)}KB`);
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = imageUrl;
    });
  }

  /**
   * Konwersja Blob na File
   * @param {Blob} blob - Blob do konwersji
   * @param {string} filename - Nazwa pliku
   * @returns {File}
   */
  static blobToFile(blob, filename = 'image.jpg') {
    return new File([blob], filename, { type: 'image/jpeg' });
  }

  /**
   * Konwersja File na Base64
   * @param {File} file - Plik do konwersji
   * @returns {Promise<string>}
   */
  static async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Konwersja Base64 na Blob
   * @param {string} base64String - String Base64
   * @param {string} mimeType - Typ MIME
   * @returns {Blob}
   */
  static base64ToBlob(base64String, mimeType = 'image/jpeg') {
    const sliceSize = 1024;
    const byteCharacters = atob(base64String.split(',')[1]);
    const bytesLength = byteCharacters.length;
    const slicesCount = Math.ceil(bytesLength / sliceSize);
    const byteArrays = new Array(slicesCount);
    
    for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
      const begin = sliceIndex * sliceSize;
      const end = Math.min(begin + sliceSize, bytesLength);
      const bytes = new Array(end - begin);
      for (let i = 0; i < bytes.length; ++i)
        bytes[i] = byteCharacters.charCodeAt(begin + i);
      byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: mimeType });
  }

  /**
   * Sprawdzenie, czy plik jest zdjęciem
   * @param {File} file - Plik do sprawdzenia
   * @returns {boolean}
   */
  static isImageFile(file) {
    return file && file.type.startsWith('image/');
  }

  /**
   * Sprawdzenie rozmiaru pliku
   * @param {File} file - Plik do sprawdzenia
   * @param {number} maxSizeMB - Maksymalny rozmiar w MB
   * @returns {boolean}
   */
  static isSizeValid(file, maxSizeMB = 50) {
    const fileSizeInMB = file.size / (1024 * 1024);
    return fileSizeInMB <= maxSizeMB;
  }
}

export default ImageCompression;
