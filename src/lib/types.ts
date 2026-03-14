export interface Design {
  id: string;
  name: string;
  description: string;
  image_url: string;
  active: number;
  sort_order: number;
}

export interface ProductType {
  id: string;
  name: string;
  description: string;
  category: string;
  example_url: string;
  active: number;
  sort_order: number;
}

export interface Size {
  id: string;
  name: string;
  sort_order: number;
}

export interface Order {
  id: string;
  user_name: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_type_id: string;
  design_id: string;
  size_id: string;
  quantity: number;
  unit_price_crc: number | null;
  unit_price_usd: number | null;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    product_name?: string;
    design_name?: string;
    size_name?: string;
  })[];
}

export interface OrderFormData {
  userName: string;
  notes: string;
  items: {
    productTypeId: string;
    designId: string;
    sizeId: string;
    quantity: number;
  }[];
}

export interface UserOrderTotal {
  userName: string;
  items: {
    productName: string;
    designName: string;
    sizeName: string;
    quantity: number;
    unitPriceUSD: number;
    totalUSD: number;
  }[];
  grandTotalUSD: number;
}

export interface AdminSummary {
  totalOrders: number;
  totalItems: number;
  byProduct: {
    productTypeId: string;
    productName: string;
    totalQty: number;
    tierPriceCRC: number;
    tierPriceUSD: number;
    totalCRC: number;
    totalUSD: number;
  }[];
  byDesign: {
    designId: string;
    designName: string;
    totalQty: number;
  }[];
  bySize: {
    sizeId: string;
    sizeName: string;
    totalQty: number;
  }[];
  byProductAndSize: {
    productTypeId: string;
    productName: string;
    sizeId: string;
    sizeName: string;
    totalQty: number;
  }[];
}
