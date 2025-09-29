'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Server, Cloud, Database, Activity, TrendingUp, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppPage, StandardCard, Section, Grid } from '@/components/ui/standard';
import portfolioData from '@/data/portfolio.json';

const categoryIcons = {
  'code': Code,
  'server': Server, 
  'cloud': Cloud,
  'database': Database
};

export default function SkillsDashboardApp() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [showProcesses, setShowProcesses] = useState(true);
  const skills = portfolioData.skills;

  return (
    <AppPage>
      {/* Header */}
      <StandardCard>
        <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="text-4xl font-bold text-gray-900" style={{ marginBottom: '0.75rem' }}>
              Skills Dashboard
            </h1>
            <p className="text-xl text-gray-600">
              Technical expertise and current learning
            </p>
          </div>
          
          <Button
            variant={showProcesses ? "default" : "outline"}
            onClick={() => setShowProcesses(!showProcesses)}
            className="flex items-center"
            style={{ gap: '0.5rem' }}
          >
            <Monitor style={{ width: '1.125rem', height: '1.125rem' }} />
            Running Processes
          </Button>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap" style={{ gap: '0.75rem' }}>
          {skills.categories.map((category, index) => {
            const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons];
            const isActive = activeCategory === index;
            
            return (
              <Button
                key={category.name}
                variant={isActive ? "default" : "outline"}
                onClick={() => setActiveCategory(index)}
                className="flex items-center"
                style={{ gap: '0.5rem' }}
              >
                <IconComponent style={{ width: '1rem', height: '1rem' }} />
                {category.name}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {category.skills.length}
                </Badge>
              </Button>
            );
          })}
        </div>
      </StandardCard>

      {/* Skills Display */}
      <StandardCard delay={0.1}>
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Section title={skills.categories[activeCategory].name}>
            <p className="text-gray-600 text-lg" style={{ marginBottom: '2rem' }}>
              Proficiency levels and project experience
            </p>
            
            <div style={{ gap: '1.5rem' }}>
              {skills.categories[activeCategory].skills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  style={{ marginBottom: '1.5rem' }}
                >
                  <Card className="hover:shadow-md transition-all">
                    <CardContent style={{ padding: '2rem' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                        <div className="flex items-center" style={{ gap: '1rem' }}>
                          <h4 className="text-xl font-semibold text-gray-900">{skill.name}</h4>
                          <div className="flex" style={{ gap: '0.5rem' }}>
                            {'isCurrentlyLearning' in skill && skill.isCurrentlyLearning && (
                              <Badge variant="outline" className="bg-brand-yellow/10 text-brand-orange border-brand-orange/30">
                                Learning
                              </Badge>
                            )}
                            {skill.isCurrentlyUsing && (
                              <Badge variant="outline" className="bg-brand-green/10 text-brand-green border-brand-green/30">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-base" style={{ marginBottom: '1.5rem' }}>
                        {skill.experience} experience
                      </p>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                          <span className="text-base font-medium text-gray-700">Proficiency</span>
                          <span className="text-base font-semibold text-gray-900">{skill.level}%</span>
                        </div>
                        <Progress value={skill.level} className="h-3" />
                      </div>

                      {skill.projects && skill.projects.length > 0 && (
                        <div>
                          <p className="text-base text-gray-600" style={{ marginBottom: '0.75rem' }}>
                            Used in projects:
                          </p>
                          <div className="flex flex-wrap" style={{ gap: '0.5rem' }}>
                            {skill.projects.map((project) => (
                              <Badge key={project} variant="secondary" className="bg-gray-100 text-gray-700">
                                {project}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </Section>
        </motion.div>
      </StandardCard>

      {/* Currently Learning */}
      {showProcesses && (
        <StandardCard delay={0.4}>
          <Section title="Currently Learning">
            <Grid columns={3}>
              {skills.currentlyLearning.map((learning, index) => (
                <motion.div
                  key={learning.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  className="h-full"
                >
                  <div 
                    className="bg-brand-orange/8 rounded-xl border border-brand-orange/20 h-full flex flex-col"
                    style={{ padding: '2rem' }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                      <h4 className="font-semibold text-gray-900 text-lg">{learning.name}</h4>
                      <TrendingUp className="text-brand-orange" style={{ width: '1.5rem', height: '1.5rem' }} />
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                        <span className="text-base font-medium text-gray-700">Progress</span>
                        <span className="text-base font-semibold text-brand-orange">{learning.progress}%</span>
                      </div>
                      <Progress value={learning.progress} className="h-3" />
                    </div>
                    
                    <div className="mt-auto" style={{ gap: '0.75rem' }}>
                      <p className="text-sm text-gray-600" style={{ marginBottom: '0.75rem' }}>
                        <span className="font-medium">Timeline:</span> {learning.timeframe}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {learning.reason}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </Grid>
          </Section>
        </StandardCard>
      )}
    </AppPage>
  );
}
