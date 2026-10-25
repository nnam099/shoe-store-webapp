import { useEffect, useState } from 'react';
import HeroSlider from '../components/home/HeroSlider';
import BrandLogos from '../components/home/BrandLogos';
import BestSellers from '../components/home/BestSellers';
import CategoryNavigation from '../components/home/CategoryNavigation';
import NewArrivals from '../components/home/NewArrivals';
import FeaturedProducts from '../components/home/FeaturedProducts';
import {
  fetchCatalogOptions,
  fetchBestSellers,
  fetchNewArrivals,
  fetchFeaturedProducts,
} from '../services/catalogService';

/**
 * HomePage Component
 * Assembles all locked storefront homepage sections.
 * Loads live active options, Top 5 Best Sellers, New Arrivals and Featured Products from backend API.
 * Handles smooth scrolling if navigation lands on a section hash (e.g. /#brands).
 */
function HomePage() {
  const [options, setOptions] = useState({ brands: null, categories: null });
  const [bestSellersState, setBestSellersState] = useState({
    loading: true,
    data: [],
    error: null,
  });
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

    // Load active options for BrandLogos
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

    // Load Top 5 Best Sellers
    fetchBestSellers()
      .then((products) => {
        if (!isCurrent) return;
        setBestSellersState({
          loading: false,
          data: products,
          error: null,
        });
      })
      .catch((err) => {
        if (!isCurrent) return;
        setBestSellersState({
          loading: false,
          data: [],
          error: err,
        });
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
        const timeoutId = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
    return undefined;
  }, [options.categories]);

  return (
    <>
      {/* Hero Slider with 4 curated banners */}
      <HeroSlider />

      {/* Brand Logos Strip (filtered by active backend brands) */}
      <BrandLogos activeBrands={options.brands} />

      {/* Compact navigation for active Categories with public Products */}
      <CategoryNavigation categories={options.categories} />

      {/* Top 5 Best Sellers (up to 5 models ranked by completed sales) */}
      <BestSellers
        products={bestSellersState.data}
        isLoading={bestSellersState.loading}
        error={bestSellersState.error}
      />

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
