import { useState } from "react";
import { Check } from "lucide-react";
import { STORE_TYPES } from "../content";
import { Reveal } from "../motion";
import { ILLUSTRATION, PHOTO_ALT, photo } from "../photos";
import { Phone } from "../ui";

type StoreType = (typeof STORE_TYPES)[number];

/** Card face: the slot's photo as it is, or (until photos exist) brand blue with the matching app screen. */
function Face({ type, open }: { type: StoreType; open: boolean }) {
  const src = photo(type.slot);
  return src ? (
    <img src={src} alt={PHOTO_ALT[type.slot]} className="absolute inset-0 size-full object-cover" loading="lazy" />
  ) : (
    <>
      <div aria-hidden className="absolute inset-0 bg-brand" />
      <div
        aria-hidden
        className={`absolute -right-6 bottom-[-120px] transition-[opacity,transform] duration-500 ease-out-quint ${open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-40"}`}
      >
        <Phone screen={type.screen} height={520} />
      </div>
    </>
  );
}

/**
 * Wongnai's "เลือกรูปแบบร้าน": one card open at a time, the rest folded to a strip.
 * Desktop opens on hover, focus or click. The open card takes more `flex`, with no width animation.
 * Captions are glass cards inset 12px from the photo edge, so the photo stays clean.
 */
export function StoreTypes() {
  const [active, setActive] = useState(0);
  return (
    <section id="shops" className="wash-shops px-5 py-16 md:py-24">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="max-w-[720px]">
          <h2 className="text-[28px] leading-[1.35] font-semibold text-ink md:text-[44px] md:leading-[1.3]">
            ร้านแบบไหน ก็เริ่มได้
            <br />
            จากมือถือเครื่องเดียว
          </h2>
          <p className="mt-4 leading-relaxed text-muted md:text-lg">เลือกแบบที่ใกล้กับร้านคุณ แล้วดูว่า khonnai ช่วยตรงไหน</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex flex-col gap-3 md:mt-12 xl:h-[520px] xl:flex-row">
          {STORE_TYPES.map((t, i) => {
            const open = i === active;
            return (
              <div
                key={t.slot}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                className={`relative overflow-hidden rounded-3xl bg-brand xl:h-auto ${open ? "h-[380px] xl:flex-[3.2]" : "h-[116px] xl:flex-1"}`}
              >
                <Face type={t} open={open} />
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-expanded={open}
                  className="absolute inset-0 z-10 rounded-3xl outline-offset-[-4px] focus-visible:shadow-[inset_0_0_0_2px_#fff] focus-visible:outline-2 focus-visible:outline-brand"
                  aria-label={t.title}
                />
                <div data-glass className="glass-caption pointer-events-none absolute inset-x-3 bottom-3 z-20 p-3 text-ink xl:p-4">
                  <h3 className={`leading-snug font-semibold ${open ? "text-2xl xl:text-[28px]" : "text-lg"}`}>{t.title}</h3>
                  {/* one card's points visible at a time, on phones too (Wongnai shows only the open card's bullets) */}
                  {open && (
                    <>
                      <p className="mt-2 text-lg">{t.lead}</p>
                      <ul className="mt-3 space-y-2">
                        {t.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2.5 text-base">
                            <Check aria-hidden className="size-5 shrink-0 text-brand" /> {b}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                {ILLUSTRATION && photo(t.slot) && (
                  <span data-glass className="glass-caption absolute top-3 right-3 z-20 rounded-lg px-2.5 py-1 text-sm text-ink">ภาพประกอบ</span>
                )}
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
