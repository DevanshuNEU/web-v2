/**
 * Pre-paint theme script.
 *
 * Runs before first paint (inlined in app/layout.tsx) and applies the saved
 * theme from store/themeStore.ts ("portfolio-os-theme") so the page does not
 * paint one theme and switch after hydration. It mirrors the store: dark and
 * color by default; a blob saved before version 1 is treated as color because
 * the store migrates it (see migrateTheme); a custom accent saved at version 1
 * or later is applied here, while the blurple default comes from globals.css.
 * ThemeProvider takes over once React mounts.
 */
export const THEME_BOOT_SCRIPT = `(function(){var r=document.documentElement;try{var b=JSON.parse(localStorage.getItem('portfolio-os-theme')||'{}');var s=b.state||{};var v=b.version||0;if(s.mode!=='light')r.classList.add('dark');var mono=v>=1&&s.palette==='mono';r.dataset.palette=mono?'mono':'color';var a=typeof s.accentColor==='string'?s.accentColor.replace('#',''):'';if(a.length===3)a=a.replace(/./g,'$&$&');if(!mono&&v>=1&&/^[0-9a-f]{6}$/i.test(a)&&a.toUpperCase()!=='635BFF'){var n=parseInt(a,16);var t=(n>>16&255)+' '+(n>>8&255)+' '+(n&255);r.style.setProperty('--color-accent',t);r.style.setProperty('--primary',t);r.style.setProperty('--ring',t);}}catch(e){r.classList.add('dark');r.dataset.palette='color';}})();`;
