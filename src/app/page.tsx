'use client';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to LocaStay
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          India's First GPS-Powered Rural Property Marketplace
        </p>
        <div className="space-x-4">
          <a href="/auth/login" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Login
          </a>
          <a href="/auth/register" className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
