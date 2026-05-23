import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export default function PerformancePage() {
  const { token, portalData } = useAuthStore();
  const [marksData, setMarksData] = useState<any[]>(portalData?.marks || []);

  useEffect(() => {
    if (!marksData.length && token) {
      fetch(`${API}/portal/marks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMarksData(data.data || []);
        }
      })
      .catch(err => console.error("Failed to fetch marks:", err));
    }
  }, [token, marksData.length]);

  // Transform marks data for the BarChart (percentage per subject)
  const chartData = useMemo(() => {
    return marksData.map(course => {
      let totalScored = 0;
      let totalMax = 0;
      course.tests?.forEach((test: any) => {
        totalScored += Number(test.scored || 0);
        totalMax += Number(test.maxMarks || 0);
      });
      const percentage = totalMax > 0 ? (totalScored / totalMax) * 100 : 0;
      
      return {
        name: course.courseCode,
        percentage: parseFloat(percentage.toFixed(1)),
        totalScored,
        totalMax
      };
    });
  }, [marksData]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Academic Performance</h1>
        <p className="text-gray-400 mt-1">Review your test scores and overall performance metrics</p>
      </div>

      {/* Graph Section */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          Overall Performance Graph
        </h2>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="percentage" 
                name="Performance %" 
                radius={[6, 6, 0, 0]}
                barSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.percentage >= 90 ? '#10B981' : entry.percentage >= 75 ? '#6366F1' : '#8B5CF6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Marks Table */}
      <div className="bg-[#E6E8F4] rounded-xl overflow-hidden shadow-2xl text-black">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#D1D5DF] text-black uppercase font-black text-xs border-b-2 border-gray-400">
              <tr>
                <th className="px-4 py-3 border-r border-gray-400 w-40">Course Code</th>
                <th className="px-4 py-3 border-r border-gray-400 w-32">Course Type</th>
                <th className="px-4 py-3">Test Performance</th>
              </tr>
            </thead>
            <tbody>
              {marksData.map((course, index) => (
                <tr key={index} className="border-b border-gray-400 bg-[#EEF0F8] hover:bg-[#E2E5F1] transition-colors">
                  <td className="px-4 py-4 border-r border-gray-400 font-medium text-gray-800">
                    {course.courseCode}
                  </td>
                  <td className="px-4 py-4 border-r border-gray-400 font-medium text-gray-800">
                    {course.courseType || "Theory"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {course.tests && course.tests.map((test: any, tIdx: number) => (
                        <div 
                          key={tIdx} 
                          className="bg-[#D1D5DF] border border-gray-500 rounded flex flex-col overflow-hidden min-w-[90px]"
                        >
                          <div className="px-2 py-1 bg-[#D1D5DF] text-black font-bold text-[10px] text-center border-b border-gray-500">
                            {test.name}/{test.maxMarks?.toFixed(2)}
                          </div>
                          <div className="px-2 py-1.5 bg-[#EEF0F8] text-center text-gray-900 font-medium text-xs">
                            {test.scored?.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {(!course.tests || course.tests.length === 0) && (
                        <span className="text-gray-500 italic text-xs">No records available</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
