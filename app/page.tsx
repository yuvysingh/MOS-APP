export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 dark:bg-surfacedark-100">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold text-primary-600 dark:text-primary-200">
          🎉 Tailwind & Tailmater are Working!
        </h1>
        <button className="px-6 py-3 rounded-lg bg-secondary-500 text-white hover:bg-secondary-600 transition">
          Test Button
        </button>
      </div>
    </div>
  );
}
