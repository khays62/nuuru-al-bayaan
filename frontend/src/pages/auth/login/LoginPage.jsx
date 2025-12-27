import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import axios from "axios";

export default function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // if (user.role === "admin") navigate("/dashboard");
  // else if (user.role === "student") navigate("/student-dashboard");
  // else navigate("/dashboard");
  
  // Redirect after successful login
  useEffect(() => {
    if (!auth?.user) return;

    const role = auth.user.role;
    switch (role) {
      case "admin":
        navigate("/dashboard", { replace: true });
        break;
      case "staff":
        navigate("/dashboard", { replace: true });
        break;
      case "teacher":
        navigate("/grades", { replace: true });
        break;
      case "student":
        navigate("/student-dashboard", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  }, [auth?.user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };



const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const isStudent =
      /^[0-9]+$/.test(form.username) || form.username.startsWith("ST");

    const payload = isStudent
      ? { studentId: form.username, password: form.password }
      : { username: form.username, password: form.password };

    const res = await axios.post("http://localhost:7000/api/auth/login", payload, {
      withCredentials: true,
    });

    if (res.data.success) {
      // Trigger auth context refresh
      await login(form.username, form.password);
    } else {
      setError(res.data.message || "Invalid credentials.");
    }
  } catch (err) {
    setError(err.response?.data?.message || "Login failed. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-6 py-10">
      <div className="relative w-full max-w-[870px] rounded-2xl p-2">
        <div className="relative flex flex-col justify-center rounded-2xl bg-white/70 px-6 py-16 backdrop-blur-md shadow-xl">
          <div className="mx-auto w-full max-w-[440px]">
            <div className="mb-10">
              <h1 className="text-4xl font-extrabold uppercase text-gray-800">
                Sign in
              </h1>
              <p className="text-base font-bold leading-normal text-gray-500">
                Enter your username and password to log in.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

              <input
                name="username"
                type="text"
                placeholder="Username or Email"
                required
                value={form.username}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />

              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}