// import React, { createContext, useState, useContext, useEffect } from "react";

// const AuthContext = createContext();

// // Function to safely get initial user data from local storage
// const getInitialAuth = () => {
//     try {
//         const token = localStorage.getItem("token");
//         const userJson = localStorage.getItem("user");
        
//         if (token && userJson) {
//             return { token, user: JSON.parse(userJson) };
//         }
//         return null;
//     } catch (error) {
//         console.error("Error parsing user data from localStorage:", error);
//         return null;
//     }
// };
 
// export const AuthProvider = ({ children }) => {
//     // 1. Initialize auth state with data from storage
//     const [auth, setAuth] = useState(null);
//     // 2. Introduce the mandatory loading state
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         // Run once on mount to initialize the state from storage
//         const initialAuth = getInitialAuth();
//         setAuth(initialAuth);
//         // Set loading to false once the check is complete
//         setIsLoading(false);
//     }, []);

//     const login = (data) => {
//         // Data structure is { token: "...", user: { ... } }
//         if (data.token && data.user) {
//             // Persist both token and user object
//             localStorage.setItem("token", data.token);
//             localStorage.setItem("user", JSON.stringify(data.user));
            
//             // Set the full data object to state
//             setAuth(data);
//         } else {
//              console.error("Login data missing token or user:", data);
//         }
//     };

//     const logout = () => {
//         // Clear all persisted data
//         localStorage.removeItem("token");
//         localStorage.removeItem("user");
//         setAuth(null);
//     };

//     // Export both 'auth' and 'isLoading'
//     return (
//         <AuthContext.Provider value={{ auth, login, logout, isLoading }}>
//             {children}
//         </AuthContext.Provider>
//     );
// };

// export const useAuth = () => useContext(AuthContext);


// import React, { createContext, useState, useContext, useEffect } from "react";

// const AuthContext = createContext();

// const getInitialAuth = () => {
//   try {
//     const token = localStorage.getItem("token");
//     const userJson = localStorage.getItem("user");
//     return token && userJson ? { token, user: JSON.parse(userJson) } : null;
//   } catch {
//     return null;
//   }
// };



// export const AuthProvider = ({ children }) => {
//   const [auth, setAuth] = useState(getInitialAuth());
//   const [isLoading, setIsLoading] = useState(false);

//   const login = (data) => {
//     // data: { token, user }
//     if (data?.token && data?.user) {
//       localStorage.setItem("token", data.token);
//       localStorage.setItem("user", JSON.stringify(data.user));
//       setAuth({ token: data.token, user: data.user });
//     } else {
//       console.error("Login data missing token or user:", data);
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     setAuth(null);
//   };

//   return (
//     <AuthContext.Provider value={{ auth, login, logout, setAuth, isLoading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);


// import React, { createContext, useState, useContext } from "react";

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [auth, setAuth] = useState({ user: null, token: null });

//   const login = (data) => setAuth(data);
//   const logout = () => setAuth({ user: null, token: null });

//   return (
//     <AuthContext.Provider value={{ auth, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);

// import React, { createContext, useState, useContext } from "react";

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [auth, setAuth] = useState({ user: null, token: null });

//   const login = (data) => setAuth(data);
//   const logout = () => setAuth({ user: null, token: null });

//   return (
//     <AuthContext.Provider value={{ auth, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);


// import React, { createContext, useState, useContext, useEffect } from "react";
// import axios from "axios";

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [auth, setAuth] = useState({ user: null, loading: true });

//   // Fetch current user from server (cookie will be sent automatically)
//   // const fetchCurrentUser = async () => {
//   //   try {
//   //     const res = await axios.get("/api/auth/verify", {
//   //       withCredentials: true, // important for cookies
//   //     });
//   //     if (res.data.success) {
//   //       setAuth({ user: res.data.admin, loading: false });
//   //     } else {
//   //       setAuth({ user: null, loading: false });
//   //     }
//   //   } catch (err) {
//   //     setAuth({ user: null, loading: false });
//   //   }
//   // };

//   const fetchCurrentUser = async () => {
//     try {
//       const res = await axios.get("/api/auth/verify", { withCredentials: true });
//       if (res.data.user) {
//         setAuth({ user: res.data.user, loading: false });
//       } else {
//         setAuth({ user: null, loading: false });
//       }
//     } catch (err) {
//       setAuth({ user: null, loading: false });
//     }
//   };
  

//   useEffect(() => {
//     fetchCurrentUser();
//   }, []);

//   // Login (server sets cookie)
//   const login = async (username, password) => {
//     try {
//       const res = await axios.post(
//         "/api/auth/login",
//         { username, password },
//         // { withCredentials: true }
//         {
//           headers: { "Content-Type": "application/json" },
//           withCredentials: true
//         }
//       );

//       if (res.data.success) {
//         await fetchCurrentUser(); // update auth.user
//         return { success: true };
//       }
//       return { success: false, message: res.data.message };
//     } catch (err) {
//       return { success: false, message: err.response?.data?.message || err.message };
//     }
//   };

//   // Logout (server clears cookie)
//   const logout = async () => {
//     try {
//       await axios.post("/api/auth/logout", {}, { withCredentials: true });
//       setAuth({ user: null, loading: false });
//     } catch (err) {
//       console.error("Logout failed:", err);
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ auth, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);


// import React, { createContext, useState, useContext, useEffect } from "react";
// import axios from "axios";


// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const fetchCurrentUser = async () => {
//     try {
//       const res = await axios.get("/api/auth/verify", { withCredentials: true });
//       if (res.data.user) {
//         setUser(res.data.user);
//       } else {
//         setUser(null);
//       }
//     } catch (err) {
//       setUser(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCurrentUser();
//   }, []);

//   const login = async (username, password) => {
//     try {
//       const res = await axios.post(
//         "/api/auth/login",
//         { username, password },
//         { withCredentials: true, headers: { "Content-Type": "application/json" } }
//       );
//       if (res.data.success) {
//         await fetchCurrentUser();
//         return { success: true };
//       }
//       return { success: false, message: res.data.message };
//     } catch (err) {
//       return { success: false, message: err.response?.data?.message || err.message };
//     }
//   };

//   const logout = async () => {
//     try {
//       await axios.post("/api/auth/logout", {}, { withCredentials: true });
//       setUser(null);
//     } catch (err) {
//       console.error("Logout failed:", err);
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ auth: { user }, loading, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);

import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("/api/auth/verify", { withCredentials: true });
      if (res.data.user) setUser(res.data.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const perm = user.permissions?.[module];
    if (!perm) return false;
    return perm.full === true || perm[action] === true;
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post(
        "/api/auth/login",
        { username, password },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.success) {
        await fetchCurrentUser();
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout", {}, { withCredentials: true });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ auth: { user }, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
