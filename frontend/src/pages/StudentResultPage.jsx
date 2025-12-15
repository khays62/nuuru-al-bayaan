// import React from "react";

// export default function StudentResultPage() {
//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-2">Welcome, Student!</h1>
//       <p>This is your personalized dashboard. You can check your results, attendance, and announcements here.</p>
//     </div>
//   );
// }


// import { useAuth } from "../../../contexts/AuthContext";
// import axios from "axios";
// import { useEffect, useState } from "react";

// export default function StudentResultsPage() {
//   const { auth } = useAuth();
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!auth?.user) return;

//     axios
//       .get("http://localhost:7000/api/students/me/results", {
//         withCredentials: true,
//       })
//       .then((res) => setData(res.data))
//       .catch((err) => {
//         console.error(err);
//         setError(err.response?.data?.message || "Failed to load results");
//       })
//       .finally(() => setLoading(false));
//   }, [auth?.user]);

//   if (loading) return <p className="text-center mt-10">Loading your results...</p>;
//   if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6 text-center">📊 My Results</h1>

//       {/* {Object.keys(data.results).map((subject) => (
//         <div key={subject} className="mb-6 border rounded-xl p-4 shadow-sm bg-gray-50">
//           <h2 className="text-xl font-semibold text-gray-800 mb-3">{subject}</h2>
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="border-b">
//                 <th className="py-2 px-3">Exam</th>
//                 <th className="py-2 px-3">Score</th>
//                 <th className="py-2 px-3">Grade</th>
//               </tr>
//             </thead>
//             <tbody>
//               {data.results[subject].map((exam, i) => (
//                 <tr key={i} className="border-b hover:bg-gray-100">
//                   <td className="py-2 px-3">{exam.examName}</td>
//                   <td className="py-2 px-3">{exam.score}</td>
//                   <td className="py-2 px-3 font-semibold">{exam.grade}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       ))} */}

// {data && data.results && Object.keys(data.results).length > 0 ? (
//   Object.keys(data.results).map((subject) => (
//     <div key={subject} className="mb-6 border rounded-xl p-4 shadow-sm bg-gray-50">
//       <h2 className="text-xl font-semibold text-gray-800 mb-3">{subject}</h2>
//       <table className="w-full text-left border-collapse">
//         <thead>
//           <tr className="border-b">
//             <th className="py-2 px-3">Exam</th>
//             <th className="py-2 px-3">Score</th>
//             <th className="py-2 px-3">Grade</th>
//           </tr>
//         </thead>
//         <tbody>
//           {Array.isArray(data.results[subject]) &&
//             data.results[subject].map((exam, i) => (
//               <tr key={i} className="border-b hover:bg-gray-100">
//                 <td className="py-2 px-3">{exam.examName}</td>
//                 <td className="py-2 px-3">{exam.score}</td>
//                 <td className="py-2 px-3 font-semibold">{exam.grade}</td>
//               </tr>
//             ))}
//         </tbody>
//       </table>
//     </div>
//   ))
// ) : (
//   <p className="text-center text-gray-500">No results found yet.</p>
// )}

//     </div>
//   );
// }


// import { useAuth } from "../../../contexts/AuthContext";
// import axios from "axios";
// import { useEffect, useState } from "react";

// export default function StudentResultsPage() {
//   const { auth } = useAuth();
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!auth?.user) return;

//     axios
//       .get("http://localhost:7000/api/students/me/results", {
//         withCredentials: true,
//       })
//       .then((res) => {
//         // Flatten and organize results by subject
//         const grouped = {};

//         res.data.results.forEach((item) => {
//           const subject = item.subject?.name || "Unknown";
//           if (!grouped[subject]) grouped[subject] = { midterm: 0, final: 0 };

//           if (item.exam?.name?.toLowerCase().includes("mid")) {
//             grouped[subject].midterm = item.scoreObtained;
//           } else if (item.exam?.name?.toLowerCase().includes("final")) {
//             grouped[subject].final = item.scoreObtained;
//           }
//         });

//         // Convert to array for rendering
//         const formatted = Object.keys(grouped).map((subject) => ({
//           subject,
//           ...grouped[subject],
//           total: grouped[subject].midterm + grouped[subject].final,
//         }));

//         setResults(formatted);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.response?.data?.message || "Failed to load results");
//       })
//       .finally(() => setLoading(false));
//   }, [auth?.user]);

//   if (loading)
//     return <p className="text-center mt-10">Loading your results...</p>;
//   if (error)
//     return <p className="text-center text-red-500 mt-10">{error}</p>;

//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6 text-center">📊 My Results</h1>

//       {results.length > 0 ? (
//         <div className="space-y-4">
//           {results.map((r, i) => (
//             <div
//               key={i}
//               className="flex justify-between items-center border rounded-xl p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition"
//             >
//               <h2 className="text-lg font-semibold text-gray-800">{r.subject}</h2>
//               <div className="text-gray-700">
//                 <span className="mr-4">🧾 Midterm: {r.midterm}</span>
//                 <span className="mr-4">📘 Final: {r.final}</span>
//                 <span className="font-bold text-gray-900">🏁 Total: {r.total}</span>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-center text-gray-500">No results found yet.</p>
//       )}
//     </div>
//   );
// }


// import { useAuth } from "../../../contexts/AuthContext";
// import axios from "axios";
// import { useEffect, useState } from "react";

// export default function StudentResultsPage() {
//   const { auth } = useAuth();
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!auth?.user) return;

//     axios
//       .get("http://localhost:7000/api/students/me/results", {
//         withCredentials: true,
//       })
//       .then((res) => {
//         console.log("API results response:", res.data);

//         const rawResults = Array.isArray(res.data.results)
//           ? res.data.results
//           : Array.isArray(res.data)
//           ? res.data
//           : [];

//         const grouped = {};

//         rawResults.forEach((item) => {
//           const subject = item.subject?.name || "Unknown";
//           if (!grouped[subject]) grouped[subject] = { midterm: 0, final: 0 };

//           const examName = item.exam?.name?.toLowerCase() || "";

//           if (examName.includes("mid")) grouped[subject].midterm = item.scoreObtained;
//           else if (examName.includes("final")) grouped[subject].final = item.scoreObtained;
//         });

//         const formatted = Object.keys(grouped).map((subject) => ({
//           subject,
//           ...grouped[subject],
//           total: grouped[subject].midterm + grouped[subject].final,
//         }));

//         setResults(formatted);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.response?.data?.message || "Failed to load results");
//       })
//       .finally(() => setLoading(false));
//   }, [auth?.user]);

//   if (loading)
//     return <p className="text-center mt-10">Loading your results...</p>;
//   if (error)
//     return <p className="text-center text-red-500 mt-10">{error}</p>;

//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6 text-center">📊 My Results</h1>

//       {results.length > 0 ? (
//         <div className="space-y-4">
//           {results.map((r, i) => (
//             <div
//               key={i}
//               className="flex justify-between items-center border rounded-xl p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition"
//             >
//               <h2 className="text-lg font-semibold text-gray-800">{r.subject}</h2>
//               <div className="text-gray-700">
//                 <span className="mr-4">🧾 Midterm: {r.midterm}</span>
//                 <span className="mr-4">📘 Final: {r.final}</span>
//                 <span className="font-bold text-gray-900">🏁 Total: {r.total}</span>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-center text-gray-500">No results found yet.</p>
//       )}
//     </div>
//   );
// }


// import { useAuth } from "../../../contexts/AuthContext";
// import axios from "axios";
// import { useEffect, useState } from "react";

// export default function StudentResultsPage() {
//   const { auth } = useAuth();
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!auth?.user) return;

//     axios
//       .get("http://localhost:7000/api/students/me/results", {
//         withCredentials: true,
//       })
//       .then((res) => {
//         console.log("API results response:", res.data);
//         setData(res.data);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.response?.data?.message || "Failed to load results");
//       })
//       .finally(() => setLoading(false));
//   }, [auth?.user]);

//   if (loading) return <p className="text-center mt-10">Loading your results...</p>;
//   if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
//   if (!data?.results || Object.keys(data.results).length === 0)
//     return <p className="text-center text-gray-500 mt-10">No results found yet.</p>;

//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6 text-center">📊 My Results</h1>

//       <table className="w-full border-collapse text-left shadow-md rounded-xl overflow-hidden">
//         <thead className="bg-gray-100 border-b">
//           <tr>
//             <th className="py-3 px-4">Subject</th>
//             <th className="py-3 px-4">Midterm</th>
//             <th className="py-3 px-4">Final</th>
//             <th className="py-3 px-4">Total</th>
//           </tr>
//         </thead>
//         <tbody>
//           {Object.entries(data.results).map(([subject, scores], i) => (
//             <tr key={i} className="border-b hover:bg-gray-50">
//               <td className="py-2 px-4 font-semibold">{subject}</td>
//               <td className="py-2 px-4">{scores.midterm ?? "-"}</td>
//               <td className="py-2 px-4">{scores.final ?? "-"}</td>
//               <td className="py-2 px-4 font-bold text-blue-600">{scores.total ?? 0}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }


import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { useEffect, useState } from "react";

export default function StudentResultsPage() {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth?.user) return;

    axios
      .get("http://localhost:7000/api/students/me/results", {
        withCredentials: true,
      })
      .then((res) => {
        console.log("API results response:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load results");
      })
      .finally(() => setLoading(false));
  }, [auth?.user]);

  if (loading) return <p className="text-center mt-10">Loading your results...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!data?.results || Object.keys(data.results).length === 0)
    return <p className="text-center text-gray-500 mt-10">No results found yet.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 My Results</h1>

      {data.student && (
      <><p className="text-center text-xl text-gray-700 mb-6">
          Student: <span className="font-semibold">{data.student.fullName}</span>
        </p><p className="text-center text-xl text-gray-700 mb-6">
            Grade: <span className="font-semibold">{data.student.grade}</span>
          </p></>
    )}

      <table className="w-full border-collapse text-left shadow-md rounded-xl overflow-hidden">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="py-3 px-4">Subject</th>
            <th className="py-3 px-4">Midterm</th>
            <th className="py-3 px-4">Final</th>
            <th className="py-3 px-4">Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.results).map(([subject, scores], i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4 font-semibold">{subject}</td>
              <td className="py-2 px-4">{scores.midterm ?? "-"}</td>
              <td className="py-2 px-4">{scores.final ?? "-"}</td>
              <td className="py-2 px-4 font-bold text-blue-600">{scores.total ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-sm text-center">
        <p className="text-lg font-semibold">Average Score: <span className="text-blue-600">{data.average}</span></p>
        <p className="text-lg font-semibold">Class Rank: <span className="text-green-600">#{data.rank ?? "-"}</span></p>
      </div>
    </div>
  );
}
