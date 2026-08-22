import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

const db = getDb();

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    let query = `
      SELECT 
        pd.id,
        pd.product_type_id,
        pd.design_id,
        pd.sort_order,
        pd.active,
        d.name as design_name
      FROM product_designs pd
      LEFT JOIN designs d ON pd.design_id = d.id
    `;

    if (productId) {
      query += ` WHERE pd.product_type_id = ?`;
      const results = db.prepare(query).all(productId);
      return NextResponse.json({ associations: results });
    } else {
      query += ` ORDER BY pd.product_type_id, pd.sort_order`;
      const results = db.prepare(query).all();
      return NextResponse.json({ associations: results });
    }
  } catch (error) {
    console.error("Error fetching product-design associations:", error);
    return NextResponse.json(
      { error: "Failed to fetch associations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return unauthorized();
  try {
    const body = await req.json();
    const { product_type_id, design_id, sort_order } = body;

    if (!product_type_id || !design_id) {
      return NextResponse.json(
        { error: "product_type_id and design_id are required" },
        { status: 400 }
      );
    }

    // Check if association already exists
    const existing = db
      .prepare(
        "SELECT id FROM product_designs WHERE product_type_id = ? AND design_id = ?"
      )
      .get(product_type_id, design_id);

    if (existing) {
      return NextResponse.json(
        { error: "Association already exists" },
        { status: 409 }
      );
    }

    const id = db
      .prepare(
        `
      INSERT INTO product_designs (product_type_id, design_id, sort_order, active)
      VALUES (?, ?, ?, 1)
    `
      )
      .run(product_type_id, design_id, sort_order || 0).lastInsertRowid;

    return NextResponse.json(
      { id, message: "Association created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product-design association:", error);
    return NextResponse.json(
      { error: "Failed to create association" },
      { status: 500 }
    );
  }
}
