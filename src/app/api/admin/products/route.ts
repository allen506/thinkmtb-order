import { NextRequest } from "next/server";
import {
  query,
  execute,
  errorResponse,
  successResponse,
  requireAdminSession,
} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const products = await query<any>(
      `SELECT 
        id, 
        name, 
        category, 
        description, 
        example_url,
        sort_order, 
        created_at
      FROM product_types
      ORDER BY sort_order ASC`
    );

    return successResponse({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return errorResponse(authError.error, 401);
  }

  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      example_url,
      sort_order,
      tenant_id,
    } = body;

    if (!name || !category) {
      return errorResponse("Name and category are required", 400);
    }

    const id = uuidv4();
    const tenantId = tenant_id || "default-tenant";

    await execute(
      `INSERT INTO product_types (id, tenant_id, name, category, description, example_url, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, tenantId, name, category, description || null, example_url || null, sort_order || 999]
    );

    return successResponse(
      { id, message: "Product created successfully" },
      201
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return errorResponse("Failed to create product", 500);
  }
}
