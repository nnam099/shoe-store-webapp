import prisma from '../src/config/db.js';

async function verify() {
  try {
    const brandsCount = await prisma.brand.count();
    const categoriesCount = await prisma.category.count();
    const productsCount = await prisma.product.count();
    const productCategoriesCount = await prisma.productCategory.count();
    const colorwaysCount = await prisma.colorway.count();
    const productImagesCount = await prisma.productImage.count();
    const variantsCount = await prisma.variant.count();

    console.log('=== COUNTS CHECK ===');
    console.log('brands:', brandsCount, brandsCount === 5 ? 'PASS' : 'FAIL');
    console.log('categories:', categoriesCount, categoriesCount === 4 ? 'PASS' : 'FAIL');
    console.log('products:', productsCount, productsCount === 20 ? 'PASS' : 'FAIL');
    console.log('productCategories:', productCategoriesCount, productCategoriesCount === 40 ? 'PASS' : 'FAIL');
    console.log('colorways:', colorwaysCount, colorwaysCount === 80 ? 'PASS' : 'FAIL');
    console.log('productImages:', productImagesCount, productImagesCount === 314 ? 'PASS' : 'FAIL');
    console.log('variants:', variantsCount, variantsCount === 720 ? 'PASS' : 'FAIL');

    console.log('\n=== INVARIANT ASSERTIONS ===');
    const products = await prisma.product.findMany({
      include: {
        colorways: {
          include: {
            variants: true,
            images: true,
          },
        },
        productCategories: {
          include: { category: true },
        },
      },
    });

    let passA = true;
    let passB = true;
    let passC = true;
    let passD = true;
    let passF = true;
    let passG = true;
    let passH = true;
    const threeImgColorways = [];

    const SIZES_EXPECTED = ['36', '37', '38', '39', '40', '41', '42', '43', '44'];

    for (const p of products) {
      if (p.colorways.length !== 4) passA = false;
      const defaults = p.colorways.filter((c) => c.isDefault);
      if (defaults.length !== 1) passB = false;

      for (const cw of p.colorways) {
        if (cw.variants.length !== 9) passC = false;
        const sizes = cw.variants.map((v) => v.size).sort();
        if (JSON.stringify(sizes) !== JSON.stringify([...SIZES_EXPECTED].sort())) passC = false;

        if (cw.images.length !== 3 && cw.images.length !== 4) passD = false;
        if (cw.images.length === 3) threeImgColorways.push(`${p.slug}/${cw.slug}`);

        const thumbs = cw.images.filter((img) => img.isThumbnail);
        if (thumbs.length !== 1) passF = false;

        for (const v of cw.variants) {
          if (v.stock < 0) passG = false;
        }

        const hasAvailable = cw.variants.some((v) => v.stock > 0);
        if (!hasAvailable) passH = false;
      }
    }

    console.log('A. Every product has exactly 4 colorways:', passA ? 'PASS' : 'FAIL');
    console.log('B. Every product has exactly 1 default colorway:', passB ? 'PASS' : 'FAIL');
    console.log('C. Every colorway has 9 variants EU36-44:', passC ? 'PASS' : 'FAIL');
    console.log('D. Every colorway has 3 or 4 images:', passD ? 'PASS' : 'FAIL');
    console.log(`E. Exactly 6 colorways have 3 images (${threeImgColorways.length}):`, threeImgColorways.length === 6 ? 'PASS' : 'FAIL');
    console.log('   List:', threeImgColorways);
    console.log('F. Every colorway has exactly 1 thumbnail:', passF ? 'PASS' : 'FAIL');
    console.log('G. No variant stock < 0:', passG ? 'PASS' : 'FAIL');
    console.log('H. Every colorway has at least one variant stock > 0:', passH ? 'PASS' : 'FAIL');

    // I. Sale subset
    const saleProducts = products.filter((p) => p.colorways.some((c) => c.salePrice !== null));
    const saleProductSlugs = saleProducts.map((p) => p.slug).sort();
    const EXPECTED_SALE_SLUGS = [
      'chuck-taylor-all-star-canvas',
      '574',
      'suede-xl',
      'superstar-ii',
      'air-max-90',
    ].sort();
    const passI = JSON.stringify(saleProductSlugs) === JSON.stringify(EXPECTED_SALE_SLUGS);
    console.log(`I. Sale subset is exactly approved 5 products (${saleProducts.length}):`, passI ? 'PASS' : 'FAIL');
    console.log('   Sale products:', saleProductSlugs);

    // J. Category counts: Classic 13, Lifestyle 12, Streetwear 10, Running 5
    const catMap = {};
    for (const p of products) {
      for (const pc of p.productCategories) {
        catMap[pc.category.slug] = (catMap[pc.category.slug] || 0) + 1;
      }
    }
    const passJ = catMap['classic'] === 13 && catMap['lifestyle'] === 12 && catMap['streetwear'] === 10 && catMap['running'] === 5;
    console.log('J. Category counts match exactly:', passJ ? 'PASS' : 'FAIL', catMap);

    // Transactional safety check
    const userCount = await prisma.user.count();
    const adminCount = await prisma.adminAccount.count();
    const orderCount = await prisma.order.count();
    const orderItemCount = await prisma.orderItem.count();
    const historyCount = await prisma.orderStatusHistory.count();
    const reviewCount = await prisma.review.count();

    const passTransactional = userCount === 0 && adminCount === 0 && orderCount === 0 && orderItemCount === 0 && historyCount === 0 && reviewCount === 0;
    console.log('\n=== TRANSACTIONAL TABLES UNTOUCHED ===');
    console.log('Transactional tables completely empty (0):', passTransactional ? 'PASS' : 'FAIL');
  } catch (err) {
    console.error('Validation error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
