import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#000000] text-[#d0d0d0] font-mono p-6 text-center">
      <h1 className="text-xl font-bold text-[#ff0099] mb-2">404 — Area Not Found</h1>
      <p className="text-sm text-[#808080] mb-6">
        You wandered off the Mineral Town path.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded bg-[#404040] hover:bg-[#606060] border border-[#606060] text-[#33ff00] text-sm"
      >
        Return to Farm
      </Link>
    </div>
  );
}
