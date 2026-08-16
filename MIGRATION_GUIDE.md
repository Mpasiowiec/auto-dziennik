# Migracja na Architekturę Offline-First (Lokalną)

Przewodnik przebudowy aplikacji z Supabase na architekturę lokalną przygotowaną do Capacitor.

## 📋 Co się zmieniło?

### Architektura

```
PRZED (Supabase Cloud)
├─ App.jsx
├─ supabaseClient.js → Połączenie z Supabase
└─ Dane w chmurze (https://supabase.io)

PO (Offline-First Local)
├─ App.jsx (zmieniony)
├─ dataManager.js      → Zarządzanie stanem lokalnym
├─ fileSystemService.js → Obsługa zdjęć lokalnie
├─ imageCompression.js  → Kompresja zdjęć
└─ Documents/data.json  → Lokalny plik z danymi
```

## 🆕 Nowe Moduły

### 1. **dataManager.js** - Zarządzanie lokalnymi danymi
Zastępuje zapytania do Supabase. Przechowuje wszystkie dane w pliku `data.json`:

```javascript
import { dataManager } from './dataManager';

// Inicjalizacja (ładuje data.json lub tworzy domyślne)
await dataManager.initialize();

// Operacje na pojazde
const vehicle = dataManager.getVehicle();
await dataManager.updateVehicle({ name: 'Nowa Nazwa' });
await dataManager.updateMileage(150000);

// Operacje na logach
const logs = dataManager.getLogs();
await dataManager.addLog({ date, category, title, ... });
await dataManager.updateLog(logId, updates);
await dataManager.deleteLog(logId);

// Operacje na przypomnieniach
const reminders = dataManager.getReminders();
await dataManager.updateReminders(remindersList);

// Operacje na częściach
const parts = dataManager.getParts();
await dataManager.updateParts(partsList);
```

### 2. **fileSystemService.js** - Zarządzanie zdjęciami
Używa `@capacitor/filesystem` do zapisywania/odczytywania zdjęć:

```javascript
import { fileSystemService } from './fileSystemService';

// Zapis zdjęcia z automatyczną kompresją
const saveResult = await fileSystemService.savePhotoLocally(
  imageFile,
  vehicleId,
  { maxWidth: 1024, maxHeight: 1024, quality: 0.8 }
);
// Zwraca: { success: boolean, path: string, size: number }

// Odczyt zdjęcia
const photoDataUrl = await fileSystemService.getPhotoDataUrl(filePath);

// Usunięcie zdjęcia
await fileSystemService.deletePhoto(filePath);

// Lista zdjęć pojazdu
const photos = await fileSystemService.listVehiclePhotos(vehicleId);
```

### 3. **imageCompression.js** - Kompresja zdjęć
Zmniejsza rozdzielczość i wagę przed zapisem:

```javascript
import ImageCompression from './imageCompression';

// Kompresja pliku
const compressedBlob = await ImageCompression.compressFile(
  file,
  1024, // maxWidth
  1024, // maxHeight
  0.8   // quality
);

// Sprawdzenie, czy to zdjęcie
if (ImageCompression.isImageFile(file)) { ... }

// Sprawdzenie rozmiaru
if (ImageCompression.isSizeValid(file, 50)) { ... } // 50MB
```

## 🔧 Zmienione Funkcje w App.jsx

### `initializeApp()` - NOWE
Inicjalizuje aplikację i DataManager:
```javascript
async function initializeApp() {
  await dataManager.initialize(); // Ładuje data.json
  fetchData();
}
```

### `fetchData()`
**Przed:**
```javascript
const { data: vehicles } = await supabase.from('vehicles').select('*');
```

**Po:**
```javascript
const currentCar = dataManager.getVehicle();
const logsData = dataManager.getLogs();
```

### `handleSaveVehicle()`
**Przed:**
```javascript
await supabase.from('vehicles').update(...).eq('id', vehicle.id);
```

**Po:**
```javascript
const result = await dataManager.updateVehicle({...});
if (result.success) { fetchData(); }
```

### `handleDelete()`
**Przed:**
```javascript
await supabase.from('logs').delete().eq('id', id);
```

**Po:**
```javascript
const result = await dataManager.deleteLog(id);
if (result.success) { fetchData(); }
```

### `handleSubmit()` - NAJWIĘKSZA ZMIANA
**Przed:** Zdjęcia wysyłane do Supabase Storage
```javascript
const { error } = await supabase.storage.from('dokumenty-auta').upload(filePath, file);
```

**Po:** Zdjęcia kompresowane i zapisywane lokalnie
```javascript
const compressedBlob = await ImageCompression.compressFile(file, 1024, 1024, 0.8);
const saveResult = await fileSystemService.savePhotoLocally(compressedFile, vehicle.id);
if (saveResult.success) {
  attachment_path = saveResult.path;
}
```

## 💾 Struktura data.json

Aplikacja automatycznie tworzy plik `Documents/data.json` w formacie:

```json
{
  "vehicle": {
    "id": "1",
    "name": "Mój Samochód",
    "license_plate": "WW1234A",
    "vin": "...",
    "engine_code": "...",
    "oil_spec": "5W30",
    "current_mileage": 150000,
    "inspection_date": "2024-12-15",
    "insurance_date": "2024-12-15",
    "parts_list": [
      { "id": "1", "name": "Filtr Oleju", "code": "MANN HU711/51x" }
    ],
    "reminders_list": [
      { "id": "1", "name": "Wymiana Oleju", "interval_km": 15000, "interval_months": 12, "last_km": 0, "last_date": "2026-08-15" }
    ]
  },
  "logs": [
    {
      "id": "1723740000000",
      "date": "2026-08-15",
      "category": "serwis",
      "title": "Wymiana oleju i filtrów",
      "mileage": 150000,
      "cost_parts": 150,
      "cost_labor": 0,
      "fuel_liters": null,
      "is_full_tank": true,
      "notes": "Olej VW 507.00",
      "attachment_url": "vehicle_photos/1/photo_1723740000000_abc123.jpg"
    }
  ]
}
```

## 📁 Struktura Plików Lokalnych

Zdjęcia i pliki są przechowywane w `Documents/`:

```
Documents/
├─ data.json                          (główny plik danych)
├─ vehicle_photos/
│  └─ 1/                             (folder pojazdu z ID=1)
│     ├─ photo_1723740000000_abc123.jpg
│     └─ photo_1723741000000_def456.jpg
└─ vehicle_files/
   └─ 1/
      └─ attachment_1723740000000.pdf
```

## 🚀 Jak Uruchomić

### 1. Instalacja Capacitor (jeśli nie jest zainstalowany)

```bash
# Zainstaluj globalne CLI Capacitor
npm install -g @capacitor/cli

# W projekcie: inicjalizacja Capacitor
npx cap init auto-dziennik pl.mpasiowiec.autodzienik

# Dodaj platformę
npx cap add android  # lub ios
```

### 2. Aplikacja Web (Dev Mode)

```bash
npm run dev
```

Aplikacja będzie działać w przeglądarce, a `data.json` będzie przechowywany w IndexedDB (emulacja lokalnego systemu plików).

### 3. Aplikacja Android/iOS

```bash
npm run build
npx cap sync
npx cap open android   # lub ios
```

Na urządzeniu fizycznym dane będą przechowywane w `Documents/` urządzenia.

## ⚙️ Konfiguracja Kompresji Zdjęć

Edytuj parametry w `handleSubmit()` w `App.jsx`:

```javascript
const compressedBlob = await ImageCompression.compressFile(
  file,
  1024,  // ← Zmień na większą wartość dla lepszej jakości (np. 2048)
  1024,  // ← Zmień na większą wartość dla lepszej jakości
  0.8    // ← Jakość JPEG (0-1), zmień na 0.9 dla lepszej jakości
);
```

## 🔄 Eksport/Import Danych

Aplikacja posiada przyciski do eksportu danych:

- **JSON** - Pełna kopia wszystkich danych (można zaimportować później)
- **CSV** - Wykres historii wydatków

Funkcje `exportData()` w `App.jsx` działają nadal w pełni.

## ⚠️ Ważne Uwagi

### 1. Pierwsza Inicjalizacja
Przy pierwszym uruchomieniu aplikacja:
- Sprawdza, czy istnieje `data.json`
- Jeśli nie istnieje, tworzy domyślną strukturę
- Nie wymagane żadne pobieranie danych z sieci

### 2. Brak Synchronizacji Między Urządzeniami
Dane są przechowywane **wyłącznie lokalnie**. Jeśli chcesz zsynchronizować między urządzeniami:
- Eksportuj JSON z jednego urządzenia
- Importuj na drugim urządzeniu
- Lub użyj Capacitor Cloud Sync (jeśli włączysz)

### 3. Kopie Zapasowe
Regularnie exportuj dane (JSON) lub synchronizuj z chmurą:
```javascript
// Ręczny export
const exportedData = dataManager.exportAsJson();
// Zapisz w pliku lub wyślij na serwer
```

### 4. Limity Pamięci
- **Web:** Ograniczone do ~5-50MB w IndexedDB (zależy od przeglądarki)
- **Android/iOS:** Praktycznie nieograniczone (aż do wolnego miejsca na urządzeniu)
- Kompresja zdjęć zmniejsza zużycie pamieci ~80%

## 🐛 Debugging

### Sprawdzenie zawartości data.json

W dev tools przeglądarki (F12):
```javascript
// Wczytaj dane
await dataManager.initialize();
console.log(dataManager.data);
```

### Czyszczenie danych

```javascript
// Zresetuj do domyślnych (UWAGA: traci wszystkie dane!)
dataManager.data = { ...DEFAULT_DATA };
await dataManager.saveData();
```

### Logi
Wszystkie operacje są logowane w konsoli przeglądarki (wyszukaj `✓` lub `✗`).

## 📦 Dependencje

Zmienione w `package.json`:

**Usunięte:**
- `@supabase/supabase-js`

**Dodane:**
- `@capacitor/core` - Główny pakiet Capacitor
- `@capacitor/filesystem` - Obsługa plików lokalnych
- `@capacitor/app` - Łącznik z systemem operacyjnym

## 🎯 Następne Kroki

1. **Test na urządzeniu Android/iOS** - Sprawdź, czy zdjęcia kompresują się prawidłowo
2. **Integracja backup'u** - Dodaj automatyczny export danych do chmury (Google Drive, iCloud, etc.)
3. **Sync Capacitor Cloud** - Jeśli chcesz zsynchronizować między urządzeniami
4. **Obsługa offline** - Aplikacja jest już offline-first, ale możesz dodać Service Worker

---

**Gratulacje!** 🎉 Twoja aplikacja jest teraz w pełni niezależna od Supabase i gotowa do pracy offline!
