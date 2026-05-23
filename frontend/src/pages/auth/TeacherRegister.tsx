import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon, 
  EyeIcon,
  EyeSlashIcon,
  BuildingLibraryIcon,
  DocumentIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import axios from 'axios';

export default function TeacherRegister() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    subjects: [] as string[],
  });
  
  const [idCard, setIdCard] = useState<File | null>(null);
  const [subjectInput, setSubjectInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    if (!idCard) {
      setError('Please upload your ID card');
      setIsLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('subjects', JSON.stringify(formData.subjects));
      formDataToSend.append('idCard', idCard);

      await axios.post('/api/teacher-auth/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Registration successful! Waiting for admin approval. You will be notified via email.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdCard(e.target.files[0]);
    }
  };

  const addSubject = () => {
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev.subjects, subjectInput.trim()]
      }));
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subject)
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 w-full max-w-lg mx-auto overflow-y-auto max-h-[90vh]"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Teacher Registration</h2>
        <p className="text-sm text-textLight">Join InsightU as an educator</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          name="name"
          type="text"
          label="Full Name"
          placeholder="Dr. John Doe"
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
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-textLight flex items-center gap-2">
            <BuildingLibraryIcon className="h-4 w-4" /> Department
          </label>
          <select 
            name="department" 
            value={formData.department} 
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
            required
          >
            <option value="" className="bg-surface text-white">Select Department</option>
            {['CTech', 'Electronics', 'Mechanical', 'Applied Sciences', 'Mathematics', 'Physics', 'Chemistry'].map(d => 
              <option key={d} value={d} className="bg-surface text-white">{d}</option>
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-textLight flex items-center gap-2">
            <AcademicCapIcon className="h-4 w-4" /> Subjects You Teach
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              placeholder="Enter subject name"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
            />
            <Button type="button" onClick={addSubject} variant="secondary" className="px-4">
              Add
            </Button>
          </div>
          {formData.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.subjects.map(subject => (
                <span 
                  key={subject}
                  className="px-3 py-1 bg-brand/20 border border-brand/30 rounded-full text-xs text-brand flex items-center gap-2"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => removeSubject(subject)}
                    className="hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-textLight flex items-center gap-2">
            <DocumentIcon className="h-4 w-4" /> ID Card (Required)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-brand/20 file:text-brand hover:file:bg-brand/30"
            required
          />
          {idCard && (
            <p className="text-xs text-green-400 mt-1">✓ {idCard.name}</p>
          )}
        </div>

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
