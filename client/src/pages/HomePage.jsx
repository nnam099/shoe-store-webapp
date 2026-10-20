import { useEffect, useMemo, useState } from 'react';
import HeroSlider from '../components/home/HeroSlider';
import BrandLogos from '../components/home/BrandLogos';
import ShopByCategory from '../components/home/ShopByCategory';
import NewArrivals from '../components/home/NewArrivals';
import FeaturedProducts from '../components/home/FeaturedProducts';
import { getFeaturedProducts, getNewArrivals } from '../services/catalogService';
import { getProductReviewSummaries } from '../services/reviewService';

/**
 * HomePage Component
 * Assemblies all locked storefront homepage sections.
 * Handles smooth scrolling if navigation lands on a section hash (e.g. /#brands).
 */
function HomePage() {
  const newArrivals = useMemo(() => getNewArrivals(8), []);
  const featuredProducts = useMemo(() => getFeaturedProducts(), []);

  const [reviewSummaries, setReviewSummaries] = useState({});

  const homepageSlugs = useMemo(() => {
    return [...new Set([...newArrivals, ...featuredProducts].map((p) => p.slug))];
  }, [newArrivals, featuredProducts]);

  const homepageSlugKey = homepageSlugs.join(',');

  useEffect(() => {
    if (!homepageSlugKey) return;
    const slugs = homepageSlugKey.split(',').filter(Boolean);
    let isCurrent = true;

    getProductReviewSummaries(slugs)
      .then((data) => {
        if (!isCurrent || !data?.summaries) return;
        const map = {};
        for (const summary of data.summaries) {
          map[summary.slug] = summary;
        }
        setReviewSummaries(map);
      })
      .catch(() => {
        // Non-blocking fallback
      });

    return () => {
      isCurrent = false;
    };
  }, [homepageSlugKey]);

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
      <NewArrivals products={newArrivals} reviewSummaries={reviewSummaries} />

      {/* Featured Products (6 flagship models representing 5 brands) */}
      <FeaturedProducts products={featuredProducts} reviewSummaries={reviewSummaries} />
    </>
  );
}

export default HomePage;
