import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import axios from 'axios';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/admin-login', {
        email,
        password
      });
      
      const { user, accessToken } = response.data;
      login(user, accessToken);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-8 w-full max-w-md mx-auto"
    >
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-3">
          <ShieldCheckIcon className="h-12 w-12 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Admin Portal</h2>
        <p className="text-sm text-textLight">Administrator access only</p>
      </div>

      <form onSubmit={handleAdminLogin} className="space-y-4">
        <Input
          type="email"
          label="Admin Email"
          placeholder="admin@srmist.edu.in"
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
          Sign In as Admin
        </Button>
      </form>

      <p className="text-center text-sm text-textLight mt-6">
        Not an admin?{' '}
        <Link to="/login" className="text-brand hover:text-brandDark transition-colors font-medium">
          Back to Login
        </Link>
      </p>
    </motion.div>
  );
}
