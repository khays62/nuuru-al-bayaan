import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";


export default function StudentSettingPage() {
  const { auth } = useAuth();

  const [student, setStudent] = useState(null);
  const [currentEnrollment, setCurrentEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");


  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!auth?.user) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          "http://localhost:7000/api/students/me/results",
          { withCredentials: true }
        );

        setStudent(res.data.student);
        setCurrentEnrollment(res.data.currentEnrollment);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth?.user]);

 
  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
  
    // ✅ Validate input
    if (!currentPassword?.trim() || !newPassword?.trim() || !confirmPassword?.trim()) {
      setPasswordError("Please fill in all fields");
      return;
    }
  
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }
  
    try {
      // ✅ Send PUT request to backend with correct keys and credentials
      const res = await axios.put(
        "/api/students/change-password",
        { oldPassword: currentPassword, newPassword },
        { withCredentials: true } // ensures cookie is sent
      );
  
      // ✅ Success
      setPasswordSuccess(res.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
  
    } catch (err) {
      console.error("Change password error:", err.response);
  
      if (err.response?.status === 401) {
        setPasswordError("Session expired. Please log in again.");
      } else {
        setPasswordError(err.response?.data?.message || "Failed to change password");
      }
    }
  };
  
  

  if (loading) return <p className="text-center mt-10">Loading profile...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!student) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ===== Profile Header ===== */}
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <div className="w-28 h-28 mx-auto rounded-full bg-white flex items-center justify-center shadow-inner ring-2 ring-gray-300 text-4xl">
          👤
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-bold">{student.fullName}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mt-6">
          <InfoBadge title="STUDENT ID" value={student.studentId} color="blue" />
          <InfoBadge title="STATUS" value={student.status || "Active"} color="green" />
          <InfoBadge title="COHORT" value={currentEnrollment?.cohort?.name} color="orange" />
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Change Password
        </button>
      </div>

      {/* ===== Info Cards ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <InfoCard title="Personal Information" subtitle="Student personal details">
          <InfoRow label="Full Name" value={student.fullName} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Date of Birth" value={formatDate(student)} />
          <InfoRow label="Parent / Guardian" value={student.guardianName} />
          <InfoRow label="Contact Number" value={student.contactNumber} />
          <InfoRow label="Address" value={student.address} />
          <InfoRow
            label="Admission Date"
            value={
              student.admissionDate
                ? new Date(student.admissionDate).toLocaleDateString()
                : "-"
            }
          />
        </InfoCard>

        <InfoCard title="Current Academic Information" subtitle="Current enrollment details">
          <InfoRow label="Academic Year" value={currentEnrollment?.academicYear?.yearName} />
          <InfoRow label="Grade" value={currentEnrollment?.gradeSection?.grade?.gradeName} />
          <InfoRow label="Section" value={currentEnrollment?.gradeSection?.section} />
          <InfoRow label="Shift" value={currentEnrollment?.shift?.shiftName} />
        </InfoCard>
      </div>

      {/* ===== Password Modal ===== */}
      {/* {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Change Password</h3>
            {passwordError && <p className="text-red-500 mb-2">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-500 mb-2">{passwordSuccess}</p>}
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )} */}

{showPasswordModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">

      <h2 className="text-2xl font-bold text-center">New Password</h2>
      <p className="text-center text-gray-500 text-sm mb-6">
        Access to ERP
      </p>

      {passwordSuccess && (
        <div className="mb-3 text-sm text-green-600 bg-green-50 p-2 rounded">
          {passwordSuccess}
        </div>
      )}

      {passwordError && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
          {passwordError}
        </div>
      )}

      <div className="space-y-5">

        {/* Current Password */}
        <PasswordInput
          label="Current Password"
          value={currentPassword}
          setValue={setCurrentPassword}
          show={showCurrent}
          setShow={setShowCurrent}
        />

        {/* New Password */}
        <PasswordInput
          label="New Password"
          value={newPassword}
          setValue={setNewPassword}
          show={showNew}
          setShow={setShowNew}
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirm Password"
          value={confirmPassword}
          setValue={setConfirmPassword}
          show={showConfirm}
          setShow={setShowConfirm}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setShowPasswordModal(false)}
          className="w-1/2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium"
        >
          Cancel
        </button>

        <button
          onClick={handleChangePassword}
          className="w-1/2 py-3 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}






    </div>
  );
}

/* ===== Reusable Components ===== */

function InfoBadge({ title, value, color }) {
  const colors = {
    blue: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    orange: "bg-amber-50 text-amber-700 border border-amber-100",
  };
  return (
    <div className={`rounded-lg p-4 ${colors[color]} text-center`}>
      <div className="text-xs uppercase tracking-wide font-semibold">{title}</div>
      <div className="text-xl font-bold">{value || "-"}</div>
    </div>
  );
}

function InfoCard({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border bg-white">
      <div className="px-4 py-3 border-b">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value ?? "-"}</div>
    </div>
  );
}

function formatDate(student) {
  const d = student?.dob || student?.dateOfBirth;
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function PasswordInput({ label, value, setValue, show, setShow }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

