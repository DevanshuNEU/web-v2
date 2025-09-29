// Shared TypeScript types between frontend and backend

// Window Management Types
export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  appType: AppType;
}

export type AppType = 
  | 'about-me'
  | 'projects'
  | 'skills-dashboard'
  | 'network-monitor'
  | 'contact'
  | 'terminal'
  | 'games'
  | 'display-options';

// API Types
export interface AnalyticsEvent {
  appName: string;
  action: 'open' | 'close' | 'focus' | 'click';
  timestamp: number;
  sessionId?: string;
}

export interface EasterEggProgress {
  sessionId: string;
  cluesFound: string[];
  currentStage: number;
  completedAt?: string;
}

export interface ContactForm {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface GitHubStats {
  publicRepos: number;
  followers: number;
  following: number;
  totalStars: number;
  totalCommits: number;
  contributionGraph: any; // Will define based on GitHub API response
  recentActivity: GitHubActivity[];
}

export interface GitHubActivity {
  type: 'push' | 'pr' | 'issue' | 'star';
  repo: string;
  timestamp: string;
  description: string;
}

// Theme and Display Types
export type Theme = 'light' | 'dark' | 'system';

export interface DisplaySettings {
  theme: Theme;
  wallpaper: string;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  analyticsEnabled: boolean;
}

// Project Data Types
export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  featured: boolean;
  startDate: string;
  endDate?: string;
}

export interface Skill {
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'cloud' | 'tools';
  proficiency: number; // 1-10 scale
  isCurrentlyLearning: boolean;
  yearsOfExperience: number;
}
