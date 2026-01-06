import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <div className="text-7xl font-bold text-slate-200 dark:text-slate-700">404</div>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
        Page Not Found
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
