import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Headline } from "@/components/ui/Headline";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

export function BehindTheCamera() {
  const t = useTranslations("home.behind");
  const c = useTranslations("cta");
  return (
    <section className="gutter py-16 lg:py-30 flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
      {/* Mobile: photo first. Desktop: copy left, collage right */}
      <Reveal className="lg:hidden">
        <Photo seed="behind-main" sizes="100vw" className="h-[380px]" />
      </Reveal>

      <Reveal className="flex flex-col gap-5 lg:gap-6 lg:flex-1 lg:pb-30">
        <p className="eyebrow">{t("eyebrow")}</p>
        <Headline line1={t("line1")} line2={t("line2")} />
        <p className="t-lead text-mute max-w-[480px]">{t("body")}</p>
        <Link href="/about" className="text-[15px] font-medium hover:text-mute transition-colors">
          {c("about")} &nbsp;→
        </Link>
      </Reveal>

      <Reveal delay={120} className="hidden lg:flex items-end gap-4">
        <div className="flex flex-col items-end gap-4">
          <Photo seed="behind-a" sizes="150px" className="w-[150px] h-[190px]" />
          <Photo seed="behind-b" sizes="190px" className="w-[190px] h-[150px]" />
        </div>
        <Photo seed="behind-main" sizes="440px" className="w-[440px] h-[560px]" />
      </Reveal>
    </section>
  );
}
