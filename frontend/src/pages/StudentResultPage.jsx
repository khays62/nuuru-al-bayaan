// import { useAuth } from "../contexts/AuthContext";
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

//       {data.student && (
//       <><p className="text-center text-xl text-gray-700 mb-6">
//           Student: <span className="font-semibold">{data.student.fullName}</span>
//         </p><p className="text-center text-xl text-gray-700 mb-6">
//             Grade: <span className="font-semibold">{data.student.grade}</span>
//           </p></>
//     )}

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

//       <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-sm text-center">
//         <p className="text-lg font-semibold">Average Score: <span className="text-blue-600">{data.average}</span></p>
//         <p className="text-lg font-semibold">Class Rank: <span className="text-green-600">#{data.rank ?? "-"}</span></p>
//       </div>
//     </div>
//   );
// }


import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { useEffect, useState } from "react";

export default function StudentResultPage() {
  const { auth } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth?.user) return;

    const fetchResults = async () => {
      try {
        const res = await axios.get(
          "http://localhost:7000/api/students/me/results",
          { withCredentials: true }
        );

        setHistory(res.data.history || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [auth?.user]);

  if (loading)
    return <p className="text-center mt-10">Loading results...</p>;

  if (error)
    return <p className="text-center text-red-500 mt-10">{error}</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {history.map((item, index) => (
        <div key={index} className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold">
              🎓 {item.enrollment.gradeSection.grade.gradeName} —{" "}
              {item.enrollment.academicYear.yearName}
            </h3>
          </div>

          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Subject</th>
                <th className="p-3">Midterm</th>
                <th className="p-3">Final</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(item.results).map(([subject, score], i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-semibold">{subject}</td>
                  <td className="p-3">{score.midterm ?? "-"}</td>
                  <td className="p-3">{score.final ?? "-"}</td>
                  <td className="p-3 font-bold text-blue-600">
                    {score.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 text-right font-semibold">
            Average: {item.average}
          </div>
        </div>
      ))}
    </div>
  );
}
