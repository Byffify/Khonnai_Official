import { MotionConfig } from "motion/react";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { Closing, Faq, Features, Footer, Pricing, StickyBar } from "./components/Sections";
import { StoreTypes } from "./components/StoreTypes";
import { useSmoothScroll } from "./motion";

// Layout follows design/khonnai-landing.figcraft (Landing v2), plus the shop-type section; the bento and the
// "ขั้นตอนสั้น" list are merged into one feature list in the list layout.
export default function App() {
  useSmoothScroll();
  return (
    // reducedMotion="user": reveals and drifts become instant when the OS asks for less motion
    <MotionConfig reducedMotion="user">
      <a href="#features" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        ข้ามไปที่เนื้อหา
      </a>
      <Nav />
      <main>
        <Hero />
        <StoreTypes />
        <Features />
        <Pricing />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <StickyBar />
    </MotionConfig>
  );
}
