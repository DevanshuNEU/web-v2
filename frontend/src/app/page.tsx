import Desktop from '@/components/os/Desktop';
import WindowManager from '@/components/os/WindowManager';
import DesktopIcons from '@/components/os/DesktopIcons';

export default function Home() {
  // JSON-LD structured data for better SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Devanshu Chicholikar',
    jobTitle: 'Software Engineer',
    url: 'https://devanshuchichilokar.me',
    image: 'https://devanshuchichilokar.me/devanshu-photo.png',
    sameAs: [
      'https://www.linkedin.com/in/devanshuchicholikar/',
      'https://github.com/devanshuNEU'
    ],
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'Northeastern University'
    },
    description: 'Software Engineer specializing in full-stack development, distributed systems, and cloud infrastructure',
    knowsAbout: [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'AWS',
      'Cloud Computing',
      'Distributed Systems'
    ]
  };

  return (
    <>
      {/* Add JSON-LD structured data for rich search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Desktop>
        <WindowManager />
        <DesktopIcons />
        
        {/* Development info */}
        <div className="absolute bottom-8 right-8 text-white/50 text-xs">
          Portfolio OS v0.1.0 - Development Build
        </div>
      </Desktop>

      {/* Hidden semantic content for search engine crawlers - improves SEO without affecting UI */}
      <div className="sr-only">
        <h1>Devanshu Chicholikar - Software Engineer</h1>
        <p>
          MS Software Engineering student at Northeastern University, 
          specializing in full-stack development with React, TypeScript, 
          Node.js, and AWS. Building scalable distributed systems and 
          cloud infrastructure.
        </p>
        <h2>Projects</h2>
        <ul>
          <li>Portfolio OS - Interactive desktop-style portfolio with Next.js 15</li>
          <li>ExpenseSink - Student expense tracker with AI integration using Google Gemini</li>
          <li>SecureScale - Production AWS infrastructure with Terraform and CI/CD</li>
        </ul>
        <h2>Technical Skills</h2>
        <p>
          JavaScript, TypeScript, React, Next.js, Node.js, Express, 
          AWS, Docker, Redis, PostgreSQL, MongoDB, Terraform, CI/CD, 
          Distributed Systems, Cloud Computing, Full-Stack Development
        </p>
        <h2>Contact Information</h2>
        <p>Email: chicholikar.d@northeastern.edu</p>
        <p>Location: Boston, MA</p>
        <p>GitHub: github.com/devanshuNEU</p>
        <p>LinkedIn: linkedin.com/in/devanshuchicholikar</p>
      </div>
    </>
  );
}
