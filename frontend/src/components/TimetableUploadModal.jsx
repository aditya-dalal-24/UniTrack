import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Loader2, 
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Save,
  FileSearch,
  Grid,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { useData } from '../contexts/DataContext';

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function TimetableUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { invalidateDashboard } = useData();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewData(null);
      setError(null);
      setSelectedGroup("");
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel'
    ];
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (validTypes.includes(selectedFile.type) || ['pdf', 'xlsx', 'xls'].includes(extension)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a valid PDF or Excel file (.pdf, .xlsx, .xls)");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const { data, error } = await api.uploadTimetable(file);
    setIsUploading(false);

    if (error) {
      setError(error);
    } else {
      setPreviewData(data);
    }
  };

  const handleDeleteSlot = (index) => {
    setPreviewData(prev => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index)
    }));
  };

  const handleEditSlot = (index, field, value) => {
    setPreviewData(prev => ({
      ...prev,
      slots: prev.slots.map((slot, i) => i === index ? { ...slot, [field]: value } : slot)
    }));
  };

  const filteredSlots = React.useMemo(() => {
    if (!previewData || !selectedGroup) return previewData?.slots || [];
    if (selectedGroup === "ALL") return previewData.slots;
    return previewData.slots.filter(slot => {
      if (slot.isBreak || !slot.groupInfo) return true;
      // Match group (e.g. G5 matches G5G6)
      return slot.groupInfo.toUpperCase().includes(selectedGroup.toUpperCase());
    });
  }, [previewData, selectedGroup]);

  const handleConfirmSave = async () => {
    if (!previewData || filteredSlots.length === 0) return;
    setIsSaving(true);
    
    const { error } = await api.saveTimetableBatch(filteredSlots);
    setIsSaving(false);

    if (error) {
      setError(error);
    } else {
      invalidateDashboard();
      onUploadSuccess();
      onClose();
    }
  };

  const renderPreview = () => {
    if (!previewData) return null;

    // If groups exist and none selected, ask user first
    if (previewData.availableGroups?.length > 0 && !selectedGroup) {
      return (
        <div className="space-y-8 py-6 px-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-gradient-to-tr from-brand/10 to-indigo-500/10 dark:from-brand/20 dark:to-indigo-500/20 flex items-center justify-center text-brand dark:text-indigo-400 mb-4 shadow-inner border border-brand/5">
              <Users size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Choose Your Group</h4>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">We detected multiple groups/batches in your timetable. Select yours to automatically filter your schedule.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            {previewData.availableGroups.map(group => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className="group relative overflow-hidden p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand dark:hover:border-brand hover:shadow-lg hover:shadow-brand/10 hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center justify-center gap-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand/0 to-brand/5 dark:to-brand/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-lg font-black text-slate-700 dark:text-slate-200 group-hover:text-brand dark:group-hover:text-brand-light transition-colors">{group}</span>
                <span className="relative text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Select</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedGroup("ALL")}
              className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all duration-300 text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">Show All</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Every Batch</span>
            </button>
          </div>
          
          <div className="pt-8 flex justify-center border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setPreviewData(null)}
              className="text-sm text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
            >
              <X size={16} /> Cancel and select another file
            </button>
          </div>
        </div>
      );
    }

    // Group slots by day
    const slotsByDay = DAYS.reduce((acc, day) => {
      acc[day] = filteredSlots.filter(s => s.dayOfWeek === day);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedGroup && selectedGroup !== "ALL" ? `Reviewing for ${selectedGroup}` : 'Review Timetable'}
            </h4>
            <p className="text-sm text-slate-500">We found {filteredSlots.length} lectures. Correct any errors below.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button 
              onClick={() => setPreviewData(null)}
              className="text-xs text-brand font-bold hover:underline"
            >
              Upload Different File
            </button>
            {previewData.availableGroups?.length > 0 && (
              <button 
                onClick={() => setSelectedGroup("")}
                className="text-xs text-slate-400 font-bold hover:underline"
              >
                Change Group
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
          {DAYS.map(day => {
            const daySlots = slotsByDay[day];
            if (daySlots.length === 0) return null;

            return (
              <div key={day} className="space-y-2">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> {day}
                </h5>
                <div className="grid gap-2">
                  {daySlots.map((slot, idx) => {
                    const globalIdx = previewData.slots.indexOf(slot);
                    return (
                      <div key={globalIdx} className="group relative flex items-start gap-0 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 transition hover:border-brand/30 overflow-hidden">
                        {/* Color accent bar */}
                        <div className="w-1.5 min-h-full flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: slot.color || '#6366f1' }} />
                        <div className="flex-1 min-w-0 p-3 space-y-1.5">
                          {/* Subject Name */}
                          <input 
                            type="text"
                            value={slot.subjectName}
                            onChange={(e) => handleEditSlot(globalIdx, 'subjectName', e.target.value)}
                            className="w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none focus:text-brand text-sm"
                            placeholder="Subject Name"
                          />
                          {slot.subjectFullName && slot.subjectFullName !== slot.subjectName && (
                            <div className="text-[10px] text-slate-400 font-medium italic -mt-1 truncate">
                              {slot.subjectFullName}
                            </div>
                          )}
                          {/* Time row */}
                          <div className="flex items-center gap-2">
                            <Clock size={11} className="text-slate-400 flex-shrink-0" />
                            <input 
                              type="text"
                              value={slot.startTime}
                              onChange={(e) => handleEditSlot(globalIdx, 'startTime', e.target.value)}
                              className="w-14 bg-transparent text-xs text-slate-500 outline-none focus:text-brand"
                              placeholder="09:00"
                            />
                            <span className="text-slate-300 text-xs">–</span>
                            <input 
                              type="text"
                              value={slot.endTime}
                              onChange={(e) => handleEditSlot(globalIdx, 'endTime', e.target.value)}
                              className="w-14 bg-transparent text-xs text-slate-500 outline-none focus:text-brand"
                              placeholder="10:00"
                            />
                            {slot.courseCode && (
                              <span className="text-[10px] uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-bold ml-1">{slot.courseCode}</span>
                            )}
                            {slot.groupInfo && (
                              <span className="text-[10px] uppercase bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-bold ml-1">{slot.groupInfo}</span>
                            )}
                          </div>
                          {/* Faculty & Room */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <input
                              type="text"
                              value={slot.professor || ''}
                              onChange={(e) => handleEditSlot(globalIdx, 'professor', e.target.value)}
                              className="flex-1 min-w-[80px] bg-transparent text-xs text-slate-500 outline-none focus:text-brand placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              placeholder="Faculty"
                            />
                            <input
                              type="text"
                              value={slot.roomNumber || ''}
                              onChange={(e) => handleEditSlot(globalIdx, 'roomNumber', e.target.value)}
                              className="w-20 bg-transparent text-xs text-slate-500 outline-none focus:text-brand placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              placeholder="Room"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteSlot(globalIdx)}
                          className="p-2 m-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={isSaving || previewData.slots.length === 0}
            className="flex-1 bg-brand text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            CONFIRM & SAVE
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
                    <Grid className="text-brand dark:text-brand-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Automated Import</h2>
                    <p className="text-sm text-slate-500 font-medium">Upload your PDF or Excel timetable</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {!previewData ? (
                <div className="space-y-6">
                  <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`relative group cursor-pointer border-2 border-dashed rounded-[2rem] p-12 text-center transition-all ${
                      dragActive 
                      ? 'border-brand bg-brand/5' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-brand/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.xlsx,.xls"
                      onChange={handleChange}
                    />
                    
                    <div className="flex flex-col items-center">
                      {file ? (
                        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
                          <Check size={40} />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-3xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center mb-4 text-brand dark:text-brand-400 group-hover:scale-110 transition-transform">
                          <Upload size={40} />
                        </div>
                      )}
                      
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {file ? file.name : 'Drop your file here'}
                      </h3>
                      <p className="text-sm text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                        Supports PDF and Excel formats. Our system will extract the grid for you.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-800/50"
                    >
                      <AlertCircle size={20} className="flex-shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!file || isUploading}
                      className="flex-1 bg-brand text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <FileSearch size={22} />}
                      {isUploading ? 'ANALYZING FILE...' : 'EXTRACT DATA'}
                    </button>
                  </div>
                </div>
              ) : renderPreview()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
