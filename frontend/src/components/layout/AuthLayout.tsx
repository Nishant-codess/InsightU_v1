import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { motion } from 'framer-motion';

export default function AuthLayout() {
   const { isAuthenticated } = useAuthStore();

   if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
   }

   return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
           
           {/* Abstract Background Blobs */}
           <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand/10 blur-[120px] animate-pulse-slow"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-blue-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

           <div className="z-10 w-full max-w-md">
                <motion.div 
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-center mb-8"
                >
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
                        Insight<span className="text-brand">U</span>
                    </h1>
                    <p className="text-textLight">Your academic command center.</p>
                </motion.div>

                <Outlet />
           </div>
       </div>
   )
}
