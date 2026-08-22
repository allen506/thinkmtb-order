import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const product = db
      .prepare("SELECT * FROM product_types WHERE id = ?")
      .get(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, description, example_url, fit_options, active, sort_order } =
      body;

    // Check if product exists
    const existing = db
      .prepare("SELECT id FROM product_types WHERE id = ?")
      .get(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(id);
    const query = `UPDATE product_types SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { id } = await params;

    // Check if product has orders
    const orders = db
      .prepare(
        "SELECT COUNT(*) as count FROM order_items WHERE product_type_id = ?"
      )
      .get(id) as { count: number };

    if (orders.count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete product with ${orders.count} existing orders`,
        },
        { status: 400 }
      );
    }

    // Delete pricing tiers
    db.prepare("DELETE FROM pricing_tiers WHERE product_type_id = ?").run(id);

    // Delete product
    db.prepare("DELETE FROM product_types WHERE id = ?").run(id);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
