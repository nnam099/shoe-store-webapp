import { useEffect } from 'react';
import HeroSlider from '../components/home/HeroSlider';
import BrandLogos from '../components/home/BrandLogos';
import ShopByCategory from '../components/home/ShopByCategory';
import NewArrivals from '../components/home/NewArrivals';
import FeaturedProducts from '../components/home/FeaturedProducts';

/**
 * HomePage Component
 * Assemblies all locked storefront homepage sections.
 * Handles smooth scrolling if navigation lands on a section hash (e.g. /#brands).
 */
function HomePage() {
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.slice(1);
      const element = document.getElementById(targetId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  return (
    <>
      {/* Hero Slider with 4 curated banners */}
      <HeroSlider />

      {/* Brand Logos Strip (5 verified brands with live catalog links) */}
      <BrandLogos />

      {/* Shop by Category (4 curated categories with derived counts) */}
      <ShopByCategory />

      {/* New Arrivals (8 latest models in 4-column grid) */}
      <NewArrivals />

      {/* Featured Products (6 flagship models representing 5 brands) */}
      <FeaturedProducts />
    </>
  );
}

export default HomePage;
