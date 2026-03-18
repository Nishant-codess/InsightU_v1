import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password
      });
      
      const { user, accessToken } = response.data;
      login(user, accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        // Exchange code for profile and tokens on backend
        const response = await axios.get(`http://localhost:3000/api/auth/google/callback?code=${tokenResponse.code}`);
        const data = response.data;
        
        if (data.needsProfile) {
          // Redirect to register with pre-filled info
          navigate('/register', { 
            state: { 
              prefill: data.profile,
              fromGoogle: true
            } 
          });
          return;
        }

        const { user, accessToken } = data;
        login(user, accessToken);
        navigate('/dashboard');
      } catch (err: any) {
        setError('Google login failed. Please try again or use email.');
      } finally {
        setIsLoading(false);
      }
    },
    flow: 'auth-code',
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-8 w-full max-w-md mx-auto"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Welcome Back</h2>
        <p className="text-sm text-textLight">Enter your credentials to access InsightU</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          type="email"
          label="Institutional Email"
          placeholder="your@institutional.edu"
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
        
        <div className="flex justify-end">
          <Link to="/forgot-password" title="Coming Soon" className="text-xs text-brand hover:text-brandDark transition-colors">
            Forgot Password?
          </Link>
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
      
      {/* Abstract Divider */}
      <div className="relative mt-8 mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-surface text-gray-500">Or continue with</span>
        </div>
      </div>
      
      <Button 
        variant="secondary" 
        className="w-full mb-6 py-2.5 flex items-center justify-center"
        onClick={() => googleLogin()}
        disabled={isLoading}
      >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span className="font-semibold">Sign in with Google</span>
      </Button>

      <p className="text-center text-sm text-textLight">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand hover:text-brandDark transition-colors font-medium">
          Register now
        </Link>
      </p>
    </motion.div>
  );
}
