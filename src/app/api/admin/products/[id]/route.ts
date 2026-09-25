import { NextRequest } from "next/server";
import {
  query,
  queryOne,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { id } = await params;
    const product = await queryOne<any>(
      "SELECT * FROM product_types WHERE id = ?",
      [id]
    );

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    return successResponse({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return errorResponse("Failed to fetch product", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, description, example_url, fit_options, active, sort_order } =
      body;

    // Check if product exists
    const existing = await queryOne(
      "SELECT id FROM product_types WHERE id = ?",
      [id]
    );
    if (!existing) {
      return errorResponse("Product not found", 404);
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description || null);
    }
    if (example_url !== undefined) {
      updates.push("example_url = ?");
      values.push(example_url || null);
    }
    if (fit_options !== undefined) {
      updates.push("fit_options = ?");
      values.push(fit_options || '["unisex"]');
    }
    if (active !== undefined) {
      updates.push("active = ?");
      values.push(active ? 1 : 0);
    }
    if (sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return errorResponse("No fields to update", 400);
    }

    values.push(id);
    const sql = `UPDATE product_types SET ${updates.join(", ")} WHERE id = ?`;
    await execute(sql, values);

    return successResponse({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return errorResponse("Failed to update product", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const { id } = await params;

    // Check if product has orders
    const orders = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM order_items WHERE product_type_id = ?",
      [id]
    );

    if (orders && orders.count > 0) {
      return errorResponse(
        `Cannot delete product with ${orders.count} existing orders`,
        400
      );
    }

    // Delete pricing tiers and product
    await execute("DELETE FROM pricing_tiers WHERE product_type_id = ?", [id]);
    await execute("DELETE FROM product_types WHERE id = ?", [id]);

    return successResponse({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return errorResponse("Failed to delete product", 500);
  }
}
