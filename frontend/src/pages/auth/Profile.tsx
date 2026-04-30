import { useAuthStore } from '../../store/useAuthStore';
import { 
  UserCircleIcon, 
  AcademicCapIcon, 
  IdentificationIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row items-center gap-8 glass-card p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
              <UserCircleIcon className="w-40 h-40 text-brand" />
          </div>
          
          <div className="relative">
              <div className="w-32 h-32 rounded-3xl bg-brand/20 border-2 border-brand/40 flex items-center justify-center text-5xl font-bold text-brand shadow-2xl shadow-brand/20">
                  {user?.name?.[0] || user?.email?.[0]}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-background border border-white/10 p-2 rounded-xl shadow-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-brand" />
              </div>
          </div>

          <div className="text-center md:text-left space-y-2">
              <h1 className="text-4xl font-bold text-white tracking-tight">{user?.name || 'Academic Scholar'}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center text-textLight">
                  <span className="flex items-center gap-1 text-xs">
                      <EnvelopeIcon className="w-4 h-4" />
                      {user?.email}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
                  <span className="bg-brand/10 text-brand px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest border border-brand/20 uppercase">
                      {user?.role}
                  </span>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <IdentificationIcon className="w-5 h-5 text-brand" />
                  Institutional Identity
              </h2>
              <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-sm text-textLight">Registration Number</span>
                      <span className="text-sm text-white font-mono">{user?.student?.id?.slice(0, 10).toUpperCase() || 'RA241100...'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-sm text-textLight">Current Section</span>
                      <span className="text-sm text-white font-bold">{user?.student?.section || 'A'}{user?.student?.batch === 'Batch 1' ? '1' : '2'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-sm text-textLight">Academic Year</span>
                      <span className="text-sm text-white">{user?.student?.year || 2}nd Year</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-textLight">Department</span>
                      <span className="text-sm text-white">{user?.student?.department || 'Computer Science'}</span>
                  </div>
              </div>
          </div>

          <div className="glass-card p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AcademicCapIcon className="w-5 h-5 text-brand" />
                  Academic Preferences
              </h2>
              <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface/50 border border-white/5">
                      <p className="text-xs font-bold text-textLight uppercase tracking-widest mb-2">Notification Settings</p>
                      <div className="flex items-center justify-between">
                          <span className="text-sm text-white">Lecture Updates</span>
                          <div className="w-10 h-5 bg-brand rounded-full relative">
                              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                          </div>
                      </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface/50 border border-white/5">
                      <p className="text-xs font-bold text-textLight uppercase tracking-widest mb-2">Login & Security</p>
                      <Button variant="outline" size="sm" className="w-full text-xs">Change Password</Button>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-center pt-8">
          <Button variant="outline" className="text-red-400 hover:text-red-300 hover:border-red-400/50">
              Sign Out from all devices
          </Button>
      </div>

    </div>
  );
}
