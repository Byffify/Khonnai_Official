import { motion } from "motion/react";
import { APP_URL, LINE_CTA, LINE_URL, PRIMARY } from "../content";
import { EASE } from "../motion";
import { Button, ICONS } from "../ui";
import { ILLUSTRATION, PHOTO_ALT, photo } from "../photos";

/**
 * Hero from the design (Landing v2): centred headline, subtitle, two pill buttons, the Free-plan line.
 * The feature cards that used to sit below are gone; a shop photo sits behind the copy instead.
 */
function HeroPhoto({ src }: { src: string }) {
  return (
    <>
      <motion.img
        src={src}
        alt={PHOTO_ALT.hero}
        className="absolute inset-0 size-full object-cover object-[80%_75%]"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: EASE }}
      />
      {/* ≥ 0.88 brand blue behind every line of white copy; the photo shows through below it */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgb(22 80 215 / 0.92) 0%, rgb(22 80 215 / 0.88) 80%, rgb(22 80 215 / 0.2) 100%)" }}
      />
      {ILLUSTRATION && (
        <span className="absolute right-4 bottom-4 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white">ภาพประกอบ</span>
      )}
    </>
  );
}

export function Hero() {
  const heroPhoto = photo("hero");
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });
  return (
    <section
      id="top"
      className="on-blue relative flex min-h-svh items-center overflow-hidden bg-linear-to-b from-brand to-[#2f60dd] px-5 pt-28 pb-20 md:pt-32"
    >
      {heroPhoto && <HeroPhoto src={heroPhoto} />}
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
        <motion.h1 className="text-[34px] leading-[1.3] font-bold text-white md:text-6xl md:leading-[1.25]" {...rise(0.2)}>
          สต็อก การจอง และบิล
          <br />
          <span className="text-accent">จบในข้อมูลชุดเดียว</span>
        </motion.h1>
        <motion.div className="mt-6 flex flex-col items-center" {...rise(0.4)}>
          <p className="max-w-[640px] text-[17px] leading-relaxed text-white md:text-xl">
            จัดการสินค้าแยกตามรุ่น สี และไซซ์ ตรวจจำนวนที่พร้อมขาย บันทึกการจอง และออกบิลจากข้อมูลชุดเดียวกัน
            สำหรับร้านค้าส่งชุดชั้นในและเสื้อผ้าขนาดเล็ก
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button href={APP_URL} kind="white" size="lg" arrow>{PRIMARY}</Button>
            <Button href={LINE_URL} kind="outline-light" size="lg" icon={ICONS.message}>{LINE_CTA}</Button>
          </div>
          <p className="mt-5 text-[15px] text-white">เริ่มด้วยแพ็กเกจ Free 0 บาท · สินค้า 20 รหัส · 50 บิลต่อเดือน</p>
        </motion.div>
      </div>
    </section>
  );
}
