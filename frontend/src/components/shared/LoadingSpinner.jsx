export default function LoadingSpinner({ fullPage = false, message = 'Loading...' }) {
  const inner = (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-purple-300 font-nunito font-semibold text-sm">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-navy flex items-center justify-center z-50">
        {inner}
      </div>
    );
  }
  return <div className="flex items-center justify-center py-12">{inner}</div>;
}
