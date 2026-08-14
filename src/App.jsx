import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Car, Fuel, Wrench, Plus, FileText, DollarSign, Edit2, Trash2, 
  Settings, ChevronDown, ChevronUp, Save, Trash, Calendar, Bell, 
  ShieldCheck, PieChart, ArrowLeft, Filter, Download, X, AlertTriangle 
} from 'lucide-react';

export default function App() {
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
  const getTodayString = () => new Date().toISOString().split('T')[0];

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
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    let { data: vehicles } = await supabase.from('vehicles').select('*');
    
    const defaultReminders = [
      { id: '1', name: 'Wymiana Oleju i Filtrów', interval_km: 15000, interval_months: 12, last_km: 145000, last_date: '2025-08-10' },
      { id: '2', name: 'Przegląd Techniczny', interval_km: 0, interval_months: 12, last_km: 0, last_date: '2025-09-01' },
      { id: '3', name: 'Ubezpieczenie OC/AC', interval_km: 0, interval_months: 12, last_km: 0, last_date: '2025-01-14' },
      { id: '4', name: 'Wymiana Rozrządu', interval_km: 90000, interval_months: 60, last_km: 210000, last_date: '2022-05-15' }
    ];

    if (!vehicles || vehicles.length === 0) {
      const { data: newCar } = await supabase
        .from('vehicles')
        .insert([{ 
          name: 'Mój Samochód', 
          current_mileage: 150000,
          oil_spec: '5W30 VW 507.00 - 4.3L',
          reminders_list: defaultReminders,
          parts_list: [
            { id: '1', name: 'Filtr Oleju', code: 'MANN HU711/51x' },
            { id: '2', name: 'Filtr Powietrza', code: 'BOSCH F026400010' }
          ]
        }])
        .select();
      vehicles = newCar;
    }

    const currentCar = vehicles[0];
    setVehicle(currentCar);
    
    setVehicleForm({
      name: currentCar.name || '',
      license_plate: currentCar.license_plate || '',
      vin: currentCar.vin || '',
      engine_code: currentCar.engine_code || '',
      oil_spec: currentCar.oil_spec || '',
      current_mileage: currentCar.current_mileage || 0,
      inspection_date: currentCar.inspection_date || '',
      insurance_date: currentCar.insurance_date || ''
    });

    setPartsList(Array.isArray(currentCar.parts_list) ? currentCar.parts_list : []);
    setRemindersList(Array.isArray(currentCar.reminders_list) && currentCar.reminders_list.length > 0 ? currentCar.reminders_list : defaultReminders);

    if (currentCar) {
      const { data: logsData } = await supabase
        .from('logs')
        .select('*')
        .eq('vehicle_id', currentCar.id)
        .order('date', { ascending: false });
      setLogs(logsData || []);
    }
    setLoading(false);
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

  // ZAPIS AUTA ORAZ ZAPIS PRZYPOMNIEŃ DO SUPABASE
  async function handleSaveVehicle(e) {
    e.preventDefault();
    const updatedMileage = Number(vehicleForm.current_mileage) || vehicle.current_mileage;
    const cleanedParts = partsList.filter(p => p.name.trim() !== '' || p.code.trim() !== '');
    const cleanedReminders = remindersList.filter(r => r.name.trim() !== '');

    const { error } = await supabase.from('vehicles').update({
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
    }).eq('id', vehicle.id);

    if (!error) {
      setIsEditingVehicle(false);
      fetchData();
    } else {
      alert('Błąd podczas zapisywania w bazie danych: ' + error.message);
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

  async function handleDelete(id) {
    if (window.confirm('Czy na pewno chcesz usunąć ten wpis z historii?')) {
      await supabase.from('logs').delete().eq('id', id);
      fetchData();
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff' }}>Ładowanie dziennika...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* NAGłÓWEK */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        padding: '16px 20px', 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '14px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            background: 'rgba(56, 189, 248, 0.1)', 
            padding: '10px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>
            <Car color="#38bdf8" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#f8fafc', letterSpacing: '-0.025em' }}>
              {vehicle?.name || 'Mój Pojazd'}
            </h1>
            <div style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>Rejestracja: <strong style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>{vehicle?.license_plate || 'Brak'}</strong></div>
              <div>Przebieg: <strong style={{ color: '#38bdf8' }}>{vehicle?.current_mileage?.toLocaleString()} km</strong></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowVehicleDetails(!showVehicleDetails)}
            style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            <Settings size={16} /> Dane Auta {showVehicleDetails ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          <button 
            onClick={handleOpenAdd}
            style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)' }}
          >
            <Plus size={16} /> Wpis
          </button>
        </div>
      </header>

      {/* WIDOK 1: EKRAN GŁÓWNY */}
      {currentView === 'main' && (
        <>
          {/* SEKCJA PRZYPOMNIEŃ NA EKRANIE GŁÓWNYM - PILNE */}
          {urgentReminders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} color="#f59e0b" /> Wymagają uwagi (Pilne Przypomnienia):
              </div>
              
              {urgentReminders.map(reminder => (
                <div key={reminder.id} style={{ background: '#1e293b', borderLeft: `4px solid ${reminder.status.color}`, padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>
                    {reminder.name}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: reminder.status.color, fontWeight: 'bold' }}>
                    {reminder.status.kmText && <div>{reminder.status.kmText}</div>}
                    {reminder.status.timeText && <div>{reminder.status.timeText}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PANEL DANYCH AUTA & WSZYSTKICH PRZYPOMNIEŃ */}
          {showVehicleDetails && (
            <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={16} /> Konfiguracja Auta & Wszystkie Przypomnienia
                </h3>
                {!isEditingVehicle && (
                  <button onClick={() => setIsEditingVehicle(true)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <Edit2 size={14} /> Edytuj
                  </button>
                )}
              </div>

              {isEditingVehicle ? (
                <form onSubmit={handleSaveVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Nazwa auta</label>
                      <input type="text" value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Nr Rejestracyjny</label>
                      <input type="text" value={vehicleForm.license_plate} onChange={e => setVehicleForm({...vehicleForm, license_plate: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>VIN</label>
                      <input type="text" value={vehicleForm.vin} onChange={e => setVehicleForm({...vehicleForm, vin: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Kod Silnika / Moc</label>
                      <input type="text" value={vehicleForm.engine_code} onChange={e => setVehicleForm({...vehicleForm, engine_code: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8' }}>Specyfikacja Oleju i Ilość</label>
                    <input type="text" value={vehicleForm.oil_spec} onChange={e => setVehicleForm({...vehicleForm, oil_spec: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                  </div>

                  {/* EDYCJA PRZYPOMNIEŃ */}
                  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>Edycja Przypomnień i Interwałów</label>
                      <button type="button" onClick={handleAddReminderRow} style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={12}/> Dodaj Nowe
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {remindersList.map(r => (
                        <div key={r.id} style={{ background: '#1e293b', padding: '8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input type="text" placeholder="Nazwa przypomnienia" value={r.name} onChange={e => handleReminderChange(r.id, 'name', e.target.value)} style={{ flex: 2, padding: '4px 6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '12px' }} />
                            <button type="button" onClick={() => handleRemoveReminderRow(r.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash size={14}/></button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', fontSize: '10px' }}>
                            <div>
                              <span style={{ color: '#94a3b8' }}>Co ile km:</span>
                              <input type="number" value={r.interval_km} onChange={e => handleReminderChange(r.id, 'interval_km', e.target.value)} style={{ width: '100%', padding: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>Co ile mies:</span>
                              <input type="number" value={r.interval_months} onChange={e => handleReminderChange(r.id, 'interval_months', e.target.value)} style={{ width: '100%', padding: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>Ostatni km:</span>
                              <input type="number" value={r.last_km} onChange={e => handleReminderChange(r.id, 'last_km', e.target.value)} style={{ width: '100%', padding: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>Ostatnia data:</span>
                              <input type="date" value={r.last_date} onChange={e => handleReminderChange(r.id, 'last_date', e.target.value)} style={{ width: '100%', padding: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KATALOG CZĘŚCI */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>Katalog Części & Zamienników</label>
                      <button type="button" onClick={handleAddPartRow} style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={12}/> Dodaj Część
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {partsList.map((part) => (
                        <div key={part.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input type="text" placeholder="Nazwa" value={part.name} onChange={(e) => handlePartChange(part.id, 'name', e.target.value)} style={{ flex: 1, padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} />
                          <input type="text" placeholder="Numer OEM/Kod" value={part.code} onChange={(e) => handlePartChange(part.id, 'code', e.target.value)} style={{ flex: 2, padding: '6px', borderRadius: '4px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} />
                          <button type="button" onClick={() => handleRemovePartRow(part.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" onClick={() => setIsEditingVehicle(false)} style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Anuluj</button>
                    <button type="submit" style={{ background: '#10b981', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Save size={14}/> Zapisz Zmiany</button>
                  </div>
                </form>
              ) : (
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* PODGLĄD WSZYSTKICH PRZYPOMNIEŃ (ROZWIJANA LISTA) */}
                  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <button 
                      type="button"
                      onClick={() => setIsRemindersOpen(!isRemindersOpen)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bell size={14} /> Pełna Lista Przypomnień i Interwałów ({remindersList.length}):
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                        <span>{isRemindersOpen ? 'Zwiń' : 'Rozwiń'}</span>
                        {isRemindersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isRemindersOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                        {remindersList.map(r => {
                          const status = calculateReminderStatus(r);
                          return (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px 10px', borderRadius: '4px', borderLeft: `3px solid ${status.color}` }}>
                              <div>
                                <div style={{ fontWeight: 'bold', color: '#fff' }}>{r.name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                  Interwał: {r.interval_km ? `${r.interval_km.toLocaleString()} km` : '—'} / {r.interval_months ? `${r.interval_months} mies.` : '—'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', fontSize: '11px', color: status.color, fontWeight: 'bold' }}>
                                {status.kmText && <div>{status.kmText}</div>}
                                {status.timeText && <div>{status.timeText}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                    <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Rejestracja:</span> <strong style={{ color: '#f59e0b' }}>{vehicle?.license_plate || '—'}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Kod Silnika:</span> <strong>{vehicle?.engine_code || '—'}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>VIN:</span> <strong>{vehicle?.vin || '—'}</strong></div>
                    <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Olej:</span> <strong>{vehicle?.oil_spec || '—'}</strong></div>
                  </div>

                  {partsList.length > 0 && (
                    <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Katalog Części & Zamienników:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {partsList.map(part => (
                          <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px', fontSize: '12px' }}>
                            <span style={{ color: '#94a3b8' }}>{part.name}:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f8fafc' }}>{part.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #334155', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Kopia zapasowa danych:</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => exportData('json')} style={{ background: '#334155', color: '#38bdf8', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={12}/> JSON
                      </button>
                      <button onClick={() => exportData('csv')} style={{ background: '#334155', color: '#10b981', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={12}/> CSV
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* KAFELKI PODSUMOWANIA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div 
              onClick={() => setCurrentView('stats')}
              style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #0284c7', cursor: 'pointer' }}
            >
              <div style={{ color: '#38bdf8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                <DollarSign size={14} color="#10b981" /> Wydatki {currentYear} r. ➔
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px', color: '#fff' }}>
                {currentYearCost.toFixed(2)} zł
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Fuel size={14} color="#f59e0b" /> Średnie Spalanie
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
                {avgConsumption ? `${avgConsumption} L/100km` : 'Brak danych'}
              </div>
            </div>
          </div>

          {/* HISTORIA ZDARZEŃ - UKŁAD ODPORNY NA DUŻĄ ILOŚĆ ZNAKÓW I BRAK SPACJI */}
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Historia Zdarzeń</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Brak wpisów. Kliknij "Wpis", aby rozpocząć!</div>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogIds.includes(log.id);
                const titleLength = log.title ? log.title.length : 0;
                const isTitleTooLong = titleLength > 35;
                const hasNotes = Boolean(log.notes && log.notes.trim().length > 0);
                const canExpand = isTitleTooLong || hasNotes;

                // Krótki nagłówek (do 35 znaków) w stałym górnym wierszu
                const shortTitle = isTitleTooLong ? log.title.substring(0, 35) + '...' : log.title;

                return (
                  <div key={log.id} style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                    
                    {/* STAŁY GÓRNY WIERSZ: Plakietka, Skrócony Tytuł, Cena */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0,
                          background: log.category === 'paliwo' ? '#7c2d12' : log.category === 'serwis' ? '#0369a1' : '#065f46',
                          color: '#fff'
                        }}>
                          {log.category}
                        </span>
                        
                        {/* Skrócony, stały nagłówek */}
                        <span style={{ fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f8fafc' }}>
                          {shortTitle}
                        </span>
                      </div>

                      <div style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '15px', flexShrink: 0 }}>
                        {(Number(log.cost_parts) + Number(log.cost_labor)).toFixed(2)} zł
                      </div>
                    </div>

                    {/* METADANE: Data, Przebieg, Litry */}
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                      <Calendar size={12} color="#38bdf8" /> {log.date} • {log.mileage?.toLocaleString()} km
                      {log.fuel_liters && ` • Wlano: ${log.fuel_liters} L`}
                    </div>

                    {/* SEKCJA PO ROZWINIĘCIU (PEŁNY TYTUŁ Z ZAWIJANIEM I NOTATKI) */}
                    {isExpanded && (
                      <div style={{ 
                        marginTop: '10px', 
                        paddingTop: '10px', 
                        borderTop: '1px solid #334155', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden' // Zabezpieczenie kontenera nadrzędnego
                      }}>
                        
                        {/* Pełny opis w rozwijanym bloku */}
                        {isTitleTooLong && (
                          <div style={{ width: '100%', overflow: 'hidden' }}> {/* Poprawiono overflowHidden na overflow */}
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 'bold', marginBottom: '2px' }}>Pełny opis / Tytuł:</div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#f8fafc', 
                              fontWeight: '600', 
                              lineHeight: '1.4',
                              wordWrap: 'break-word',       // Standardowe łamanie długich słów
                              wordBreak: 'break-word',      // Przenoszenie słów 
                              overflowWrap: 'break-word',   // Nowoczesny odpowiednik word-wrap
                              whiteSpace: 'normal',         
                              display: 'block',
                              width: '100%'
                            }}>
                              {log.title}
                            </div>
                          </div>
                        )}

                        {/* Notatki */}
                        {hasNotes && (
                          <div style={{ width: '100%', overflow: 'hidden' }}> {/* Poprawiono overflowHidden na overflow */}
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', marginBottom: '2px' }}>Notatki:</div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#cbd5e1', 
                              lineHeight: '1.4', 
                              background: '#0f172a', 
                              padding: '8px', 
                              borderRadius: '4px',
                              wordWrap: 'break-word',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              whiteSpace: 'normal',
                              display: 'block',
                              width: '100%'
                            }}>
                              {log.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STOPKA KARTY Z AKCJAMI */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '4px' }}>
                      <div>
                        {canExpand && (
                          <button 
                            onClick={() => toggleExpandLog(log.id)} 
                            style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', padding: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isExpanded ? '▲ Zwiń opisy' : '▼ Wyświetl więcej...'}
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {log.attachment_url && (
                          <a href={log.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}>
                            <FileText size={12} /> Załącznik
                          </a>
                        )}
                        <button onClick={() => handleOpenEdit(log)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}><Edit2 size={15} /></button>
                        <button onClick={() => handleDelete(log.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={15} /></button>
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
          <button onClick={() => setCurrentView('main')} style={{ background: '#334155', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <ArrowLeft size={16}/> Powrót do ekranu głównego
          </button>

          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart color="#38bdf8"/> Raport Finansowy & Analiza Wydatków
          </h2>

          <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}><Filter size={16}/> Filtruj:</div>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '8px', borderRadius: '6px', fontSize: '13px' }}>
              <option value="2026">Rok 2026</option>
              <option value="2025">Rok 2025</option>
              <option value="all">Wszystkie lata</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '8px', borderRadius: '6px', fontSize: '13px' }}>
              <option value="all">Wszystkie kategorie</option>
              <option value="serwis">Serwis / Naprawa</option>
              <option value="eksploatacja">Eksploatacja (Olej/Filtry)</option>
              <option value="paliwo">Paliwo</option>
              <option value="oplaty">Opłaty / OC / Przegląd</option>
            </select>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px', border: '1px solid #0284c7', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Suma wydatków dla wybranych kryteriów:</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{filteredTotalCost.toFixed(2)} zł</div>
          </div>

          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#38bdf8' }}>Podział Kosztów wg Kategorii</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px' }}>Brak danych dla wybranych filtrów</div>
              ) : (
                Object.entries(categoryBreakdown).map(([cat, amount]) => {
                  const percentage = filteredTotalCost > 0 ? ((amount / filteredTotalCost) * 100).toFixed(1) : 0;
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{cat}</span>
                        <span>{amount.toFixed(2)} zł ({percentage}%)</span>
                      </div>
                      <div style={{ background: '#0f172a', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: cat === 'paliwo' ? '#f59e0b' : cat === 'serwis' ? '#0284c7' : cat === 'eksploatacja' ? '#10b981' : '#a855f7' }} />
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>{editingLogId ? 'Edytuj Wpis' : 'Nowy Wpis do Dziennika'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8' }}>Data</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8' }}>Kategoria</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }}>
                    <option value="serwis">Serwis / Naprawa</option>
                    <option value="eksploatacja">Eksploatacja (Olej/Filtry)</option>
                    <option value="paliwo">Paliwo</option>
                    <option value="oplaty">Opłaty / OC / Przegląd</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Tytuł / Nazwa usługi</label>
                <input type="text" placeholder="np. Wymiana oleju i filtrów" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8' }}>Przebieg (km)</label>
                  <input type="number" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                {formData.category === 'paliwo' && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8' }}>Litry Paliwa</label>
                    <input type="number" step="0.01" value={formData.fuel_liters} onChange={e => setFormData({...formData, fuel_liters: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8' }}>Koszt Części (zł)</label>
                  <input type="number" step="0.01" value={formData.cost_parts} onChange={e => setFormData({...formData, cost_parts: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8' }}>Koszt Robocizny (zł)</label>
                  <input type="number" step="0.01" value={formData.cost_labor} onChange={e => setFormData({...formData, cost_labor: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Załącznik / Skan paragonu</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files[0])} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Notatki</label>
                <textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Anuluj</button>
                <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Zapisz</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}