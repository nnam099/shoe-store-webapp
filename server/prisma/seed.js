import prisma from '../src/config/db.js';
import { products } from '../../client/src/data/catalog.js';

/**
 * STEP/LAB — Catalog Database Seed Foundation (Phase 6A)
 * Populates PostgreSQL catalog with approved 100% locked storefront data:
 * - 5 Brands
 * - 4 Categories
 * - 20 Products
 * - 40 ProductCategories
 * - 80 Colorways (exactly 1 default per product)
 * - 314 ProductImages (exactly 6 colorways with 3 images, 74 with 4 images)
 * - 720 Variants (EU 36-44, deterministic stock)
 *
 * Idempotent: safe to run multiple times without data duplication or constraint violations.
 * Safe: never deletes or truncates transactional tables (orders, users, reviews).
 */

const BRANDS_DEF = [
  { name: 'Nike', slug: 'nike', logoUrl: 'logos/nike.svg' },
  { name: 'Puma', slug: 'puma', logoUrl: 'logos/puma.svg' },
  { name: 'Converse', slug: 'converse', logoUrl: 'logos/converse.svg' },
  { name: 'Adidas', slug: 'adidas', logoUrl: 'logos/adidas.svg' },
  { name: 'New Balance', slug: 'new-balance', logoUrl: 'logos/new-balance.svg' },
];

const CATEGORIES_DEF = [
  { name: 'Lifestyle', slug: 'lifestyle' },
  { name: 'Running', slug: 'running' },
  { name: 'Streetwear', slug: 'streetwear' },
  { name: 'Classic', slug: 'classic' },
];

export async function seedCatalog() {
  console.log('--- Starting Catalog Database Seed (Phase 6A) ---');

  // 1. Upsert Brands (5)
  console.log('1. Seeding Brands...');
  const brandMap = new Map();
  for (const b of BRANDS_DEF) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, logoUrl: b.logoUrl, isActive: true },
      create: { name: b.name, slug: b.slug, logoUrl: b.logoUrl, isActive: true },
    });
    brandMap.set(brand.slug, brand.id);
  }
  console.log(`   Seeded ${brandMap.size} brands.`);

  // 2. Upsert Categories (4)
  console.log('2. Seeding Categories...');
  const categoryMap = new Map();
  for (const c of CATEGORIES_DEF) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, isActive: true },
      create: { name: c.name, slug: c.slug, isActive: true },
    });
    categoryMap.set(category.slug, category.id);
  }
  console.log(`   Seeded ${categoryMap.size} categories.`);

  // 3. Upsert Products, ProductCategories, Colorways, ProductImages, Variants
  console.log('3. Seeding Products, Colorways, Images, and Variants...');
  let totalProductCategories = 0;
  let totalColorways = 0;
  let totalImages = 0;
  let totalVariants = 0;

  for (const p of products) {
    const brandId = brandMap.get(p.brand.slug);
    if (!brandId) {
      throw new Error(`Brand not found for slug: ${p.brand.slug}`);
    }

    // Upsert Product
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        brandId,
        isActive: true,
        isFeatured: p.isFeatured,
        createdAt: new Date(p.createdAt),
      },
      create: {
        name: p.name,
        slug: p.slug,
        brandId,
        isActive: true,
        isFeatured: p.isFeatured,
        createdAt: new Date(p.createdAt),
      },
    });

    // Upsert ProductCategory mapping
    for (const catSlug of p.categories) {
      const categoryId = categoryMap.get(catSlug);
      if (!categoryId) {
        throw new Error(`Category not found for slug: ${catSlug}`);
      }
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId: product.id,
            categoryId,
          },
        },
        update: {},
        create: {
          productId: product.id,
          categoryId,
        },
      });
      totalProductCategories++;
    }

    // Sort colorways so non-default are processed first, then default last (avoids partial unique index transient conflict)
    const sortedColorways = [...p.colorways].sort((a, b) => (a.isDefault ? 1 : 0) - (b.isDefault ? 1 : 0));

    for (const cw of sortedColorways) {
      // Upsert Colorway
      const colorway = await prisma.colorway.upsert({
        where: {
          productId_slug: {
            productId: product.id,
            slug: cw.slug,
          },
        },
        update: {
          name: cw.name,
          price: cw.price,
          salePrice: cw.salePrice,
          isDefault: cw.isDefault,
          isActive: true,
        },
        create: {
          productId: product.id,
          name: cw.name,
          slug: cw.slug,
          price: cw.price,
          salePrice: cw.salePrice,
          isDefault: cw.isDefault,
          isActive: true,
        },
      });
      totalColorways++;

      // Upsert ProductImages (3 or 4 images per colorway)
      for (let idx = 0; idx < cw.images.length; idx++) {
        const displayOrder = idx + 1;
        const isThumbnail = displayOrder === 1;
        const imageUrl = cw.images[idx];

        await prisma.productImage.upsert({
          where: {
            colorwayId_displayOrder: {
              colorwayId: colorway.id,
              displayOrder,
            },
          },
          update: {
            imageUrl,
            isThumbnail,
          },
          create: {
            colorwayId: colorway.id,
            imageUrl,
            displayOrder,
            isThumbnail,
          },
        });
        totalImages++;
      }

      // Upsert Variants (9 sizes: EU 36-44)
      // Stock is only initialized on creation; reseed must preserve live inventory stock.
      for (const v of cw.variants) {
        await prisma.variant.upsert({
          where: {
            colorwayId_size: {
              colorwayId: colorway.id,
              size: v.size,
            },
          },
          update: {},
          create: {
            colorwayId: colorway.id,
            size: v.size,
            stock: v.stock,
          },
        });
        totalVariants++;
      }
    }
  }

  console.log(`   Seeded ${products.length} products.`);
  console.log(`   Seeded ${totalProductCategories} product-category relations.`);
  console.log(`   Seeded ${totalColorways} colorways.`);
  console.log(`   Seeded ${totalImages} product images.`);
  console.log(`   Seeded ${totalVariants} variants.`);
  console.log('--- Catalog Seed Completed Successfully ---');
}

// Execute directly if run via CLI
const isMain = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isMain) {
  seedCatalog()
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
