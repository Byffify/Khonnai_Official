// Copy and data for the landing page. Layout: design/khonnai-landing.figcraft (Landing v2); copy from
// design/build_landing_v2.py, plus the kinds of information Wongnai POS gives (shop types, "when" tags,
// running-cost reassurance, who answers).
// Facts come from the pitch deck; anything still waiting on the team is marked TODO and kept out of the page.

export const APP_URL = "./app/index.html"; // the khonnai prototype, copied in by scripts/sync-app.mjs
export const LINE_URL = "https://lin.ee/8PHy1Z1"; // LINE OA add-friend link, decoded from the official QR (src/assets/line-qr.png)

export const PRIMARY = "เริ่มใช้ฟรี";
export const LINE_CTA = "คุยกับทีมทาง LINE";

export const NAV = [
  { label: "ฟีเจอร์", href: "#features", menu: "features" },
  { label: "ราคา", href: "#pricing" },
  { label: "บริการ", href: "#services", menu: "services" },
  { label: "ติดต่อ", href: "#contact" },
] as const;

export type ModuleKey = "stock" | "bill" | "reserve" | "home";

export const MODULES: { key: ModuleKey; label: string; href: string }[] = [
  { key: "stock", label: "สต็อกสินค้า", href: "#features" },
  { key: "bill", label: "ออกบิล", href: "#features" },
  { key: "reserve", label: "การจอง", href: "#features" },
  { key: "home", label: "หน้าโฮมสรุปร้าน", href: "#features" },
];

// Services the team can offer by hand today; confirm before launch.
export const SERVICES = [
  { icon: "calendar", title: "นัดดูเดโม", sub: "ทีมพาดูการทำงานจริง" },
  { icon: "store", title: "ช่วยตั้งค่าร้าน", sub: "เพิ่มสินค้าชุดแรกให้" },
  { icon: "upload", title: "ย้ายข้อมูลเดิม", sub: "จากสมุดหรือ Excel" },
  { icon: "message", title: "คุยกับทีมทาง LINE", sub: "ถามก่อนเริ่มใช้" },
] as const;

export type ScreenKey = "home" | "stock" | "addmodel" | "bill" | "reserve" | "bill-select" | "bill-confirm";

// Wongnai POS asks "what kind of shop are you?" before any feature; these are khonnai's shop types.
// Every bullet maps to something the prototype already does (or, for ช่วยตั้งค่าร้าน, a proposed service).
export const STORE_TYPES = [
  {
    slot: "type-new",
    screen: "addmodel",
    title: "ร้านเพิ่งเริ่มจดสต็อก",
    lead: "เลิกจดสมุด เริ่มจากมือถือเครื่องเดียว",
    bullets: ["เพิ่มรุ่นแรกได้ในหน้าเดียว", "เริ่มฟรี 20 รหัสสินค้า", "ให้ทีมช่วยตั้งค่าร้านได้"],
  },
  {
    slot: "type-front",
    screen: "bill",
    title: "ขายส่งหน้าร้าน",
    lead: "ลูกค้ายืนรอ บิลต้องออกไว",
    bullets: ["ออกบิลใน 3 ขั้น", "ไม่ขายเกินของที่มี", "บันทึกบิลเป็น PDF ได้"],
  },
  {
    slot: "type-line",
    screen: "reserve",
    title: "รับออเดอร์ทาง LINE",
    lead: "จองไว้ก่อน ของไม่ถูกขายซ้ำ",
    bullets: ["ใบจองที่กันสต็อกไว้ให้", "แยกช่องทางหน้าร้านกับ LINE", "รับของแล้วออกบิลได้เลย"],
  },
  {
    slot: "type-variants",
    screen: "stock",
    title: "ของหลายรุ่น หลายสี หลายไซซ์",
    lead: "เห็นของพร้อมขายทุกช่องในจอเดียว",
    bullets: ["สต็อกแยกรุ่น สี และไซซ์", "เห็นของที่ใกล้หมดต้องเติม", "ค้นหาและกรองตามหมวดได้"],
  },
] as const;

// One list for every feature, in the design's "ขั้นตอนสั้น ตัวใหญ่" layout (the bento cards were folded in).
// It cycles and each point shows its real app screen(s) from design/revisions/audit-fixes-v1/khonnai-home-v1.figcraft.
// `when` borrows Wongnai's "who / what for" tag under each feature: the moment in the shop's day it helps.
export const POINTS: { icon: string; title: string; desc: string; when: string; screens: ScreenKey[] }[] = [
  {
    icon: "package",
    title: "สต็อกแยกรุ่น สี และไซซ์",
    desc: "เห็นทันทีว่าไซซ์ไหน สีไหน เหลือกี่แพ็ก และตัวไหนหมดต้องเติม",
    when: "ใช้ตอนลูกค้าถามว่ามีของไหม",
    screens: ["stock"],
  },
  {
    icon: "receipt",
    title: "ออกบิลใน 3 ขั้น",
    desc: "เลือกสินค้า ยืนยันออเดอร์ แล้วได้บิลเงินสดตามแบบฟอร์มร้าน สต็อกถูกตัดทันที และบันทึกเป็น PDF ได้",
    when: "ใช้ตอนลูกค้ายืนรอบิลหน้าร้าน",
    screens: ["bill-select", "bill-confirm", "bill"], // the three steps, in order
  },
  {
    icon: "bookmark",
    title: "ใบจองที่กันสต็อกไว้ให้",
    desc: "จองจากหน้าร้านหรือ LINE ใช้สต็อกชุดเดียวกัน กด “ลูกค้ารับของแล้ว · ออกบิล” โดยไม่ตัดสต็อกซ้ำ",
    when: "ใช้ตอนรับออเดอร์ทาง LINE",
    screens: ["reserve"],
  },
  {
    icon: "house",
    title: "หน้าโฮมสรุปร้านในจอเดียว",
    desc: "รายได้วันนี้ ออเดอร์รอรับของ และของที่ต้องเติม พร้อมปุ่มลัดเพิ่มสต็อก และแถบล่างไปขาย สต็อก รายงาน",
    when: "ใช้ตอนเปิดร้าน / ปิดยอดสิ้นวัน",
    screens: ["home"],
  },
  {
    icon: "plus",
    title: "เพิ่มรุ่นใหม่ได้ในหน้าเดียว",
    desc: "ใส่ชื่อ รหัส ราคา ไซซ์ สี และจำนวนแต่ละช่องจบในหน้าเดียว",
    when: "ใช้ตอนของล็อตใหม่เข้าร้าน",
    screens: ["addmodel"],
  },
];

// Slide 8 of the pitch: prices still being tested with pilot shops. Daily bills = monthly limit / 30.
export const PLANS = [
  { name: "Free", price: "0", audience: "ให้ร้านลองใช้ก่อนจ่าย", skus: "20", bills: "50", perDay: "ออกบิลได้ราววันละ 1–2 ใบ", cta: PRIMARY, href: APP_URL, featured: false },
  { name: "Basic", price: "299", audience: "ร้านค้าส่งทั่วไป", skus: "200", bills: "500", perDay: "ออกบิลได้ราววันละ 15 ใบ", cta: "เริ่ม Basic ทาง LINE", href: LINE_URL, featured: true },
  { name: "Pro", price: "699", audience: "ร้านที่มียอดขายสูง", skus: "1,000", bills: "2,000", perDay: "ออกบิลได้ราววันละ 65 ใบ", cta: "คุยเรื่อง Pro ทาง LINE", href: LINE_URL, featured: false },
];

export const INCLUDED = ["สต็อกแยกรุ่น สี และไซซ์", "ใบจองที่กันสต็อก", "ออกบิลเงินสดและบันทึก PDF"];

// The design's five questions. Answers 1–3 follow from the pitch; 4–5 wait for the team (TODO) and stay hidden (visibleFaq).
// Q2 carries Wongnai's "what does it take to run" reassurance: nothing to install, no hardware to buy.
export const FAQ: { q: string; a: string | null }[] = [
  {
    q: "khonnai คืออะไร?",
    a: "เว็บแอปบนมือถือสำหรับร้านค้าส่งชุดชั้นในและเสื้อผ้าขนาดเล็ก ช่วยจัดการสินค้าแยกตามรุ่น สี และไซซ์ บันทึกการจอง และออกบิลจากข้อมูลชุดเดียวกัน เพื่อลดการเช็กของซ้ำและบิลที่ไม่ตรงกับสต็อก",
  },
  {
    q: "ต้องติดตั้งแอปหรือซื้อเครื่องไหม?",
    a: "ไม่ต้อง ใช้ผ่านเว็บบนมือถือเครื่องเดิมของร้าน เปิดลิงก์แล้วเริ่มได้ทันที ไม่ต้องซื้อเครื่อง POS เพิ่ม",
  },
  { q: "มีให้ทดลองใช้ฟรีไหม?", a: "มี แพ็กเกจ Free ใช้ได้ 20 รหัสสินค้า และ 50 บิลต่อเดือน โดยไม่มีค่าใช้จ่าย" },
  { q: "ถ้าสินค้าหรือบิลเกินลิมิต จะเป็นอย่างไร?", a: null },
  { q: "ข้อมูลร้านเก็บไว้ที่ไหน ปลอดภัยไหม?", a: null },
];

// Two questions still wait for the team, so only answered ones are shown.
export const visibleFaq = FAQ.filter((f) => f.a);

export const FOOTER = [
  { head: "ผลิตภัณฑ์", links: [["ฟีเจอร์", "#features"], ["ราคา", "#pricing"], ["บริการ", "#services"]] },
  { head: "ทีม", links: [["ทีม khonnai", "#contact"], ["ติดต่อ", "#contact"]] },
  { head: "ช่วยเหลือ", links: [["คำถามที่พบบ่อย", "#faq"]] },
] as const;
