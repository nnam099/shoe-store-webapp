import { AppError } from "../errors/app-error.js";

function toCatalogItem(row, resource) {
  return {
    id: row.id,
    name: row.display_name,
    ...(resource === "colors" ? { hexCode: row.hex_code } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function notFoundError() {
  return new AppError({
    statusCode: 404,
    code: "CATALOG_ITEM_NOT_FOUND",
    message: "Không tìm thấy danh mục hoặc thuộc tính.",
  });
}

function conflictError(resource) {
  const labels = {
    categories: "Tên loại giày",
    brands: "Tên thương hiệu",
    sizes: "Giá trị size",
    colors: "Tên màu",
  };
  return new AppError({
    statusCode: 409,
    code: "CATALOG_ITEM_CONFLICT",
    message: `${labels[resource]} đã tồn tại.`,
    fields: { name: `${labels[resource]} đã tồn tại.` },
  });
}

function validateResourceInput(resource, input) {
  const maximumLengths = { categories: 100, brands: 100, sizes: 30, colors: 60 };
  if (input.name.length > maximumLengths[resource]) {
    throw new AppError({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Dữ liệu gửi lên không hợp lệ.",
      fields: { name: `Tên/giá trị không được vượt quá ${maximumLengths[resource]} ký tự.` },
    });
  }

  if (resource !== "colors" && input.hexCode !== null) {
    throw new AppError({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Chỉ màu sắc mới nhận mã màu.",
      fields: { hexCode: "Trường này không áp dụng cho nhóm đã chọn." },
    });
  }
}

export function createAdminCatalogService(repository) {
  return {
    async list(resource, query) {
      const result = await repository.list(resource, query);
      return {
        items: result.rows.map((row) => toCatalogItem(row, resource)),
        pagination: {
          page: query.page,
          pageSize: result.pageSize,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      };
    },

    async create(resource, input) {
      validateResourceInput(resource, input);
      try {
        const id = await repository.create(resource, input);
        return toCatalogItem(await repository.findById(resource, id), resource);
      } catch (error) {
        if (error?.code === "23505") throw conflictError(resource);
        throw error;
      }
    },

    async update(resource, id, input) {
      validateResourceInput(resource, input);
      try {
        const updatedId = await repository.update(resource, id, input);
        if (!updatedId) throw notFoundError();
        return toCatalogItem(await repository.findById(resource, updatedId), resource);
      } catch (error) {
        if (error?.code === "23505") throw conflictError(resource);
        throw error;
      }
    },

    async delete(resource, id) {
      try {
        await repository.transaction(async (transaction) => {
          if (!(await transaction.lock(resource, id))) throw notFoundError();
          const usage = await transaction.getUsage(resource, id);

          if (usage.active_products > 0 || usage.deleted_products > 0) {
            throw new AppError({
              statusCode: 409,
              code: "CATALOG_ITEM_IN_USE",
              message: `Không thể xóa vì đang được dùng bởi ${usage.active_products} sản phẩm đang bán và ${usage.deleted_products} sản phẩm đã xóa mềm.`,
            });
          }

          await transaction.delete(resource, id);
        });
      } catch (error) {
        if (error?.code === "23503") {
          throw new AppError({
            statusCode: 409,
            code: "CATALOG_ITEM_IN_USE",
            message: "Không thể xóa vì mục này vừa được một sản phẩm sử dụng.",
          });
        }
        throw error;
      }
    },
  };
}
