import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon, 
  IdentificationIcon,
  EyeIcon,
  EyeSlashIcon,
  UsersIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

type UserRole = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill || {};
  const fromGoogle = location.state?.fromGoogle || false;
  
  const [formData, setFormData] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    registrationNumber: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as UserRole,
    course: 'BTech',
    department: 'CTech',
    branch: 'CSE',
    year: 1,
    section: 'A',
    batch: 'Batch 1',
    childRegistrationNumber: '', // For Parents
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!fromGoogle && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        year: Number(formData.year),
        batch: formData.batch, // Now a string "Batch 1" or "Batch 2"
        // If Google login, password is not required/sent
        password: fromGoogle ? undefined : formData.password,
      };

      const response = await axios.post('http://localhost:3000/api/auth/register', payload);
      
      const { user, accessToken } = response.data;
      login(user, accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 w-full max-w-lg mx-auto overflow-y-auto max-h-[90vh]"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Create Account</h2>
        <p className="text-sm text-textLight">Access the InsightU modular ecosystem</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-textLight flex items-center gap-2">
            <UsersIcon className="h-4 w-4" /> I am registering as
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFormData(p => ({ ...p, role: r }))}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  formData.role === r 
                    ? 'bg-brand/20 border-brand text-brand' 
                    : 'bg-white/5 border-white/10 text-textLight hover:bg-white/10'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="name"
            type="text"
            label="Full Name"
            placeholder="John Doe"
            icon={<UserIcon className="h-5 w-5" />}
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            name="email"
            type="email"
            label="Institutional Email"
            placeholder="john.doe@university.edu"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={formData.email}
            onChange={handleChange}
            required
            disabled={fromGoogle} // Don't let them change email if it came from Google
          />
        </div>

        {/* Role Specific Fields for Student */}
        {formData.role === 'STUDENT' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-2 border-t border-white/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="registrationNumber"
                type="text"
                label="Reg Number"
                placeholder="RA21110..."
                icon={<IdentificationIcon className="h-5 w-5" />}
                value={formData.registrationNumber}
                onChange={handleChange}
                required
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textLight flex items-center gap-2">
                    <AcademicCapIcon className="h-4 w-4" /> Course
                </label>
                <select 
                    name="course" 
                    value={formData.course} 
                    onChange={handleChange as any}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                >
                    {['BTech', 'BE', 'BSc', 'MTech'].map(c => <option key={c} value={c} className="bg-surface text-white">{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textLight flex items-center gap-2">
                    <BuildingLibraryIcon className="h-4 w-4" /> Department
                </label>
                <select 
                    name="department" 
                    value={formData.department} 
                    onChange={handleChange as any}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                >
                    {['CTech', 'Electronics', 'Mechanical', 'Applied Sciences'].map(d => <option key={d} value={d} className="bg-surface text-white">{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textLight flex items-center gap-2">
                    <UsersIcon className="h-4 w-4" /> Branch
                </label>
                <select 
                    name="branch" 
                    value={formData.branch} 
                    onChange={handleChange as any}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                >
                    {['CSE', 'ECE', 'ME', 'IT', 'AI/ML', 'Cybersecurity'].map(b => <option key={b} value={b} className="bg-surface text-white">{b}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-textLight">Year</label>
                    <select 
                        name="year" 
                        value={formData.year} 
                        onChange={handleChange as any}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                    >
                        {[1,2,3,4].map(y => <option key={y} value={y} className="bg-surface text-white">{y} Year</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-textLight">Section</label>
                    <select 
                        name="section" 
                        value={formData.section} 
                        onChange={handleChange as any}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                    >
                        {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s} className="bg-surface text-white">Section {s}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-textLight">Batch</label>
                    <select 
                        name="batch" 
                        value={formData.batch} 
                        onChange={handleChange as any}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
                    >
                        {['Batch 1', 'Batch 2'].map(b => <option key={b} value={b} className="bg-surface text-white">{b}</option>)}
                    </select>
                </div>
            </div>
          </motion.div>
        )}

        {/* Role Specific Fields for Parent */}
        {formData.role === 'PARENT' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-2 border-t border-white/5"
          >
            <Input
              name="childRegistrationNumber"
              type="text"
              label="Student's Reg Number"
              placeholder="Enter your child's registration number"
              icon={<LinkIcon className="h-5 w-5" />}
              value={formData.childRegistrationNumber}
              onChange={handleChange}
              required
            />
            <p className="text-[10px] text-textLight italic">This links your account to your student's academic profile.</p>
          </motion.div>
        )}

        {/* Password Fields - only if not from Google */}
        {!fromGoogle && (
          <div className="space-y-4">
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={formData.password}
              onChange={handleChange}
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

          <Input
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            icon={<LockClosedIcon className="h-5 w-5" />}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        )}

        {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center"
            >
                {error}
            </motion.div>
        )}

        <Button 
          type="submit" 
          className="w-full mt-4" 
          isLoading={isLoading}
        >
          Create {formData.role.charAt(0) + formData.role.slice(1).toLowerCase()} Profile
        </Button>
      </form>

      <p className="text-center text-sm text-textLight mt-6">
        Already part of InsightU?{' '}
        <Link to="/login" className="text-brand hover:text-brandDark transition-colors font-medium">
          Sign In
        </Link>
      </p>
    </motion.div>
  );
}
