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
  AcademicCapIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import axios from 'axios';

type RegisterTab = 'teacher' | 'parent';

export default function RegisterTabs() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RegisterTab>('teacher');
  
  // Teacher Form
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    subjects: [] as string[],
  });
  
  // Parent Form
  const [parentForm, setParentForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    childSrmEmail: '',
    childSrmPassword: '',
  });

  const [idCard, setIdCard] = useState<File | null>(null);
  const [childIdCard, setChildIdCard] = useState<File | null>(null);
  const [subjectInput, setSubjectInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showChildPassword, setShowChildPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Teacher Handlers
  const handleTeacherChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeacherForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTeacherFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdCard(e.target.files[0]);
    }
  };

  const addSubject = () => {
    if (subjectInput.trim() && !teacherForm.subjects.includes(subjectInput.trim())) {
      setTeacherForm(prev => ({
        ...prev,
        subjects: [...prev.subjects, subjectInput.trim()]
      }));
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setTeacherForm(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subject)
    }));
  };

  const validateTeacherPassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
    return null;
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validations
    if (!teacherForm.email.endsWith('@srmist.edu.in')) {
      setError('Email must be from @srmist.edu.in domain');
      setIsLoading(false);
      return;
    }

    const passwordError = validateTeacherPassword(teacherForm.password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    if (teacherForm.password !== teacherForm.confirmPassword) {
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
      const formData = new FormData();
      formData.append('name', teacherForm.name);
      formData.append('email', teacherForm.email);
      formData.append('password', teacherForm.password);
      formData.append('department', teacherForm.department);
      formData.append('subjects', JSON.stringify(teacherForm.subjects));
      formData.append('idCard', idCard);

      await axios.post('http://localhost:3000/api/teacher-auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess('Registration successful! Waiting for admin approval. You will be notified via email.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Parent Handlers
  const handleParentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChildIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setChildIdCard(e.target.files[0]);
    }
  };

  const validateParentPassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
    return null;
  };

  const handleParentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validations
    const passwordError = validateParentPassword(parentForm.password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    if (parentForm.password !== parentForm.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!childIdCard) {
      setError('Please upload your child\'s ID card');
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', parentForm.name);
      formData.append('email', parentForm.email);
      formData.append('password', parentForm.password);
      formData.append('phone', parentForm.phone);
      formData.append('childSrmEmail', parentForm.childSrmEmail);
      formData.append('childSrmPassword', parentForm.childSrmPassword);
      formData.append('childIdCard', childIdCard);

      await axios.post('http://localhost:3000/api/parent-auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess('Registration successful! Waiting for admin approval. You will be notified via email.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: RegisterTab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 w-full max-w-lg mx-auto overflow-y-auto max-h-[90vh]"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-1 font-outfit">Join InsightU</h2>
        <p className="text-sm text-textLight">Register as a Teacher or Parent</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg border border-white/10">
        <button
          onClick={() => handleTabChange('teacher')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'teacher'
              ? 'bg-brand text-white'
              : 'text-textLight hover:text-white'
          }`}
        >
          <AcademicCapIcon className="h-4 w-4 inline mr-1" />
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
          <UserIcon className="h-4 w-4 inline mr-1" />
          Parent
        </button>
      </div>

      {/* Teacher Tab */}
      {activeTab === 'teacher' && (
        <form onSubmit={handleTeacherRegister} className="space-y-4">
          <Input
            name="name"
            type="text"
            label="Full Name"
            placeholder="Dr. John Doe"
            icon={<UserIcon className="h-5 w-5" />}
            value={teacherForm.name}
            onChange={handleTeacherChange}
            required
          />

          <Input
            name="email"
            type="email"
            label="Institutional Email"
            placeholder="john.doe@srmist.edu.in"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={teacherForm.email}
            onChange={handleTeacherChange}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textLight flex items-center gap-2">
              <BuildingLibraryIcon className="h-4 w-4" /> Department
            </label>
            <select 
              name="department" 
              value={teacherForm.department} 
              onChange={handleTeacherChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50"
              required
            >
              <option value="" className="bg-surface text-white">Select Department</option>
              {['C.Tech', 'DSB', 'SNW', 'Electronics', 'Mechanical', 'Applied Sciences'].map(d => 
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
            {teacherForm.subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {teacherForm.subjects.map(subject => (
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
              onChange={handleTeacherFileChange}
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
              value={teacherForm.password}
              onChange={handleTeacherChange}
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

          <div className="relative">
            <Input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              label="Confirm Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={teacherForm.confirmPassword}
              onChange={handleTeacherChange}
              required
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-brand"
            >
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
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

          <Button 
            type="submit" 
            className="w-full mt-4" 
            isLoading={isLoading}
          >
            Submit Registration
          </Button>
        </form>
      )}

      {/* Parent Tab */}
      {activeTab === 'parent' && (
        <form onSubmit={handleParentRegister} className="space-y-4">
          <Input
            name="name"
            type="text"
            label="Full Name"
            placeholder="Mr. John Doe"
            icon={<UserIcon className="h-5 w-5" />}
            value={parentForm.name}
            onChange={handleParentChange}
            required
          />

          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="your@email.com"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={parentForm.email}
            onChange={handleParentChange}
            required
          />

          <Input
            name="phone"
            type="tel"
            label="Phone Number"
            placeholder="+91 98765 43210"
            icon={<PhoneIcon className="h-5 w-5" />}
            value={parentForm.phone}
            onChange={handleParentChange}
          />

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
            👶 Enter your child's SRM Academia credentials
          </div>

          <Input
            name="childSrmEmail"
            type="email"
            label="Child's SRM Email"
            placeholder="child@srmist.edu.in"
            icon={<EnvelopeIcon className="h-5 w-5" />}
            value={parentForm.childSrmEmail}
            onChange={handleParentChange}
            required
          />

          <div className="relative">
            <Input
              name="childSrmPassword"
              type={showChildPassword ? "text" : "password"}
              label="Child's SRM Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={parentForm.childSrmPassword}
              onChange={handleParentChange}
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
              onChange={handleChildIdCardChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-brand/20 file:text-brand hover:file:bg-brand/30"
              required
            />
            {childIdCard && (
              <p className="text-xs text-green-400 mt-1">✓ {childIdCard.name}</p>
            )}
          </div>

          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              label="Your Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={parentForm.password}
              onChange={handleParentChange}
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

          <div className="relative">
            <Input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              label="Confirm Password"
              placeholder="••••••••"
              icon={<LockClosedIcon className="h-5 w-5" />}
              value={parentForm.confirmPassword}
              onChange={handleParentChange}
              required
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-brand"
            >
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
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

          <Button 
            type="submit" 
            className="w-full mt-4" 
            isLoading={isLoading}
          >
            Submit Registration
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-textLight mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-brand hover:text-brandDark transition-colors font-medium">
          Sign In
        </Link>
      </p>
    </motion.div>
  );
}
