# 🏗️ Architektura Aplikacji - Offline-First

Szczegółowy opis jak działają komponenty aplikacji i jak wzajemnie się komunikują.

## 📊 Diagram Architektyry

```
┌─────────────────────────────────────────────────────────────┐
│                        App.jsx                              │
│              (Główny Komponent React)                       │
│  - Zarządzanie stanem (vehicle, logs, form, UI)            │
│  - Obsługiwanie interakcji użytkownika                      │
│  - Renderowanie UI                                          │
└──────┬──────────────────────────────────────┬───────────────┘
       │                                      │
       ├─────────────────┬────────────────────┤
       │                 │                    │
       ▼                 ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  DataManager │  │FileSystemService │  │ImageCompression  │
│   (LocalDB)  │  │   (Files/Photos) │  │   (Image Utils)  │
│              │  │                  │  │                  │
│ • getVehicle│  │• savePhotoLocally │  │• compressFile    │
│ • updateLog │  │• deletePhoto      │  │• isImageFile     │
│ • addLog     │  │• getPhotoDataUrl  │  │• isSizeValid     │
│ • ...        │  │• ...              │  │• ...             │
└──────┬───────┘  └──────┬───────────┘  └──────────────────┘
       │                  │
       └──────────┬───────┘
                  │
       ┌──────────▼────────────────────┐
       │ @capacitor/filesystem         │
       │  (Native File System Access)  │
       └──────────┬────────────────────┘
                  │
       ┌──────────▼────────────────────┐
       │  Device Storage               │
       │  Documents/data.json          │
       │  Documents/vehicle_photos/    │
       │  Documents/vehicle_files/     │
       └───────────────────────────────┘
```

## 🔄 Przepływ Danych

### 1. Inicjalizacja Aplikacji

```
App.jsx (useEffect)
  │
  ├─ await dataManager.initialize()
  │    ├─ Filesystem.readFile('data.json')
  │    │   ├─ Jeśli istnieje: Parsuj JSON
  │    │   ├─ Jeśli nie: Stwórz domyślną strukturę
  │    │   └─ Zapisz data.json
  │    └─ dataManager.data ← załadowany JSON
  │
  └─ fetchData()
       ├─ const vehicle = dataManager.getVehicle()
       ├─ const logs = dataManager.getLogs()
       └─ setVehicle, setLogs (state update)
```

### 2. Zapis Wpisu z Zdjęciem

```
handleSubmit()
  │
  ├─ Jeśli jest file:
  │    │
  │    ├─ ImageCompression.compressFile()
  │    │    ├─ FileReader.readAsDataURL()
  │    │    ├─ Image.onload
  │    │    ├─ Canvas.drawImage()
  │    │    ├─ Canvas.toBlob(quality=0.8)
  │    │    └─ return compressedBlob
  │    │
  │    ├─ FileSystemService.savePhotoLocally()
  │    │    ├─ blobToBase64(compressedBlob)
  │    │    ├─ Filesystem.writeFile()
  │    │    │   ├─ path: vehicle_photos/1/photo_123.jpg
  │    │    │   ├─ directory: Directory.Documents
  │    │    │   ├─ data: base64String
  │    │    │   └─ recursive: true
  │    │    └─ return { success, path, size }
  │    │
  │    └─ attachment_url ← path
  │
  ├─ Payload = { date, category, title, ..., attachment_url }
  │
  ├─ DataManager.addLog(payload)
  │    ├─ newLog = { id, created_at, ...payload }
  │    ├─ dataManager.data.logs.push(newLog)
  │    ├─ Filesystem.writeFile()
  │    │   ├─ path: data.json
  │    │   ├─ data: JSON.stringify(dataManager.data)
  │    └─ return { success, data }
  │
  ├─ DataManager.updateMileage() [jeśli nowy przebieg]
  │
  └─ fetchData() [odśwież UI]
```

### 3. Wyświetlanie Zdjęcia

```
<img src={photoUrl} />
  │
  └─ Jeśli attachment_url zawiera ścieżkę:
      │
      ├─ FileSystemService.getPhotoDataUrl(attachment_url)
      │    │
      │    ├─ Filesystem.readFile(path)
      │    │   ├─ directory: Directory.Documents
      │    │   └─ return base64 string
      │    │
      │    └─ return `data:image/jpeg;base64,${base64}`
      │
      └─ Browser renderuje obrazek z data URL
```

## 📁 Struktura Danych

### data.json (Główny Plik)

```javascript
{
  vehicle: {
    id: string,
    name: string,
    license_plate: string,
    vin: string,
    engine_code: string,
    oil_spec: string,
    current_mileage: number,
    inspection_date: string | null,
    insurance_date: string | null,
    
    // Embedded arrays
    parts_list: [
      { id: string, name: string, code: string }
    ],
    reminders_list: [
      { 
        id: string,
        name: string,
        interval_km: number,
        interval_months: number,
        last_km: number,
        last_date: string
      }
    ]
  },
  
  logs: [
    {
      id: string,
      date: string,
      category: 'serwis' | 'eksploatacja' | 'paliwo' | 'oplaty',
      title: string,
      mileage: number,
      cost_parts: number,
      cost_labor: number,
      fuel_liters: number | null,
      is_full_tank: boolean,
      notes: string,
      attachment_url: string | null,
      created_at: string
    }
  ]
}
```

### Struktura Plików

```
Device Storage (Documents/)
├── data.json                          ← Główny plik (∼50-500KB)
│
├── vehicle_photos/                    ← Zdjęcia pojazdu
│   └── 1/                            ← Vehicle ID
│       ├── photo_1723740000000_abc.jpg (∼100-300KB kompresowane)
│       ├── photo_1723741000000_def.jpg
│       └── ...
│
└── vehicle_files/                    ← Inne pliki
    └── 1/
        ├── attachment_1723740000000.pdf
        └── ...
```

## 🔐 Bezpieczeństwo & Integracja Danych

```
┌─ Lokalne Przechowywanie ─────────────────┐
│  data.json (JSON -> Tekst)              │
│  └─ Nieszyfrowany (domyślnie)           │
│     └─ Na produkcję: rozważ AES-256     │
└─────────────────────────────────────────┘

┌─ Zdjęcia ────────────────────────────────┐
│  Przechowywane jako:                    │
│  - Base64 w localStorage (web)          │
│  - JPEG na dysku (mobile)               │
│  - Kompresowane @80% quality            │
│  - ∼80% zmniejszenie rozmiaru            │
└─────────────────────────────────────────┘

┌─ Integracja ─────────────────────────────┐
│  Brak synchronizacji ze chmurą (default)│
│  Można dodać: Google Drive, iCloud, S3  │
│  Import/Export JSON jako backup         │
└─────────────────────────────────────────┘
```

## ⚙️ Klasy & API

### DataManager

```javascript
class DataManager {
  // Inicjalizacja
  async initialize()
  
  // Vehicle Operations
  getVehicle() → vehicle
  async updateVehicle(updates) → { success, data, error }
  async updateMileage(newMileage) → { success, data, error }
  
  // Logs Operations
  getLogs() → logs[]
  async addLog(logData) → { success, data, error }
  async updateLog(logId, updates) → { success, data, error }
  async deleteLog(logId) → { success, error }
  getLogById(logId) → log
  
  // Reminders Operations
  getReminders() → reminders[]
  async updateReminders(remindersList) → { success, data, error }
  async addReminder(reminder) → { success, data, error }
  async removeReminder(reminderId) → { success, error }
  
  // Parts Operations
  getParts() → parts[]
  async updateParts(partsList) → { success, data, error }
  
  // Storage
  async saveData() → { success, error }
  exportAsJson() → string
  async importFromJson(jsonString) → { success, error }
}
```

### FileSystemService

```javascript
class FileSystemService {
  // Photo Management
  async savePhotoLocally(imageFile, vehicleId, options) 
    → { success, path, fileName, size, error }
  
  async readPhoto(filePath) 
    → { success, data, mimeType, error }
  
  async getPhotoDataUrl(filePath) 
    → string (data URL)
  
  async deletePhoto(filePath) 
    → { success, error }
  
  // Directory Management
  async listVehiclePhotos(vehicleId) 
    → { success, files, error }
  
  async deleteVehiclePhotosDirectory(vehicleId) 
    → { success, error }
  
  async getVehiclePhotosSize(vehicleId) 
    → { success, totalSize, count, files, error }
  
  // Utilities
  async getPhotoInfo(filePath) 
    → { success, info, error }
}
```

### ImageCompression

```javascript
class ImageCompression {
  // Compression
  static async compressFile(file, maxWidth, maxHeight, quality)
    → Blob
  
  static async compressFromUrl(imageUrl, maxWidth, maxHeight, quality)
    → Blob
  
  // Conversion
  static blobToFile(blob, filename) → File
  static async fileToBase64(file) → string
  static base64ToBlob(base64String, mimeType) → Blob
  
  // Validation
  static isImageFile(file) → boolean
  static isSizeValid(file, maxSizeMB) → boolean
}
```

## 🔄 State Management (React)

```javascript
// Na poziomie App.jsx

// Vehicle Data
const [vehicle, setVehicle] = useState(null);

// Logs Data
const [logs, setLogs] = useState([]);

// UI State
const [currentView, setCurrentView] = useState('main'); // 'main' | 'stats'
const [showModal, setShowModal] = useState(false);
const [editingLogId, setEditingLogId] = useState(null);
const [loading, setLoading] = useState(true);

// Form Data
const [vehicleForm, setVehicleForm] = useState({ ... });
const [formData, setFormData] = useState({ ... });
const [file, setFile] = useState(null);

// Lists (Editable)
const [remindersList, setRemindersList] = useState([]);
const [partsList, setPartsList] = useState([]);

// UI Control
const [isEditingVehicle, setIsEditingVehicle] = useState(false);
const [expandedLogIds, setExpandedLogIds] = useState([]);
const [filterYear, setFilterYear] = useState('2026');
const [filterCategory, setFilterCategory] = useState('all');
```

## 📊 Performance Considerations

### Pamięć (Memory)

```
data.json size (typical):
- Vehicle + reminders: 5-10KB
- 500 logów: 100-200KB
- Total: 105-210KB (mały!)

Zdjęcia:
- Przed kompresją: 2-4MB (telefon)
- Po kompresji: 200-400KB (80% zmniejszenie)
- 100 zdjęć: 20-40MB (manageable)
```

### Szybkość (Speed)

```
dataManager.initialize(): 50-100ms (czyt pliku)
dataManager.getLogs(): <1ms (w pamięci)
fileSystemService.savePhotoLocally(): 200-500ms (kompresja + zapis)
ImageCompression.compressFile(): 100-300ms (canvas operations)
```

### Optymalizacje

1. **Memoization** - Dodaj React.memo() dla list
2. **Lazy Loading** - Załaduj zdjęcia on-demand
3. **Pagination** - Dla dużo logów (>500)
4. **IndexedDB** - Na web zamiast LocalStorage (5MB limit)

## 🌍 Kompatybilność

### Platforms

- ✅ **Web** - Chrome, Firefox, Safari, Edge
- ✅ **Android** - API 21+ (4.5+)
- ✅ **iOS** - iOS 12+

### Capacitor Plugins Wymagane

- `@capacitor/core` ← Główny API
- `@capacitor/filesystem` ← Odczyt/zapis plików
- `@capacitor/app` ← Lifecycle aplikacji

### Opcjonalne (Przyszłość)

- `@capacitor/camera` ← Bezpośredni dostęp do aparatu
- `@capacitor/camera-gallery` ← Galeria
- `@capacitor/share` ← Udostępnianie danych
- `@capacitor/geolocation` ← GPS (do logowania lokalizacji serwisu)

---

## 🚀 Rozszerzenia & Ulepszenia

### Tier 1: MVP (Current)
- ✅ Offline przechowywanie danych
- ✅ Kompresja zdjęć
- ✅ CRUD operacje
- ✅ Statystyki

### Tier 2: Enhancement
- 🔲 Capacitor Camera (zdjęcia bezpośrednio z aparatu)
- 🔲 Encryption (szyfrowanie data.json)
- 🔲 Cloud Sync (opcjonalny backup)
- 🔲 Dark/Light mode toggle

### Tier 3: Advanced
- 🔲 OCR (tesseract.js do czytania paragonów)
- 🔲 Service Worker (PWA)
- 🔲 Geolocation (GPS koordynaty serwisu)
- 🔲 Share funkcjonalność
- 🔲 Notifications (przypomnienia o przeglądach)

---

## 📚 Referencje

- [Capacitor Filesystem API](https://capacitorjs.com/docs/apis/filesystem)
- [Canvas toBlob Compression](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [React Hooks](https://react.dev/reference/react)

---

**Architektura gotowa do skali!** 🎯
