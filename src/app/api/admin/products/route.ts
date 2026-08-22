import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const products = db
      .prepare(
        `
      SELECT 
        id, 
        name, 
        category, 
        description, 
        example_url,
        fit_options,
        active, 
        sort_order, 
        created_at
      FROM product_types
      ORDER BY sort_order ASC
    `
      )
      .all();

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const body = await req.json();
    const { name, category, description, example_url, fit_options, active, sort_order } =
      body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const id = `${category}-${name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .substring(0, 20)}`;
    const now = new Date().toISOString().split("T")[0];

    db.prepare(
      `
      INSERT INTO product_types (id, name, category, description, example_url, fit_options, active, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      name,
      category,
      description || null,
      example_url || null,
      fit_options || '["unisex"]',
      active ? 1 : 0,
      sort_order || 999,
      now
    );

    return NextResponse.json(
      { id, message: "Product created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
