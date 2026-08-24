"use client";

interface SessionWarningModalProps {
  isOpen: boolean;
  timeRemaining: number; // seconds
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export default function SessionWarningModal({
  isOpen,
  timeRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionWarningModalProps) {
  if (!isOpen) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Ending</h2>
          <p className="text-gray-600">You've been inactive for a while</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-sm text-amber-800 mb-2">You'll be logged out in</p>
          <p className="text-3xl font-bold text-amber-600">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
        </div>

        <p className="text-sm text-gray-600 text-center mb-6">
          Click "Stay Logged In" to continue or you'll be automatically logged out.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Logout Now
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
