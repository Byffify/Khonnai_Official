// Photo slots. Drop a file named after its slot into src/assets/photos/ (webp/jpg/png) and the page picks it up;
// until then each section falls back to its brand-gradient + app-screen look.
// Photos made with AI are illustrations, not the pilot shop: keep ILLUSTRATION true so the page says so.

const files = import.meta.glob("./assets/photos/*.{webp,jpg,jpeg,png,avif}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export type PhotoSlot = "hero" | "type-new" | "type-front" | "type-line" | "type-variants" | "closing";

export function photo(slot: PhotoSlot): string | undefined {
  const hit = Object.entries(files).find(([path]) => path.split("/").pop()!.replace(/\.\w+$/, "") === slot);
  return hit?.[1];
}

export const ILLUSTRATION = true; // set false once the slots hold real photos from a shop that agreed to be shown

/** What each slot should show; also the brief for generating or shooting it. */
export const PHOTO_ALT: Record<PhotoSlot, string> = {
  hero: "มือเจ้าของร้านถือมือถือเปิดแอป khonnai ข้างหลังเป็นชั้นวางกล่องชุดชั้นในเรียงเป็นแพ็ก",
  "type-new": "เจ้าของร้านกำลังนับแพ็กสินค้าล็อตแรกบนโต๊ะ พร้อมมือถือวางข้าง ๆ",
  "type-front": "เคาน์เตอร์ร้านค้าส่ง ลูกค้ากำลังเลือกชุดชั้นในจากราว เจ้าของร้านถือมือถือออกบิล",
  "type-line": "มือถือแสดงแชตสั่งของ วางข้างถุงสินค้าที่แพ็กรอลูกค้ามารับ",
  "type-variants": "ราวและชั้นวางชุดชั้นในหลายสีหลายไซซ์ จัดเรียงเป็นช่อง",
  closing: "เจ้าของร้านยิ้มขณะดูยอดขายบนมือถือ หน้าร้านค้าส่งชุดชั้นใน",
};
