export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur">
        {children}
      </div>
    </div>
  );
}
