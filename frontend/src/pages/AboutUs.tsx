import { motion } from 'framer-motion';
import { 
  AcademicCapIcon,
  LightBulbIcon,
  SparklesIcon,
  ChartBarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function AboutUs() {
  const team = [
    { name: 'Nishant Ranjan', ra: 'RA2411003010008', github: 'https://github.com/Nishant-codess', color: 'from-blue-500 to-cyan-500' },
    { name: 'Nidhi Nayana', ra: 'RA2411003010018', github: 'https://github.com/nidhi-nayana', color: 'from-purple-500 to-pink-500' },
    { name: 'Vaishnavi', ra: 'RA2411003010012', github: 'https://github.com/phobiccvaishu', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 p-4 sm:p-6 lg:p-8 overflow-hidden">
      
      {/* --- HERO SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-10 overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/30 blur-[120px] rounded-full mix-blend-screen group-hover:bg-brand/50 transition-all duration-1000"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/30 blur-[120px] rounded-full mix-blend-screen group-hover:bg-purple-600/50 transition-all duration-1000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          
          <div className="flex flex-col items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/95 px-6 py-4 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/20 backdrop-blur-md"
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/en/7/7a/SRM_Institute_of_Science_and_Technology_Logo.svg" 
                alt="SRM Institute of Science and Technology Logo" 
                className="h-16 md:h-20 w-auto object-contain drop-shadow-md"
              />
            </motion.div>
          </div>

          <div className="max-w-4xl space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 tracking-tight leading-tight">
              Pioneering the Future of <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-400">Digital Education.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-3xl mx-auto">
              InsightU is not just an application. It is a <span className="text-white">next-generation educational ecosystem</span> crafted exclusively for the SRM community, breaking the boundaries of traditional classrooms and empowering minds through infinite collaboration.
            </p>
          </div>

        </div>
      </motion.div>


      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* --- FACULTY MENTOR SECTION --- */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-7 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-96 h-96 bg-brand/10 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-brand/20 rounded-2xl border border-brand/30">
              <AcademicCapIcon className="w-8 h-8 text-brand" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Faculty Mentor</h2>
              <p className="text-brand font-semibold tracking-wide uppercase text-sm mt-1">Guiding The Vision</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-10">
            
            {/* Image & Core Info */}
            <div className="flex flex-col items-center md:items-start space-y-6 shrink-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand to-purple-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
                <img 
                  src="/padmini.jpg" 
                  alt="Dr. S. Padmini" 
                  className="relative w-48 h-48 md:w-56 md:h-56 object-cover rounded-3xl border-2 border-white/20 shadow-2xl z-10"
                  onError={(e) => {
                    e.currentTarget.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Padmini";
                  }}
                />
              </div>
              
              <div className="text-center md:text-left space-y-1">
                <h3 className="text-3xl font-bold text-white">Dr. S. Padmini</h3>
                <p className="text-gray-400 font-medium">Associate Professor</p>
                <a href="mailto:padminis@srmist.edu.in" className="text-brand hover:text-brandLight text-sm font-semibold transition-colors">padminis@srmist.edu.in</a>
                <p className="text-gray-500 text-sm font-medium mt-2 flex items-center justify-center md:justify-start gap-2">
                  <ChartBarIcon className="w-4 h-4"/> Citations: 357 • H-Index: 10
                </p>
              </div>
            </div>

            {/* Achievements & Specializations */}
            <div className="space-y-8 flex-1">
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2">
                  <LightBulbIcon className="w-4 h-4"/> Specialization
                </h4>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Application of Machine Learning and Deep Learning Techniques to real world problems, AI driven Sustainable Technologies, Intelligent Automation Systems, IOT, Renewable Energy Optimization, Solar and EV applications, Solar Desalination and Sustainability, Green Computing.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-center space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <GlobeAltIcon className="w-5 h-5"/> Research Profiles
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 font-medium">SCOPUS: 23985792700</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 font-medium">ORCID: 0000-0001-8133-3453</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 font-medium">WOS: ACW-4520-2022</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>


        {/* --- STUDENT TEAM SECTION --- */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col"
        >
          <div className="absolute left-0 bottom-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-purple-500/20 rounded-2xl border border-purple-500/30">
              <SparklesIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">The Creators</h2>
              <p className="text-purple-400 font-semibold tracking-wide uppercase text-sm mt-1">Student Engineering Team</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-5 relative z-10">
            {team.map((member) => (
              <motion.div 
                key={member.ra}
                whileHover={{ scale: 1.02, x: 10 }}
                className="group relative bg-black/40 border border-white/10 rounded-2xl p-5 flex items-center justify-between overflow-hidden"
              >
                {/* Hover Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${member.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${member.color}`}></div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                      {member.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{member.ra}</p>
                  </div>
                </div>

                <a 
                  href={member.github}
                  target="_blank"
                  rel="noreferrer"
                  className="relative z-10 p-3 bg-white/5 hover:bg-white/20 border border-white/10 rounded-xl transition-all hover:rotate-12 hover:scale-110"
                  aria-label={`GitHub Profile of ${member.name}`}
                >
                  <GithubIcon className="w-6 h-6 text-white" />
                </a>
              </motion.div>
            ))}
          </div>

        </motion.div>

      </div>
    </div>
  );
}
