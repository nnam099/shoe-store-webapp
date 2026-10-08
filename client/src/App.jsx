import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col bg-[#f8f8f6] text-[#121212] overflow-x-hidden">
        {/* Top Header */}
        <Header />

        {/* Routed Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
          </Routes>
        </main>

        {/* Storefront Footer */}
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
