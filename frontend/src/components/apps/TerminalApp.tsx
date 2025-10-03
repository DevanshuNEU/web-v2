'use client';

import { useState, useRef } from 'react';

interface CommandOutput {
  command: string;
  output: string[];
}

export default function TerminalApp() {
  const [history, setHistory] = useState<CommandOutput[]>([
    {
      command: '',
      output: [
        'Portfolio OS Terminal v0.1.0',
        'Type "help" for available commands',
        ''
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const commands: Record<string, string[]> = {
    help: [
      'Available commands:',
      '  help     - Show this help',
      '  about    - About me',
      '  projects - My projects',
      '  contact  - Contact info',
      '  skills   - Technical skills',
      '  whoami   - User info',
      '  clear    - Clear terminal',
      ''
    ],
    about: [
      'Devanshu Chicholikar',
      'MS Software Engineering @ Northeastern University',
      'Graduating December 2026',
      'Seeking Spring 2026 Co-op + Full-time Opportunities',
      ''
    ],
    projects: [
      'My Projects:',
      '  1. Financial Copilot - OCR/NLP receipt processing',
      '  2. SecureScale - Multi-AZ AWS infrastructure',
      '  3. Portfolio OS - This interactive portfolio',
      ''
    ],
    contact: [
      'Email: chicholikar.d@northeastern.edu',
      'LinkedIn: linkedin.com/in/devanshuchicholikar',
      'GitHub: github.com/devanshuNEU',
      ''
    ],
    skills: [
      'Languages: TypeScript, Python, Java, SQL',
      'Frontend: React, Next.js, Tailwind CSS',
      'Backend: Node.js, Flask, PostgreSQL',
      'Cloud: AWS, Terraform, Docker',
      ''
    ],
    whoami: [
      'guest@portfolio-os',
      ''
    ]
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    
    if (trimmed === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    const output = commands[trimmed] || [`Command not found: ${cmd}. Type "help" for available commands.`];
    
    setHistory(prev => [...prev, { command: cmd, output }]);
    setInput('');
    
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    }
  };

  return (
    <div className="h-full bg-black flex flex-col -m-px">
      {/* Scrollable terminal content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto p-6 text-green-400 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="space-y-1">
          {history.map((entry, idx) => (
            <div key={idx}>
              {entry.command && (
                <div className="flex gap-2 mb-1">
                  <span className="text-blue-400">guest@portfolio-os</span>
                  <span className="text-white">:</span>
                  <span className="text-purple-400">/</span>
                  <span className="text-white">$</span>
                  <span className="text-green-400">{entry.command}</span>
                </div>
              )}
              {entry.output.map((line, i) => (
                <div key={i} className="text-gray-300">{line}</div>
              ))}
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <span className="text-blue-400">guest@portfolio-os</span>
            <span className="text-white">:</span>
            <span className="text-purple-400">/</span>
            <span className="text-white">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
