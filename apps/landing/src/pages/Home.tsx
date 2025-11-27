import type { ReactElement } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { StoresSection } from '@/components/StoresSection';
import { UseCases } from '@/components/UseCases';
import { Features } from '@/components/Features';

const Home = (): ReactElement => {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-8">
        <Header />
        <main>
          <Hero />
          <UseCases />
          <Features />
          <StoresSection />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Home;
