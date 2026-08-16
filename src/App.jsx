import React, { useState, useEffect } from 'react';
import { dataManager } from './dataManager';
import { fileSystemService } from './fileSystemServiceWeb';
import ImageCompression from './imageCompression';
import { 
  Car, Fuel, Wrench, Plus, FileText, DollarSign, Edit2, Trash2, 
  Settings, ChevronDown, ChevronUp, Save, Trash, Calendar, Bell, 
  ShieldCheck, PieChart, ArrowLeft, Filter, Download, X, AlertTriangle 
} from 'lucide-react';

import './App.css';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

export default function App() {
  // Funkcja pomocnicza - musi być zdefiniowana PRZED użyciem w useState
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stany widoków
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'stats'
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Stan rozwijania listy przypomnień w podglądzie auta
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);

  // Stan rozwinięcia długich opisów w historii
  const [expandedLogIds, setExpandedLogIds] = useState([]);

  // Stany filtrów w widoku statystyk
  const [filterYear, setFilterYear] = useState('2026');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dynamiczna lista przypomnień
  const [remindersList, setRemindersList] = useState([]);

  // Formularz auta
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    license_plate: '',
    vin: '',
    engine_code: '',
    oil_spec: '',
    current_mileage: '',
    inspection_date: '',
    insurance_date: ''
  });

  const [partsList, setPartsList] = useState([]);

  // Formularz logu
  const [formData, setFormData] = useState({
    date: getTodayString(),
    category: 'serwis',
    title: '',
    mileage: '',
    cost_parts: '',
    cost_labor: '',
    fuel_liters: '',
    is_full_tank: true,
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    setLoading(true);
    try {
      // Inicjalizacja DataManager - ładuje dane.json lub tworzy domyślne
      await dataManager.initialize();
      fetchData();
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoading(false);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      // Pobranie pojazdu z lokalnego storage
      const currentCar = dataManager.getVehicle();
      const safeVehicle = currentCar && typeof currentCar === 'object' ? currentCar : {
        id: '1',
        name: 'Mój Samochód',
        license_plate: '',
        vin: '',
        engine_code: '',
        oil_spec: '',
        current_mileage: 0,
        inspection_date: '',
        insurance_date: '',
        parts_list: [],
        reminders_list: [],
      };

      setVehicle(safeVehicle);

      setVehicleForm({
        name: safeVehicle.name || '',
        license_plate: safeVehicle.license_plate || '',
        vin: safeVehicle.vin || '',
        engine_code: safeVehicle.engine_code || '',
        oil_spec: safeVehicle.oil_spec || '',
        current_mileage: safeVehicle.current_mileage || 0,
        inspection_date: safeVehicle.inspection_date || '',
        insurance_date: safeVehicle.insurance_date || ''
      });

      setPartsList(Array.isArray(safeVehicle.parts_list) ? safeVehicle.parts_list : []);
      setRemindersList(Array.isArray(safeVehicle.reminders_list) && safeVehicle.reminders_list.length > 0 ? safeVehicle.reminders_list : []);

      // Pobranie logów z lokalnego storage
      const logsData = Array.isArray(dataManager.getLogs()) ? dataManager.getLogs() : [];
      setLogs(logsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }

  // ZARZĄDZANIE PRZYPOMNIENIAMI
  function handleAddReminderRow() {
    setRemindersList([
      ...remindersList, 
      { id: Date.now().toString(), name: '', interval_km: 10000, interval_months: 12, last_km: vehicle?.current_mileage || 0, last_date: getTodayString() }
    ]);
  }

  function handleReminderChange(id, field, value) {
    setRemindersList(remindersList.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function handleRemoveReminderRow(id) {
    setRemindersList(remindersList.filter(r => r.id !== id));
  }

  // ZARZĄDZANIE CZĘŚCIAMI
  function handleAddPartRow() {
    setPartsList([...partsList, { id: Date.now().toString(), name: '', code: '' }]);
  }

  function handlePartChange(id, field, value) {
    setPartsList(partsList.map(part => part.id === id ? { ...part, [field]: value } : part));
  }

  function handleRemovePartRow(id) {
    setPartsList(partsList.filter(part => part.id !== id));
  }

  // ZAPIS AUTA ORAZ ZAPIS PRZYPOMNIEŃ DO LOKALNEGO STORAGE
  async function handleSaveVehicle(e) {
    e.preventDefault();
    try {
      const updatedMileage = Number(vehicleForm.current_mileage) || vehicle.current_mileage;
      const cleanedParts = partsList.filter(p => p.name.trim() !== '' || p.code.trim() !== '');
      const cleanedReminders = remindersList.filter(r => r.name.trim() !== '');

      const result = await dataManager.updateVehicle({
        name: vehicleForm.name,
        license_plate: vehicleForm.license_plate,
        vin: vehicleForm.vin,
        engine_code: vehicleForm.engine_code,
        oil_spec: vehicleForm.oil_spec,
        current_mileage: updatedMileage,
        inspection_date: vehicleForm.inspection_date || null,
        insurance_date: vehicleForm.insurance_date || null,
        parts_list: cleanedParts,
        reminders_list: cleanedReminders
      });

      if (result.success) {
        setIsEditingVehicle(false);
        fetchData();
      } else {
        alert('Błąd podczas zapisywania danych: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Błąd podczas zapisywania: ' + error.message);
    }
  }

  function toggleExpandLog(id) {
    if (expandedLogIds.includes(id)) {
      setExpandedLogIds(expandedLogIds.filter(logId => logId !== id));
    } else {
      setExpandedLogIds([...expandedLogIds, id]);
    }
  }

  function handleOpenAdd() {
    setEditingLogId(null);
    setFormData({
      date: getTodayString(),
      category: 'serwis',
      title: '',
      mileage: vehicle?.current_mileage || '',
      cost_parts: '',
      cost_labor: '',
      fuel_liters: '',
      is_full_tank: true,
      notes: '',
    });
    setFile(null);
    setCurrentAttachmentUrl(null);
    setShowModal(true);
  }

  function handleOpenEdit(log) {
    setEditingLogId(log.id);
    setFormData({
      date: log.date || getTodayString(),
      category: log.category,
      title: log.title,
      mileage: log.mileage || '',
      cost_parts: log.cost_parts || '',
      cost_labor: log.cost_labor || '',
      fuel_liters: log.fuel_liters || '',
      is_full_tank: log.is_full_tank ?? true,
      notes: log.notes || '',
    });
    setFile(null);
    setCurrentAttachmentUrl(log.attachment_url);
    setShowModal(true);
  }

  function getAttachmentMimeType(path) {
    const extension = path.split('.').pop()?.toLowerCase();

    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      gif: 'image/gif',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  async function handleOpenAttachment(attachmentPath) {
    if (!attachmentPath) {
      alert('Brak załącznika do otwarcia.');
      return;
    }

    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        const fileInfo = await Filesystem.getUri({
          path: attachmentPath,
          directory: Directory.Documents,
        });
   
        console.log('ATTACHMENT_FILE_URI', {
          attachmentPath,
          uri: fileInfo.uri,
          mimeType: getAttachmentMimeType(attachmentPath),
        });

        await FileOpener.open({
          filePath: fileInfo.uri,
          contentType: getAttachmentMimeType(attachmentPath),
          openWithDefault: true,
        });

        return;
      }

      window.open(attachmentPath, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('ATTACHMENT_OPEN_ERROR', {
        attachmentPath,
        message: error?.message,
        error,
      });

      alert(
        `Nie udało się otworzyć załącznika.\n\nSzczegóły: ${
          error?.message || JSON.stringify(error)
        }`
      );
    }
  }

  async function handleDelete(id) {
    if (window.confirm('Czy na pewno chcesz usunąć ten wpis z historii?')) {
      try {
        const result = await dataManager.deleteLog(id);
        if (result.success) {
          fetchData();
        } else {
          alert('Błąd podczas usuwania wpisu');
        }
      } catch (error) {
        console.error('Error deleting log:', error);
        alert('Błąd podczas usuwania: ' + error.message);
      }
    }
  }

  function exportData(format) {
    const dataToExport = { vehicle, logs };
    let mimeType = 'application/json';
    let fileExtension = 'json';
    let fileContent = '';

    if (format === 'json') {
      fileContent = JSON.stringify(dataToExport, null, 2);
    } else if (format === 'csv') {
      mimeType = 'text/csv;charset=utf-8;';
      fileExtension = 'csv';
      const headers = ['Data', 'Kategoria', 'Tytuł', 'Przebieg (km)', 'Koszt Części (zł)', 'Koszt Robocizny (zł)', 'Suma (zł)', 'Paliwo (L)', 'Notatki', 'Załącznik'];
      const rows = logs.map(l => [
        l.date,
        l.category,
        `"${(l.title || '').replace(/"/g, '""')}"`,
        l.mileage || 0,
        l.cost_parts || 0,
        l.cost_labor || 0,
        (Number(l.cost_parts || 0) + Number(l.cost_labor || 0)).toFixed(2),
        l.fuel_liters || '',
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        l.attachment_url || ''
      ]);
      fileContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dziennik_auto_${vehicle?.license_plate || 'backup'}_${getTodayString()}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const currentYear = new Date().getFullYear().toString();
  const currentYearCost = logs
    .filter(item => item.date && item.date.startsWith(currentYear))
    .reduce((acc, item) => acc + Number(item.cost_parts || 0) + Number(item.cost_labor || 0), 0);

  const fuelLogs = logs.filter(l => l.category === 'paliwo' && l.fuel_liters).sort((a, b) => a.mileage - b.mileage);
  let avgConsumption = null;
  if (fuelLogs.length >= 2) {
    const totalLiters = fuelLogs.slice(1).reduce((acc, curr) => acc + Number(curr.fuel_liters), 0);
    const distance = fuelLogs[fuelLogs.length - 1].mileage - fuelLogs[0].mileage;
    if (distance > 0) avgConsumption = ((totalLiters / distance) * 100).toFixed(2);
  }

  // OBLICZANIE STATUSU PRZYPOMNIEŃ
  
  function getLastLogForReminder(reminderName) {
    // Szukamy logów, które zawierają nazwę przypomnienia (np. "Olej")
    const matchingLogs = logs.filter(log => 
      log.title.toLowerCase().includes(reminderName.toLowerCase())
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    return matchingLogs[0] || null;
  }

  function calculateReminderStatus(reminder) {
    // Sprawdź czy jest wpis w historii
    const lastLog = getLastLogForReminder(reminder.name);
    
    // Użyj danych z logu jeśli istnieje, w przeciwnym razie z konfiguracji
    const lastKm = lastLog ? Number(lastLog.mileage) : Number(reminder.last_km);
    const lastDateStr = lastLog ? lastLog.date : (reminder.last_date || getTodayString());

    const intervalKm = Number(reminder.interval_km) || 0;
    const intervalMonths = Number(reminder.interval_months) || 0;
    
    let kmText = null;
    let timeText = null;
    let isOverdue = false;
    let isWarning = false;

    if (intervalKm > 0 && vehicle) {
      const kmPassed = vehicle.current_mileage - lastKm;
      const kmRemaining = intervalKm - kmPassed;
      if (kmRemaining <= 0) {
        kmText = `${Math.abs(kmRemaining).toLocaleString()} km po terminie`;
        isOverdue = true;
      } else {
        kmText = `za ${kmRemaining.toLocaleString()} km`;
        if (kmRemaining < 2000) isWarning = true;
      }
    }

    if (intervalMonths > 0) {
      const lastDate = new Date(lastDateStr);
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + intervalMonths);
      const today = new Date();
      const daysRemaining = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        timeText = `${Math.abs(daysRemaining)} dni po terminie`;
        isOverdue = true;
      } else {
        timeText = `za ${daysRemaining} dni`;
        if (daysRemaining < 30) isWarning = true;
      }
    }

    let color = '#10b981';
    if (isOverdue) color = '#ef4444';
    else if (isWarning) color = '#f59e0b';

    return { kmText, timeText, color, isOverdue, isWarning, isUrgent: isOverdue || isWarning, lastDateStr };
  }

  const urgentReminders = remindersList
    .map(r => ({ ...r, status: calculateReminderStatus(r) }))
    .filter(r => r.status.isUrgent);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      let attachment_path = currentAttachmentUrl;

      // Obsługa zdjęć i plików - kompresja + zapis do lokalnego systemu
      if (file) {
        // Kompresja zdjęcia jeśli to obraz
        if (ImageCompression.isImageFile(file)) {
          try {
            const compressedBlob = await ImageCompression.compressFile(file, 1024, 1024, 0.8);
            const compressedFile = ImageCompression.blobToFile(compressedBlob, file.name);
            
            const saveResult = await fileSystemService.savePhotoLocally(
              compressedFile, 
              vehicle.id,
              { maxWidth: 1024, maxHeight: 1024, quality: 0.8 }
            );
            
            if (saveResult.success) {
              attachment_path = saveResult.path;
            } else {
              alert('Błąd podczas zapisywania zdjęcia: ' + saveResult.error);
              return;
            }
          } catch (error) {
            console.error('Error compressing/saving image:', error);
            alert('Błąd podczas przetwarzania zdjęcia');
            return;
          }
        } else {
          // Jeśli nie jest to obraz, zapisz normalnie (bez kompresji)
          const fileExt = file.name.split('.').pop();
          const fileName = `attachment_${Date.now()}.${fileExt}`;
          const dirPath = `vehicle_files/${vehicle.id}`;
          
          try {
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            await Filesystem.writeFile({
              path: `${dirPath}/${fileName}`,
              data: base64Data,
              directory: Directory.Documents,
              recursive: true,
            });

            attachment_path = `${dirPath}/${fileName}`;
          } catch (error) {
            console.error('Error saving file:', error);
            alert('Błąd podczas zapisywania pliku');
            return;
          }
        }
      }

      const currentVehicle = vehicle || dataManager.getVehicle();
      const mileageNum = Number(formData.mileage) || Number(currentVehicle?.current_mileage || 0);
      const payload = {
        date: formData.date,
        category: formData.category,
        title: formData.title,
        mileage: mileageNum,
        cost_parts: Number(formData.cost_parts) || 0,
        cost_labor: Number(formData.cost_labor) || 0,
        fuel_liters: formData.category === 'paliwo' ? Number(formData.fuel_liters) : null,
        is_full_tank: formData.is_full_tank,
        notes: formData.notes,
        attachment_url: attachment_path
      };

      let result;
      if (editingLogId) {
        result = await dataManager.updateLog(editingLogId, payload);
      } else {
        result = await dataManager.addLog(payload);
      }

      if (result.success) {
        // Aktualizacja przebiegu pojazdu jeśli nowy przebieg jest większy
        if (currentVehicle && mileageNum > Number(currentVehicle.current_mileage || 0)) {
          await dataManager.updateMileage(mileageNum);
        }

        setShowModal(false);
        fetchData();
      } else {
        alert('Błąd podczas zapisywania wpisu: ' + result.error);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Błąd podczas zapisywania: ' + error.message);
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchYear = filterYear === 'all' || (log.date && log.date.startsWith(filterYear));
    const matchCat = filterCategory === 'all' || log.category === filterCategory;
    return matchYear && matchCat;
  });

  const filteredTotalCost = filteredLogs.reduce((acc, item) => acc + Number(item.cost_parts || 0) + Number(item.cost_labor || 0), 0);

  const categoryBreakdown = filteredLogs.reduce((acc, item) => {
    const cost = Number(item.cost_parts || 0) + Number(item.cost_labor || 0);
    acc[item.category] = (acc[item.category] || 0) + cost;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="auto-dziennik-app loading-screen">
        Ładowanie dziennika...
      </div>
    );
  }

  return (
  <div className="auto-dziennik-app">

    {/* NAGŁÓWEK */}
    <header className="app-header">
      <div className="header-vehicle">
        <div className="header-car-icon">
          <Car color="#38bdf8" size={24} />
        </div>

        <div>
          <h1>{vehicle?.name || 'Mój Pojazd'}</h1>

          <div className="header-meta">
            <div>
              Rejestracja:{' '}
              <strong className="plate-badge">
                {vehicle?.license_plate || 'Brak'}
              </strong>
            </div>

            <div>
              Przebieg:{' '}
              <strong className="mileage-value">
                {vehicle?.current_mileage?.toLocaleString()} km
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          onClick={() => setShowVehicleDetails(!showVehicleDetails)}
          className="button button-secondary"
        >
          <Settings size={16} />
          Dane Auta
          {showVehicleDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="button button-primary"
        >
          <Plus size={16} />
          Wpis
        </button>
      </div>
    </header>

    {/* WIDOK 1: EKRAN GŁÓWNY */}
    {currentView === 'main' && (
      <>
        {/* SEKCJA PRZYPOMNIEŃ NA EKRANIE GŁÓWNYM - PILNE */}
        {urgentReminders.length > 0 && (
          <div className="urgent-reminders">
            <div className="urgent-reminders-title">
              <AlertTriangle size={15} color="#f59e0b" />
              Wymagają uwagi (Pilne Przypomnienia):
            </div>

            {urgentReminders.map(reminder => (
              <div
                key={reminder.id}
                className="urgent-reminder-card"
                style={{ '--reminder-color': reminder.status.color }}
              >
                <div className="urgent-reminder-name">
                  {reminder.name}
                </div>

                <div className="urgent-reminder-status">
                  {reminder.status.kmText && <div>{reminder.status.kmText}</div>}
                  {reminder.status.timeText && <div>{reminder.status.timeText}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PANEL DANYCH AUTA & WSZYSTKICH PRZYPOMNIEŃ */}
        {showVehicleDetails && (
          <div className="vehicle-panel">
            <div className="section-header">
              <h3 className="section-heading">
                <Wrench size={16} />
                Konfiguracja Auta & Wszystkie Przypomnienia
              </h3>

              {!isEditingVehicle && (
                <button
                  type="button"
                  onClick={() => setIsEditingVehicle(true)}
                  className="button button-ghost button-ghost-muted"
                >
                  <Edit2 size={14} />
                  Edytuj
                </button>
              )}
            </div>

            {isEditingVehicle ? (
              <form onSubmit={handleSaveVehicle} className="form-stack">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Nazwa auta</label>
                    <input
                      className="form-control form-control-compact"
                      type="text"
                      value={vehicleForm.name}
                      onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Nr Rejestracyjny</label>
                    <input
                      className="form-control form-control-compact"
                      type="text"
                      value={vehicleForm.license_plate}
                      onChange={e => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">VIN</label>
                    <input
                      className="form-control form-control-compact"
                      type="text"
                      value={vehicleForm.vin}
                      onChange={e => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Kod Silnika / Moc</label>
                    <input
                      className="form-control form-control-compact"
                      type="text"
                      value={vehicleForm.engine_code}
                      onChange={e => setVehicleForm({ ...vehicleForm, engine_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Specyfikacja Oleju i Ilość</label>
                  <input
                    className="form-control form-control-compact"
                    type="text"
                    value={vehicleForm.oil_spec}
                    onChange={e => setVehicleForm({ ...vehicleForm, oil_spec: e.target.value })}
                  />
                </div>

                {/* EDYCJA PRZYPOMNIEŃ */}
                <div className="reminders-editor">
                  <div className="reminders-editor-header">
                    <label className="editor-label">
                      Edycja Przypomnień i Interwałów
                    </label>

                    <button
                      type="button"
                      onClick={handleAddReminderRow}
                      className="button button-primary button-small"
                    >
                      <Plus size={12} />
                      Dodaj Nowe
                    </button>
                  </div>

                  <div className="reminder-list">
                    {remindersList.map(r => (
                      <div key={r.id} className="reminder-row">
                        <div className="reminder-name-row">
                          <input
                            className="form-control"
                            type="text"
                            placeholder="Nazwa przypomnienia"
                            value={r.name}
                            onChange={e => handleReminderChange(r.id, 'name', e.target.value)}
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveReminderRow(r.id)}
                            className="button button-ghost button-ghost-danger"
                            aria-label={`Usuń przypomnienie ${r.name || 'bez nazwy'}`}
                            title="Usuń przypomnienie"
                          >
                            <Trash size={14} />
                          </button>
                        </div>

                        <div className="reminder-fields">
                          <div className="form-field">
                            <label className="form-label">Co ile km</label>
                            <input
                              className="form-control"
                              type="number"
                              value={r.interval_km}
                              onChange={e => handleReminderChange(r.id, 'interval_km', e.target.value)}
                            />
                          </div>

                          <div className="form-field">
                            <label className="form-label">Co ile mies.</label>
                            <input
                              className="form-control"
                              type="number"
                              value={r.interval_months}
                              onChange={e => handleReminderChange(r.id, 'interval_months', e.target.value)}
                            />
                          </div>

                          <div className="form-field">
                            <label className="form-label">Ostatni km</label>
                            <input
                              className="form-control"
                              type="number"
                              value={r.last_km}
                              onChange={e => handleReminderChange(r.id, 'last_km', e.target.value)}
                            />
                          </div>

                          <div className="form-field">
                            <label className="form-label">Ostatnia data</label>
                            <input
                              className="form-control"
                              type="date"
                              value={r.last_date}
                              onChange={e => handleReminderChange(r.id, 'last_date', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KATALOG CZĘŚCI */}
                <div className="parts-catalog">
                  <div className="parts-catalog-header">
                    <label className="catalog-label">
                      Katalog Części & Zamienników
                    </label>

                    <button
                      type="button"
                      onClick={handleAddPartRow}
                      className="button button-primary button-small"
                    >
                      <Plus size={12} />
                      Dodaj Część
                    </button>
                  </div>

                  <div className="parts-list">
                    {partsList.map(part => (
                      <div key={part.id} className="part-row">
                        <input
                          className="form-control form-control-compact part-name"
                          type="text"
                          placeholder="Nazwa"
                          value={part.name}
                          onChange={e => handlePartChange(part.id, 'name', e.target.value)}
                        />

                        <input
                          className="form-control form-control-compact part-code"
                          type="text"
                          placeholder="Numer OEM/Kod"
                          value={part.code}
                          onChange={e => handlePartChange(part.id, 'code', e.target.value)}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemovePartRow(part.id)}
                          className="button button-ghost button-ghost-danger"
                          aria-label={`Usuń część ${part.name || 'bez nazwy'}`}
                          title="Usuń część"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setIsEditingVehicle(false)}
                    className="button button-secondary button-small"
                  >
                    Anuluj
                  </button>

                  <button
                    type="submit"
                    className="button button-success button-small"
                  >
                    <Save size={14} />
                    Zapisz Zmiany
                  </button>
                </div>
              </form>
            ) : (
              <div className="info-stack">
                {/* PODGLĄD WSZYSTKICH PRZYPOMNIEŃ */}
                <div className="reminders-preview">
                  <button
                    type="button"
                    onClick={() => setIsRemindersOpen(!isRemindersOpen)}
                    className="reminder-toggle"
                  >
                    <span className="reminder-toggle-content">
                      <Bell size={14} />
                      Pełna Lista Przypomnień i Interwałów ({remindersList.length})
                    </span>

                    <span className="reminder-toggle-action">
                      <span>{isRemindersOpen ? 'Zwiń' : 'Rozwiń'}</span>
                      {isRemindersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isRemindersOpen && (
                    <div className="reminder-preview-list">
                      {remindersList.map(r => {
                        const status = calculateReminderStatus(r);

                        return (
                          <div
                            key={r.id}
                            className="reminder-preview-row"
                            style={{ '--reminder-color': status.color }}
                          >
                            <div>
                              <div className="reminder-preview-name">{r.name}</div>
                              <div className="reminder-preview-interval">
                                Interwał:{' '}
                                {r.interval_km ? `${r.interval_km.toLocaleString()} km` : '—'}
                                {' / '}
                                {r.interval_months ? `${r.interval_months} mies.` : '—'}
                              </div>
                            </div>

                            <div className="reminder-preview-status">
                              {status.kmText && <div>{status.kmText}</div>}
                              {status.timeText && <div>{status.timeText}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="vehicle-info-grid info-card">
                  <div>
                    <span className="info-label">Rejestracja:</span>{' '}
                    <strong className="info-value info-value-plate">
                      {vehicle?.license_plate || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="info-label">Kod Silnika:</span>{' '}
                    <strong className="info-value">
                      {vehicle?.engine_code || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="info-label">VIN:</span>{' '}
                    <strong className="info-value">
                      {vehicle?.vin || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="info-label">Olej:</span>{' '}
                    <strong className="info-value">
                      {vehicle?.oil_spec || '—'}
                    </strong>
                  </div>
                </div>

                {partsList.length > 0 && (
                  <div className="parts-catalog">
                    <div className="parts-title">
                      Katalog Części & Zamienników:
                    </div>

                    <div className="parts-preview-list">
                      {partsList.map(part => (
                        <div key={part.id} className="part-preview-row">
                          <span className="part-preview-name">{part.name}:</span>
                          <span className="part-preview-code">{part.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="backup-row">
                  <span className="backup-label">Kopia zapasowa danych:</span>

                  <div className="backup-actions">
                    <button
                      type="button"
                      onClick={() => exportData('json')}
                      className="button button-secondary button-small button-ghost-info"
                    >
                      <Download size={12} />
                      JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => exportData('csv')}
                      className="button button-secondary button-small button-success"
                    >
                      <Download size={12} />
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KAFELKI PODSUMOWANIA */}
        <div className="summary-grid">
          <div
            onClick={() => setCurrentView('stats')}
            className="summary-card summary-card-clickable"
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setCurrentView('stats');
              }
            }}
          >
            <div className="summary-label">
              <DollarSign size={14} color="#10b981" />
              Wydatki {currentYear} r. ➔
            </div>

            <div className="summary-value">
              {currentYearCost.toFixed(2)} zł
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">
              <Fuel size={14} color="#f59e0b" />
              Średnie Spalanie
            </div>

            <div className="summary-value">
              {avgConsumption ? `${avgConsumption} L/100km` : 'Brak danych'}
            </div>
          </div>
        </div>

        {/* HISTORIA ZDARZEŃ */}
        <h2 className="history-heading">Historia Zdarzeń</h2>

        <div className="history-list">
          {logs.length === 0 ? (
            <div className="empty-state">
              Brak wpisów. Kliknij „Wpis”, aby rozpocząć!
            </div>
          ) : (
            logs.map(log => {
              const isExpanded = expandedLogIds.includes(log.id);
              const titleLength = log.title ? log.title.length : 0;
              const isTitleTooLong = titleLength > 35;
              const hasNotes = Boolean(log.notes && log.notes.trim().length > 0);
              const canExpand = isTitleTooLong || hasNotes;

              const shortTitle = isTitleTooLong
                ? `${log.title.substring(0, 35)}...`
                : log.title;

              const categoryClass = log.category === 'paliwo'
                ? 'category-fuel'
                : log.category === 'serwis'
                  ? 'category-service'
                  : 'category-other';

              return (
                <div key={log.id} className="log-card">
                  {/* STAŁY GÓRNY WIERSZ: Kategoria, skrócony tytuł i koszt */}
                  <div className="log-header">
                    <div className="log-title-group">
                      <span className={`category-badge ${categoryClass}`}>
                        {log.category}
                      </span>

                      <span className="log-title" title={log.title}>
                        {shortTitle}
                      </span>
                    </div>

                    <div className="log-cost">
                      {(Number(log.cost_parts) + Number(log.cost_labor)).toFixed(2)} zł
                    </div>
                  </div>

                  {/* METADANE */}
                  <div className="log-meta">
                    <Calendar size={12} color="#38bdf8" />
                    {log.date} • {log.mileage?.toLocaleString()} km
                    {log.fuel_liters && ` • Wlano: ${log.fuel_liters} L`}
                  </div>

                  {/* PEŁNY TYTUŁ I NOTATKI PO ROZWINIĘCIU */}
                  {isExpanded && (
                    <div className="log-expanded">
                      {isTitleTooLong && (
                        <div className="log-expanded-block">
                          <div className="log-expanded-label">
                            Pełny opis / tytuł:
                          </div>

                          <div className="log-full-title">
                            {log.title}
                          </div>
                        </div>
                      )}

                      {hasNotes && (
                        <div className="log-expanded-block">
                          <div className="log-expanded-label log-expanded-label-muted">
                            Notatki:
                          </div>

                          <div className="log-notes">
                            {log.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STOPKA KARTY Z AKCJAMI */}
                  <div className="log-footer">
                    <div>
                      {canExpand && (
                        <button
                          type="button"
                          onClick={() => toggleExpandLog(log.id)}
                          className="button button-ghost button-ghost-info"
                        >
                          {isExpanded ? '▲ Zwiń opisy' : '▼ Wyświetl więcej...'}
                        </button>
                      )}
                    </div>

                    <div className="log-actions">
                      {log.attachment_url && (
                        <button
                          type="button"
                          onClick={() => handleOpenAttachment(log.attachment_url)}
                          className="button button-ghost button-ghost-info attachment-link"
                        >
                          <FileText size={12} />
                          Załącznik
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(log)}
                        className="button button-ghost button-ghost-muted"
                        aria-label={`Edytuj wpis: ${log.title}`}
                        title="Edytuj wpis"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(log.id)}
                        className="button button-ghost button-ghost-danger"
                        aria-label={`Usuń wpis: ${log.title}`}
                        title="Usuń wpis"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </>
        )}

        {/* WIDOK 2: STATYSTYKI */}
        {currentView === 'stats' && (
          <div>
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="button button-secondary stats-back-button"
            >
              <ArrowLeft size={16} />
              Powrót do ekranu głównego
            </button>

            <h2 className="stats-heading">
              <PieChart color="#38bdf8" />
              Raport Finansowy & Analiza Wydatków
            </h2>

            <div className="stats-filter-bar">
              <div className="stats-filter-label">
                <Filter size={16} />
                Filtruj:
              </div>

              <select
                value={filterYear}
                onChange={event => setFilterYear(event.target.value)}
                className="form-control"
              >
                <option value="2026">Rok 2026</option>
                <option value="2025">Rok 2025</option>
                <option value="all">Wszystkie lata</option>
              </select>

              <select
                value={filterCategory}
                onChange={event => setFilterCategory(event.target.value)}
                className="form-control"
              >
                <option value="all">Wszystkie kategorie</option>
                <option value="serwis">Serwis / Naprawa</option>
                <option value="eksploatacja">Eksploatacja (Olej/Filtry)</option>
                <option value="paliwo">Paliwo</option>
                <option value="oplaty">Opłaty / OC / Przegląd</option>
              </select>
            </div>

            <div className="stats-total-card">
              <div className="stats-total-label">
                Suma wydatków dla wybranych kryteriów:
              </div>

              <div className="stats-total-value">
                {filteredTotalCost.toFixed(2)} zł
              </div>
            </div>

            <div className="stats-card">
              <h3>Podział Kosztów wg Kategorii</h3>

              <div className="stats-breakdown">
                {Object.keys(categoryBreakdown).length === 0 ? (
                  <div className="empty-state">
                    Brak danych dla wybranych filtrów
                  </div>
                ) : (
                  Object.entries(categoryBreakdown).map(([cat, amount]) => {
                    const percentage = filteredTotalCost > 0
                      ? ((amount / filteredTotalCost) * 100).toFixed(1)
                      : 0;

                    const progressClass = cat === 'paliwo'
                      ? 'progress-fuel'
                      : cat === 'serwis'
                        ? 'progress-service'
                        : cat === 'eksploatacja'
                          ? 'progress-maintenance'
                          : 'progress-other';

                    return (
                      <div key={cat}>
                        <div className="stats-breakdown-row">
                          <span className="stats-breakdown-category">{cat}</span>
                          <span>
                            {amount.toFixed(2)} zł ({percentage}%)
                          </span>
                        </div>

                        <div className="progress-track">
                          <div
                            className={`progress-bar ${progressClass}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        
    {/* MODAL WPISU */}
    {showModal && (
      <div className="modal-backdrop">
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="entry-modal-title"
        >
          <div className="modal-header">
            <h3 id="entry-modal-title" className="modal-title">
              {editingLogId ? 'Edytuj Wpis' : 'Nowy Wpis do Dziennika'}
            </h3>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="button button-ghost button-ghost-muted"
              aria-label="Zamknij formularz wpisu"
              title="Zamknij"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Data</label>
                <input
                  className="form-control"
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Kategoria</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="serwis">Serwis / Naprawa</option>
                  <option value="eksploatacja">Eksploatacja (Olej/Filtry)</option>
                  <option value="paliwo">Paliwo</option>
                  <option value="oplaty">Opłaty / OC / Przegląd</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Tytuł / Nazwa usługi</label>
              <input
                className="form-control"
                type="text"
                placeholder="np. Wymiana oleju i filtrów"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Przebieg (km)</label>
                <input
                  className="form-control"
                  type="number"
                  value={formData.mileage}
                  onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                  required
                />
              </div>

              {formData.category === 'paliwo' && (
                <div className="form-field">
                  <label className="form-label">Litry Paliwa</label>
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    value={formData.fuel_liters}
                    onChange={e => setFormData({ ...formData, fuel_liters: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Koszt Części (zł)</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  value={formData.cost_parts}
                  onChange={e => setFormData({ ...formData, cost_parts: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Koszt Robocizny (zł)</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  value={formData.cost_labor}
                  onChange={e => setFormData({ ...formData, cost_labor: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Załącznik / Skan paragonu</label>
              <input
                className="form-control"
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files[0])}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Notatki</label>
              <textarea
                className="form-control"
                rows="2"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="button button-secondary"
              >
                Anuluj
              </button>

              <button
                type="submit"
                className="button button-primary"
              >
                Zapisz
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    </div>
  );
}