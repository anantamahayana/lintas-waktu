import { VerifyView } from "@/components/invoice/VerifyView";

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ c?: string }> }) {
  const { number } = await params;
  const { c } = await searchParams;
  return <VerifyView number={decodeURIComponent(number)} code={c ?? ""} />;
}
