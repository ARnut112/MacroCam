import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog, isDemoMode } from "@/lib/site";
import { ProductDetail } from "@/components/product-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCatalog()).find((p) => p.slug === slug && p.published);
  if (!product) return { title: "ไม่พบสินค้า" };
  return {
    title: product.name,
    description: `${isDemoMode() ? "ข้อมูลตัวอย่าง: " : ""}${product.tagline} ราคา ${product.price.toLocaleString("th-TH")} บาท รวมค่าจัดส่งแล้ว`,
    openGraph: {
      title: `${product.name} | MacroCam`,
      images: product.images.map((url) => ({ url })),
    },
  };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await getCatalog()).find((p) => p.slug === slug && p.published);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
