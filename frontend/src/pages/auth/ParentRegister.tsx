import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon, 
  EyeIcon,
  EyeSlashIcon,
  PhoneIcon,
  DocumentIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import axios from 'axios';

export default function ParentRegister() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    childSrmEmail: '',
    childSrmPassword: '',
  });
  
  const [childIdCard, setChildIdCard] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showChildPassword, setShowChildPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validate email format
    if (!formData.email.endsWith('@srmist.edu.in')) {
      setError('Email must be from @srmist.edu.in domain');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter');
      setIsLoading(false);
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter');
      setIsLoading(false);
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number');
      setIsLoading(false);
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      setError('Password must contain at least one special character (!@#$%^&*)');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!childIdCard) {
      setError("Please upload your child's ID card");
      setIsLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('childSrmEmail', formData.childSrmEmail);
      formDataToSend.append('childSrmPassword', formData.childSrmPassword);
      formDataToSend.append('childIdCard', childIdCard);

      setIsValidating(true);
      await axios.post('http://localhost:3000/api/parent-auth/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Registration successful! Your child\'s credentials have been verified. Waiting for admin approval.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please verify your child\'s SRM credentials.');
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setChildIdCard(e.target.files[0]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 w-full max-w-lg mx-auto overflow-y-auto max-h-[90vh]"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Parent Registration</h2>
        <p className="text-sm text-textLight">Monitor your child's academic progress</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-4 pb-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Your Information</h3>
          
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
            label="Your Email"
            placeholder="parent@email.com"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            name="phone"
            type="tel"
            label="Phone Number (Optional)"
            placeholder="+91 98765 43210"
            icon={<PhoneIcon className="h-5 w-5" />}
            value={formData.phone}
            onChange={handleChange}
          />

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

        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-semibold text-white">Child's SRM Academia Credentials</h3>
          <p className="text-xs text-textLight">
            These credentials will be used to automatically fetch your child's academic data
          </p>
          
          <Input
            name="childSrmEmail"
            type="email"
            label="Child's SRM Email"
            placeholder="student@srmist.edu.in"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={formData.childSrmEmail}
            onChange={handleChange}
            required
          />

          <div className="relative">
            <Input
              name="childSrmPassword"
              type={showChildPassword ? "text" : "password"}
              label="Child's SRM Password"
              placeholder="••••••••"
              icon={<KeyIcon className="h-5 w-5" />}
              value={formData.childSrmPassword}
              onChange={handleChange}
              required
            />
            <button 
              type="button"
              onClick={() => setShowChildPassword(!showChildPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-brand"
            >
              {showChildPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textLight flex items-center gap-2">
              <DocumentIcon className="h-4 w-4" /> Child's ID Card (Required)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-brand/20 file:text-brand hover:file:bg-brand/30"
              required
            />
            {childIdCard && (
              <p className="text-xs text-green-400 mt-1">✓ {childIdCard.name}</p>
            )}
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 text-center"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 text-center"
          >
            {success}
          </motion.div>
        )}

        {isValidating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400 text-center"
          >
            Validating child's SRM credentials...
          </motion.div>
        )}

        <Button 
          type="submit" 
          className="w-full mt-4" 
          isLoading={isLoading}
        >
          Submit Registration
        </Button>
      </form>

      <p className="text-center text-sm text-textLight mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-brand hover:text-brandDark transition-colors font-medium">
          Sign In
        </Link>
      </p>
    </motion.div>
  );
}
