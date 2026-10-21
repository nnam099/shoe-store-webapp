import {
  getCatalogOptions,
  getCatalogProduct,
  listCatalogProducts,
} from '../services/catalog.service.js';

export async function getOptions(req, res, next) {
  try {
    const result = await getCatalogOptions();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(req, res, next) {
  try {
    const result = await listCatalogProducts(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const result = await getCatalogProduct(req.params.slug);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
