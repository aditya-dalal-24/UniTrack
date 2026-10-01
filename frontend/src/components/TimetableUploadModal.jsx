import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Users,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useData } from '../contexts/DataContext';
import { scanTimetableWithGemini } from '../services/geminiTimetableScannerService';
import { scanTimetableImage } from '../services/timetableScannerService';

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
  const [ocrProgress, setOcrProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef(null);

  // Minor course state
  const [minorStep, setMinorStep] = useState(null); // null = not asked, 'asking' = yes/no, 'picking' = enter name, 'done' = resolved
  const [hasMinor, setHasMinor] = useState(null); // true/false
  const [minorSubjectName, setMinorSubjectName] = useState("");

  // Elective selection state
  const [electiveStep, setElectiveStep] = useState(null); // null = not started, 'picking' = showing picker, 'done' = resolved
  const [electiveSelections, setElectiveSelections] = useState({}); // { electiveGroupId: selectedSubjectName }

  const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewData(null);
      setError(null);
      setSelectedGroup("");
      setOcrProgress(0);
      setUploadStatus("");
      setMinorStep(null);
      setHasMinor(null);
      setMinorSubjectName("");
      setElectiveStep(null);
      setElectiveSelections({});
    }
  }, [isOpen]);

  // Compute elective groups from previewData
  const electiveGroups = useMemo(() => {
    if (!previewData?.slots) return {};
    const groups = {};
    for (const slot of previewData.slots) {
      if (slot.electiveGroup && slot.electiveGroup.trim()) {
        const gid = slot.electiveGroup.trim();
        if (!groups[gid]) groups[gid] = [];
        groups[gid].push(slot);
      }
    }
    return groups;
  }, [previewData]);

  const hasElectives = Object.keys(electiveGroups).length > 0;

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
      'application/vnd.ms-excel',
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp'
    ];
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (validTypes.includes(selectedFile.type) || ['pdf', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a PDF, Excel, or Image file (.pdf, .xlsx, .xls, .png, .jpg)");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setOcrProgress(0);
    setUploadStatus("Preparing file...");

    const extension = file.name.split('.').pop().toLowerCase();
    const isImage = IMAGE_TYPES.includes(file.type) || ['png', 'jpg', 'jpeg', 'webp'].includes(extension);
    const isPdf = file.type === 'application/pdf' || extension === 'pdf';
    const isExcel = ['xlsx', 'xls'].includes(extension) || (file.type && (file.type.includes('spreadsheet') || file.type.includes('excel')));

    const hasGeminiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

    // 1. EXCEL SPREADSHEETS -> Route directly to backend Apache POI parser
    if (isExcel) {
      setUploadStatus("Parsing Excel spreadsheet...");
      const { data, error: apiErr } = await api.uploadTimetable(file);
      setIsUploading(false);
      if (apiErr) {
        setError(apiErr);
      } else {
        setPreviewData(data);
        setMinorStep('asking');
      }
      return;
    }

    // 2. PDF DOCUMENTS -> Try Gemini first if key available, then fall back to backend PDF parser
    if (isPdf) {
      if (hasGeminiKey && navigator.onLine) {
        try {
          setUploadStatus("Analyzing PDF with AI...");
          const data = await scanTimetableWithGemini(file);
          setPreviewData(data);
          setMinorStep('asking');
          setIsUploading(false);
          return;
        } catch (geminiErr) {
          console.warn("Gemini PDF scan failed, falling back to backend parser:", geminiErr);
        }
      }

      setUploadStatus("Extracting timetable from PDF...");
      const { data, error: apiErr } = await api.uploadTimetable(file);
      setIsUploading(false);
      if (apiErr) {
        setError(apiErr);
      } else {
        setPreviewData(data);
        setMinorStep('asking');
      }
      return;
    }

    // 3. IMAGES -> Try Gemini first if key available, otherwise fall back to local offline OCR (Tesseract)
    if (isImage) {
      if (hasGeminiKey && navigator.onLine) {
        try {
          setUploadStatus("Scanning timetable with AI...");
          const data = await scanTimetableWithGemini(file);
          setPreviewData(data);
          setMinorStep('asking');
          setIsUploading(false);
          return;
        } catch (geminiErr) {
          console.warn("Gemini vision scan failed, falling back to local OCR:", geminiErr);
        }
      }

      // Offline-capable Local Tesseract.js OCR engine
      try {
        setUploadStatus("Scanning timetable with local OCR engine...");
        const data = await scanTimetableImage(file, (progress) => {
          setOcrProgress(Math.round(progress));
          setUploadStatus(`Reading timetable grid (${Math.round(progress)}%)...`);
        });
        setPreviewData(data);
        setMinorStep('asking');
      } catch (ocrErr) {
        setError(ocrErr.message || "Failed to scan timetable image. Ensure the image has clear day names and times.");
      }
      setIsUploading(false);
      return;
    }

    // Fallback for any other file type
    setUploadStatus("Processing file...");
    const { data, error: apiErr } = await api.uploadTimetable(file);
    setIsUploading(false);
    if (apiErr) {
      setError(apiErr);
    } else {
      setPreviewData(data);
      setMinorStep('asking');
    }
  };

  // === MINOR COURSE HANDLERS ===
  const handleMinorNo = () => {
    setHasMinor(false);
    setMinorStep('done');
    // Move to elective step if needed
    if (hasElectives) {
      setElectiveStep('picking');
    }
  };

  const handleMinorYes = () => {
    setHasMinor(true);
    setMinorStep('picking');
  };

  const handleMinorConfirm = () => {
    if (!minorSubjectName.trim()) return;
    
    // Add 8:00-8:55 slot for each day that has classes
    const daysWithClasses = [...new Set(previewData.slots.map(s => s.dayOfWeek))];
    const minorSlots = daysWithClasses.map(day => ({
      dayOfWeek: day,
      startTime: "08:00",
      endTime: "08:55",
      subjectName: minorSubjectName.trim(),
      subjectFullName: null,
      courseCode: null,
      professor: null,
      roomNumber: null,
      groupInfo: null,
      electiveGroup: null,
      color: "#a855f7", // Purple for minor
      isBreak: false,
    }));

    setPreviewData(prev => ({
      ...prev,
      slots: [...minorSlots, ...prev.slots],
    }));

    setMinorStep('done');
    // Move to elective step if needed
    if (hasElectives) {
      setElectiveStep('picking');
    }
  };

  // === ELECTIVE HANDLERS ===
  const handleElectiveSelection = (groupId, subjectName) => {
    setElectiveSelections(prev => ({ ...prev, [groupId]: subjectName }));
  };

  const handleElectiveConfirm = () => {
    // Filter out non-selected elective slots
    setPreviewData(prev => ({
      ...prev,
      slots: prev.slots.filter(slot => {
        if (!slot.electiveGroup || !slot.electiveGroup.trim()) return true; // Keep non-elective slots
        const groupId = slot.electiveGroup.trim();
        const selected = electiveSelections[groupId];
        if (!selected) return true; // Keep if no selection made for this group (shouldn't happen)
        // Keep only the selected subject for this elective group
        return slot.subjectName === selected;
      }),
    }));
    setElectiveStep('done');
  };

  const allElectivesSelected = useMemo(() => {
    const groupIds = Object.keys(electiveGroups);
    return groupIds.length > 0 && groupIds.every(gid => electiveSelections[gid]);
  }, [electiveGroups, electiveSelections]);

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
    if (!previewData) return [];

    const fixTime = (t) => {
      if (!t || !t.includes(":")) return t;
      let [hStr, mStr] = t.split(":");
      let h = parseInt(hStr, 10);
      // Heuristic: College timetables don't have classes at 1-6 AM. Treat as PM.
      if (h >= 1 && h <= 6) {
        h += 12;
      }
      return `${h.toString().padStart(2, '0')}:${mStr}`;
    };

    let slots = previewData.slots.map(slot => ({
      ...slot,
      startTime: fixTime(slot.startTime),
      endTime: fixTime(slot.endTime)
    }));

    if (selectedGroup && selectedGroup !== "ALL") {
      slots = slots.filter(slot => {
        if (slot.isBreak || !slot.groupInfo) return true;
        return slot.groupInfo.toUpperCase().includes(selectedGroup.toUpperCase());
      });
    }

    // 2. Normalize so all days have a consistent time structure
    // Extract all unique time boundaries across the whole week from ALL groups
    const timePoints = new Set();
    slots.forEach(s => {
      if (s.startTime) timePoints.add(s.startTime);
      if (s.endTime) timePoints.add(s.endTime);
    });

    const sortedPoints = Array.from(timePoints).sort();

    // Create atomic intervals between adjacent time points
    const atomicIntervals = [];
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      atomicIntervals.push({
        start: sortedPoints[i],
        end: sortedPoints[i + 1]
      });
    }

    // Only process days that actually have classes in the original timetable
    const activeDays = DAYS.filter(day => previewData.slots.some(s => s.dayOfWeek === day));
    const normalizedSlots = [];

    const timeToMins = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    activeDays.forEach(day => {
      const daySlots = slots.filter(s => s.dayOfWeek === day);
      const addedRealSlots = new Set();
      
      let currentFreeSlot = null;

      atomicIntervals.forEach(interval => {
        // A real slot overlaps if it starts before interval ends AND ends after interval starts
        const overlappingSlots = daySlots.filter(s => 
          s.startTime < interval.end && s.endTime > interval.start
        );

        if (overlappingSlots.length > 0) {
          if (currentFreeSlot) {
            // Only keep Free slots if duration > 15 minutes (ignore 5-min transition gaps)
            if (timeToMins(currentFreeSlot.endTime) - timeToMins(currentFreeSlot.startTime) > 15) {
              normalizedSlots.push(currentFreeSlot);
            }
            currentFreeSlot = null;
          }

          overlappingSlots.forEach(s => {
            // Use a unique key to avoid pushing the same real slot multiple times
            // Include groupInfo to prevent deleting identical subjects for different groups
            const key = `${s.startTime}-${s.endTime}-${s.subjectName}-${s.groupInfo || ''}`;
            if (!addedRealSlots.has(key)) {
              normalizedSlots.push(s);
              addedRealSlots.add(key);
            }
          });
        } else {
          // If no real class covers this time, pad it with a Free slot
          if (!currentFreeSlot) {
            currentFreeSlot = {
              dayOfWeek: day,
              startTime: interval.start,
              endTime: interval.end,
              subjectName: "Free",
              isBreak: true,
              color: "#f8fafc" // Light slate color for empty slots
            };
          } else {
            // Merge consecutive Free slots
            currentFreeSlot.endTime = interval.end;
          }
        }
      });
      
      if (currentFreeSlot) {
        if (timeToMins(currentFreeSlot.endTime) - timeToMins(currentFreeSlot.startTime) > 15) {
          normalizedSlots.push(currentFreeSlot);
        }
      }
    });

    // Final sort by day and time to be safe
    normalizedSlots.sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return normalizedSlots;
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

  // === MINOR COURSE STEP RENDER ===
  const renderMinorStep = () => {
    if (minorStep === 'asking') {
      return (
        <div className="space-y-8 py-6 px-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 mb-4 shadow-inner border border-purple-500/5">
              <BookOpen size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Minor Course</h4>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">Do you have a minor course this semester? If yes, we'll add an 8:00 – 8:55 AM slot for it.</p>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center pt-2">
            <button
              onClick={handleMinorYes}
              className="group relative overflow-hidden px-10 py-4 rounded-2xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-lg font-black text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Yes</span>
            </button>
            <button
              onClick={handleMinorNo}
              className="px-10 py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all duration-300 text-center"
            >
              <span className="text-lg font-bold text-slate-600 dark:text-slate-400">No</span>
            </button>
          </div>
          
          <div className="pt-6 flex justify-center border-t border-slate-100 dark:border-slate-800">
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

    if (minorStep === 'picking') {
      return (
        <div className="space-y-8 py-6 px-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 mb-4 shadow-inner border border-purple-500/5">
              <BookOpen size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">What's Your Minor?</h4>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">Enter the name of your minor course. We'll add it as an 8:00 – 8:55 AM slot on all your class days.</p>
            </div>
          </div>
          
          <div className="max-w-sm mx-auto space-y-4">
            <input
              type="text"
              value={minorSubjectName}
              onChange={(e) => setMinorSubjectName(e.target.value)}
              placeholder="e.g. Introduction to Psychology"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:border-purple-500 dark:focus:border-purple-500 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleMinorConfirm()}
            />
            <button
              onClick={handleMinorConfirm}
              disabled={!minorSubjectName.trim()}
              className="w-full bg-purple-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Add Minor Course
            </button>
          </div>
          
          <div className="pt-6 flex justify-center border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleMinorNo}
              className="text-sm text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
            >
              Skip — I don't have a minor
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // === ELECTIVE SELECTION STEP RENDER ===
  const renderElectiveStep = () => {
    if (electiveStep !== 'picking') return null;

    const groupEntries = Object.entries(electiveGroups);

    return (
      <div className="space-y-8 py-6 px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-gradient-to-tr from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-4 shadow-inner border border-amber-500/5">
            <Sparkles size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Choose Your Electives</h4>
            <p className="text-slate-500 mt-2 max-w-md mx-auto font-medium">We detected {groupEntries.length} elective slot{groupEntries.length > 1 ? 's' : ''} with multiple options. Pick the subject you're enrolled in for each.</p>
          </div>
        </div>

        <div className="max-h-[350px] overflow-y-auto pr-1 space-y-5">
          {groupEntries.map(([groupId, slots]) => {
            const firstSlot = slots[0];
            const dayLabel = firstSlot.dayOfWeek.charAt(0) + firstSlot.dayOfWeek.slice(1).toLowerCase();
            const timeLabel = `${firstSlot.startTime} – ${firstSlot.endTime}`;

            return (
              <div key={groupId} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <Calendar size={12} />
                  <span>{dayLabel}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Clock size={12} />
                  <span>{timeLabel}</span>
                </div>
                <div className="space-y-2">
                  {slots.map((slot, idx) => {
                    const isSelected = electiveSelections[groupId] === slot.subjectName;
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name={groupId}
                          checked={isSelected}
                          onChange={() => handleElectiveSelection(groupId, slot.subjectName)}
                          className="w-4 h-4 text-amber-500 accent-amber-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
                            {slot.subjectName}
                          </div>
                          {(slot.professor || slot.roomNumber) && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {[slot.professor, slot.roomNumber].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              setElectiveStep('done');
            }}
            className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Skip
          </button>
          <button
            onClick={handleElectiveConfirm}
            disabled={!allElectivesSelected}
            className="flex-1 bg-amber-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Confirm Electives
          </button>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (!previewData) return null;

    // Step 1: Minor course question (shown right after parsing)
    if (minorStep && minorStep !== 'done') {
      return renderMinorStep();
    }

    // Step 2: Elective selection (shown after minor is resolved)
    if (electiveStep === 'picking') {
      return renderElectiveStep();
    }

    // Step 3: If groups exist and none selected, ask user first
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

    // Step 4: Review slots
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
                    // Generate a truly unique key for rendering to prevent React duplicate key issues
                    const uniqueKey = `${day}-${slot.startTime}-${slot.endTime}-${idx}`;
                    return (
                      <div key={uniqueKey} className="group relative flex items-start gap-0 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 transition hover:border-brand/30 overflow-hidden">
                        {/* Color accent bar */}
                        <div className="w-1.5 min-h-full flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: slot.color || '#6366f1' }} />
                        <div className="flex-1 min-w-0 p-3 space-y-1.5">
                          {/* Subject Name */}
                          <input 
                            type="text"
                            value={slot.subjectName}
                            onChange={(e) => handleEditSlot(globalIdx, 'subjectName', e.target.value)}
                            disabled={globalIdx === -1} // Cannot edit dynamically generated Free slots
                            className={`w-full bg-transparent font-bold outline-none text-sm ${globalIdx === -1 ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-white focus:text-brand'}`}
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
                              disabled={globalIdx === -1}
                              className="w-14 bg-transparent text-xs text-slate-500 outline-none focus:text-brand disabled:cursor-not-allowed"
                              placeholder="09:00"
                            />
                            <span className="text-slate-300 text-xs">–</span>
                            <input 
                              type="text"
                              value={slot.endTime}
                              onChange={(e) => handleEditSlot(globalIdx, 'endTime', e.target.value)}
                              disabled={globalIdx === -1}
                              className="w-14 bg-transparent text-xs text-slate-500 outline-none focus:text-brand disabled:cursor-not-allowed"
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
                      accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
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
                        Supports Images, PDF and Excel formats. Our system will extract the grid for you.
                      </p>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-2 py-1 px-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin text-brand" />
                          {uploadStatus || 'Processing timetable...'}
                        </span>
                        {ocrProgress > 0 && <span>{ocrProgress}%</span>}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-brand h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress > 0 ? ocrProgress : 100}%` }}
                        />
                      </div>
                    </div>
                  )}

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
                      disabled={isUploading}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 disabled:opacity-50"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!file || isUploading}
                      className="flex-1 bg-brand text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <FileSearch size={22} />}
                      {isUploading ? (uploadStatus ? uploadStatus.toUpperCase() : 'ANALYZING FILE...') : 'EXTRACT DATA'}
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
