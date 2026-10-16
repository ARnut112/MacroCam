"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Loader2 } from "lucide-react";
import { useStore } from "./store-provider";
import { Breadcrumb, EmptyState } from "./shell";
import { money } from "@/lib/format";

export function CheckoutSteps({ step }: { step: number }) {
  return (
    <div className="checkout-steps">
      {["ข้อมูลจัดส่ง", "ชำระเงิน", "รอตรวจสอบ"].map((label, i) => (
        <div key={label} className={i + 1 <= step ? "current" : ""}>
          <b>{i + 1 < step ? <Check size={14} /> : i + 1}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export function Checkout() {
  const { cart, products, isDemo, checkoutEnabled, ready, createOrder } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ recipient: "", phone: "", address: "", note: "" });
  const items = cart.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const order = await createOrder(form);
      router.replace(`/payment?order=${order.orderNumber}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกคำสั่งซื้อไม่สำเร็จ");
      setBusy(false);
    }
  };
  return (
    <div className="container standard-page">
      <Breadcrumb items={[{ label: "ตะกร้าสินค้า", href: "/cart" }, { label: "ข้อมูลจัดส่ง" }]} />
      <div className="page-title">
        <span className="section-eyebrow">ALMOST YOURS</span>
        <h1>ส่งอุปกรณ์ไปหาคุณ</h1>
        <p>กรอกข้อมูลที่จำเป็นสำหรับจัดส่งเท่านั้น</p>
      </div>
      <CheckoutSteps step={1} />
      {!ready ? (
        <p className="page-loading">กำลังตรวจตะกร้า…</p>
      ) : !items.length ? (
        <EmptyState
          icon="bag"
          title="ยังไม่มีสินค้าในตะกร้า"
          detail="เลือกอุปกรณ์ก่อน แล้วค่อยกลับมากรอกข้อมูลจัดส่งค่ะ"
        />
      ) : (
        <form className="checkout-layout" onSubmit={submit}>
          <section className="form-panel">
            <h2>ข้อมูลผู้รับสินค้า</h2>
            {isDemo && (
              <div className="inline-notice">
                กำลังทดสอบระบบ ใช้ชื่อ ที่อยู่ และเบอร์โทรสมมติได้ค่ะ{" "}
                <button
                  type="button"
                  className="inline-fill"
                  onClick={() =>
                    setForm({
                      recipient: "นัท ทดสอบระบบ",
                      phone: "0812345678",
                      address: "99 ถนนตัวอย่าง แขวงทดสอบ เขตทดสอบ กรุงเทพฯ 10100",
                      note: "คำสั่งซื้อจำลอง ไม่ต้องจัดส่งจริง",
                    })
                  }
                >
                  กรอกข้อมูลตัวอย่าง
                </button>
              </div>
            )}
            <div className="form-row">
              <label>
                ชื่อ–นามสกุลผู้รับ <span>*</span>
                <input
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  placeholder="ชื่อผู้รับสินค้า"
                />
              </label>
              <label>
                เบอร์โทรศัพท์ <span>*</span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  maxLength={15}
                  autoComplete="tel"
                  pattern="0[0-9\- ]{8,13}"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08X XXX XXXX"
                />
                <small>ใช้คู่กับเลขคำสั่งซื้อเพื่อติดตามสินค้า</small>
              </label>
            </div>
            <label>
              ที่อยู่จัดส่ง <span>*</span>
              <textarea
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด และรหัสไปรษณีย์"
              />
            </label>
            <label>
              หมายเหตุ <small>(ถ้ามี)</small>
              <textarea
                rows={2}
                maxLength={500}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="ข้อมูลเพิ่มเติมสำหรับร้านหรือการจัดส่ง"
              />
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={accepted}
                required
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                ตรวจสอบรายการและข้อมูลจัดส่งแล้ว และอ่าน{" "}
                <Link href="/policies?section=privacy" target="_blank">
                  นโยบายข้อมูลส่วนบุคคล
                </Link>
                {isDemo && " (ฉบับรอร้านกำหนดสำหรับการทดสอบ)"}
              </span>
            </label>
            <p className="small muted">
              <LockKeyhole size={14} /> ใช้ข้อมูลเพื่อดำเนินคำสั่งซื้อและจัดส่งสินค้า
            </p>
            <Link href="/cart" className="small-link">
              <ArrowLeft size={15} /> กลับไปตรวจตะกร้า
            </Link>
          </section>
          <aside className="order-summary">
            <h2>อุปกรณ์ของคุณ</h2>
            <div className="mini-items">
              {items.map(({ product, quantity }) => (
                <div key={product.id}>
                  <img src={product.images[0]} alt="" width={65} height={55} />
                  <span>
                    {product.name}
                    <small>จำนวน {quantity} ชิ้น</small>
                  </span>
                  <strong>฿{money(product.price * quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="summary-row">
              <span>ค่าจัดส่ง</span>
              <span className="green-text">รวมในราคาแล้ว</span>
            </div>
            <div className="summary-total">
              <span>ยอดรวม</span>
              <strong>฿{money(total)}</strong>
            </div>
            <p className="small muted">
              เมื่อบันทึกคำสั่งซื้อ ระบบจะเปิดหน้าชำระเงินให้ทันที จองสินค้าไว้ 1 ชั่วโมง
            </p>
            {!checkoutEnabled && (
              <div className="inline-notice">
                ร้านยังเตรียมข้อมูลการชำระเงินและนโยบายไม่ครบ จึงยังไม่เปิดรับคำสั่งซื้อจริงค่ะ
              </div>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <button
              className="button button-red full-width"
              type="submit"
              disabled={busy || !accepted || !checkoutEnabled}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="spin" /> กำลังบันทึก…
                </>
              ) : (
                <>
                  บันทึกคำสั่งซื้อ <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className="small muted centered">
              {isDemo ? "สร้างคำสั่งซื้อจำลองเท่านั้น" : "ร้านตรวจสลิปและยืนยันยอดด้วยตนเอง"}
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}
