/**
 * DataManager - Zarządzanie lokalnym stanem i plikiem data.json
 * Replaces Supabase with local JSON file storage via Capacitor Filesystem
 * Fallback: localStorage na web
 */

let Filesystem, Directory, Encoding;
let useLocalStorage = false;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

// Spróbuj załadować Capacitor Filesystem
try {
  // Dynamic import dla uniknięcia błędu w bundle'u
  if (typeof window !== 'undefined') {
    const capacitorModule = window.__CAPACITOR__ || {};
    if (capacitorModule.Filesystem) {
      Filesystem = capacitorModule.Filesystem;
      Directory = capacitorModule.Directory;
      Encoding = capacitorModule.Encoding;
    } else {
      useLocalStorage = true;
    }
  } else {
    useLocalStorage = true;
  }
} catch (error) {
  useLocalStorage = true;
}

const DATA_FILE_NAME = 'data.json';
const STORAGE_KEY = 'auto_dziennik_data';
const DEFAULT_DATA = {
  vehicle: {
    id: '1',
    name: 'Mój Samochód',
    license_plate: '',
    vin: '',
    engine_code: '',
    oil_spec: '5W30',
    current_mileage: 0,
    inspection_date: null,
    insurance_date: null,
    parts_list: [
      { id: '1', name: 'Filtr Oleju', code: 'MANN HU711/51x' },
      { id: '2', name: 'Filtr Powietrza', code: 'BOSCH F026400010' }
    ],
    reminders_list: [
      { 
        id: '1', 
        name: 'Wymiana Oleju i Filtrów', 
        interval_km: 15000, 
        interval_months: 12, 
        last_km: 0, 
        last_date: new Date().toISOString().split('T')[0] 
      },
      { 
        id: '2', 
        name: 'Przegląd Techniczny', 
        interval_km: 0, 
        interval_months: 12, 
        last_km: 0, 
        last_date: new Date().toISOString().split('T')[0] 
      },
      { 
        id: '3', 
        name: 'Ubezpieczenie OC/AC', 
        interval_km: 0, 
        interval_months: 12, 
        last_km: 0, 
        last_date: new Date().toISOString().split('T')[0] 
      },
      { 
        id: '4', 
        name: 'Wymiana Rozrządu', 
        interval_km: 90000, 
        interval_months: 60, 
        last_km: 0, 
        last_date: new Date().toISOString().split('T')[0] 
      }
    ]
  },
  logs: []
};

class DataManager {
  constructor() {
    this.data = deepClone(DEFAULT_DATA);
    this.initialized = false;
  }

  normalizeData(rawData) {
    const safeData = rawData && typeof rawData === 'object' ? rawData : {};
    const baseVehicle = deepClone(DEFAULT_DATA.vehicle);
    const vehicle = safeData.vehicle && typeof safeData.vehicle === 'object' ? safeData.vehicle : {};
    const normalizedVehicle = {
      ...baseVehicle,
      ...vehicle,
      parts_list: Array.isArray(vehicle.parts_list) ? vehicle.parts_list : baseVehicle.parts_list,
      reminders_list: Array.isArray(vehicle.reminders_list) ? vehicle.reminders_list : baseVehicle.reminders_list,
    };

    return {
      vehicle: normalizedVehicle,
      logs: Array.isArray(safeData.logs) ? safeData.logs : [],
    };
  }

  /**
   * Inicjalizacja - ładowanie danych z pliku lub tworzenie domyślnych
   */
  async initialize() {
    try {
      // Spróbuj załadować z Capacitor Filesystem (mobile)
      if (Filesystem && !useLocalStorage) {
        try {
          const fileContent = await Filesystem.readFile({
            path: DATA_FILE_NAME,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });

          const parsedData = JSON.parse(fileContent.data || '{}');
          this.data = this.normalizeData(parsedData);
          console.log('✓ Data loaded from data.json (Filesystem)');
          this.initialized = true;
          return;
        } catch (error) {
          if (error.code === 'ENOENT' || error.message?.includes('not found')) {
            console.log('✓ First run detected, creating default data.json');
            this.data = deepClone(DEFAULT_DATA);
            await this.saveData();
            this.initialized = true;
            return;
          } else {
            console.warn('Filesystem error, falling back to localStorage:', error);
            useLocalStorage = true;
          }
        }
      }

      // Fallback: localStorage (web)
      const savedData = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          this.data = this.normalizeData(parsedData);
          console.log('✓ Data loaded from localStorage');
        } catch (error) {
          console.warn('Invalid localStorage data, resetting to defaults:', error);
          this.data = deepClone(DEFAULT_DATA);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
          }
        }
      } else {
        console.log('✓ First run detected, using default data');
        this.data = deepClone(DEFAULT_DATA);
        await this.saveData();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing DataManager:', error);
      this.data = deepClone(DEFAULT_DATA);
      this.initialized = true;
    }
  }

  /**
   * Zapisanie całych danych do data.json
   */
  async saveData() {
    try {
      const jsonString = JSON.stringify(this.data, null, 2);
      
      // Spróbuj zapisać do Capacitor Filesystem (mobile)
      if (Filesystem && !useLocalStorage) {
        try {
          await Filesystem.writeFile({
            path: DATA_FILE_NAME,
            data: jsonString,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true,
          });
          console.log('✓ Data saved to data.json (Filesystem)');
          return { success: true };
        } catch (error) {
          console.warn('Filesystem save error, falling back to localStorage:', error);
          useLocalStorage = true;
        }
      }
      
      // Fallback: localStorage (web)
      localStorage.setItem(STORAGE_KEY, jsonString);
      console.log('✓ Data saved to localStorage');
      return { success: true };
    } catch (error) {
      console.error('Error saving data:', error);
      return { success: false, error };
    }
  }

  // ==================== VEHICLE OPERATIONS ====================

  /**
   * Pobranie danych pojazdu
   */
  getVehicle() {
    return this.data?.vehicle || deepClone(DEFAULT_DATA.vehicle);
  }

  /**
   * Aktualizacja danych pojazdu
   */
  async updateVehicle(updates) {
    try {
      this.data.vehicle = { ...this.data.vehicle, ...updates };
      await this.saveData();
      return { success: true, data: this.data.vehicle };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Aktualizacja przebiegu pojazdu
   */
  async updateMileage(newMileage) {
    try {
      const mileageNum = Number(newMileage) || this.data.vehicle.current_mileage;
      this.data.vehicle.current_mileage = mileageNum;
      await this.saveData();
      return { success: true, data: this.data.vehicle };
    } catch (error) {
      return { success: false, error };
    }
  }

  // ==================== LOGS OPERATIONS ====================

  /**
   * Pobranie wszystkich logów posortowanych malejąco
   */
  getLogs() {
    if (!Array.isArray(this.data?.logs)) {
      this.data.logs = [];
    }
    return [...this.data.logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Dodanie nowego logu
   */
  async addLog(logData) {
    try {
      const newLog = {
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        ...logData
      };
      
      this.data.logs.push(newLog);
      await this.saveData();
      return { success: true, data: newLog };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Aktualizacja logu
   */
  async updateLog(logId, updates) {
    try {
      const logIndex = this.data.logs.findIndex(l => l.id === logId);
      if (logIndex === -1) {
        return { success: false, error: 'Log not found' };
      }
      
      this.data.logs[logIndex] = { ...this.data.logs[logIndex], ...updates };
      await this.saveData();
      return { success: true, data: this.data.logs[logIndex] };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Usunięcie logu
   */
  async deleteLog(logId) {
    try {
      this.data.logs = this.data.logs.filter(l => l.id !== logId);
      await this.saveData();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Pobranie logu po ID
   */
  getLogById(logId) {
    return this.data.logs.find(l => l.id === logId);
  }

  // ==================== REMINDERS OPERATIONS ====================

  /**
   * Pobranie listy przypomnień
   */
  getReminders() {
    return this.data.vehicle.reminders_list || [];
  }

  /**
   * Aktualizacja listy przypomnień
   */
  async updateReminders(remindersList) {
    try {
      this.data.vehicle.reminders_list = remindersList;
      await this.saveData();
      return { success: true, data: remindersList };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Dodanie nowego przypomnienia
   */
  async addReminder(reminder) {
    try {
      const newReminder = {
        id: Date.now().toString(),
        ...reminder
      };
      this.data.vehicle.reminders_list.push(newReminder);
      await this.saveData();
      return { success: true, data: newReminder };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Usunięcie przypomnienia
   */
  async removeReminder(reminderId) {
    try {
      this.data.vehicle.reminders_list = 
        this.data.vehicle.reminders_list.filter(r => r.id !== reminderId);
      await this.saveData();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // ==================== PARTS OPERATIONS ====================

  /**
   * Pobranie listy części
   */
  getParts() {
    return this.data.vehicle.parts_list || [];
  }

  /**
   * Aktualizacja listy części
   */
  async updateParts(partsList) {
    try {
      this.data.vehicle.parts_list = partsList;
      await this.saveData();
      return { success: true, data: partsList };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Dodanie nowej części
   */
  async addPart(part) {
    try {
      const newPart = {
        id: Date.now().toString(),
        ...part
      };
      this.data.vehicle.parts_list.push(newPart);
      await this.saveData();
      return { success: true, data: newPart };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Usunięcie części
   */
  async removePart(partId) {
    try {
      this.data.vehicle.parts_list = 
        this.data.vehicle.parts_list.filter(p => p.id !== partId);
      await this.saveData();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // ==================== EXPORT/IMPORT ====================

  /**
   * Eksport całych danych jako JSON
   */
  exportAsJson() {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import danych z JSON
   */
  async importFromJson(jsonString) {
    try {
      const importedData = JSON.parse(jsonString);
      this.data = importedData;
      await this.saveData();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid JSON' };
    }
  }
}

// Singleton instance
export const dataManager = new DataManager();
