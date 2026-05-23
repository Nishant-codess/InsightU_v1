import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';
import { BookOpenIcon, ChartBarIcon, UserIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, PresentationChartBarIcon, SparklesIcon, CalendarDaysIcon, DocumentTextIcon, VideoCameraIcon, NewspaperIcon, InformationCircleIcon, ClockIcon, ClipboardDocumentListIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../ui/ThemeSwitcher';
import { useTheme } from '../../context/ThemeContext';
import SpidermanBackground from '../backgrounds/SpidermanBackground';
import DoraemonBackground from '../backgrounds/DoraemonBackground';
import DarkProBackground from '../backgrounds/DarkProBackground';
import AnimeBackground from '../backgrounds/AnimeBackground';

export default function DashboardLayout() {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const { user, isAuthenticated, token, logout } = useAuthStore();
   const { themeId } = useTheme();
   const location = useLocation();

   if (!isAuthenticated || !user || !token) {
       return <Navigate to="/login" replace state={{ from: location }} />;
   }

   const NavItems = [
       { id: 'dash',        label: 'Dashboard',     path: '/dashboard',    icon: ChartBarIcon, },
       { id: 'classroom',   label: 'Classrooms',    path: '/classroom',    icon: PresentationChartBarIcon, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
       { id: 'timetable',   label: 'Timetable',     path: '/timetable',    icon: ClockIcon, roles: ['STUDENT', 'PARENT'] },
       { id: 'performance', label: 'Performance',   path: '/performance',  icon: ClipboardDocumentListIcon, roles: ['STUDENT', 'PARENT'] },
       { id: 'whiteboard',  label: 'Whiteboard',    path: '/whiteboard',   icon: BookOpenIcon, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
       { id: 'live',        label: 'Live Session',  path: '/live-sessions', icon: VideoCameraIcon, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
       { id: 'notes',       label: 'Notes',         path: '/notes',        icon: DocumentTextIcon, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
       { id: 'papers',      label: 'Sample Papers', path: '/papers',       icon: NewspaperIcon, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
       { id: 'calendar',    label: 'Calendar',      path: '/calendar',     icon: CalendarDaysIcon, },
       { id: 'ai-tests',    label: 'AI Tests',      path: '/ai-tests',     icon: SparklesIcon, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
       { id: 'about',       label: 'About Us',      path: '/about',        icon: InformationCircleIcon, },
       { id: 'profile',     label: 'Profile',       path: '/profile',      icon: Cog6ToothIcon, },
   ];

   const visibleNavItems = NavItems.filter(item => !item.roles || item.roles.includes(user.role));


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

               <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                  {visibleNavItems.map((item) => {
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
              <div className="md:hidden h-16 border-b border-white/10 flex items-center justify-between px-4 sticky top-0 z-20 bg-surface/80 backdrop-blur-md">
                 <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                       <Bars3Icon className="h-6 w-6 text-white" />
                    </button>
                    <h1 className="text-xl font-bold text-brand">InsightU</h1>
                 </div>
                 <button onClick={logout}><ArrowRightOnRectangleIcon className="h-6 w-6 text-red-400" /></button>
              </div>

              {/* Mobile Sidebar Overlay */}
              <AnimatePresence>
                 {isMobileMenuOpen && (
                    <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex"
                    >
                       <motion.aside 
                          initial={{ x: -300 }}
                          animate={{ x: 0 }}
                          exit={{ x: -300 }}
                          className="w-64 h-full bg-[#1a1a2e] border-r border-white/10 flex flex-col"
                       >
                          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                             <h1 className="text-xl font-bold text-brand">InsightU</h1>
                             <button onClick={() => setIsMobileMenuOpen(false)}>
                                <XMarkIcon className="h-6 w-6 text-gray-400" />
                             </button>
                          </div>

                          <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                             {visibleNavItems.map((item) => {
                                 const active = location.pathname.startsWith(item.path);
                                 return (
                                     <Link key={item.id} to={item.path} onClick={() => setIsMobileMenuOpen(false)}>
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
                       </motion.aside>
                       {/* Click away area to close */}
                       <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
                    </motion.div>
                 )}
              </AnimatePresence>

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
