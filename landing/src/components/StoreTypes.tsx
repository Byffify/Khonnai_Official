import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { STORE_TYPES } from "../content";
import { OUT_QUINT, Reveal } from "../motion";
import { ILLUSTRATION, PHOTO_ALT, photo } from "../photos";
import { Phone } from "../ui";

type StoreType = (typeof STORE_TYPES)[number];

/** Card face: the slot's photo under a dark scrim, or (until photos exist) brand blue with the matching app screen. */
function Face({ type, open }: { type: StoreType; open: boolean }) {
  const src = photo(type.slot);
  return src ? (
    <>
      <img src={src} alt={PHOTO_ALT[type.slot]} className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/10" />
    </>
  ) : (
    <>
      <div aria-hidden className="absolute inset-0 bg-linear-160 from-brand to-brand-dark" />
      <div
        aria-hidden
        className={`absolute -right-6 bottom-[-120px] transition-[opacity,transform] duration-700 ${open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-40"}`}
      >
        <Phone screen={type.screen} height={520} />
      </div>
      <div aria-hidden className="absolute inset-0 bg-linear-to-r from-brand-dark/95 via-brand-dark/60 to-transparent" />
    </>
  );
}

/**
 * Wongnai's "เลือกรูปแบบร้าน": one card open at a time, the rest folded to a strip.
 * Desktop opens on hover, focus or click; the open card widens in 600ms outQuint.
 */
export function StoreTypes() {
  const [active, setActive] = useState(0);
  return (
    <section id="shops" className="px-5 pt-12 pb-4 md:pt-20">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="max-w-[720px]">
          <h2 className="text-[28px] leading-[1.35] font-semibold md:text-[44px] md:leading-[1.3]">
            ร้านแบบไหน ก็เริ่มได้
            <br />
            จาก<span className="text-gradient-brand">มือถือเครื่องเดียว</span>
          </h2>
          <p className="mt-4 leading-relaxed text-muted md:text-lg">เลือกแบบที่ใกล้กับร้านคุณ แล้วดูว่า khonnai ช่วยตรงไหน</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex flex-col gap-3 md:mt-12 md:h-[520px] md:flex-row">
          {STORE_TYPES.map((t, i) => {
            const open = i === active;
            return (
              <motion.div
                key={t.slot}
                layout
                transition={{ layout: { duration: 0.6, ease: OUT_QUINT } }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                className={`group relative overflow-hidden rounded-3xl text-white md:h-auto ${open ? "h-[380px] md:flex-[3.2]" : "h-[92px] md:flex-1"}`}
              >
                <Face type={t} open={open} />
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-expanded={open}
                  className="absolute inset-0 z-10 rounded-3xl"
                  aria-label={t.title}
                />
                <div className="relative z-20 flex h-full flex-col justify-end p-6 md:p-7 pointer-events-none">
                  <h3 className={`leading-snug font-semibold transition-[font-size] duration-500 ${open ? "text-2xl md:text-[28px]" : "text-lg"}`}>{t.title}</h3>
                  {/* one card's points visible at a time, on phones too (Wongnai shows only the open card's bullets) */}
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <p className="mt-2 text-lg text-white/90">{t.lead}</p>
                      <ul className="mt-4 space-y-2">
                        {t.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2.5 text-base md:text-base">
                            <Check aria-hidden className="size-5 shrink-0 text-accent" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                {ILLUSTRATION && photo(t.slot) && (
                  <span className="absolute top-4 right-4 z-20 rounded-full bg-black/35 px-2.5 py-1 text-sm text-white/90">ภาพประกอบ</span>
                )}
              </motion.div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
