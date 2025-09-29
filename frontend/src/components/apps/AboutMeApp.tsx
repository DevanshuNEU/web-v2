'use client';

import React, { useState } from 'react';
import { User, Compass, Lightbulb, Heart, PenTool, Activity, Mail } from 'lucide-react';
import { AppPage, StandardCard } from '@/components/ui/standard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import WhoIAmSection from './about-me/sections/WhoIAmSection';

const menuItems = [
  { id: 'intro', title: 'Who I Am', icon: User },
  { id: 'journey', title: 'My Journey', icon: Compass },
  { id: 'excites', title: 'What Excites Me', icon: Lightbulb },
  { id: 'currently', title: 'Currently', icon: Activity },
  { id: 'contact', title: 'Get in Touch', icon: Mail }
];

export default function AboutMeApp() {
  const [activeSection, setActiveSection] = useState('intro');

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return <WhoIAmSection />;
      default:
        return (
          <StandardCard>
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">
                {menuItems.find(item => item.id === activeSection)?.title}
              </h1>
              <p>Content for {activeSection} section coming soon...</p>
            </div>
          </StandardCard>
        );
    }
  };

  return (
    <AppPage className="!p-0 bg-[#faf9f6]">
      <div className="flex h-full">
        {/* Simple Sidebar */}
        <div className="w-64 bg-white/60 backdrop-blur-sm border-r border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">About Me</h2>
          
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full justify-start gap-3 p-3",
                  activeSection === item.id 
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            ))}
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </AppPage>
  );
}