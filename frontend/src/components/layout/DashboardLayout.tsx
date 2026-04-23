import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';
import { BookOpenIcon, ChartBarIcon, BellIcon, UserIcon, ArrowRightOnRectangleIcon, UserGroupIcon, CalendarDaysIcon, Cog6ToothIcon, ClipboardDocumentListIcon, AcademicCapIcon, PresentationChartBarIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../ui/ThemeSwitcher';
import { useTheme } from '../../context/ThemeContext';
import SpidermanBackground from '../backgrounds/SpidermanBackground';
import DoraemonBackground from '../backgrounds/DoraemonBackground';
import DarkProBackground from '../backgrounds/DarkProBackground';
import AnimeBackground from '../backgrounds/AnimeBackground';

export default function DashboardLayout() {
   const { user, isAuthenticated, token, logout } = useAuthStore();
   const { themeId } = useTheme();
   const location = useLocation();

   if (!isAuthenticated || !user || !token) {
       return <Navigate to="/login" replace state={{ from: location }} />;
   }

   const NavItems = [
       { id: 'dash',         label: 'Dashboard',      path: '/dashboard',         icon: ChartBarIcon,              match: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
       { id: 'timetable',    label: 'Timetable',       path: '/timetable',         icon: CalendarDaysIcon,          match: ['STUDENT'] },
       { id: 'academic',     label: 'Marks & Attend.', path: '/academic-data',     icon: AcademicCapIcon,           match: ['STUDENT'] },
       { id: 'section',      label: 'My Section',      path: '/section',           icon: UserGroupIcon,             match: ['STUDENT', 'TEACHER'] },
       { id: 'classroom',    label: 'Classrooms',      path: '/classroom',         icon: PresentationChartBarIcon,  match: ['TEACHER'] },
       { id: 'my-classrooms',label: 'Classrooms',      path: '/my-classrooms',     icon: PresentationChartBarIcon,  match: ['STUDENT'] },
       { id: 'notes',        label: 'Lecture Notes',   path: '/notes',             icon: BookOpenIcon,              match: ['STUDENT', 'TEACHER'] },
       { id: 'mock-tests',   label: 'Mock Tests',      path: '/mock-tests/create', icon: ClipboardDocumentListIcon, match: ['STUDENT', 'TEACHER'] },
       { id: 'notifications',label: 'Notifications',   path: '/notifications',     icon: BellIcon,                  match: ['STUDENT', 'TEACHER', 'PARENT'] },
       { id: 'profile',      label: 'Profile & AI',    path: '/profile',           icon: Cog6ToothIcon,             match: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
   ].filter(item => item.match.includes(user.role));

   return (
       <div className="min-h-screen bg-background text-textLight flex relative">
           {themeId === 'spiderman' && <SpidermanBackground />}
           {themeId === 'doraemon' && <DoraemonBackground />}
           {themeId === 'dark-professional' && <DarkProBackground />}
           {themeId === 'anime' && <AnimeBackground />}
           
           {/* Sidebar Component */}
           <motion.aside 
             initial={{ x: -200 }} 
             animate={{ x: 0 }}
             className="w-64 border-r border-white/10 hidden md:flex flex-col bg-surface/30 backdrop-blur-xl"
           >
              <div className="h-16 flex items-center px-6 border-b border-white/5">
                 <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-brandDark">InsightU</h1>
              </div>

              <div className="flex-1 py-6 px-4 space-y-2">
                 {NavItems.map((item) => {
                     const active = location.pathname.startsWith(item.path);
                     return (
                         <Link key={item.id} to={item.path}>
                             <div className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                 active ? 'bg-brand/10 text-brand border border-brand/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                             }`}>
                                 <item.icon className="h-5 w-5" />
                                 <span className="font-medium text-sm">{item.label}</span>
                             </div>
                         </Link>
                     );
                 })}
              </div>

              <div className="p-4 border-t border-white/5">
                 <Link to="/profile">
                   <div className="flex items-center space-x-3 px-3 py-2 mb-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                      <UserIcon className="h-8 w-8 text-brand bg-brand/10 rounded-full p-1" />
                      <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white truncate max-w-[120px]">{user.name || user.email}</span>
                          <span className="text-xs text-brand uppercase font-medium tracking-wide">{user.role} · Settings</span>
                      </div>
                   </div>
                 </Link>
                 
                 <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                 >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span>Log Out</span>
                 </button>
              </div>
           </motion.aside>

           {/* Main Content View with Animation routing constraints */}
           <main className="flex-1 relative overflow-auto h-screen">
              {/* Global theme switcher — visible on all pages */}
              <ThemeSwitcher />
              <div className="md:hidden h-16 border-b border-white/10 flex items-center justify-between px-4 sticky top-0 z-10 bg-surface/50 backdrop-blur-md">
                 <h1 className="text-xl font-bold text-brand">InsightU</h1>
                 <button onClick={logout}><ArrowRightOnRectangleIcon className="h-6 w-6 text-red-400" /></button>
              </div>

              <AnimatePresence mode="wait">
                 <PageTransition key={location.pathname}>
                   <div className="p-6 md:p-8">
                     <Outlet />
                   </div>
                 </PageTransition>
              </AnimatePresence>
           </main>

       </div>
   )
}
