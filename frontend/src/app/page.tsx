import Desktop from '@/components/os/Desktop';
import WindowManager from '@/components/os/WindowManager';
import DesktopIcons from '@/components/os/DesktopIcons';

export default function Home() {
  return (
    <Desktop>
      <WindowManager />
      <DesktopIcons />
      
      {/* Development info */}
      <div className="absolute bottom-8 right-8 text-white/50 text-xs">
        Portfolio OS v0.1.0 - Development Build
      </div>
    </Desktop>
  );
}