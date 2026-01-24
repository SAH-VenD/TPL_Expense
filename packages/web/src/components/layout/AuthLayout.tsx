import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">T</span>
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold text-gray-900">TPL Expense</h2>
        <p className="mt-1 text-center text-sm text-gray-600">
          Tekcellent Expense Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
