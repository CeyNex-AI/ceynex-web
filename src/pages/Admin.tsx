import { Link } from "react-router-dom";

export default function Admin() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Administration tools aren't part of this build — there's no admin API to back them yet.
          </p>
          <Link
            to="/query"
            className="inline-block mt-4 text-sm text-teal-700 hover:text-teal-800 font-medium"
          >
            Back to Query →
          </Link>
        </div>
      </div>
    </div>
  );
}
