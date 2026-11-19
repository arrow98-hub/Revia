export type ContactChannel = "messenger" | "instagram" | "whatsapp";
export type StoreKind = "amazon" | "walmart" | "tiktok" | "temu" | "other";
export type ReviewType = "stars" | "comment" | "photos" | "video";
export type ProductStatus = "in_transit" | "delayed" | "received" | "completed" | "cancelled" | "returned";
export type PhotoKind = "arrival" | "review";

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  code_prefix: string | null;
  product_seq: number;
  timezone: string;
  role: "user" | "admin";
  onboarded_at: string | null;
  created_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  name: string;
  contact_channel: ContactChannel | null;
  contact_handle: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  user_id: string;
  code: string;
  name: string;
  provider_id: string;
  contact_channel: ContactChannel | null;
  store: StoreKind;
  store_other: string | null;
  url: string | null;
  image_url: string | null;
  requires_review: boolean;
  review_types: ReviewType[];
  review_days: number | null;
  status: ProductStatus;
  registered_at: string;
  expected_arrival_date: string;
  arrived_on: string | null;
  review_due_date: string | null;
  reviewed_on: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductWithProvider = Product & { provider: Pick<Provider, "id" | "name"> | null };

export interface ProductEvent {
  id: string;
  product_id: string;
  type: string;
  payload: Record<string, unknown>;
  note: string | null;
  created_at: string;
}

export interface ProductPhoto {
  id: string;
  product_id: string;
  kind: PhotoKind;
  storage_path: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
}
