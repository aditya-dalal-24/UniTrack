import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Calendar, User, Users, GraduationCap, Building2, Heart, Edit2, Save, X, Shield, BookOpen, Camera, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import PageHeader from "../components/PageHeader";

const defaultProfileData = {
  name: "",
  rollNumber: "",
  privateEmail: "",
  universityEmail: "",
  phone: "",
  dateOfBirth: "",
  age: "",
  bloodGroup: "",
  address: "",
  course: "",
  branch: "",
  semester: "",
  batch: "",
  college: "",
  fatherName: "",
  fatherPhone: "",
  motherName: "",
  motherPhone: "",
  emergencyContact: "",
  emergencyContactName: "",
};

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [studentData, setStudentData] = useState(defaultProfileData);
  const [editData, setEditData] = useState(defaultProfileData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("https://api.dicebear.com/7.x/avataaars/svg?seed=student");
  const [coverUrl, setCoverUrl] = useState(null);

  const countryCodes = [
    { code: "+1", label: "+1" },
    { code: "+44", label: "+44" },
    { code: "+91", label: "+91" },
    { code: "+61", label: "+61" },
    { code: "+86", label: "+86" },
  ];

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    
    // Retrieve visually persisted images to maintain UX
    const savedAvatar = localStorage.getItem("profile_avatar");
    if (savedAvatar) setAvatarUrl(savedAvatar);
    
    const savedCover = localStorage.getItem("profile_cover");
    if (savedCover) setCoverUrl(savedCover);

    const { data, error: apiError } = await api.getProfile();
    if (apiError) {
      setError(apiError);
    } else if (data) {
      const fetched = {
        name: data.name || "",
        rollNumber: data.rollNumber || "",
        privateEmail: data.email || "",
        universityEmail: data.universityEmail || "",
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || "",
        age: data.age?.toString() || "",
        bloodGroup: data.bloodGroup || "",
        address: data.address || "",
        course: data.course || "",
        branch: data.branch || "",
        semester: data.semester || "",
        batch: data.batch || "",
        college: data.college || "",
        fatherName: data.fatherName || "",
        fatherPhone: data.fatherPhone || "",
        motherName: data.motherName || "",
        motherPhone: data.motherPhone || "",
        emergencyContact: data.emergencyContact || "",
        emergencyContactName: data.emergencyContactName || "",
      };
      setStudentData(fetched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEdit = () => {
    setEditData(studentData);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const payload = {
      name: editData.name,
      rollNumber: editData.rollNumber,
      email: editData.privateEmail,
      universityEmail: editData.universityEmail,
      phone: editData.phone,
      dateOfBirth: editData.dateOfBirth,
      age: parseInt(editData.age) || 0,
      bloodGroup: editData.bloodGroup,
      address: editData.address,
      course: editData.course,
      branch: editData.branch,
      semester: editData.semester,
      batch: editData.batch,
      college: editData.college,
      fatherName: editData.fatherName,
      fatherPhone: editData.fatherPhone,
      motherName: editData.motherName,
      motherPhone: editData.motherPhone,
      emergencyContact: editData.emergencyContact,
      emergencyContactName: editData.emergencyContactName,
    };

    // Persist images locally to survive page refreshes
    if (avatarUrl !== "https://api.dicebear.com/7.x/avataaars/svg?seed=student") {
      localStorage.setItem("profile_avatar", avatarUrl);
    }
    if (coverUrl) {
      localStorage.setItem("profile_cover", coverUrl);
    }

    const { error: apiError } = await api.updateProfile(payload);
    if (apiError) {
      alert(apiError);
      return;
    }

    setStudentData(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(studentData);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  if (loading) return <LoadingSpinner message="Loading profile..." fullPage />;
  if (error) return <ErrorMessage message={error} onRetry={fetchProfile} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-8"
    >
      <PageHeader
        title="Student Profile"
        description="View and manage your academic and personal information."
        actions={
          !isEditing ? (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-accent text-white px-5 py-2.5 text-sm font-semibold shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 transition-all active:scale-95"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-accent text-white px-5 py-2.5 text-sm font-semibold shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 transition-all active:scale-95"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )
        }
      />

      {/* Cover and Header Info */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-[2rem] bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
      >
        {/* Cover Background */}
        <div className="h-40 md:h-52 w-full bg-gradient-to-r from-brand via-purple-500 to-accent relative overflow-hidden group">
          {coverUrl && <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover z-0" />}
          {!coverUrl && (
            <>
              <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] z-0"></div>
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/20 blur-3xl transition-transform duration-1000 hover:scale-110 z-0"></div>
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-black/20 blur-3xl transition-transform duration-1000 hover:scale-110 z-0"></div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 opacity-60"></div>
          
          {isEditing && (
            <label className="absolute right-4 bottom-4 z-20 flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer shadow-lg">
              <Camera className="h-4 w-4" />
              <span className="text-xs font-semibold">Change Cover</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setCoverUrl)} />
            </label>
          )}
        </div>

        {/* Profile Content */}
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start -mt-20 md:-mt-24 relative z-10 w-full">
            {/* Avatar */}
            <div className="relative group flex-shrink-0 z-30">
              <div className="absolute inset-0 rounded-[2rem] bg-brand/30 blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100 duration-500"></div>
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="w-40 h-40 md:w-48 md:h-48 shadow-2xl border-4 border-white dark:border-slate-900 relative bg-white dark:bg-slate-800 object-cover rounded-[2rem] transition-transform duration-500"
              />
              {isEditing && (
                <label className="absolute inset-0 z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-sm rounded-[2rem] transition-all duration-300 cursor-pointer">
                  <Upload className="h-8 w-8 text-white mb-2" />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Update Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAvatarUrl)} />
                </label>
              )}
            </div>

            {/* Title Details */}
            <div className="flex-1 mt-4 md:mt-24 text-center md:text-left w-full min-w-0">
              {isEditing ? (
                <div className="space-y-3 flex flex-col items-center md:items-start w-full">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border-2 border-brand/20 rounded-xl px-4 py-2.5 w-full max-w-lg focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="Student Name"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">{studentData.name || "Student Name"}</h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mt-1 font-medium italic">
                    {studentData.college || "No University set"}
                  </p>
                </>
              )}
              
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                <GraduationCap className="h-4 w-4 text-brand dark:text-brand-300" />
                {studentData.course || "Course"} <span className="opacity-40">•</span> {studentData.branch || "Branch"} <span className="opacity-40">•</span> Semester {studentData.semester || "-"}
              </div>

              <div className="mt-8 flex flex-col xl:flex-row gap-4 items-center md:items-start justify-center md:justify-start w-full">
                
                {/* Email Section */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 flex-1 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 hover:border-brand/30 dark:hover:border-brand/30 transition-colors">
                    <div className="p-3 bg-brand/10 text-brand dark:text-brand-300 rounded-xl">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col w-full text-center sm:text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Private Email</span>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editData.privateEmail}
                            onChange={(e) => handleChange("privateEmail", e.target.value)}
                            className="bg-white dark:bg-slate-900 border-2 border-brand/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none mt-1 w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Private email"
                          />
                        ) : (
                          <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5">{studentData.privateEmail || "—"}</span>
                        )}
                      </div>
                      <div className="flex flex-col w-full text-center sm:text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">University Email</span>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editData.universityEmail}
                            onChange={(e) => handleChange("universityEmail", e.target.value)}
                            className="bg-white dark:bg-slate-900 border-2 border-brand/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none mt-1 w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="University email"
                          />
                        ) : (
                          <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5">{studentData.universityEmail || "—"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Phone Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 flex-1 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 hover:border-brand/30 dark:hover:border-brand/30 transition-colors h-full">
                    <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl flex-shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col w-full text-center sm:text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone Number</span>
                      {isEditing ? (
                        <div className="flex gap-1.5 mt-1 w-full">
                          <select
                            value={(editData.phone || "").includes(' ') ? (editData.phone || "").split(' ')[0] : '+91'}
                            onChange={(e) => {
                              const num = (editData.phone || "").includes(' ') ? (editData.phone || "").split(' ').slice(1).join(' ') : (editData.phone || "");
                              handleChange("phone", `${e.target.value} ${num}`.trim());
                            }}
                            className="bg-white dark:bg-slate-900 border-2 border-brand/20 rounded-lg px-2 py-1.5 text-sm font-medium focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none w-[70px] cursor-pointer"
                          >
                            {countryCodes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          <input
                            type="tel"
                            value={(editData.phone || "").includes(' ') ? (editData.phone || "").split(' ').slice(1).join(' ') : (editData.phone || "")}
                            onChange={(e) => {
                              const code = (editData.phone || "").includes(' ') ? (editData.phone || "").split(' ')[0] : '+91';
                              handleChange("phone", `${code} ${e.target.value}`.trim());
                            }}
                            className="bg-white dark:bg-slate-900 border-2 border-brand/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none flex-1 min-w-0 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Phone number"
                          />
                        </div>
                      ) : (
                        <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 mt-1">{studentData.phone || "—"}</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal Information */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
            <User className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Personal Information
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 relative z-10">
          <EditableInfoCard
            icon={Calendar}
            label="Date of Birth"
            value={studentData.dateOfBirth}
            editValue={editData.dateOfBirth}
            isEditing={isEditing}
            onChange={(val) => handleChange("dateOfBirth", val)}
            type="date"
          />
          <EditableInfoCard
            icon={User}
            label="Age"
            value={studentData.age ? `${studentData.age} years` : ""}
            editValue={editData.age}
            isEditing={isEditing}
            onChange={(val) => handleChange("age", val)}
            type="number"
          />
          <EditableInfoCard
            icon={Heart}
            label="Blood Group"
            value={studentData.bloodGroup}
            editValue={editData.bloodGroup}
            isEditing={isEditing}
            onChange={(val) => handleChange("bloodGroup", val)}
          />
          <EditableInfoCard
            icon={MapPin}
            label="Address"
            value={studentData.address}
            editValue={editData.address}
            isEditing={isEditing}
            onChange={(val) => handleChange("address", val)}
            className="md:col-span-2 lg:col-span-3"
            multiline
          />
        </div>
      </motion.div>

      {/* Academic Details */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-xl">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Academic Details
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 relative z-10">
          <EditableInfoCard
            icon={Building2}
            label="College"
            value={studentData.college}
            editValue={editData.college}
            isEditing={isEditing}
            onChange={(val) => handleChange("college", val)}
          />
          <EditableInfoCard
            icon={BookOpen}
            label="Course"
            value={studentData.course}
            editValue={editData.course}
            isEditing={isEditing}
            onChange={(val) => handleChange("course", val)}
          />
          <EditableInfoCard
            icon={GraduationCap}
            label="Branch"
            value={studentData.branch}
            editValue={editData.branch}
            isEditing={isEditing}
            onChange={(val) => handleChange("branch", val)}
          />
          <EditableInfoCard
            icon={Calendar}
            label="Current Semester"
            value={studentData.semester}
            editValue={editData.semester}
            isEditing={isEditing}
            onChange={(val) => handleChange("semester", val)}
          />
          <EditableInfoCard
            icon={Calendar}
            label="Batch"
            value={studentData.batch}
            editValue={editData.batch}
            isEditing={isEditing}
            onChange={(val) => handleChange("batch", val)}
          />
          <EditableInfoCard
            icon={User}
            label="Enrollment No."
            value={studentData.rollNumber}
            editValue={editData.rollNumber}
            isEditing={isEditing}
            onChange={(val) => handleChange("rollNumber", val)}
          />
        </div>
      </motion.div>

      {/* Parents/Guardian Information Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Family Information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Family Information
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 relative z-10">
            <EditableInfoCard
              icon={User}
              label="Father's Name"
              value={studentData.fatherName}
              editValue={editData.fatherName}
              isEditing={isEditing}
              onChange={(val) => handleChange("fatherName", val)}
            />
            <EditableInfoCard
              icon={Phone}
              label="Father's Phone"
              value={studentData.fatherPhone}
              editValue={editData.fatherPhone}
              isEditing={isEditing}
              onChange={(val) => handleChange("fatherPhone", val)}
              type="tel"
            />
            <EditableInfoCard
              icon={User}
              label="Mother's Name"
              value={studentData.motherName}
              editValue={editData.motherName}
              isEditing={isEditing}
              onChange={(val) => handleChange("motherName", val)}
            />
            <EditableInfoCard
              icon={Phone}
              label="Mother's Phone"
              value={studentData.motherPhone}
              editValue={editData.motherPhone}
              isEditing={isEditing}
              onChange={(val) => handleChange("motherPhone", val)}
              type="tel"
            />
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2.5 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Emergency Contact
            </h2>
          </div>

          <div className="grid gap-5 grid-cols-1 relative z-10">
            <EditableInfoCard
              icon={User}
              label="Contact Person Name"
              value={studentData.emergencyContactName}
              editValue={editData.emergencyContactName}
              isEditing={isEditing}
              onChange={(val) => handleChange("emergencyContactName", val)}
            />
            <EditableInfoCard
              icon={Phone}
              label="Emergency Number"
              value={studentData.emergencyContact}
              editValue={editData.emergencyContact}
              isEditing={isEditing}
              onChange={(val) => handleChange("emergencyContact", val)}
              type="tel"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Editable Info Card component
function EditableInfoCard({ icon: Icon, label, value, editValue, isEditing, onChange, className = "", multiline = false, type = "text" }) {
  return (
    <div className={`group relative p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-brand/40 dark:hover:border-brand/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden ${className}`}>
      
      {/* Decorative gradient blob */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors duration-500"></div>

      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-brand dark:group-hover:text-slate-200 group-hover:bg-brand/10 transition-colors duration-300 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        </div>
        
        <div className="flex-1 min-w-0 pl-1">
          {isEditing ? (
            multiline ? (
              <textarea
                value={editValue}
                onChange={(e) => onChange(e.target.value)}
                rows="2"
                className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border-2 border-brand/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            ) : type === "tel" ? (
              <div className="flex gap-2 w-full mt-1.5">
                <select
                  value={(editValue || "").includes(' ') ? (editValue || "").split(' ')[0] : '+91'}
                  onChange={(e) => {
                    const num = (editValue || "").includes(' ') ? (editValue || "").split(' ').slice(1).join(' ') : (editValue || "");
                    onChange(`${e.target.value} ${num}`.trim());
                  }}
                  className="bg-slate-50 dark:bg-slate-900 border-2 border-brand/20 rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none w-20 focus:border-brand transition-all cursor-pointer"
                >
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+91">+91</option>
                  <option value="+61">+61</option>
                  <option value="+86">+86</option>
                </select>
                <input
                  type="tel"
                  value={(editValue || "").includes(' ') ? (editValue || "").split(' ').slice(1).join(' ') : (editValue || "")}
                  onChange={(e) => {
                    const code = (editValue || "").includes(' ') ? (editValue || "").split(' ')[0] : '+91';
                    onChange(`${code} ${e.target.value}`.trim());
                  }}
                  className="flex-1 w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border-2 border-brand/20 rounded-xl px-3 py-2.5 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand transition-all min-w-0"
                  placeholder="Phone number"
                />
              </div>
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border-2 border-brand/20 rounded-xl px-4 py-2.5 mt-1.5 focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            )
          ) : (
            <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 break-words leading-relaxed">{value || "—"}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Read-only Info Card component (used interchangeably conceptually, kept for strict legacy support if needed)
function InfoCard({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`group relative p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-brand/40 dark:hover:border-brand/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden ${className}`}>
      
      {/* Decorative gradient blob */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors duration-500"></div>

      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-brand dark:group-hover:text-slate-200 group-hover:bg-brand/10 transition-colors duration-300 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        </div>
        
        <div className="flex-1 min-w-0 pl-1">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 break-words leading-relaxed">{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}
