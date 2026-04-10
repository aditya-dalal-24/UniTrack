import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";

// Single student data
const studentData = {
  name: "Aarav Patel",
  email: "aarav.patel@example.com",
  phone: "+91 98765 43210",
  rollNo: "2024-CS-101",
  class: "Computer Science - Year 3",
  address: "123 MG Road, Bangalore, Karnataka 560001",
  dateOfBirth: "15 March 2003",
  enrollmentDate: "August 2021",
};

const recentActivities = [
  { id: 1, type: "Assignment", title: "Data Structures Project", date: "2 days ago", status: "Submitted" },
  { id: 2, type: "Exam", title: "Algorithms Mid-term", date: "1 week ago", status: "Completed" },
  { id: 3, type: "Attendance", title: "Present - Database Systems", date: "Today", status: "Marked" },
];

export default function Students() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Profile"
        description="View and manage student information and academic progress."
      />

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {studentData.name.charAt(0)}
            </div>
          </div>

          {/* Student Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {studentData.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Roll No: {studentData.rollNo} • {studentData.class}
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Mail className="h-4 w-4 text-brand" />
                {studentData.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Phone className="h-4 w-4 text-brand" />
                {studentData.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4 text-brand" />
                DOB: {studentData.dateOfBirth}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-brand" />
                {studentData.address}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Academic Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Overall Attendance"
          value="94%"
          icon={Calendar}
          trend="3%"
          trendUp={true}
          color="emerald"
        />
        <StatsCard
          title="Average Grade"
          value="A-"
          icon={Award}
          description="GPA: 3.7/4.0"
          color="brand"
        />
        <StatsCard
          title="Assignments"
          value="18/20"
          icon={BookOpen}
          description="Completed"
          color="accent"
        />
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {activity.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activity.type} • {activity.date}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                {activity.status}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
