import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSlider from './components/home/HeroSlider';
import BrandLogos from './components/home/BrandLogos';
import ShopByCategory from './components/home/ShopByCategory';
import NewArrivals from './components/home/NewArrivals';
import FeaturedProducts from './components/home/FeaturedProducts';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f6] text-[#121212] overflow-x-hidden">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Slider with 4 curated banners */}
        <HeroSlider />

        {/* Brand Logos Strip (5 verified brands) */}
        <BrandLogos />

        {/* Shop by Category (4 curated categories with derived counts) */}
        <ShopByCategory />

        {/* New Arrivals (8 latest models in 4-column grid) */}
        <NewArrivals />

        {/* Featured Products (6 flagship models representing 5 brands) */}
        <FeaturedProducts />
      </main>

      {/* Storefront Footer */}
      <Footer />
    </div>
  );
}

export default App;
