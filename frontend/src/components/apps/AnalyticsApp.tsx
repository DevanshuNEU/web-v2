'use client';
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePostHog } from 'posthog-js/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  Eye, 
  Clock, 
  TrendingUp,
  Shield,
  Info
} from 'lucide-react';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export default function AnalyticsApp() {
  const posthog = usePostHog();
  const [stats, setStats] = useState({
    sessionStart: Date.now(),
    sessionDuration: '0s',
    appsOpened: [] as string[],
    isOptedOut: false,
    // Demo aggregated data
    totalVisitors: 127,
    totalPageViews: 384,
    avgDuration: '3m 12s',
    topSections: [
      { name: 'About Me', views: 156 },
      { name: 'Projects', views: 98 },
      { name: 'Skills', views: 67 },
      { name: 'Analytics', views: 43 },
      { name: 'Contact', views: 20 }
    ],
    deviceBreakdown: [
      { name: 'Desktop', value: 65 },
      { name: 'Mobile', value: 30 },
      { name: 'Tablet', value: 5 }
    ]
  });

  useEffect(() => {
    setStats(prev => ({ ...prev, isOptedOut: posthog.has_opted_out_capturing() }));

    // Track that Analytics app was opened
    posthog.capture('analytics_app_opened');

    // Update session duration every second
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - stats.sessionStart) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      setStats(prev => ({ 
        ...prev, 
        sessionDuration: `${minutes}m ${seconds}s` 
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [posthog, stats.sessionStart]);

  const handleOptOut = () => {
    if (stats.isOptedOut) {
      posthog.opt_in_capturing();
      setStats(prev => ({ ...prev, isOptedOut: false }));
    } else {
      posthog.opt_out_capturing();
      setStats(prev => ({ ...prev, isOptedOut: true }));
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface/30 overflow-auto">
      <div className="p-8 space-y-8 max-w-6xl mx-auto w-full">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-text">
            Portfolio <span className="text-accent">Analytics</span>
          </h1>
          <p className="text-text-secondary text-lg">
            Real-time insights into how visitors interact with Portfolio OS
          </p>
        </div>

        <div className="glass-subtle rounded-2xl p-6 border-l-4 border-accent backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <Shield className="text-accent flex-shrink-0 mt-1" size={24} />
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold text-text">Privacy-First Analytics</h3>
              <p className="text-text-secondary leading-relaxed">
                This site uses PostHog for anonymous analytics. No personal data is collected. 
                All stats are aggregated and anonymized. You can opt-out anytime.
              </p>
              <button
                onClick={handleOptOut}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  stats.isOptedOut
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-accent/20 text-accent hover:bg-accent/30'
                }`}
              >
                {stats.isOptedOut ? '✓ Opted Out' : 'Opt Out of Tracking'}
              </button>
            </div>
          </div>
        </div>

        {/* Your Session - REAL DATA */}
        <div className="glass-subtle rounded-2xl p-6 border border-accent/20 backdrop-blur-xl bg-gradient-to-br from-green-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <h3 className="text-xl font-bold text-text">Your Session (Live)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-text-secondary text-sm mb-1">Duration</div>
              <div className="text-2xl font-bold text-text">{stats.sessionDuration}</div>
            </div>
            <div>
              <div className="text-text-secondary text-sm mb-1">Device</div>
              <div className="text-lg font-medium text-text">
                {typeof window !== 'undefined' && /Mobile/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
              </div>
            </div>
            <div>
              <div className="text-text-secondary text-sm mb-1">Tracking Status</div>
              <div className={`text-lg font-medium ${stats.isOptedOut ? 'text-red-400' : 'text-green-400'}`}>
                {stats.isOptedOut ? 'Opted Out' : 'Active'}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Badge */}
        <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
          📊 Demo Dashboard - Real tracking powered by PostHog
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-subtle rounded-xl p-6 border border-accent/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-accent" size={20} />
              <span className="text-text-secondary text-sm">Total Visitors</span>
            </div>
            <div className="text-3xl font-bold text-text">{stats.totalVisitors}</div>
            <div className="text-xs text-text-secondary mt-1">Demo data</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-subtle rounded-xl p-6 border border-accent/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <Eye className="text-accent" size={20} />
              <span className="text-text-secondary text-sm">Total Views</span>
            </div>
            <div className="text-3xl font-bold text-text">{stats.totalPageViews}</div>
            <div className="text-xs text-text-secondary mt-1">Demo data</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-subtle rounded-xl p-6 border border-accent/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-accent" size={20} />
              <span className="text-text-secondary text-sm">Avg Duration</span>
            </div>
            <div className="text-3xl font-bold text-text">{stats.avgDuration}</div>
            <div className="text-xs text-text-secondary mt-1">Demo data</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-subtle rounded-xl p-6 border border-accent/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-accent" size={20} />
              <span className="text-text-secondary text-sm">Trend</span>
            </div>
            <div className="text-3xl font-bold text-green-400">↑ 12%</div>
            <div className="text-xs text-text-secondary mt-1">Demo data</div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-subtle rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-text mb-6">Most Viewed Sections</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topSections}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="views" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-subtle rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-text mb-6">Device Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
          <div className="relative glass-subtle p-8 border border-accent/20">
            <div className="flex items-start gap-4">
              <Info className="text-accent flex-shrink-0 mt-1" size={24} />
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-text">Why show analytics publicly?</h3>
                <div className="text-text-secondary leading-relaxed space-y-2">
                  <p>
                    Transparency matters. Inspired by PostHog's approach to building in public, 
                    I'm sharing how visitors interact with this portfolio.
                  </p>
                  <p>
                    No personal data is collected - just anonymous, aggregated stats that help me 
                    understand what content resonates and how to improve the experience.
                  </p>
                  <p className="text-accent font-medium">
                    Building in public. Learning in public. Growing in public.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Powered by{' '}
            <a 
              href="https://posthog.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium"
            >
              PostHog
            </a>
            {' '}• Privacy-focused analytics
          </p>
        </div>
      </div>
    </div>
  );
}
