// // import React from 'react';
// // import { useNavigate } from 'react-router-dom'; // Import useNavigate here
// // import logo from '../assets/nuuruBayaan.png';
// // import { useAuth } from '../contexts/AuthContext';

// // export default function LoginPage() {
// //     const { login } = useAuth();
// //     const navigate = useNavigate(); // Use the hook here

// //     const handleLogin = (e) => {
// //         e.preventDefault();
// //         login(); // This just sets the authentication state
// //         navigate('/dashboard'); // Now, we manually navigate after a successful login
// //     };

// //     return (
// //         <div className="flex items-center justify-center min-h-screen bg-gray-100">
// //             <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
// //                 <div className="text-center">
// //                     <img className="w-24 h-24 mx-auto" src={logo} alt="Logo" />
// //                     <h2 className="mt-6 text-3xl font-bold text-gray-900">
// //                         Sign in to your account
// //                     </h2>
// //                     <p className="mt-2 text-sm text-gray-600">
// //                         Nuuru Al-Bayaan Academic Management System
// //                     </p>
// //                 </div>
// //                 <form className="mt-8 space-y-6" onSubmit={handleLogin}>
// //                     <div className="rounded-md shadow-sm -space-y-px">
// //                         <div>
// //                             <label htmlFor="username" className="sr-only">Username</label>
// //                             <input
// //                                 id="username"
// //                                 name="username"
// //                                 type="text"
// //                                 required
// //                                 className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
// //                                 placeholder="Username"
// //                                 defaultValue="admin"
// //                             />
// //                         </div>
// //                         <div>
// //                             <label htmlFor="password-input" className="sr-only">Password</label>
// //                             <input
// //                                 id="password-input"
// //                                 name="password"
// //                                 type="password"
// //                                 required
// //                                 className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
// //                                 placeholder="Password"
// //                                 defaultValue="password"
// //                             />
// //                         </div>
// //                     </div>

// //                     <div>
// //                         <button
// //                             type="submit"
// //                             className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
// //                         >
// //                             Sign in
// //                         </button>
// //                     </div>
// //                 </form>
// //             </div>
// //         </div>
// //     );
// // }

// import React, { useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../../contexts/AuthContext";

// export default function LoginPage() {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ username: "", password: "" });
//   const [error, setError] = useState("");

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
//   //   try {
//   //     const res = await axios.post("http://localhost:5000/api/auth/login", form);
//   //     login(res.data);
//   //     navigate("/dashboard");
//   //   } catch (err) {
//   //     setError(err.response?.data?.message || "Login failed");
//   //   }
//   // };


//   // File: src/api/auth/login/LoginPage.jsx

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//           const res = await axios.post("http://localhost:5000/api/auth/login", form);
//           // 🔥 CHECK #1: Confirm the data structure you get back
//           console.log("Login Success Data:", res.data); 
//           login(res.data);
//           // 🔥 CHECK #2: Confirm this line is reached
//           console.log("Context updated. Attempting to navigate..."); 
//           navigate("/dashboard");
//         } catch (err) {
//           // 🔥 CHECK #3: If you see this, the server failed.
//           setError(err.response?.data?.message || "Login failed");
//           console.error("Login Error:", err.response); // Print the server error response
//         }
//       };

//   return (
//     <form onSubmit={handleSubmit}>
//       <input
//         name="username"
//         placeholder="username"
//         value={form.username}
//         onChange={handleChange}
//       />
//       <input
//         type="password"
//         name="password"
//         placeholder="Password"
//         value={form.password}
//         onChange={handleChange}
//       />
//       <button type="submit">Login</button>
//       {error && <p style={{ color: "red" }}>{error}</p>}
//     </form>
//   );
// }
