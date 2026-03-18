import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpenIcon, ChartBarIcon, BellIcon, UserIcon, ArrowRightOnRectangleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function DashboardLayout() {
   const { user, isAuthenticated, logout } = useAuthStore();
   const location = useLocation();

   if (!isAuthenticated || !user) {
       return <Navigate to="/login" replace state={{ from: location }} />;
   }

   const NavItems = [
       { id: 'dash', label: 'Dashboard', path: '/dashboard', icon: ChartBarIcon, match: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] },
       { id: 'section', label: 'My Section', path: '/section', icon: UserGroupIcon, match: ['STUDENT', 'TEACHER'] },
       { id: 'notes', label: 'Lecture Notes', path: '/notes', icon: BookOpenIcon, match: ['STUDENT', 'TEACHER'] },
       { id: 'notifications', label: 'Notifications', path: '/notifications', icon: BellIcon, match: ['STUDENT', 'TEACHER', 'PARENT'] },
   ].filter(item => item.match.includes(user.role));

   return (
       <div className="min-h-screen bg-background text-textLight flex">
           
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
                 <div className="flex items-center space-x-3 px-3 py-2 mb-2">
                    <UserIcon className="h-8 w-8 text-brand bg-brand/10 rounded-full p-1" />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white truncate max-w-[120px]">{user.name || user.email}</span>
                        <span className="text-xs text-brandDark uppercase font-medium tracking-wide">{user.role}</span>
                    </div>
                 </div>
                 
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
              <div className="md:hidden h-16 border-b border-white/10 flex items-center justify-between px-4 sticky top-0 z-10 bg-surface/50 backdrop-blur-md">
                 <h1 className="text-xl font-bold text-brand">InsightU</h1>
                 <button onClick={logout}><ArrowRightOnRectangleIcon className="h-6 w-6 text-red-400" /></button>
              </div>

              <AnimatePresence mode="wait">
                 <motion.div
                   key={location.pathname}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   transition={{ duration: 0.2 }}
                   className="p-4 md:p-8 max-w-7xl mx-auto h-full"
                 >
                   <Outlet />
                 </motion.div>
              </AnimatePresence>
           </main>

       </div>
   )
}
