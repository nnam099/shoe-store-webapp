import { useEffect, useState } from 'react';
import HeroSlider from '../components/home/HeroSlider';
import BrandLogos from '../components/home/BrandLogos';
import ShopByCategory from '../components/home/ShopByCategory';
import NewArrivals from '../components/home/NewArrivals';
import FeaturedProducts from '../components/home/FeaturedProducts';
import {
  fetchCatalogOptions,
  fetchNewArrivals,
  fetchFeaturedProducts,
} from '../services/catalogService';

/**
 * HomePage Component
 * Assembles all locked storefront homepage sections.
 * Loads live active options, New Arrivals and Featured Products from the backend API.
 * Handles smooth scrolling if navigation lands on a section hash (e.g. /#brands).
 */
function HomePage() {
  const [options, setOptions] = useState({ brands: null, categories: null });
  const [newArrivalsState, setNewArrivalsState] = useState({
    loading: true,
    data: [],
    error: null,
  });
  const [featuredState, setFeaturedState] = useState({
    loading: true,
    data: [],
    error: null,
  });

  useEffect(() => {
    let isCurrent = true;

    // Load active options for BrandLogos and ShopByCategory
    fetchCatalogOptions()
      .then((opts) => {
        if (!isCurrent) return;
        setOptions({
          brands: opts.brands,
          categories: opts.categories,
        });
      })
      .catch(() => {
        // Fallback: components will use default visual presentation
      });

    // Load New Arrivals (latest 8 products)
    fetchNewArrivals(8)
      .then((res) => {
        if (!isCurrent) return;
        setNewArrivalsState({
          loading: false,
          data: res.products,
          error: null,
        });
      })
      .catch((err) => {
        if (!isCurrent) return;
        setNewArrivalsState({
          loading: false,
          data: [],
          error: err,
        });
      });

    // Load Featured Products (up to 6 products)
    fetchFeaturedProducts(6)
      .then((res) => {
        if (!isCurrent) return;
        setFeaturedState({
          loading: false,
          data: res.products,
          error: null,
        });
      })
      .catch((err) => {
        if (!isCurrent) return;
        setFeaturedState({
          loading: false,
          data: [],
          error: err,
        });
      });

    return () => {
      isCurrent = false;
    };
  }, []);

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

      {/* Brand Logos Strip (filtered by active backend brands) */}
      <BrandLogos activeBrands={options.brands} />

      {/* Shop by Category (filtered by active backend categories with live counts) */}
      <ShopByCategory activeCategories={options.categories} />

      {/* New Arrivals (8 latest models in 4-column grid with live review summary) */}
      <NewArrivals
        products={newArrivalsState.data}
        isLoading={newArrivalsState.loading}
        error={newArrivalsState.error}
      />

      {/* Featured Products (6 flagship models with live review summary) */}
      <FeaturedProducts
        products={featuredState.data}
        isLoading={featuredState.loading}
        error={featuredState.error}
      />
    </>
  );
}

export default HomePage;
