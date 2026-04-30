import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import axios from 'axios';

type LoginTab = 'student' | 'teacher' | 'parent';

export default function Login() {
  const [activeTab, setActiveTab] = useState<LoginTab>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [srmEmail, setSrmEmail] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSrmPassword, setShowSrmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // Student Login - Portal credentials
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/student-portal-login', {
        srmEmail,
        srmPassword
      });
      
      const { user, accessToken, portalData } = response.data;
      login(user, accessToken, portalData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid SRM credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Teacher/Parent Login - DB credentials
  const handleDbLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = activeTab === 'teacher' 
        ? 'http://localhost:3000/api/teacher-auth/login'
        : 'http://localhost:3000/api/parent-auth/login';

      const response = await axios.post(endpoint, {
        email,
        password
      });
      
      const { user, accessToken, portalData } = response.data;
      login(user, accessToken, portalData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setError('');
    setEmail('');
    setPassword('');
    setSrmEmail('');
    setSrmPassword('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-8 w-full max-w-md mx-auto"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Welcome Back</h2>
        <p className="text-sm text-textLight">Sign in to access InsightU</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg border border-white/10">
        <button
          onClick={() => handleTabChange('student')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'student'
              ? 'bg-brand text-white'
              : 'text-textLight hover:text-white'
          }`}
        >
          <AcademicCapIcon className="h-4 w-4 inline mr-1" />
          Student
        </button>
        <button
          onClick={() => handleTabChange('teacher')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'teacher'
              ? 'bg-brand text-white'
              : 'text-textLight hover:text-white'
          }`}
        >
          <UserGroupIcon className="h-4 w-4 inline mr-1" />
          Teacher
        </button>
        <button
          onClick={() => handleTabChange('parent')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'parent'
              ? 'bg-brand text-white'
              : 'text-textLight hover:text-white'
          }`}
        >
          <UserGroupIcon className="h-4 w-4 inline mr-1" />
          Parent
        </button>
      </div>

      {/* Student Tab */}
      {activeTab === 'student' && (
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 mb-4">
            📚 Enter your SRM Academia credentials. Your timetable, attendance, and marks will be fetched automatically.
          </div>

          <Input
            type="email"
            label="SRM Email"
            placeholder="your.email@srmist.edu.in"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={srmEmail}
            onChange={(e) => setSrmEmail(e.target.value)}
            required
          />
          
          <div className="relative">
            <Input
              type={showSrmPassword ? "text" : "password"}
              label="SRM Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={srmPassword}
              onChange={(e) => setSrmPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowSrmPassword(!showSrmPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-brand"
            >
              {showSrmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-4" 
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
      )}

      {/* Teacher Tab */}
      {activeTab === 'teacher' && (
        <form onSubmit={handleDbLogin} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="your@srmist.edu.in"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-brand"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-4" 
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
      )}

      {/* Parent Tab */}
      {activeTab === 'parent' && (
        <form onSubmit={handleDbLogin} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-brand"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-4" 
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-textLight mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand hover:text-brandDark transition-colors font-medium">
          Register now
        </Link>
      </p>

      <p className="text-center text-sm text-textLight mt-2">
        Admin?{' '}
        <Link to="/admin-login" className="text-brand hover:text-brandDark transition-colors font-medium">
          Admin Login
        </Link>
      </p>
    </motion.div>
  );
}
