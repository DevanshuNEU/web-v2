const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const actions = ['useOSStore', 'useAnalyticsStore', 'trackEvent', 'trackAppOpen', 'trackAppClose', 'trackAppFocus', 'openWindow', 'closeWindow', 'focusWindow', 'setBooted', 'updateWindowPosition'];

walkDir('/Users/devanshu/Desktop/Portfolio/web-v2/frontend/src', function(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic heuristic: check if action name appears outside of useEffect/useCallback/=> functions
  // A simple grep wouldn't catch this perfectly, but let's see which files use these actions at all.
  let suspicious = false;
  for (const action of actions) {
    if (content.includes(action)) {
      suspicious = true;
      break;
    }
  }
  
  if (suspicious) {
    console.log(filePath);
  }
});
