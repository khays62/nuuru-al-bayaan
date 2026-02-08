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
import { useI18n } from '../../../i18n/I18nProvider';

const QuickCard = ({ title, description, to, Icon, tone = 'indigo' }) => {
	const cardBg = {
		indigo: 'bg-linear-to-r from-indigo-50 to-violet-50 border-indigo-100',
		emerald: 'bg-linear-to-r from-emerald-50 to-lime-50 border-emerald-100',
		amber: 'bg-linear-to-r from-amber-50 to-orange-50 border-amber-100',
		sky: 'bg-linear-to-r from-sky-50 to-cyan-50 border-sky-100',
	};
	const accent = {
		indigo: 'border-b-indigo-300',
		emerald: 'border-b-emerald-300',
		amber: 'border-b-amber-300',
		sky: 'border-b-sky-300',
	};
	const toneClasses = {
		indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
		emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
		amber: 'bg-amber-100 text-amber-900 border-amber-200',
		sky: 'bg-sky-100 text-sky-800 border-sky-200',
	};
	return (
		<Link
			to={to}
			className={`block rounded-xl border border-b-4 p-5 shadow-md hover:shadow-lg hover:border-blue-200 transition ${cardBg[tone] || cardBg.indigo} ${accent[tone] || accent.indigo}`}
		>
			<div className="flex items-start gap-4">
				<div className={`shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center ${toneClasses[tone] || toneClasses.indigo}`}>
					{Icon ? <Icon size={20} /> : null}
				</div>
				<div className="min-w-0">
					<div className="text-base font-semibold text-gray-900">{title}</div>
					<div className="text-sm text-gray-600 mt-1">{description}</div>
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
			<div className="rounded-xl border border-blue-200 border-b-4 border-b-blue-300 bg-linear-to-r from-blue-50 to-indigo-50 p-5 shadow-md">
				<div className="text-xl md:text-2xl font-semibold text-blue-900">{welcomeText}</div>
				<div className="text-sm text-blue-900/70 mt-1">{summaryLine}</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
