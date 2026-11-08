import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  FileText,
  Globe,
  House,
  MessageSquare,
  Package,
  PackagePlus,
  Receipt,
  Smartphone,
  Store,
  Type,
  Upload,
  type LucideIcon,
} from "lucide-react";
import logo from "./assets/logo.png";
import type { ScreenKey } from "./content";
import home from "./assets/screens/home.webp";
import stock from "./assets/screens/stock.webp";
import addmodel from "./assets/screens/addmodel.webp";
import bill from "./assets/screens/bill.webp";
import reserve from "./assets/screens/reserve.webp";
import billSelect from "./assets/screens/bill-select.webp";
import billConfirm from "./assets/screens/bill-confirm.webp";

export const ICONS: Record<string, LucideIcon> = {
  package: Package,
  receipt: Receipt,
  bookmark: Bookmark,
  house: House,
  home: House,
  stock: Package,
  bill: Receipt,
  reserve: Bookmark,
  type: Type,
  smartphone: Smartphone,
  calendar: Calendar,
  store: Store,
  upload: Upload,
  message: MessageSquare,
  globe: Globe,
  file: FileText,
  plus: PackagePlus,
};

export const SCREENS: Record<ScreenKey, { src: string; alt: string }> = {
  home: { src: home, alt: "หน้าโฮมของแอป khonnai: รายได้วันนี้ ฿12,450 ออเดอร์รอรับของ และของที่ต้องเติม" },
  stock: { src: stock, alt: "หน้าสต็อกสินค้า: รายการสินค้าพร้อมราคาและจำนวนแพ็กที่เหลือ" },
  addmodel: { src: addmodel, alt: "หน้าเพิ่มรุ่นใหม่: กรอกชื่อ รหัส ราคา ไซซ์ และสี ในหน้าเดียว" },
  bill: { src: bill, alt: "บิลเงินสดที่ออกแล้ว ตัดสต็อก 5 แพ็ก" },
  reserve: { src: reserve, alt: "รายการจองที่รอรับของ 3 รายการ" },
  "bill-select": { src: billSelect, alt: "ออกบิลขั้นที่ 1: เลือกสินค้าจากรายการ 3 รายการ 5 แพ็ก รวม ฿1,160" },
  "bill-confirm": { src: billConfirm, alt: "ออกบิลขั้นที่ 2: ยืนยันออเดอร์ของคุณวิไล ช่องทางหน้าร้าน รวม ฿1,160" },
};

export function Logo({ className = "h-7" }: { className?: string }) {
  return <img src={logo} alt="khonnai" className={`${className} w-auto`} width={147} height={32} />;
}

type Kind = "primary" | "white" | "outline" | "outline-light" | "dark";

const KIND: Record<Kind, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-pressed",
  white: "bg-white text-brand hover:bg-brand-tint active:bg-[#d9e4fa]",
  outline: "bg-white text-ink ring-1 ring-inset ring-line-strong hover:bg-hover active:bg-line",
  "outline-light": "text-white ring-[1.5px] ring-inset ring-white hover:bg-white/12 active:bg-white/20",
  dark: "bg-ink text-white hover:bg-[#1e293b] active:bg-black",
};

/**
 * Pill link. The trailing arrow follows FeedSpring's "CTA Button Hover" (a-114/115):
 * it waits 4px back and slides home on hover in 500ms "ease".
 */
export function Button({
  kind = "primary",
  size = "md",
  arrow = false,
  icon: Icon,
  wide = false,
  children,
  className = "",
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  kind?: Kind;
  size?: "sm" | "md" | "lg";
  arrow?: boolean;
  icon?: LucideIcon;
  wide?: boolean;
  children: ReactNode;
}) {
  const h = { sm: "h-11 px-5 text-[15px]", md: "h-12 px-6 text-base", lg: "h-13 px-6 text-base" }[size];
  return (
    <a
      className={`group inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-out ${h} ${KIND[kind]} ${wide ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {Icon && <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2} />}
      <span>{children}</span>
      {arrow && (
        <ArrowRight
          aria-hidden
          className="size-[18px] shrink-0 -translate-x-1 transition-transform duration-500 ease-[cubic-bezier(.25,.1,.25,1)] group-hover:translate-x-0.5"
        />
      )}
    </a>
  );
}

/** A device bezel around a real app screen. Height drives the size; screens are 393×852. */
export function Phone({ screen, height, className = "" }: { screen: ScreenKey; height: number; className?: string }) {
  const bezel = Math.max(3, Math.round(height * 0.022));
  const inner = height - bezel * 2;
  const width = Math.round((inner * 393) / 852) + bezel * 2;
  const radius = Math.round(inner * 0.065);
  const { src, alt } = SCREENS[screen];
  return (
    <div
      className={`bg-[#111827] shadow-float ${className}`}
      style={{ width, height, padding: bezel, borderRadius: radius + bezel }}
    >
      <img src={src} alt={alt} className="size-full object-cover" style={{ borderRadius: radius }} loading="lazy" />
    </div>
  );
}
