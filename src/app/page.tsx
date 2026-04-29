
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1>Gamer</h1>
      <a href="/login" className="px-6 py-4 border border-blue-500 rounded-md ml-4 text-blue-500 hover:underline">Sign In</a>
    </div>
  );
}
