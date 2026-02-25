import Link from "next/link";
import Header from "@/components/Header";

export default function Home() {
  return (
    <main>
      {/* We show the header even on the welcome page in our implementation, 
          though the wireframe hid it until after "Login". 
          For a real web app, a persistent header is usually better. 
          We'll keep it there but maybe simplify it if not logged in.
      */}
      <Header />

      <div className="max-w-[1200px] mx-auto py-10 px-5">
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="card text-center py-15">
            <div className="text-[120px] mb-8 leading-none">🌱</div>
            <h1 className="text-4xl md:text-5xl font-bold text-harvest-green mb-5">
              Welcome to LocalHarvest AI
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
              Let our AI handle your content creation and posting while you focus on farming.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/login" className="button-primary px-10 py-4 text-lg">
                🔐 Login
              </Link>
              <Link href="/signup" className="button-secondary px-10 py-4 text-lg">
                ✨ Sign Up Free
              </Link>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/dashboard"
                className="text-harvest-green font-semibold text-base border-b-2 border-harvest-green pb-0.5 transition-all hover:opacity-80"
              >
                View Demo
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
