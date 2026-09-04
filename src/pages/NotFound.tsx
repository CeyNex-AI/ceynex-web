import { Link } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import usePageTitle from "../lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Page not found");
  const { userId } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-sm mx-auto">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Page not found</h1>
        <div className="cx-panel-flat p-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            There's nothing at this address.
          </p>
          <Link
            to={userId ? "/query" : "/"}
            className="inline-block mt-4 text-sm text-teal-700 hover:text-teal-800 font-medium"
          >
            {userId ? "Back to Query" : "Back to Login"} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
