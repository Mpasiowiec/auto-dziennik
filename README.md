# Auto-Dziennik 🚗

Aplikacja do śledzenia historii pojazdu, wydatków i przypomnień o konserwacji. **100% offline-first** - wszystkie dane przechowywane lokalnie na urządzeniu, przygotowana do Capacitor (Android/iOS).

## ✨ Cechy

- 📱 **Offline-First** - Działa bez internetu
- 💾 **Lokalne Przechowywanie** - Wszystkie dane w pliku `data.json`
- 📸 **Automatyczna Kompresja Zdjęć** - Oszczędzanie miejsca
- 🔔 **Przypomnienia** - Interwały km i miesięcy
- 📊 **Statystyki & Wykresy** - Analiza wydatków
- 🔄 **Import/Export** - JSON i CSV
- ⚡ **Szybkie i Lekkie** - React + Vite

## 🛠️ Technologia

- **Frontend:** React 19 + Vite
- **Przechowywanie:** `@capacitor/filesystem` (lokalnie na urządzeniu)
- **Kompresja:** Canvas API
- **Ikony:** Lucide React

## 🚀 Instalacja

```bash
# Klonowanie/pobranie
cd auto-dziennik

# Instalacja zależności
npm install

# Dev server
npm run dev

# Build (produkcja)
npm run build
```

## 📱 Capacitor (Android/iOS)

```bash
# Instalacja CLI
npm install -g @capacitor/cli

# Inicjalizacja Capacitor
npx cap init auto-dziennik pl.mpasiowiec.autodzienik

# Dodanie platformy
npx cap add android  # lub ios

# Budowanie i uruchomienie
npm run build
npx cap sync
npx cap open android
```

## 📁 Struktura Projektu

```
src/
├── App.jsx                  # Główny komponent aplikacji
├── dataManager.js          # Zarządzanie lokalnym stanem (data.json)
├── fileSystemService.js    # Obsługa zdjęć i plików
├── imageCompression.js     # Kompresja i transformacja zdjęć
├── App.css
├── index.css
└── main.jsx
```

## 💾 Przechowywanie Danych

Wszystkie dane są przechowywane w pliku `Documents/data.json`:

```json
{
  "vehicle": { ... },
  "logs": [ ... ]
}
```

Zdjęcia są przechowywane w: `Documents/vehicle_photos/{vehicleId}/`

## 🔍 Główne Funkcje

### Zarządzanie Pojazdem
- Rejestracja, VIN, kod silnika, specyfikacja oleju
- Bieżący przebieg
- Daty przeglądów i ubezpieczenia

### Historia Zdarzeń
- Data, kategoria (serwis/paliwo/eksploatacja/opłaty)
- Koszty (części + robocizna)
- Notatki i załączniki (zdjęcia dokumentów)
- Pobór paliwa i temperatura

### Przypomnienia
- Interwały co ile km
- Interwały co ile miesięcy
- Automatyczne wyliczanie statusu (piętro/ostrzeżenie/termin)
- Pełna lista z edytorem

### Katalog Części
- Nazwa części
- Numery OEM/kody zamienników

### Statystyki
- Łączne wydatki w roku
- Średnie spalanie
- Podział kosztów wg kategorii
- Filtry (rok, kategoria)

## 🎨 Interfejs

- **Motyw ciemny** - Wygodny dla oczu
- **Responsive Design** - Działa na mobilnych i desktopach
- **Ikony Lucide** - Nowoczesny design
- **Animacje CSS** - Płynne przejścia

## 📊 Export Danych

Aplikacja umożliwia export danych w dwóch formatach:

- **JSON** - Pełna kopia wszystkich danych (można zaimportować)
- **CSV** - Tabelaryczne dane do Excela

## ⚙️ Konfiguracja

### Kompresja Zdjęć

W `handleSubmit()` w `App.jsx`:

```javascript
const compressedBlob = await ImageCompression.compressFile(
  file,
  1024,  // maxWidth
  1024,  // maxHeight
  0.8    // quality (0-1)
);
```

Zmień parametry aby dostosować do swoich potrzeb:
- Wyższa rozdzielczość = lepsza jakość, większe pliki
- Wyższe quality = lepsza jakość, większe pliki

## 📖 Dokumentacja

Szczegółowa dokumentacja migracji z Supabase: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

## 🐛 Troubleshooting

### Aplikacja ładuje się bez danych

```javascript
// W dev tools (F12):
await dataManager.initialize();
console.log(dataManager.data);
```

### Reset danych (OSTRZEŻENIE: traci wszystkie dane!)

```javascript
const { DEFAULT_DATA } = await import('./dataManager.js');
dataManager.data = { ...DEFAULT_DATA };
await dataManager.saveData();
```

## 📝 Notatki

- Aplikacja jest **w pełni offline** - nie wymaga internetu
- Dane **nie synchronizują się** automatycznie między urządzeniami
- Regularnie eksportuj JSON jako kopię zapasową
- Kompresja zdjęć zmniejsza zużycie miejsca ~80%

## 🔗 Usunięte Zależności

- ❌ `@supabase/supabase-js` - Nie jest już potrzebne
- ❌ Zmienne env Supabase - Można usunąć z `.env`

## ✅ Dodane Zależności

- ✅ `@capacitor/core` - Łącznik z systemem
- ✅ `@capacitor/filesystem` - Operacje na plikach
- ✅ `@capacitor/app` - Integracja z aplikacją

## 📄 Licencja

Projekt jest open-source. Użytkowanie na własny użytek.

---

**Gotowe do pracy offline!** 🎉
