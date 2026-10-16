import { Breadcrumb } from "@/components/shell";
import { getSettings } from "@/lib/site";
export const metadata = { title: "การจัดส่ง การคืนสินค้า และข้อมูลส่วนบุคคล" };
export default async function Page() {
  const settings = await getSettings();
  return (
    <div className="container standard-page narrow-page">
      <Breadcrumb items={[{ label: "เงื่อนไขและนโยบายร้าน" }]} />
      <div className="page-title">
        <span className="section-eyebrow">CLEAR BEFORE YOU BUY</span>
        <h1>เงื่อนไขและนโยบายของร้าน</h1>
        <p>อ่านข้อมูลก่อนตัดสินใจ เพื่อให้ซื้อขายกันได้อย่างสบายใจค่ะ</p>
      </div>
      {[
        { id: "shipping", title: "การจัดส่ง", value: settings.shippingPolicy },
        { id: "returns", title: "การคืนสินค้า", value: settings.returnPolicy },
        { id: "warranty", title: "การรับประกัน", value: settings.warrantyPolicy },
        { id: "privacy", title: "ข้อมูลส่วนบุคคล", value: settings.privacyPolicy },
      ].map((p) => (
        <section key={p.id} id={p.id} className="policy-section form-panel">
          <h2>{p.title}</h2>
          {p.value ? (
            <p className="policy-text">{p.value}</p>
          ) : (
            <div className="inline-notice">
              รอเจ้าของร้านกำหนดและยืนยันข้อมูล{p.title} ก่อนเปิดขายจริง
              ข้อความนี้เป็นสถานะระหว่างพัฒนา ไม่ใช่นโยบายของร้านค่ะ
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
