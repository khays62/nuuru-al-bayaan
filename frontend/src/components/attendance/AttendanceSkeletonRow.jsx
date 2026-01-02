function SkeletonCell({ wClass = 'w-24' }) {
  return (
    <div className={`h-4 ${wClass} rounded bg-gray-200`} />
  );
}

export default function AttendanceSkeletonRow({ keyId }) {
  return (
    <tr className="odd:bg-white even:bg-gray-50">
      <td className="px-6 py-4 border-x border-gray-200">
        <SkeletonCell wClass="w-20" />
      </td>
      <td className="px-6 py-4 border-x border-gray-200">
        <SkeletonCell wClass="w-56" />
      </td>
      <td className="px-6 py-4 border-x border-gray-200">
        <SkeletonCell wClass="w-32" />
      </td>
    </tr>
  );
}
