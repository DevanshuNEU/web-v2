export default function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
      <div className="text-center">
        <div className="text-white text-2xl font-bold mb-4 animate-pulse">
          Loading Portfolio OS...
        </div>
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-white/60 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" 
               style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  );
}
