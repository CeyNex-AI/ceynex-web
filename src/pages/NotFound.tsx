import { Link } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export default function NotFound() {
  const { userId } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Page not found</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            There's nothing at this address.
          </p>
          <Link
            to={userId ? "/query" : "/"}
            className="inline-block mt-4 text-sm text-teal-700 hover:text-teal-800 font-medium"
          >
            {userId ? "Back to Query" : "Back to Login"} →
          </Link>
        </div>
      </div>
    </div>
  );
}
