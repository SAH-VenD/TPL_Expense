import { useAppSelector } from '../../store/hooks';

export function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  const stats = [
    { name: 'Pending Expenses', value: '3', change: '+2 this week' },
    { name: 'Approved This Month', value: 'PKR 45,000', change: '+12%' },
    { name: 'Pending Approvals', value: '5', change: 'Action required' },
    { name: 'Active Vouchers', value: '2', change: '1 due soon' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your expenses today.
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          New Expense
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6"
          >
            <p className="text-sm font-medium text-gray-600">{stat.name}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Office Supplies</p>
                    <p className="text-sm text-gray-500">Jan {20 + i}, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">PKR {1000 * i}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Travel Expense</p>
                    <p className="text-sm text-gray-500">By: John Doe</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                      Approve
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Budget Overview</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { name: 'Department Budget', used: 65000, total: 100000 },
              { name: 'Travel Budget', used: 25000, total: 50000 },
              { name: 'Training Budget', used: 8000, total: 20000 },
            ].map((budget) => (
              <div key={budget.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{budget.name}</span>
                  <span className="text-gray-900">
                    PKR {budget.used.toLocaleString()} / {budget.total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(budget.used / budget.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
