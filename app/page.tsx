'use client';

import dynamic from 'next/dynamic';

// Import GameScreen with SSR disabled since it uses HTML5 Canvas and browser events
const GameScreen = dynamic(() => import('@/components/GameScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#000000] text-[#c0c0c0] font-mono p-4">
      <pre className="text-xs sm:text-sm text-[#ff0099] mb-4 text-center leading-none">
{` _   _ ____  __     __ ____ _____ __  __ _   _ 
| | | |  _ \\ \\ \\   / // ___|_   _|  \\/  | \\ | |
| |_| | |_) | \\ \\ / / \\___ \\ | | | |\\/| |  \\| |
|  _  |  _ <   \\ V /   ___) || | | |  | | |\\  |
|_| |_|_| \\_\\   \\_/   |____/ |_| |_|  |_|_| \\_|`}
      </pre>
      <div className="text-sm text-[#33ff00] animate-pulse">Loading Mineral Town...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-[#000000]">
      <GameScreen />
    </main>
  );
}
