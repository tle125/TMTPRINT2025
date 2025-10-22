import React, { useState, useCallback, useEffect } from 'react';
import Calculator from './components/Calculator';
import CustomerDbManager from './components/CustomerDbManager';
import { CalculatorIcon, DatabaseIcon } from './components/icons';
import type { CustomerEquipment } from './types';

const TabButton: React.FC<{
  tabName: string;
  activeTab: string;
  onClick: (tabName: string) => void;
  label: string;
  icon: React.ReactNode;
}> = ({ tabName, activeTab, onClick, label, icon }) => (
  <button
    onClick={() => onClick(tabName)}
    className={`flex-1 flex items-center justify-center gap-2 p-4 text-sm font-semibold transition-colors focus:outline-none ${
      activeTab === tabName
        ? 'text-sky-300 bg-slate-800/50'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
    }`}
  >
    {icon}
    {label}
  </button>
);


function App() {
  const [activeTab, setActiveTab] = useState('calculator');

  // DB state and logic lifted from Calculator
  const [customerEquipmentDb, setCustomerEquipmentDb] = useState<CustomerEquipment[]>([]);
  const [scriptUrl, setScriptUrl] = useState('');
  const [tempScriptUrl, setTempScriptUrl] = useState('');
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const loadCustomerDbFromSheet = useCallback(async (url: string) => {
    if (!url) {
      setDbError("ไม่พบ URL ของ Google Apps Script");
      return;
    }
    setIsDbLoading(true);
    setDbError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        setCustomerEquipmentDb(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch data from script.');
      }
    } catch (error: any) {
      console.error("Failed to load customer DB from Google Sheet", error);
      setDbError(`ไม่สามารถโหลดข้อมูลได้: ${error.message}`);
      setCustomerEquipmentDb([]);
    } finally {
      setIsDbLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUrl = localStorage.getItem('googleScriptUrl') || 'https://script.google.com/macros/s/AKfycbwz48fIa4dQk6MjyTdlNwkDcb5DlXgZbIWfDbSKUdSrJvTwDyagWCNgAfke1e85bJ11/exec';
    setScriptUrl(savedUrl);
    setTempScriptUrl(savedUrl);
    loadCustomerDbFromSheet(savedUrl);
  }, [loadCustomerDbFromSheet]);

  const handleSaveScriptUrl = () => {
    const urlToSave = tempScriptUrl.trim();
    if (urlToSave) {
      setScriptUrl(urlToSave);
      localStorage.setItem('googleScriptUrl', urlToSave);
      loadCustomerDbFromSheet(urlToSave);
      setDbError(null);
    }
  };

  const handleAddCustomerEquipment = async (newCustomer: { name: string; equipment: string; }) => {
    if (!scriptUrl) {
      setDbError("กรุณาตั้งค่า Google Apps Script URL ก่อน");
      return;
    }
     if (newCustomer.name.trim() && newCustomer.equipment.trim()) {
        if (!customerEquipmentDb.some(item => item.customerName === newCustomer.name.trim())) {
            setIsDbLoading(true);
            setDbError(null);
            try {
                 await fetch(scriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'add', payload: { customerName: newCustomer.name.trim(), equipment: newCustomer.equipment.trim()} }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                 });
                 await loadCustomerDbFromSheet(scriptUrl);
                 return true; // Indicate success
            } catch(error: any) {
                setDbError(`ไม่สามารถเพิ่มข้อมูลได้: ${error.message}`);
            } finally {
                setIsDbLoading(false);
            }
        }
    }
    return false; // Indicate failure
  };

  const handleRemoveCustomerEquipment = async (customerNameToRemove: string) => {
    if (!scriptUrl) {
        setDbError("กรุณาตั้งค่า Google Apps Script URL ก่อน");
        return;
    }
    setIsDbLoading(true);
    setDbError(null);
    try {
        await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', payload: { customerName: customerNameToRemove } }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });
        await loadCustomerDbFromSheet(scriptUrl);
    } catch(error: any) {
        setDbError(`ไม่สามารถลบข้อมูลได้: ${error.message}`);
    } finally {
        setIsDbLoading(false);
    }
  };


  return (
    <main className="bg-slate-900 min-h-screen w-full flex flex-col items-center justify-center text-white p-4 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-700/[0.2] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      <div className="relative z-10 w-full max-w-2xl">
        <div className="w-full max-w-2xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl shadow-sky-900/20 overflow-hidden">
            <div className="flex border-b border-slate-700">
                <TabButton tabName="calculator" activeTab={activeTab} onClick={setActiveTab} label="คำนวณ" icon={<CalculatorIcon className="w-5 h-5"/>} />
                <TabButton tabName="dbManager" activeTab={activeTab} onClick={setActiveTab} label="จัดการฐานข้อมูล" icon={<DatabaseIcon className="w-5 h-5"/>} />
            </div>

            <div className="p-8">
                {activeTab === 'calculator' && <Calculator customerEquipmentDb={customerEquipmentDb} />}
                {activeTab === 'dbManager' && (
                  <CustomerDbManager
                    customerEquipmentDb={customerEquipmentDb}
                    tempScriptUrl={tempScriptUrl}
                    isDbLoading={isDbLoading}
                    dbError={dbError}
                    setTempScriptUrl={setTempScriptUrl}
                    onSaveUrl={handleSaveScriptUrl}
                    onAddCustomer={handleAddCustomerEquipment}
                    onRemoveCustomer={handleRemoveCustomerEquipment}
                    hasValidUrl={!!scriptUrl}
                  />
                )}
            </div>
        </div>
      </div>
      <footer className="relative z-10 text-center text-slate-500 text-sm mt-8">
        <p>สร้างโดย AI สำหรับการวางแผนการขนส่ง</p>
      </footer>
    </main>
  );
}

export default App;
