import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator as CalcIcon, RotateCcw, Delete } from 'lucide-react';

const FloatingCalculator = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num) => {
    setDisplay(prev => prev === '0' ? String(num) : prev + num);
  };

  const handleOperator = (op) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  const backspace = () => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const buttons = [
    { label: 'C', action: clear, color: 'text-red-500' },
    { label: 'DEL', action: backspace, color: 'text-amber-500', icon: Delete },
    { label: '/', action: () => handleOperator('/'), color: 'text-indigo-600 dark:text-indigo-400' },
    { label: '*', action: () => handleOperator('*'), color: 'text-indigo-600 dark:text-indigo-400' },
    { label: '7', action: () => handleNumber(7) },
    { label: '8', action: () => handleNumber(8) },
    { label: '9', action: () => handleNumber(9) },
    { label: '-', action: () => handleOperator('-'), color: 'text-indigo-600 dark:text-indigo-400' },
    { label: '4', action: () => handleNumber(4) },
    { label: '5', action: () => handleNumber(5) },
    { label: '6', action: () => handleNumber(6) },
    { label: '+', action: () => handleOperator('+'), color: 'text-indigo-600 dark:text-indigo-400' },
    { label: '1', action: () => handleNumber(1) },
    { label: '2', action: () => handleNumber(2) },
    { label: '3', action: () => handleNumber(3) },
    { label: '=', action: calculate, color: 'bg-indigo-600 dark:bg-indigo-500 text-white', span: 'row-span-2' },
    { label: '0', action: () => handleNumber(0), span: 'col-span-2' },
    { label: '.', action: () => handleNumber('.') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-40 md:bottom-24 right-6 md:right-24 z-[10000] w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <CalcIcon size={16} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Calculator</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
              <X size={16} />
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 mb-4 text-right overflow-hidden border border-slate-100 dark:border-slate-800/50">
            <p className="text-[10px] font-bold text-slate-400 h-4 truncate uppercase tracking-tighter">{equation}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white truncate">{display}</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.action}
                className={`
                  ${btn.span || ''}
                  flex items-center justify-center p-3 rounded-xl text-sm font-black transition-all active:scale-90
                  ${btn.color || 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
                `}
              >
                {btn.icon ? <btn.icon size={16} /> : btn.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCalculator;
