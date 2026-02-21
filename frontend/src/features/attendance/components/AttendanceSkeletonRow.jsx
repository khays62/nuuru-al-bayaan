function SkeletonCell({ wClass = 'w-24' }) {
  return (
    <div className={`h-4 ${wClass} rounded bg-(--nb-color-bg)`} />
  );
}

export default function AttendanceSkeletonRow() {
  return (
    <tr className="odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg)">
      <td className="px-6 py-4 border-x border-(--nb-color-border)">
        <SkeletonCell wClass="w-20" />
      </td>
      <td className="px-6 py-4 border-x border-(--nb-color-border)">
        <SkeletonCell wClass="w-56" />
      </td>
      <td className="px-6 py-4 border-x border-(--nb-color-border)">
        <SkeletonCell wClass="w-32" />
      </td>
    </tr>
  );
}
