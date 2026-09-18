import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { SelectedWork } from "@/components/home/SelectedWork";
import { Services } from "@/components/home/Services";
import { BehindTheCamera } from "@/components/home/BehindTheCamera";
import { Process } from "@/components/home/Process";
import { Testimonial } from "@/components/home/Testimonial";
import { Packages } from "@/components/home/Packages";
import { ClosingCta } from "@/components/home/ClosingCta";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <SelectedWork />
      <Services />
      <BehindTheCamera />
      <Process />
      <Testimonial />
      <Packages />
      <ClosingCta />
    </>
  );
}
