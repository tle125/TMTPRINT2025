import React from 'react';

// Component for a styled input field
export interface InputFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ReactNode;
    placeholder: string;
    unit?: string;
    subtext?: string;
    type?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, icon, placeholder, unit, subtext, type = "number" }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        {subtext && <p className="text-xs text-sky-400 mb-2">{subtext}</p>}
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500">{icon}</span>
            </div>
            <input
                type={type}
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                className="block w-full rounded-md border-0 bg-slate-800/80 py-3 pl-12 pr-16 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:text-sm sm:leading-6 transition-all"
                placeholder={placeholder}
                min={type === "number" ? "0" : undefined}
                step={type === "number" ? "any" : undefined}
            />
            {unit && <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-slate-500 sm:text-sm">{unit}</span>
            </div>}
        </div>
    </div>
);
