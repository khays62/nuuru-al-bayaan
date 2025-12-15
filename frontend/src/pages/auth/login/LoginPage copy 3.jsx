// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../../contexts/AuthContext";

// // Assuming useAuth context and other dependencies are accessible in this environment
// // We'll keep the relative imports as they were in the original code snippet
// // FIX: Temporarily commenting out non-resolvable context dependency to allow compilation.
// // import { useAuth } from "../../../contexts/AuthContext";

// // --- START: SVG Icons (Used for Social Links for completeness, though commented out) ---
// // Using custom SVGs as replacements for imported components like IconFacebookCircle
// const IconInstagram = () => (
//   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.5" y1="6.5" y2="6.5"></line></svg>
// );
// const IconFacebookCircle = () => (
//   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
// );
// const IconTwitter = () => (
//   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.288 5.694c-.695.309-1.446.516-2.235.61a4.295 4.295 0 0 0 1.87-2.146 8.57 8.57 0 0 1-2.556.977c-.65-.694-1.575-1.127-2.618-1.127-1.984 0-3.593 1.61-3.593 3.594 0 .28.03.55.087.81a10.215 10.215 0 0 1-7.402-3.753c-.305.52-.48.974-.48 1.48 0 1.246.634 2.345 1.597 2.984a3.568 3.568 0 0 1-1.625-.45c0 .015 0 .03 0 .045 0 1.74 1.237 3.193 2.876 3.525a3.606 3.606 0 0 1-1.62.061c.456 1.424 1.777 2.46 3.342 2.484a8.55 8.55 0 0 1-5.304 1.832c-.34 0-.675-.02-.996-.058a12.03 12.03 0 0 0 6.556 1.916c7.868 0 12.164-6.505 12.164-12.164 0-.185-.004-.37-.013-.553.834-.602 1.55-1.355 2.12-2.213z"/></svg>
// );
// const IconGoogle = () => (
//   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" x2="12" y1="8" y2="8"></line><line x1="3.95" x2="8.5" y1="12" y2="12"></line><line x1="21.17" x2="12" y1="16" y2="16"></line></svg>
// );
// // --- END: SVG Icons ---


// export default function LoginPage() {
//   // const { login } = useAuth(); // Commented out to resolve compilation error
//   // const navigate = useNavigate();
//   // const [form, setForm] = useState({ username: "", password: "" });
//   // const [error, setError] = useState("");

//   const [form, setForm] = useState({ username: "", password: "" });
//   const [error, setError] = useState("");
//   const { auth, login } = useAuth();
//   const navigate = useNavigate();

//   // useEffect(() => {
//   //   if (auth?.user?.role) {
//   //     // redirect after successful login
//   //     const role = auth.user.role;
//   //     if (role === "admin") navigate("/dashboard");
//   //     else if (role === "exam_office") navigate("/exams");
//   //     else if (role === "registration_office") navigate("/students");
//   //     else if (role === "teacher") navigate("/grades");
//   //     else if (role === "student") navigate("/results");
//   //   }
//   // }, [auth, navigate]);

//   useEffect(() => {
//     if (!auth?.user) return; // Only run when user is set
  
//     const role = auth.user.role;
//     switch (role) {
//       case "admin":
//         navigate("/dashboard", { replace: true });
//         break;
//       case "exam_office":
//         navigate("/exams", { replace: true });
//         break;
//       case "registration_office":
//         navigate("/students", { replace: true });
//         break;
//       case "teacher":
//         navigate("/grades", { replace: true });
//         break;
//       case "student":
//         navigate("/results", { replace: true });
//         break;
//       default:
//         break;
//     }
//   }, [auth?.user]); // <-- only trigger when user changes
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await axios.post("http://localhost:7000/api/auth/login", form);
//       // server returns { token, user }
//       login(res.data);
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed");
//       console.error(err);
//     }
//   };

//   // Placeholder for the login function since useAuth is unavailable
//   const mockLogin = (data) => {
//       // // In a real app, this would update authentication state
//       // console.log("Mock login called with data:", data);
//       login(res.data);

//   };
  
//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

  
// // const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     try {
// //       const res = await axios.post("http://localhost:7000/api/auth/login", form);
// //       console.log("✅ Login success:", res.data);
// //       // navigate("/dashboard");

// //       console.log("Navigating to dashboard...");
// // navigate("/dashboard", { replace: true });
// //     } catch (err) {
// //       console.error("❌ Login failed:", err);
// //     }
// //   };
  
// // const handleSubmit = async (e) => {
// //   e.preventDefault();
// //   try {
// //     const res = await axios.post("http://localhost:7000/api/auth/login", form);
// //     console.log("✅ Login success:", res.data);

// //     // 1. Update auth state
// //     login(res.data); // <- this must come from useAuth

// //     // 2. Navigate after login state is set
// //     navigate("/dashboard", { replace: true });
// //   } catch (err) {
// //     console.error("❌ Login failed:", err);
// //     setError(err.response?.data?.message || "Login failed");
// //   }
// // };

//   return (
//     // Main Container: Full viewport height, flex-centered, using a dark background
//     <div className="min-h-screen flex items-center justify-center 
                    
//                     bg-cover bg-center px-6 py-10 dark:bg-[#fffff] sm:px-16">
      
//       {/* Absolute Image Placeholders (using empty divs with fixed height/width to mimic the layout) */}
//       <div className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2 w-40  hidden lg:block"></div>
//       <div className="absolute right-0 top-0 h-[300px] w-40  hidden sm:block"></div>

//       {/* Decorative Wrapper: The large gradient box surrounding the form card */}
//       <div className="relative w-full max-w-[870px] rounded-2xl p-2 
                     
//                      ">
        
//         {/* The Login Card: Slightly transparent, blurred background */}
//         <div className="relative flex flex-col justify-center rounded-2xl bg-white/70 px-6 py-16 backdrop-blur-md 
//                          shadow-xl">
          
//           {/* Language Dropdown Placeholder (can be added later) */}
//           <div className="absolute end-6 top-6">
//             {/* <LanguageDropdown /> */}
//           </div>
          
//           <div className="mx-auto w-full max-w-[440px]">
//             <div className="mb-10 ">
//               <h1 className="text-4xl font-extrabold uppercase !leading-snug text-gray-800">Sign in</h1>
//               <p className="text-base font-bold leading-normal text-gray-200 dark:text-gray-300">
//                 Enter your username and password to log in.
//               </p>
//             </div>
            
//             {/* --- ACTUAL LOGIN FORM --- */}
//             <form className="space-y-5" onSubmit={handleSubmit}>
              
//               {/* Error Message */}
//               {error && (
//                 <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">
//                   {error}
//                 </div>
//               )}

//               {/* Username Field */}
//               <div className="relative">
//                 <input
//                   name="username"
//                   type="text"
//                   required
//                   placeholder="Username or Email"
//                   value={form.username}
//                   onChange={handleChange}
//                   className="form-input w-full rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-100/80 
//                              focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-0 backdrop-blur-sm px-4 py-3 text-gray-900 dark:text-black"
//                 />
//               </div>

//               {/* Password Field */}
//               <div className="relative">
//                 <input
//                   type="password"
//                   name="password"
//                   required
//                   placeholder="Password"
//                   value={form.password}
//                   onChange={handleChange}
//                   className="form-input w-full rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-100/80 
//                              focus:border-gray-500 dark:focus:border-gray-400 focus:ring-0 backdrop-blur-sm px-4 py-3 text-gray-900 dark:text-black"
//                 />
//               </div>

//               {/* Login Button */}
//               <button
//                 type="submit"
//                 className="btn cursor-pointer w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 
//                            rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-[1.01]"
//               >
//                 Login
//               </button>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../../contexts/AuthContext";
// import axios from "axios";

// export default function LoginPage() {
//   const { auth, login } = useAuth();
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ username: "", password: "" });
//   const [error, setError] = useState("");

//   // Redirect user after login based on role
//   useEffect(() => {
//     if (!auth?.user) return;

//     const role = auth.user.role;
//     switch (role) {
//       case "admin":
//         navigate("/dashboard", { replace: true });
//         break;
//       case "exam_office":
//         navigate("/exams", { replace: true });
//         break;
//       case "registration_office":
//         navigate("/students", { replace: true });
//         break;
//       case "teacher":
//         navigate("/grades", { replace: true });
//         break;
//       case "student":
//         navigate("/results", { replace: true });
//         break;
//       default:
//         navigate("/", { replace: true });
//     }
//   }, [auth?.user, navigate]);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");

//     try {
//       // Server sets cookie automatically
//       const res = await axios.post(
//         "http://localhost:7000/api/auth/login",
//         form,
//         { withCredentials: true } // important for cookies
//       );

//       if (res.data.success) {
//         // Update context with user only; token is not needed
//         await login(); // fetch current user from /verify endpoint
//       }
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed");
//       console.error(err);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-6 py-10">
//       <div className="relative w-full max-w-[870px] rounded-2xl p-2">
//         <div className="relative flex flex-col justify-center rounded-2xl bg-white/70 px-6 py-16 backdrop-blur-md shadow-xl">
//           <div className="mx-auto w-full max-w-[440px]">
//             <div className="mb-10">
//               <h1 className="text-4xl font-extrabold uppercase text-gray-800">Sign in</h1>
//               <p className="text-base font-bold leading-normal text-gray-500">
//                 Enter your username and password to log in.
//               </p>
//             </div>

//             <form className="space-y-5" onSubmit={handleSubmit}>
//               {error && (
//                 <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">
//                   {error}
//                 </div>
//               )}

//               <input
//                 name="username"
//                 type="text"
//                 placeholder="Username or Email"
//                 required
//                 value={form.username}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border-2 border-gray-300 px-4 py-3"
//               />

//               <input
//                 name="password"
//                 type="password"
//                 placeholder="Password"
//                 required
//                 value={form.password}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border-2 border-gray-300 px-4 py-3"
//               />

//               <button
//                 type="submit"
//                 className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg"
//               >
//                 Login
//               </button>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../../contexts/AuthContext";
// import axios from "axios";

// export default function LoginPage() {
//   const { auth, login } = useAuth();
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ username: "", password: "" });
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Redirect after successful login
//   useEffect(() => {
//     if (!auth?.user) return;

//     const role = auth.user.role;
//     switch (role) {
//       case "admin":
//         navigate("/dashboard", { replace: true });
//         break;
//       case "exam_office":
//         navigate("/exams", { replace: true });
//         break;
//       case "registration_office":
//         navigate("/students", { replace: true });
//         break;
//       case "teacher":
//         navigate("/grades", { replace: true });
//         break;
//       case "student":
//         navigate("/results", { replace: true });
//         break;
//       default:
//         navigate("/", { replace: true });
//     }
//   }, [auth?.user, navigate]);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
//   //   setError("");
//   //   setLoading(true);

//   //   try {
//   //     const res = await axios.post(
//   //       "http://localhost:7000/api/auth/login",
//   //       form,
//   //       {
//   //         headers: { "Content-Type": "application/json" },
//   //         withCredentials: true, // important for cookies
//   //       }
//   //     );

//   //     // Check if backend returned token + user
//   //     if (res.data?.token && res.data?.user) {
//   //       login({
//   //         token: res.data.token,
//   //         user: res.data.user,
//   //       });
//   //     } else {
//   //       throw new Error("Invalid response from server");
//   //     }
//   //   } catch (err) {
//   //     const message =
//   //       err.response?.data?.message ||
//   //       err.message ||
//   //       "Login failed. Please check your credentials.";
//   //     setError(message);
//   //     console.error("Login error:", message);
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);
  
//     const { username, password } = form;
//     try {
//       const result = await login(username, password); // ✅ use context method
  
//       if (result.success) {
//         // successful login, auth state will auto-update via fetchCurrentUser()
//       } else {
//         setError(result.message || "Invalid credentials.");
//       }
//     } catch (err) {
//       setError("Login failed. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-6 py-10">
//       <div className="relative w-full max-w-[870px] rounded-2xl p-2">
//         <div className="relative flex flex-col justify-center rounded-2xl bg-white/70 px-6 py-16 backdrop-blur-md shadow-xl">
//           <div className="mx-auto w-full max-w-[440px]">
//             <div className="mb-10">
//               <h1 className="text-4xl font-extrabold uppercase text-gray-800">
//                 Sign in
//               </h1>
//               <p className="text-base font-bold leading-normal text-gray-500">
//                 Enter your username and password to log in.
//               </p>
//             </div>

//             <form className="space-y-5" onSubmit={handleSubmit}>
//               {error && (
//                 <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">
//                   {error}
//                 </div>
//               )}

//               <input
//                 name="username"
//                 type="text"
//                 placeholder="Username or Email"
//                 required
//                 value={form.username}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600"
//               />

//               <input
//                 name="password"
//                 type="password"
//                 placeholder="Password"
//                 required
//                 value={form.password}
//                 onChange={handleChange}
//                 className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600"
//               />

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition duration-200"
//               >
//                 {loading ? "Logging in..." : "Login"}
//               </button>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



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

  // Redirect after successful login
  useEffect(() => {
    if (!auth?.user) return;

    const role = auth.user.role;
    switch (role) {
      case "admin":
        navigate("/dashboard", { replace: true });
        break;
      case "exam_office":
        navigate("/exams", { replace: true });
        break;
      case "registration_office":
        navigate("/students", { replace: true });
        break;
      case "teacher":
        navigate("/grades", { replace: true });
        break;
      case "student":
        navigate("/results", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  }, [auth?.user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   setLoading(true);

  //   try {
  //     const res = await axios.post(
  //       "http://localhost:7000/api/auth/login",
  //       form,
  //       {
  //         headers: { "Content-Type": "application/json" },
  //         withCredentials: true, // important for cookies
  //       }
  //     );

  //     // Check if backend returned token + user
  //     if (res.data?.token && res.data?.user) {
  //       login({
  //         token: res.data.token,
  //         user: res.data.user,
  //       });
  //     } else {
  //       throw new Error("Invalid response from server");
  //     }
  //   } catch (err) {
  //     const message =
  //       err.response?.data?.message ||
  //       err.message ||
  //       "Login failed. Please check your credentials.";
  //     setError(message);
  //     console.error("Login error:", message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    const { username, password } = form;
    try {
      const result = await login(username, password); // ✅ use context method
  
      if (result.success) {
        // successful login, auth state will auto-update via fetchCurrentUser()
      } else {
        setError(result.message || "Invalid credentials.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
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