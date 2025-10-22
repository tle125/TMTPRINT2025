import React, { useState } from 'react';
import type { CustomerEquipment } from '../types';
import { InputField } from './InputField';
import { UserIcon, TruckIcon, PlusIcon, TrashIcon, LinkIcon, SaveIcon, SearchIcon } from './icons';

interface CustomerDbManagerProps {
    customerEquipmentDb: CustomerEquipment[];
    tempScriptUrl: string;
    isDbLoading: boolean;
    dbError: string | null;
    hasValidUrl: boolean;
    setTempScriptUrl: (url: string) => void;
    onSaveUrl: () => void;
    onAddCustomer: (customer: { name: string; equipment: string }) => Promise<boolean>;
    onRemoveCustomer: (customerName: string) => void;
}

const equipmentOptions = ['แคร่', 'ซัพพอต', 'แพ็คลังไม้'];

const CustomerDbManager: React.FC<CustomerDbManagerProps> = ({
    customerEquipmentDb,
    tempScriptUrl,
    isDbLoading,
    dbError,
    hasValidUrl,
    setTempScriptUrl,
    onSaveUrl,
    onAddCustomer,
    onRemoveCustomer
}) => {
    const [newCustomer, setNewCustomer] = useState({ name: '', equipment: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const handleAddClick = async () => {
        const success = await onAddCustomer(newCustomer);
        if (success) {
            setNewCustomer({ name: '', equipment: '' });
        }
    };

    const filteredCustomers = customerEquipmentDb.filter(c =>
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-200 mb-4">จัดการฐานข้อมูลลูกค้า (Google Sheet)</h2>
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-4">
                    <h3 className="font-semibold text-slate-200">ตั้งค่าการเชื่อมต่อ</h3>
                    <div className='flex items-end gap-2'>
                        <div className='flex-grow'>
                            <InputField 
                                id="scriptUrl" 
                                label="Google Apps Script URL" 
                                value={tempScriptUrl} 
                                onChange={(e) => setTempScriptUrl(e.target.value)} 
                                icon={<LinkIcon className="w-5 h-5"/>} 
                                placeholder="วาง URL ที่คัดลอกมาที่นี่" 
                                type="text"
                            />
                        </div>
                        <button onClick={onSaveUrl} className="px-4 py-3 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors flex-shrink-0" aria-label="บันทึก URL">
                            <SaveIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    {dbError && <p className="text-sm text-red-400 mt-2">{dbError}</p>}
                </div>
            </div>

            <div>
                 <h3 className="font-semibold text-slate-200 mb-2">เพิ่มลูกค้าใหม่</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <InputField 
                        id="newCustomerName" 
                        label="ชื่อลูกค้า" 
                        value={newCustomer.name} 
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} 
                        icon={<UserIcon className="w-5 h-5"/>} 
                        placeholder="เช่น บริษัท แคนนอน บอล" 
                        type="text"
                    />
                    <div>
                        <label htmlFor="newCustomerEquipment" className="block text-sm font-medium text-slate-300 mb-1">อุปกรณ์ที่ใช้</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-slate-500"><TruckIcon className="w-5 h-5"/></span>
                            </div>
                            <select
                                id="newCustomerEquipment"
                                value={newCustomer.equipment}
                                onChange={(e) => setNewCustomer({ ...newCustomer, equipment: e.target.value })}
                                className="block w-full appearance-none rounded-md border-0 bg-slate-800/80 py-3 pl-12 pr-10 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6 transition-all"
                            >
                                <option value="" disabled>เลือกอุปกรณ์</option>
                                {equipmentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                               <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={handleAddClick} disabled={!hasValidUrl || isDbLoading || !newCustomer.name || !newCustomer.equipment} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                    {isDbLoading ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <PlusIcon className="w-5 h-5"/>}
                    เพิ่มลูกค้า
                </button>
            </div>
            
            <div>
                 <h3 className="font-semibold text-slate-200 mb-2">รายชื่อลูกค้าในระบบ</h3>
                 <div className="mb-4">
                    <InputField 
                        id="customerSearch"
                        label="ค้นหารายชื่อลูกค้า"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<SearchIcon className="w-5 h-5"/>}
                        placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                        type="text"
                    />
                </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg p-2">
                    {isDbLoading && <p className="text-center text-sm text-slate-500 py-4">กำลังโหลดข้อมูล...</p>}
                    
                    {!isDbLoading && filteredCustomers.length > 0 && filteredCustomers.map(c => (
                        <div key={c.customerName} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-md">
                            <div>
                                <p className="text-slate-300 font-medium">{c.customerName}</p>
                                <p className="text-sm text-slate-400">อุปกรณ์: <span className="font-semibold text-amber-400">{c.equipment}</span></p>
                            </div>
                            <button onClick={() => onRemoveCustomer(c.customerName)} disabled={isDbLoading} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full disabled:text-slate-700 disabled:cursor-not-allowed" aria-label="ลบลูกค้า">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    
                    {!isDbLoading && customerEquipmentDb.length === 0 && <p className="text-center text-sm text-slate-500 py-4">{hasValidUrl ? 'ยังไม่มีข้อมูลลูกค้า' : 'กรุณาตั้งค่า URL เพื่อเริ่มใช้งาน'}</p>}
                    
                    {!isDbLoading && customerEquipmentDb.length > 0 && filteredCustomers.length === 0 && <p className="text-center text-sm text-slate-500 py-4">ไม่พบลูกค้าที่ตรงกับการค้นหา</p>}
                 </div>
            </div>
        </div>
    );
};

export default CustomerDbManager;