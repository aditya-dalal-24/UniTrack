import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Calendar, User, Users, GraduationCap, Building2, Heart, Edit2, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const defaultProfileData = {
  name: "",
  rollNo: "",
  privateEmail: "",
  universityEmail: "",
  phone: "",
  dateOfBirth: "",
  age: 0,
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

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getProfile();
    if (apiError) {
      setError(apiError);
    } else if (data) {
      const fetched = {
        name: data.name || "",
        rollNo: data.rollNo || "",
        privateEmail: data.email || "",
        universityEmail: data.universityEmail || "",
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || "",
        age: data.age || 0,
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
      rollNo: editData.rollNo,
      email: editData.privateEmail,
      universityEmail: editData.universityEmail,
      phone: editData.phone,
      dateOfBirth: editData.dateOfBirth,
      age: editData.age,
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
      className="space-y-6"
    >
      {/* Edit Button */}
      <div className="flex justify-end">
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-brand-dark transition-all active:scale-95"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Header Section */}
      <div className="rounded-3xl bg-gradient-to-br from-brand/10 via-accent/10 to-brand/5 dark:from-brand/20 dark:via-accent/20 dark:to-brand/10 border border-brand/20 dark:border-brand/30 p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=student"
            alt="Profile Avatar"
            className="w-32 h-32 rounded-full shadow-xl border-4 border-white dark:border-slate-800"
          />

          <div className="flex-1 text-center md:text-left">
            {isEditing ? (
              <input
                type="text"
                value={editData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="text-4xl font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 w-full max-w-md"
              />
            ) : (
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">{studentData.name}</h1>
            )}
            <p className="text-lg text-brand dark:text-brand-300 font-medium mt-1">
              {studentData.rollNo}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {studentData.course} • {studentData.semester}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Mail className="h-4 w-4" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-500">Private:</span>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editData.privateEmail}
                        onChange={(e) => handleChange("privateEmail", e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm"
                        placeholder="Private email"
                      />
                    ) : (
                      <span>{studentData.privateEmail}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-500">University:</span>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editData.universityEmail}
                        onChange={(e) => handleChange("universityEmail", e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm"
                        placeholder="University email"
                      />
                    ) : (
                      <span>{studentData.universityEmail}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Phone className="h-4 w-4" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <span>{studentData.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-brand" />
          Personal Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <EditableInfoCard
            icon={Calendar}
            label="Date of Birth"
            value={studentData.dateOfBirth}
            editValue={editData.dateOfBirth}
            isEditing={isEditing}
            onChange={(val) => handleChange("dateOfBirth", val)}
          />
          <EditableInfoCard
            icon={User}
            label="Age"
            value={`${studentData.age} years`}
            editValue={editData.age}
            isEditing={isEditing}
            onChange={(val) => handleChange("age", parseInt(val) || 0)}
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
      </div>

      {/* Academic Details */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-brand" />
          Academic Details
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <EditableInfoCard
            icon={Building2}
            label="College"
            value={studentData.college}
            editValue={editData.college}
            isEditing={isEditing}
            onChange={(val) => handleChange("college", val)}
          />
          <EditableInfoCard
            icon={GraduationCap}
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
          <InfoCard icon={User} label="Enrollment No." value={studentData.rollNo} />
        </div>
      </div>

      {/* Parents/Guardian Information */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand" />
          Parents/Guardian Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Father */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Father's Details</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.fatherName}
                    onChange={(e) => handleChange("fatherName", e.target.value)}
                    className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{studentData.fatherName}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.fatherPhone}
                    onChange={(e) => handleChange("fatherPhone", e.target.value)}
                    className="flex-1 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-400">{studentData.fatherPhone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Mother */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Mother's Details</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.motherName}
                    onChange={(e) => handleChange("motherName", e.target.value)}
                    className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{studentData.motherName}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.motherPhone}
                    onChange={(e) => handleChange("motherPhone", e.target.value)}
                    className="flex-1 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-400">{studentData.motherPhone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-6">
        <h2 className="text-xl font-bold text-red-900 dark:text-red-400 mb-4">
          Emergency Contact
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-red-600 dark:text-red-400">Contact Person</p>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.emergencyContactName}
                  onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                  className="w-full font-semibold text-red-900 dark:text-red-300 bg-white dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded px-2 py-1 text-sm mt-1"
                />
              ) : (
                <p className="font-semibold text-red-900 dark:text-red-300">{studentData.emergencyContactName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-red-600 dark:text-red-400">Phone Number</p>
              {isEditing ? (
                <input
                  type="tel"
                  value={editData.emergencyContact}
                  onChange={(e) => handleChange("emergencyContact", e.target.value)}
                  className="w-full font-semibold text-red-900 dark:text-red-300 bg-white dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded px-2 py-1 text-sm mt-1"
                />
              ) : (
                <p className="font-semibold text-red-900 dark:text-red-300">{studentData.emergencyContact}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Editable Info Card component
function EditableInfoCard({ icon: Icon, label, value, editValue, isEditing, onChange, className = "", multiline = false, type = "text" }) {
  return (
    <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          {isEditing ? (
            multiline ? (
              <textarea
                value={editValue}
                onChange={(e) => onChange(e.target.value)}
                rows="2"
                className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 resize-none"
              />
            ) : (
              <input
                type={type}
                value={type === "number" ? editValue : editValue}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
              />
            )
          ) : (
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Read-only Info Card component
function InfoCard({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}
