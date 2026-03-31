import React from 'react';
import { Link } from 'react-router-dom';
import {
	BarChart2,
	CalendarDays,
	ClipboardList,
	Layers3,
	Megaphone,
	TrendingUp,
	UserCircle2,
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';

import TeacherAttendanceChartsCard from '../components/dashboard/TeacherAttendanceChartsCard';
import TeacherResultsChartsCard from '../components/dashboard/TeacherResultsChartsCard';
import TeacherDashboardPrefetcher from '../components/dashboard/TeacherDashboardPrefetcher';
import { useI18n } from '../../../i18n/useI18n';

const QuickCard = ({ title, description, to, Icon }) => {
	const base =
		'block rounded-xl border border-(--nb-color-border) border-b-4 border-b-(--nb-color-accent) ' +
		'bg-(--nb-color-bg-card) p-3 sm:p-5 shadow-md transition';
	const active = 'hover:shadow-lg hover:border-(--nb-color-accent-200)';
	return (
		<Link
			to={to}
			className={`${base} ${active}`}
		>
			<div className="flex items-start gap-3 sm:gap-4">
				<div className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-lg border border-(--nb-color-border) bg-(--nb-color-accent-100) text-(--nb-color-brand-ui) flex items-center justify-center">
					{Icon ? <Icon className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" /> : null}
				</div>
				<div className="min-w-0">
					<div className="text-sm sm:text-base font-semibold text-(--nb-color-text)">{title}</div>
					<div className="text-xs sm:text-sm text-(--nb-color-muted) mt-1">{description}</div>
				</div>
			</div>
		</Link>
	);
};

export default function TeacherDashboardPage() {
	const { auth } = useAuth();
	const { t } = useI18n();
	const fullName = String(auth?.user?.fullName || '').trim();
	const summaryLine = t('teachers.dashboard.home.summaryLine', { defaultValue: 'Choose what you want to do below.' });
	const welcomeText = fullName
		? t('teachers.dashboard.home.welcomeWithName', { name: fullName, defaultValue: `Welcome, ${fullName}` })
		: t('teachers.dashboard.home.welcome', { defaultValue: 'Welcome' });

	return (
		<div className="space-y-4">
			<TeacherDashboardPrefetcher />
			<div className="rounded-xl border border-(--nb-color-border) border-b-4 border-b-(--nb-color-accent) bg-linear-to-r from-(--nb-color-bg-card) to-(--nb-color-accent-50) p-5 shadow-md">
				<div className="text-xl md:text-2xl font-semibold text-(--nb-color-text)">{welcomeText}</div>
				<div className="text-sm text-(--nb-color-muted) mt-1">{summaryLine}</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
				<QuickCard
					title={t('teachers.dashboard.home.cards.myClasses.title', { defaultValue: 'My Classes' })}
					description={t('teachers.dashboard.home.cards.myClasses.description', { defaultValue: 'View your assigned classes and active rosters' })}
					to="/teacher-classes"
					Icon={Layers3}
					tone="indigo"
				/>
				<QuickCard
					title={t('teachers.dashboard.home.cards.timetable.title', { defaultValue: 'Timetable' })}
					description={t('teachers.dashboard.home.cards.timetable.description', { defaultValue: 'See your schedule and class timetables' })}
					to="/timetable"
					Icon={CalendarDays}
					tone="sky"
				/>
				<QuickCard
					title={t('teachers.dashboard.home.cards.attendance.title', { defaultValue: 'Attendance' })}
					description={t('teachers.dashboard.home.cards.attendance.description', { defaultValue: 'Mark and review attendance for your classes' })}
					to="/attendance"
					Icon={ClipboardList}
					tone="emerald"
				/>
				<QuickCard
					title={t('teachers.dashboard.home.cards.attendanceReports.title', { defaultValue: 'Attendance Reports' })}
					description={t('teachers.dashboard.home.cards.attendanceReports.description', { defaultValue: 'Summary reports by date range' })}
					to="/attendance-reports"
					Icon={BarChart2}
					tone="indigo"
				/>
				<QuickCard
					title={t('teachers.dashboard.home.cards.exam.title', { defaultValue: 'Exam' })}
					description={t('teachers.dashboard.home.cards.exam.description', { defaultValue: 'Enter scores and review results' })}
					to="/exams"
					Icon={TrendingUp}
					tone="amber"
				/>
				<QuickCard
					title={t('teachers.dashboard.home.cards.profile.title', { defaultValue: 'Profile' })}
					description={t('teachers.dashboard.home.cards.profile.description', { defaultValue: 'Account details and change password' })}
					to="/teacher-profile"
					Icon={UserCircle2}
					tone="sky"
				/>
				<QuickCard
					title={t('teachers.dashboard.home.cards.announcements.title', { defaultValue: 'Announcements' })}
					description={t('teachers.dashboard.home.cards.announcements.description', { defaultValue: 'School announcements and updates' })}
					to="/announcements"
					Icon={Megaphone}
					tone="sky"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<TeacherAttendanceChartsCard />
				<TeacherResultsChartsCard />
			</div>
		</div>
	);
}
