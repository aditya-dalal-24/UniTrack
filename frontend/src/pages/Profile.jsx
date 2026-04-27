import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Edit2, Save, Camera, GraduationCap } from "lucide-react";
import { api } from "../services/api";
import { useData } from "../contexts/DataContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import PageHeader from "../components/PageHeader";
import UserAvatar from "../components/UserAvatar";

const defaultProfileData = {
  name: "",
  rollNumber: "",
  privateEmail: "",
  universityEmail: "",
  phone: "",
  dob: "",
  age: "",
  course: "",
  branch: "",
  semester: "",
  batch: "",
  college: "",
  gender: "",
  enrolmentNumber: "",
};

export default function Profile() {
  const { invalidateDashboard } = useData();
  const { userData, updateAvatar, updateUserData } = useAuth();
  const userId = userData?.userId || "default";

  const [isEditing, setIsEditing] = useState(false);
  const [studentData, setStudentData] = useState(defaultProfileData);
  const [editData, setEditData] = useState(defaultProfileData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);

  const fetchProfile = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    const avatarKey = `profile_avatar_${userId}`;
    const coverKey = `profile_cover_${userId}`;
    
    const savedAvatar = localStorage.getItem(avatarKey);
    if (savedAvatar) setAvatarUrl(savedAvatar);
    
    const savedCover = localStorage.getItem(coverKey);
    if (savedCover) setCoverUrl(savedCover);

    const { data, error: apiError } = await api.getProfile();
    if (apiError) setError(apiError);
    else if (data) {
      setStudentData({
        name: data.name || "",
        rollNumber: data.rollNumber || data.enrolmentNumber || "",
        privateEmail: data.email || "",
        universityEmail: data.universityEmail || "",
        phone: data.phone || "",
        dob: data.dob || "",
        age: data.age?.toString() || "",
        course: data.course || "",
        branch: data.branch || "",
        semester: data.semester || "",
        batch: data.batch || "",
        college: data.college || "",
        gender: data.gender || "",
        enrolmentNumber: data.enrolmentNumber || "",
      });
    }
    if (showSpinner) setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleEdit = () => {
    setEditData(studentData);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const payload = { ...editData, enrolmentNumber: editData.rollNumber };
    const avatarKey = `profile_avatar_${userId}`;
    const coverKey = `profile_cover_${userId}`;

    if (avatarUrl && avatarUrl.startsWith('data:image')) {
      localStorage.setItem(avatarKey, avatarUrl);
      updateAvatar(avatarUrl);
    }
    
    if (coverUrl && coverUrl.startsWith('data:image')) {
        localStorage.setItem(coverKey, coverUrl);
    }

    const { error: apiError } = await api.updateProfile(payload);
    if (apiError) alert(apiError);
    
    invalidateDashboard();
    if (updateUserData) updateUserData({ ...editData });
    setStudentData(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(studentData);
    setIsEditing(false);
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file && file.size < 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <LoadingSpinner message="Loading Profile Data..." fullPage />;
  if (error) return <ErrorMessage message={error} onRetry={fetchProfile} />;

  return (
    <div className="w-full space-y-6 pb-12 font-sans">
      <PageHeader
        title="Student Profile"
        description="Manage your academic credentials and personal details."
      />

      {/* COMPACT IDENTITY HEADER WITH BANNER */}
      <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Banner */}
        <div className="h-44 w-full relative bg-slate-100 dark:bg-slate-800">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-500/10 to-brand/10 dark:from-indigo-500/20 dark:to-brand/20" />
          )}
          {isEditing && (
            <label className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:scale-105">
              <Camera className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Change Cover</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setCoverUrl)} />
            </label>
          )}
        </div>

        {/* Content Row */}
        <div className="px-8 pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end gap-8 relative">
          <div className="relative group shrink-0 -mt-16 z-10">
            <UserAvatar 
              name={studentData.name} 
              src={avatarUrl}
              className="w-32 h-32 rounded-[30px] shadow-xl border-4 border-white dark:border-slate-900 bg-white"
            />
            {isEditing && (
              <label className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-[30px] opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                <Camera className="h-7 w-7 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAvatarUrl)} />
              </label>
            )}
          </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          {isEditing ? (
             <input 
                type="text" 
                value={editData.name} 
                onChange={(e) => setEditData({...editData, name: e.target.value})} 
                className="text-3xl font-black bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700 outline-none w-full max-w-md dark:text-white"
                placeholder="Student Name"
             />
          ) : (
             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{studentData.name || "Student Node"}</h2>
          )}
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{studentData.rollNumber || "NO ID SET"}</p>
        </div>

        <div className="flex flex-col sm:items-end gap-4 shrink-0">
           {!isEditing ? (
             <button onClick={handleEdit} className="w-full sm:w-auto px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 flex justify-center items-center gap-2">
               <Edit2 size={16} /> Edit Profile
             </button>
           ) : (
             <div className="flex gap-3">
               <button onClick={handleCancel} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">Abort</button>
               <button onClick={handleSave} className="flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all hover:scale-105">
                 <Save size={16} /> Commit
               </button>
             </div>
           )}
        </div>
        </div>
      </div>

      {/* COMPACT UNIFIED DATA CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-[30px] border border-slate-200/60 dark:border-slate-800 shadow-sm p-8 sm:p-10">
         
         {/* Academic Section */}
         <div className="mb-10">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">Academic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
                <DenseField label="Institution" value={studentData.college} isEditing={isEditing} editValue={editData.college} onChange={v => setEditData({...editData, college: v})} />
                <DenseField label="Course" value={studentData.course} isEditing={isEditing} editValue={editData.course} onChange={v => setEditData({...editData, course: v})} />
                <DenseField label="Branch" value={studentData.branch} isEditing={isEditing} editValue={editData.branch} onChange={v => setEditData({...editData, branch: v})} />
                <DenseField label="Semester" value={studentData.semester} isEditing={isEditing} editValue={editData.semester} onChange={v => setEditData({...editData, semester: v})} />
                <DenseField label="Batch" value={studentData.batch} isEditing={isEditing} editValue={editData.batch} onChange={v => setEditData({...editData, batch: v})} />
                <DenseField label="Enrolment No" value={studentData.rollNumber} isEditing={isEditing} editValue={editData.rollNumber} onChange={v => setEditData({...editData, rollNumber: v})} />
            </div>
         </div>

         {/* Personal Section */}
         <div>
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">Personal & Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
                <DenseField label="Date of Birth" value={studentData.dob} isEditing={isEditing} editValue={editData.dob} onChange={v => setEditData({...editData, dob: v})} type="date" />
                <DenseField label="Gender" value={studentData.gender} isEditing={isEditing} editValue={editData.gender} onChange={v => setEditData({...editData, gender: v})} type="select" options={["Male", "Female", "Other", "Unknown"]} />
                <DenseField label="Phone" value={studentData.phone} isEditing={isEditing} editValue={editData.phone} onChange={v => setEditData({...editData, phone: v})} />
                <DenseField label="University Email" value={studentData.universityEmail} isEditing={isEditing} editValue={editData.universityEmail} onChange={v => setEditData({...editData, universityEmail: v})} />
                <DenseField label="Private Email" value={studentData.privateEmail} isEditing={isEditing} editValue={editData.privateEmail} onChange={v => setEditData({...editData, privateEmail: v})} />
            </div>
         </div>

      </div>
    </div>
  );
}

function DenseField({ label, value, isEditing, editValue, onChange, type="text", options=[] }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</label>
        {isEditing ? (
           type === "select" ? (
            <select value={editValue} onChange={e => onChange(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all">
              <option value="">Select</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input type={type} value={editValue} onChange={e => onChange(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all" />
          )
        ) : (
           <p className="text-base font-black text-slate-800 dark:text-slate-200 truncate tracking-tight">{value || "—"}</p>
        )}
      </div>
    );
  }
