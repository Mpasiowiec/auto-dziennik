# 🚀 Instalacja Capacitor - Krok po Kroku

Przewodnik by uruchomić aplikację na Android i iOS z lokalnym przechowywaniem danych.

## Wymagania Wstępne

### Na System

#### Windows
- **Node.js 16+** - [Pobierz](https://nodejs.org/)
- **Android Studio** (dla Android) - [Pobierz](https://developer.android.com/studio)
- **Xcode** (dla iOS, tylko macOS) - App Store

#### macOS
- **Node.js 16+**
- **Android Studio** lub **Xcode**

#### Linux
- **Node.js 16+**
- **Android Studio**
- Java Development Kit (JDK) 11+

### Sprawdzenie Instalacji

```bash
node --version      # Powinno być 16+
npm --version       # Powinno być 7+
java -version       # Dla Android SDK
```

## Krok 1: Instalacja Capacitor CLI

```bash
npm install -g @capacitor/cli
```

Sprawdzenie:
```bash
capacitor --version
```

## Krok 2: Inicjalizacja Capacitor w Projekcie

```bash
cd c:\Users\micha\auto-dziennik
npx cap init
```

Pojawią się pytania - odpowiedz:

```
? App name: auto-dziennik
? App Package ID: pl.mpasiowiec.autodzienik
? Which platforms do you want to use? (Use arrow keys)
  ❯ Android
    iOS
    Web
```

Możesz wybrać Android, iOS, lub oba.

## Krok 3: Dodanie Platformy

### Android

```bash
npx cap add android
```

Pliki będą utworzone w: `android/`

### iOS (tylko macOS)

```bash
npx cap add ios
```

Pliki będą utworzone w: `ios/`

## Krok 4: Budowanie Aplikacji

```bash
npm run build
```

Spowoduje to:
1. Zbudowanie optimized версії w folderze `dist/`
2. Przygotowanie aplikacji do mobilnego wdrożenia

## Krok 5: Synchronizacja z Platformami

Po każdej zmianie kodu:

```bash
npx cap sync
```

To skopiuje zmieniony kod do `android/` i `ios/`.

---

## 🤖 Uruchamianie na Android

### Krok 1: Otwórz Android Studio

```bash
npx cap open android
```

Lub otwórz ręcznie: `auto-dziennik/android/app/`

### Krok 2: Wybierz Emulator/Urządzenie

- **Emulator:** Zainstaluj w Android Studio (Tools → Virtual Device Manager)
- **Urządzenie fizyczne:** Podłącz via USB z włączonym Developer Mode

### Krok 3: Uruchom Aplikację

W Android Studio:
- Kliknij `Run` (▶️ button)
- Lub naciśnij `Shift + F10`

### Troubleshooting Android

**Problem:** "No devices found"
```bash
# Sprawdzenie podłączonych urządzeń
adb devices

# Jeśli brak - włącz USB Debugging na urządzeniu
# Settings → About Phone → Build Number (7x tap) → Developer Options → USB Debugging
```

**Problem:** Build error
```bash
# Wyczyść build
cd android
./gradlew clean
cd ..

# Rebuild
npm run build
npx cap sync
npx cap open android
```

---

## 🍎 Uruchamianie na iOS (macOS)

### Krok 1: Otwórz Xcode

```bash
npx cap open ios
```

Lub: `open auto-dziennik/ios/App/App.xcworkspace`

### Krok 2: Wybierz Simulator/Urządzenie

- **Simulator:** W Xcode: Product → Destination → Simulator
- **Urządzenie fizyczne:** Podłącz iPhone via USB

### Krok 3: Uruchom

W Xcode:
- Kliknij ▶️ Run
- Lub naciśnij `Cmd + R`

### Troubleshooting iOS

**Problem:** "Signing failed"
```
Xcode → Preferences → Accounts → dodaj Apple ID
Targets → Signing → Team (wybierz swoje konto)
```

**Problem:** "Build failed"
```bash
cd ios
rm -rf Pods Podfile.lock
cd ..
npx cap sync
npx cap open ios
```

---

## 🌐 Uruchamianie Web (Local Development)

```bash
npm run dev
```

Aplikacja będzie dostępna na `http://localhost:5173`

**Uwaga:** Na web data.json będzie przechowywana w IndexedDB (emulacja)

---

## 📱 Testowanie Lokalnego Przechowywania

### Na Android/iOS

Dane będą zapisane w: `/Documents/data.json`

Sprawdzenie poprzez Android Studio Device File Explorer:
1. View → Tool Windows → Device File Explorer
2. Navigate: `/data/data/pl.mpasiowiec.autodzienik/files/`
3. Znajdź: `data.json`

### Na Web (Browser)

Otwórz Dev Tools (F12):
```javascript
// W konsoli:
await dataManager.initialize();
console.log(dataManager.data);
```

Lub w Application → IndexedDB.

---

## 🔧 Integracja z VS Code

### 1. Instalacja Extensionów

- **Android Debug Bridge** - dla Android debugging
- **Xcode Build** - dla iOS (macOS)
- **REST Client** - do testowania API

### 2. Launch Configuration

Stwórz `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Android",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "pathMapping": {
        "/": "${workspaceRoot}/",
        "/dist": "${workspaceRoot}/dist"
      }
    }
  ]
}
```

---

## 🔄 Workflow Development

### Zmiana Kodu

```bash
# 1. Edytuj kod w VS Code
# src/App.jsx, src/dataManager.js, etc.

# 2. Build
npm run build

# 3. Sync z mobilem
npx cap sync

# 4. Refresh aplikacji na urządzeniu
# Android: adb shell input keyevent 82  (otwiera menu)
# iOS: Cmd + R w Xcode
```

### Hot Reload (Web Dev Mode)

```bash
npm run dev
# Zmiany w kodzie będą widoczne natychmiast w przeglądarce
```

---

## 📦 Build do Publikacji

### Android (Google Play)

```bash
# 1. Build release
cd android
./gradlew bundleRelease

# 2. Plik będzie w: android/app/build/outputs/bundle/release/app-release.aab
# 3. Prześlij do Google Play Console
```

### iOS (App Store)

```bash
# W Xcode:
# 1. Product → Archive
# 2. Organizer (Xcode → Window → Organizer)
# 3. Distribute App
# 4. App Store Connect
```

---

## 🚨 Częste Problemy

### Problem: "capacitor.js not found"

```bash
npm run build
npx cap sync
```

### Problem: "Could not find variant matching"

```bash
# Update Gradle
cd android
./gradlew wrapper --gradle-version 8.x
cd ..
```

### Problem: Zdjęcia się nie zapisują

```javascript
// Sprawdzenie uprawnień
import { Permissions } from '@capacitor/filesystem';
```

Dodaj do `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

---

## 📚 Przydatne Komendy

```bash
# Pełna lista komend Capacitor
npx cap

# Informacje o projekcie
npx cap doctor

# Podgląd runtime info
npx cap open web

# Czyszczenie build cache
rm -rf node_modules
npm install
npm run build
npx cap sync
```

---

## ✅ Checklist Przed Publikacją

- [ ] Testowanie na rzeczywistym urządzeniu Android
- [ ] Testowanie na rzeczywistym iPhone (jeśli możliwe)
- [ ] Sprawdzenie kompresji zdjęć (rozmiar files vs oryginały)
- [ ] Test offline - wyłącz internet i sprawdź czy aplikacja działa
- [ ] Export danych (JSON/CSV) - upewnij się że dane się eksportują
- [ ] Backup danych - przetestuj czy export i import działają
- [ ] Performance - sprawdź szybkość aplikacji z dużą ilością logów

---

## 🎉 Gotowe!

Aplikacja powinna teraz działać offline na Android i iOS!

Dalsze informacje:
- [Capacitor Documentation](https://capacitorjs.com/)
- [Android Developer Guide](https://developer.android.com/)
- [iOS Developer Guide](https://developer.apple.com/)
