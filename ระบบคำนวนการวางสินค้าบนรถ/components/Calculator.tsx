import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { SEPARATOR_WIDTH_MM, TRUCK_BEDS } from '../constants';
import type { CalculationResult, CustomerEquipment } from '../types';
import { InputField } from './InputField';
import { WidthIcon, CountIcon, SeparatorIcon, TruckIcon, TrashIcon, PlusIcon, ImageIcon, WeightIcon, UserIcon } from './icons';

// Helper function to convert file to base64
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

// Component to display the final result visually
const VisualResult: React.FC<{ result: CalculationResult }> = ({ result }) => {
    const { totalLengthMm, recommendedBed } = result;
    const displayBed = recommendedBed || TRUCK_BEDS[TRUCK_BEDS.length - 1];
    const percentage = displayBed ? Math.min((totalLengthMm / displayBed.length) * 100, 150) : 0;
    const isOverloaded = recommendedBed === null && totalLengthMm > 0;

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200">ภาพรวมการวางสินค้า</h3>
            <div className="mt-3 bg-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                    <span>0 ม.</span>
                    <span>{displayBed.name} ({displayBed.length / 1000} ม.)</span>
                </div>
                <div className="relative w-full h-8 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${isOverloaded ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${isOverloaded ? 100 : percentage}%` }}
                    ></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-bold text-sm text-white drop-shadow-md">
                            {(totalLengthMm / 1000).toFixed(2)} ม.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface Item {
    id: number;
    width: string;
    count: string;
    weight: string;
}

interface EquipmentUsage {
    customerName: string;
    equipment: string;
}

interface ExtractedItemData {
    customerName: string;
    equipment: string;
    width: number;
    count: number;
    totalWeight: number;
}


// Main Calculator Component
const Calculator: React.FC<{ customerEquipmentDb: CustomerEquipment[] }> = ({ customerEquipmentDb }) => {
    const [items, setItems] = useState<Item[]>([{ id: Date.now(), width: '', count: '', weight: '' }]);
    const [separatorCount, setSeparatorCount] = useState('');
    const [suggestedSeparators, setSuggestedSeparators] = useState<number | null>(null);
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [equipmentUsage, setEquipmentUsage] = useState<EquipmentUsage[]>([]);
    
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

    const handleCalculate = useCallback((currentItems: Item[], currentSeparators: string) => {
        let totalItemLengthMm = 0;
        let hasError = false;

        if (currentItems.length === 0 || currentItems.every(i => !i.width || !i.count)) {
            setResult(null);
            return;
        }

        for (const item of currentItems) {
            const width = parseFloat(item.width);
            const count = parseInt(item.count, 10);
            if (isNaN(width) || isNaN(count) || width <= 0 || count <= 0) {
                hasError = true;
                break;
            }
            totalItemLengthMm += width * count;
        }
        
        const separators = currentSeparators.trim() === '' ? 0 : parseInt(currentSeparators, 10);
        if (hasError || isNaN(separators) || separators < 0) {
            setResult({
                totalLengthMm: 0,
                recommendedBed: null,
                errorMessage: 'กรุณากรอกข้อมูลสินค้า (ความกว้าง, จำนวน) ให้ถูกต้อง'
            });
            return;
        }

        const totalLengthMm = totalItemLengthMm + (separators * SEPARATOR_WIDTH_MM);
        const suitableBed = TRUCK_BEDS.find(bed => bed.length >= totalLengthMm);

        if (suitableBed) {
            setResult({ totalLengthMm, recommendedBed: suitableBed, errorMessage: null });
        } else {
            setResult({
                totalLengthMm,
                recommendedBed: null,
                errorMessage: `ความยาวรวม ${(totalLengthMm / 1000).toFixed(2)} ม. เกินขนาดแคร่ที่ใหญ่ที่สุด (${TRUCK_BEDS[TRUCK_BEDS.length-1].name})`
            });
        }
    }, []);
    
    // Effect for main calculation
    useEffect(() => {
        const handler = setTimeout(() => {
            if (items.some(item => item.width && item.count)) {
                 handleCalculate(items, separatorCount);
            } else {
                 setResult(null);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [items, separatorCount, handleCalculate]);

    // Effect for suggesting separators based on total weight
    useEffect(() => {
        const grandTotalWeight = items.reduce((total, item) => {
            const weight = parseFloat(item.weight);
            return !isNaN(weight) && weight > 0 ? total + weight : total;
        }, 0);

        if (grandTotalWeight > 0) {
            const suggestion = Math.ceil(grandTotalWeight / 1650);
            setSuggestedSeparators(suggestion);
            setSeparatorCount(String(suggestion));
        } else {
            setSuggestedSeparators(null);
        }
    }, [items]);

    const handleImageChange = async (file: File | null) => {
        if (!file) return;

        setIsProcessingImage(true);
        setImageError(null);
        setEquipmentUsage([]);
        setResult(null);

        try {
            const imagePart = await fileToGenerativePart(file);
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: {
                    parts: [
                        { text: "Analyze the table in the provided image which lists steel products. Group the rows by 'Name' and 'Description(from DO)' to identify distinct products. For each distinct product, do the following: 1. Extract the customer's name from the 'Name' column into a 'customerName' field. 2. From the 'Description(from DO)' column, infer the equipment type. 'เหล็กม้วนสลิต' (steel coil) implies 'แคร่'. Other possibilities are 'ซัพพอต' or 'แพ็คลังไม้'. Put this in an 'equipment' field. 3. From the 'Description(from DO)' column, extract the product's width in millimeters. For example, in '1.7 x 152 x C'', the width is 152. Put this in a 'width' field (as a number). 4. Count how many rows belong to this distinct product. This is the 'count' (as a number). 5. Sum the 'Gross Weight' for all rows of this product to get the 'totalWeight' (as a number). Crucially, you MUST completely ignore any rows where the 'Description(from DO)' column contains 'เศษคืนลูกค้า (KG)' or similar phrases indicating non-product items like scraps or returns. These rows should not be part of the final JSON output in any way. Return a JSON array where each object represents one distinct product with the fields: customerName, equipment, width, count, and totalWeight." },
                        imagePart,
                    ],
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                customerName: { type: Type.STRING },
                                equipment: { type: Type.STRING },
                                width: { type: Type.NUMBER },
                                count: { type: Type.NUMBER },
                                totalWeight: { type: Type.NUMBER },
                            },
                            required: ["customerName", "equipment", "width", "count", "totalWeight"],
                        },
                    },
                },
            });
            
            const text = response.text;
            const extractedData: ExtractedItemData[] = JSON.parse(text);
            
            if (Array.isArray(extractedData) && extractedData.length > 0) {
                // Populate equipment usage summary, using custom DB as override
                 const usageData = extractedData.map(item => {
                    const customEntry = customerEquipmentDb.find(dbItem => dbItem.customerName.trim() === item.customerName.trim());
                    return {
                        customerName: item.customerName,
                        equipment: customEntry ? customEntry.equipment : item.equipment,
                    };
                });

                const uniqueUsageMap = new Map<string, EquipmentUsage>();
                usageData.forEach(item => {
                    const key = `${item.customerName}|${item.equipment}`;
                    if (!uniqueUsageMap.has(key)) {
                        uniqueUsageMap.set(key, item);
                    }
                });
                setEquipmentUsage(Array.from(uniqueUsageMap.values()));

                // Populate calculator items
                const newItems: Item[] = extractedData.map(item => ({
                    id: Date.now() + Math.random(),
                    width: String(item.width || ''),
                    count: String(item.count || ''),
                    weight: String(item.totalWeight || ''),
                }));
                setItems(newItems);
                
            } else {
                setImageError("ไม่พบข้อมูลสินค้าที่ถูกต้องในรูปภาพ");
                handleClear();
            }
        } catch (error) {
            console.error("Error processing image:", error);
            setImageError("ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่");
            handleClear();
        } finally {
            setIsProcessingImage(false);
        }
    };

    const handleItemChange = (id: number, field: 'width' | 'count' | 'weight', value: string) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => setItems([...items, { id: Date.now(), width: '', count: '', weight: '' }]);
    const handleRemoveItem = (id: number) => { if (items.length > 1) setItems(items.filter(item => item.id !== id)); };
    const handleClear = useCallback(() => {
        setItems([{ id: Date.now(), width: '', count: '', weight: '' }]);
        setSeparatorCount('');
        setResult(null);
        setImageError(null);
        setSuggestedSeparators(null);
        setEquipmentUsage([]);
    }, []);
    
    const dropzoneEvents = {
        onDragEnter: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
        onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
        onDragOver: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
        onDrop: (e: React.DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleImageChange(e.dataTransfer.files[0]);
            }
        },
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-400">
                ระบบคำนวนการวางสินค้าบนรถ
            </h1>
            <p className="text-center text-slate-400 mt-2">
                กรอกข้อมูลเอง หรือวางรูปภาพเพื่อคำนวณอัตโนมัติ
            </p>

            {/* Image Uploader */}
            <div className="mt-8">
                <label
                    htmlFor="image-upload"
                    className={`relative block w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-sky-500 bg-slate-800/80' : 'border-slate-600 hover:border-slate-500'}`}
                    {...dropzoneEvents}
                >
                    <div className="flex flex-col items-center justify-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-500" />
                        <span className="mt-2 block text-sm font-semibold text-slate-300">
                            {isProcessingImage ? "กำลังวิเคราะห์รูปภาพ..." : "ลากและวางรูปภาพที่นี่"}
                        </span>
                        <span className="block text-xs text-slate-500">
                            {isProcessingImage ? "กรุณารอสักครู่" : "หรือ คลิกเพื่อเลือกไฟล์"}
                        </span>
                    </div>
                    {isProcessingImage && (
                         <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg">
                             <svg className="animate-spin h-8 w-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                         </div>
                    )}
                    <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageChange(e.target.files ? e.target.files[0] : null)} disabled={isProcessingImage} />
                </label>
                {imageError && <p className="mt-2 text-sm text-red-400 text-center">{imageError}</p>}
            </div>

            {equipmentUsage.length > 0 && (
                <div className="mt-8 animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-200 mb-4 text-center">สรุปการใช้อุปกรณ์</h2>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                        {equipmentUsage.map((item, index) => (
                            <div key={index} className="flex items-center bg-slate-900/50 p-3 rounded-md">
                                <UserIcon className="w-6 h-6 text-sky-400 mr-4 flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="text-slate-300 font-medium">{item.customerName}</p>
                                    <p className="text-sm text-slate-400">อุปกรณ์ที่ใช้: <span className="font-semibold text-amber-400">{item.equipment}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs">หรือกรอกข้อมูลด้วยตนเอง</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <div className="space-y-4">
                 {items.map((item, index) => (
                    <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4 relative transition-all animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-slate-300">สินค้า #{index + 1}</h3>
                            {items.length > 1 && (
                                <button onClick={() => handleRemoveItem(item.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full" aria-label="ลบสินค้า">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField id={`itemWidth-${item.id}`} label="ความกว้าง (หน้าแถบ)" value={item.width} onChange={(e) => handleItemChange(item.id, 'width', e.target.value)} icon={<WidthIcon className="w-5 h-5"/>} placeholder="เช่น 395" unit="มม." />
                            <InputField id={`itemCount-${item.id}`} label="จำนวน" value={item.count} onChange={(e) => handleItemChange(item.id, 'count', e.target.value)} icon={<CountIcon className="w-5 h-5"/>} placeholder="เช่น 6" unit="แถบ" />
                        </div>
                         <InputField id={`itemWeight-${item.id}`} label="น้ำหนักรวม" value={item.weight} onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)} icon={<WeightIcon className="w-5 h-5"/>} placeholder="เช่น 2960" unit="กก." />
                    </div>
                ))}
            </div>
            
            <div className="mt-4">
                <button onClick={handleAddItem} className="w-full flex items-center justify-center gap-2 px-6 py-2 border border-dashed border-slate-600 text-base font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 transition-colors">
                    <PlusIcon className="w-5 h-5" /> เพิ่มรายการสินค้า
                </button>
            </div>

            <div className="mt-6">
                <InputField 
                    id="separatorCount" 
                    label="จำนวนไม้คั่น" 
                    value={separatorCount} 
                    onChange={(e) => setSeparatorCount(e.target.value)} 
                    icon={<SeparatorIcon className="w-5 h-5"/>} 
                    placeholder="กรอกข้อมูลสินค้า" 
                    unit="ท่อน"
                    subtext={suggestedSeparators !== null ? `แนะนำ: ${suggestedSeparators} ท่อน (จากน้ำหนักรวม / 1650 กก.)` : ''}
                />
            </div>

            <div className="mt-8 flex justify-center">
                <button onClick={handleClear} className="w-full max-w-xs flex items-center justify-center px-6 py-3 border border-slate-700 text-base font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-colors">
                    ล้างข้อมูลทั้งหมด
                </button>
            </div>
            
            <div className="mt-8">
                {result && (
                    <div className="animate-fade-in">
                        {result.errorMessage ? (
                             <div className="flex items-center gap-4 p-4 rounded-lg bg-red-900/50 border border-red-700">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                     <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                 </svg>
                                 <div>
                                     <h3 className="font-semibold text-red-300">เกิดข้อผิดพลาด</h3>
                                     <p className="text-sm text-red-400">{result.errorMessage}</p>
                                 </div>
                             </div>
                        ) : (
                            <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 bg-sky-500/10 text-sky-400 p-3 rounded-full">
                                        <TruckIcon className="w-8 h-8"/>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">ผลการคำนวณ</h3>
                                        <p className="text-slate-400">สรุปความยาวและแคร่ที่แนะนำ</p>
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                                            <div className="bg-slate-900/50 p-3 rounded-md">
                                                <p className="text-xs text-slate-400">ความยาวรวม</p>
                                                <p className="text-lg font-semibold text-sky-300">{(result.totalLengthMm / 10).toFixed(2)} <span className="text-sm">ซม.</span></p>
                                                <p className="text-xs text-slate-500">({(result.totalLengthMm / 1000).toFixed(2)} ม.)</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-3 rounded-md">
                                                <p className="text-xs text-slate-400">แคร่ที่แนะนำ</p>
                                                <p className="text-lg font-semibold text-green-300">{result.recommendedBed?.name}</p>
                                                <p className="text-xs text-slate-500">(ขนาด {result.recommendedBed?.length/1000} ม.)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <VisualResult result={result} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Calculator;
