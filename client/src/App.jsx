import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSlider from './components/home/HeroSlider';
import BrandLogos from './components/home/BrandLogos';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f6] text-[#121212]">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Slider with 4 curated banners */}
        <HeroSlider />

        {/* Brand Logos Strip (5 verified brands) */}
        <BrandLogos />
      </main>

      {/* Storefront Footer */}
      <Footer />
    </div>
  );
}

export default App;
