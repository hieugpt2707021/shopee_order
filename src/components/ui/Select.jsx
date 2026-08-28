import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export const Select = ({ options, value, onChange, placeholder, className = '', placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-transparent outline-none focus:outline-none"
      >
        <div className="flex items-center gap-2 truncate mr-2">
          {selectedOption?.color && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }}></span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder || 'Chọn...'}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-gray-500 transition-transform duration-200 shrink-0 ${isOpen ? (placement === 'top' ? 'rotate-0' : 'rotate-180') : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === 'top' ? 10 : -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 left-0 min-w-[160px] w-full bg-[#1c212a] border border-gray-700 rounded shadow-xl overflow-hidden ${
              placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            <ul className="max-h-60 overflow-auto custom-scrollbar py-1">
              {options.map((option) => (
                <li
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors
                    ${option.value === value ? 'bg-[#3b82f6]/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.color && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: option.color }}></span>
                    )}
                    <span className="truncate" title={option.label}>{option.label}</span>
                  </div>
                  {option.value === value && <Check size={14} className="text-[#3b82f6] shrink-0 ml-2" />}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
