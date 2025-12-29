// // import React, { useState } from "react";
// // import axios from "axios";
// // import { useNavigate } from "react-router-dom";
// // import { useAuth } from "../../../contexts/AuthContext";

// // export default function LoginPage() {
// //   const { login } = useAuth();
// //   const navigate = useNavigate();
// //   const [form, setForm] = useState({ username: "", password: "" });
// //   const [error, setError] = useState("");

// //   const handleChange = (e) => {
// //     setForm({ ...form, [e.target.name]: e.target.value });
// //   };


// //     const handleSubmit = async (e) => {
// //         e.preventDefault();
// //         try {
// //           const res = await axios.post("http://localhost:5000/api/auth/login", form);
// //           // 🔥 CHECK #1: Confirm the data structure you get back
// //           console.log("Login Success Data:", res.data); 
// //           login(res.data);
// //           // 🔥 CHECK #2: Confirm this line is reached
// //           console.log("Context updated. Attempting to navigate..."); 
// //           navigate("/dashboard");
// //         } catch (err) {
// //           // 🔥 CHECK #3: If you see this, the server failed.
// //           setError(err.response?.data?.message || "Login failed");
// //           console.error("Login Error:", err.response); // Print the server error response
// //         }
// //       };

// //   return (
// //     <form onSubmit={handleSubmit}>
// //       <input
// //         name="username"
// //         placeholder="username"
// //         value={form.username}
// //         onChange={handleChange}
// //       />
// //       <input
// //         type="password"
// //         name="password"
// //         placeholder="Password"
// //         value={form.password}
// //         onChange={handleChange}
// //       />
// //       <button type="submit">Login</button>
// //       {error && <p style={{ color: "red" }}>{error}</p>}
// //     </form>
// //   );
// // }


// // import React, { useState } from "react";
// // import axios from "axios";
// // import { useNavigate } from "react-router-dom";
// // import { useAuth } from "../../../contexts/AuthContext";

// // export default function LoginPage() {
// //   const { login } = useAuth();
// //   const navigate = useNavigate();
// //   const [form, setForm] = useState({ username: "", password: "" });
// //   const [error, setError] = useState("");

// //   const handleChange = (e) => {
// //     setForm({ ...form, [e.target.name]: e.target.value });
// //   };

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     try {
// //       const res = await axios.post("http://localhost:5000/api/auth/login", form);
// //       console.log("Login Success Data:", res.data);
// //       login(res.data);
// //       console.log("Context updated. Attempting to navigate...");
// //       navigate("/dashboard");
// //     } catch (err) {
// //       setError(err.response?.data?.message || "Login failed");
// //       console.error("Login Error:", err.response);
// //     }
// //   };

// //   return (
// //     // Outer container: Full screen, center content, background color
// //     <div className="min-h-screen flex items-center justify-center bg-gray-100"> 
// //       {/* Login Card Container */}
// //       <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-2xl space-y-6"> 
// //         <h2 className="text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        
// //         <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
// //           {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
          
// //           {/* Username Input */}
// //           <div>
// //             <label htmlFor="username" className="sr-only">Username</label>
// //             <input
// //               id="username"
// //               name="username"
// //               type="text"
// //               required
// //               className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
// //               placeholder="admin@gmail.com" // Better placeholder example
// //               value={form.username}
// //               onChange={handleChange}
// //             />
// //           </div>

// //           {/* Password Input */}
// //           <div>
// //             <label htmlFor="password" className="sr-only">Password</label>
// //             <input
// //               id="password"
// //               name="password"
// //               type="password"
// //               required
// //               className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
// //               placeholder="Password"
// //               value={form.password}
// //               onChange={handleChange}
// //             />
// //           </div>

// //           {/* Login Button */}
// //           <div>
// //             <button
// //               type="submit"
// //               className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white dark:bg-[#060818] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
// //             >
// //               Login
// //             </button>
// //           </div>
// //         </form>
// //       </div>
// //     </div>
// //   );
// // }


// import React, { useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext";
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
//   const { login } = useAuth(); // Commented out to resolve compilation error
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ username: "", password: "" });
//   const [error, setError] = useState("");

//   // Placeholder for the login function since useAuth is unavailable
//   const mockLogin = (data) => {
//       // // In a real app, this would update authentication state
//       // console.log("Mock login called with data:", data);
//       login(res.data);

//   };
  
//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       // NOTE: Update the local host URL to an appropriate endpoint if needed
//       const res = await axios.post("http://localhost:7000/api/auth/login", form);
//       console.log("Login Success Data:", res.data);
//       // login(res.data); // Replaced with mock
//       mockLogin(res.data);
//       console.log("Context updated. Attempting to navigate...");
//       navigate("/dashboard");
//     } catch (err) {
//       setError(err.response?.data?.message || "Login failed. Check server status.");
//       console.error("Login Error:", err.response);
//     }
//   };

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

//             {/* --- OR Separator (Commented out as per original design) --- */}
//             {/* <div className="relative my-7 text-center md:mb-9">
//               <span className="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-gray-300 dark:bg-gray-700"></span>
//               <span className="relative bg-white/70 dark:bg-black/60 px-2 font-bold uppercase text-gray-500 dark:text-gray-400 backdrop-blur-sm">or</span>
//             </div>
//             */}

//             {/* --- Social Icons (Commented out as per original design) --- */}
//             {/*
//             <div className="mb-10 md:mb-[60px]">
//               <ul className="flex justify-center gap-3.5 text-white">
//                 <li>
//                   <a
//                     href="#"
//                     className="inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition hover:scale-110"
//                     style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
//                   >
//                     <IconInstagram />
//                   </a>
//                 </li>
//                 <li>
//                   <a
//                     href="#"
//                     className="inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition hover:scale-110"
//                     style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
//                   >
//                     <IconFacebookCircle />
//                   </a>
//                 </li>
//                 <li>
//                   <a
//                     href="#"
//                     className="inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition hover:scale-110"
//                     style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
//                   >
//                     <IconTwitter fill={true} />
//                   </a>
//                 </li>
//                 <li>
//                   <a
//                     href="#"
//                     className="inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition hover:scale-110"
//                     style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
//                   >
//                     <IconGoogle />
//                   </a>
//                 </li>
//               </ul>
//             </div>
//             */}

//             {/* --- Sign Up Link (Commented out as per original design) --- */}
//             {/*
//             <div className="text-center dark:text-white mt-10">
//               Don&apos;t have an account ?&nbsp;
//               <a href="/auth/boxed-signup" className="uppercase text-indigo-600 dark:text-indigo-400 underline transition hover:text-black dark:hover:text-white">
//                 SIGN UP
//               </a>
//             </div>
//             */}
            
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
