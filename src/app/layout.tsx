import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-slate-100 text-slate-900 touch-manipulation antialiased selection:bg-orange-600 selection:text-white">
      {children}
    </div>
  );
}
