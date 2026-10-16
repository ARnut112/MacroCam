"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Package,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { dateTime, money, statusLabels } from "@/lib/format";
import { useStore } from "./store-provider";
import { Breadcrumb } from "./shell";
import { CheckoutSteps } from "./checkout";

export function Payment() {
  const searchParams = useSearchParams();
  const { ready, resumeOrder, settings, uploadSlip, isDemo, notify } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const number = searchParams.get("order") || "";
  useEffect(() => {
    if (!ready) return;
    let live = true;
    resumeOrder(number).then((o) => {
      if (live) {
        setOrder(o);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [ready, number]);
  const sendSlip = async () => {
    if (!file || !order || busy) return;
    setBusy(true);
    setError("");
    try {
      setOrder(await uploadSlip(order, file));
      setFile(null);
      notify("ได้รับสลิปแล้ว รอร้านตรวจสอบค่ะ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "แนบสลิปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      notify("คัดลอกเลขคำสั่งซื้อแล้ว");
    } catch {
      notify("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกเลขคำสั่งซื้อแล้วคัดลอกค่ะ");
    }
  };
  return (
    <div className="container standard-page narrow-page">
      <Breadcrumb items={[{ label: "ชำระเงิน" }]} />
      <div className="page-title centered">
        <span className="section-eyebrow">YOUR GEAR IS RESERVED</span>
        <h1>
          {order?.status === "slip_submitted"
            ? "ได้รับสลิปเรียบร้อยแล้ว"
            : "อีกนิด ก็พร้อมออกไปถ่ายภาพ"}
        </h1>
        <p>เก็บเลขคำสั่งซื้อไว้ กลับมาทำรายการต่อได้เสมอ</p>
      </div>
      <CheckoutSteps step={order?.status === "slip_submitted" ? 3 : 2} />
      {loading ? (
        <p className="page-loading">กำลังเปิดคำสั่งซื้อ…</p>
      ) : !order ? (
        <div className="form-panel centered">
          <Package size={42} />
          <h2>เปิดคำสั่งซื้อด้วยข้อมูลของคุณ</h2>
          <p className="muted">เพื่อความเป็นส่วนตัว กรุณาใช้เลขคำสั่งซื้อคู่กับเบอร์โทรศัพท์ค่ะ</p>
          <Link href={`/track?order=${encodeURIComponent(number)}`} className="button button-dark">
            ไปติดตามคำสั่งซื้อ
          </Link>
        </div>
      ) : (
        <div className="payment-layout">
          <section className="form-panel payment-panel">
            <div className="payment-order-number">
              <span>เลขคำสั่งซื้อ</span>
              <strong>{order.orderNumber}</strong>
              <button className="icon-button" aria-label="คัดลอกเลขคำสั่งซื้อ" onClick={copy}>
                <Copy size={17} />
              </button>
            </div>
            {isDemo && (
              <div className="inline-notice centered">
                คำสั่งซื้อจำลอง — ไม่ต้องโอนเงินจริง และใช้รูปทดสอบแทนสลิปได้
              </div>
            )}
            {order.status === "awaiting_payment" ? (
              <>
                <div className="payment-total">
                  <span>ยอดที่ต้องชำระ</span>
                  <strong>฿{money(order.total)}</strong>
                  <small>รวมค่าจัดส่งแล้ว</small>
                </div>
                <div className="qr-box">
                  {settings.paymentQrUrl && !isDemo ? (
                    <img
                      src={settings.paymentQrUrl}
                      alt="QR รับเงินของร้าน MacroCam ตรวจชื่อผู้รับก่อนโอน"
                      width={240}
                      height={240}
                    />
                  ) : (
                    <div className="qr-placeholder">
                      <QrCode size={90} strokeWidth={1.1} />
                      <strong>พื้นที่ QR ของร้าน</strong>
                      <span>ยังไม่มี QR รับเงินจริง</span>
                    </div>
                  )}
                </div>
                <p className="centered small">
                  {settings.paymentAccount || "บัญชีรับเงิน: รอร้านกำหนด"}
                </p>
                <div className="payment-instructions">
                  <p>
                    <span>1</span>สแกน QR แล้วกรอกยอด <strong>฿{money(order.total)}</strong>{" "}
                    ด้วยตนเอง
                  </p>
                  <p>
                    <span>2</span>ตรวจชื่อผู้รับและยอดเงินก่อนยืนยันโอน
                  </p>
                  <p>
                    <span>3</span>กลับมาหน้านี้ เพื่อแนบรูปสลิปด้านล่าง
                  </p>
                </div>
                <p className="payment-deadline">
                  <Clock3 size={16} /> ส่งสลิปก่อน {dateTime(order.expiresAt)}
                </p>
              </>
            ) : (
              <div
                className={`payment-success ${order.status === "slip_submitted" ? "" : "other-status"}`}
              >
                <CheckCircle2 size={54} />
                <h2>{statusLabels[order.status]}</h2>
                <p>
                  {order.status === "slip_submitted"
                    ? "ร้านจะตรวจสลิปด้วยตนเอง การแนบสลิปยังไม่ถือว่าชำระสำเร็จจนกว่าร้านจะยืนยันค่ะ"
                    : "ติดตามความคืบหน้าของคำสั่งซื้อได้ที่หน้าติดตามค่ะ"}
                </p>
              </div>
            )}
            {order.status === "awaiting_payment" && (
              <div className="slip-upload">
                <h3>โอนแล้ว แนบสลิปที่นี่</h3>
                <label className="upload-zone">
                  <UploadCloud size={26} />
                  <strong>{file ? file.name : "เลือกรูปสลิปการโอนเงิน"}</strong>
                  <span>JPG, PNG หรือ WebP ขนาดไม่เกิน 4 MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      setError("");
                      const f = e.target.files?.[0];
                      if (
                        f &&
                        (!["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
                          f.size > 4194304)
                      ) {
                        setError("กรุณาใช้รูป JPG, PNG หรือ WebP ไม่เกิน 4 MB ค่ะ");
                        setFile(null);
                      } else setFile(f || null);
                    }}
                  />
                </label>
                {error && (
                  <div className="error-box" role="alert">
                    {error}
                  </div>
                )}
                <button
                  className="button button-red full-width"
                  disabled={!file || busy}
                  onClick={sendSlip}
                >
                  {busy ? (
                    <>
                      <Loader2 className="spin" size={17} /> กำลังส่งสลิป…
                    </>
                  ) : (
                    <>
                      <Check size={18} /> ส่งสลิปให้ร้านตรวจสอบ
                    </>
                  )}
                </button>
                <p className="small muted centered">
                  <ShieldCheck size={14} /> สลิปจริงจะเก็บในพื้นที่ส่วนตัวของร้าน
                </p>
              </div>
            )}
            <Link
              href={`/track?order=${order.orderNumber}`}
              className="button button-outline full-width"
            >
              กลับไปติดตามคำสั่งซื้อ <Package size={17} />
            </Link>
          </section>
          <aside className="order-summary">
            <h2>รายการที่สั่งซื้อ</h2>
            <OrderItems order={order} />
            <div className="summary-total">
              <span>ยอดรวม</span>
              <strong>฿{money(order.total)}</strong>
            </div>
            <p className="small muted">
              จองสินค้า 1 ชั่วโมง หากยังไม่ส่งสลิป ระบบจะหมดอายุและคืนสต็อก
              รายการที่ส่งสลิปแล้วจะรอร้านตรวจสอบ
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

export function TrackOrder() {
  const searchParams = useSearchParams();
  const { lookupOrder, resumeOrder, completeOrder, lastOrderNumber, ready, isDemo, notify } =
    useStore();
  const [number, setNumber] = useState(searchParams.get("order") || "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!ready || !searchParams.get("order")) return;
    resumeOrder(searchParams.get("order")!).then(setOrder);
  }, [ready]);
  const search = async (e?: React.SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setOrder(await lookupOrder(number, phone));
    } catch (e) {
      setOrder(null);
      setError(e instanceof Error ? e.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (!order) return;
    setBusy(true);
    const refreshed = await resumeOrder(order.orderNumber);
    if (refreshed) setOrder(refreshed);
    else setError("กรุณากรอกเลขคำสั่งซื้อและเบอร์โทรเพื่อค้นหาอีกครั้งค่ะ");
    setBusy(false);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("คัดลอกแล้วค่ะ");
    } catch {
      notify("กรุณาเลือกข้อความแล้วคัดลอกค่ะ");
    }
  };
  return (
    <div className="container standard-page narrow-page">
      <Breadcrumb items={[{ label: "ติดตามคำสั่งซื้อ" }]} />
      <div className="page-title centered">
        <span className="section-eyebrow">FOLLOW YOUR NEXT STORY</span>
        <h1>อุปกรณ์ของคุณ ถึงขั้นตอนไหนแล้ว?</h1>
        <p>ใช้เลขคำสั่งซื้อคู่กับเบอร์โทรศัพท์ที่ระบุไว้ตอนสั่งซื้อ</p>
      </div>
      <form className="tracking-form form-panel" onSubmit={search}>
        <label>
          เลขคำสั่งซื้อ
          <input
            required
            maxLength={60}
            autoCapitalize="characters"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={isDemo ? "DEMO-XXXXXXXX" : "MC-XXXXXXXXXX"}
          />
        </label>
        <label>
          เบอร์โทรศัพท์
          <input
            required
            type="tel"
            maxLength={15}
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="เบอร์ที่ใช้สั่งซื้อ"
          />
        </label>
        <button className="button button-dark" disabled={busy}>
          {busy ? <Loader2 className="spin" size={17} /> : <Search size={18} />} ค้นหาคำสั่งซื้อ
        </button>
        {lastOrderNumber && !number && (
          <button
            className="small-link last-order-link"
            type="button"
            onClick={() => setNumber(lastOrderNumber)}
          >
            ใช้เลขคำสั่งซื้อล่าสุด: {lastOrderNumber}
          </button>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
      </form>
      {isDemo && (
        <p className="demo-caption">
          โหมดตัวอย่าง: ค้นหาได้เฉพาะคำสั่งซื้อจำลองที่สร้างในเบราว์เซอร์นี้
        </p>
      )}
      {order && (
        <section className="tracking-result form-panel">
          <div className="tracking-heading">
            <div>
              <span className="section-eyebrow">ORDER DETAILS</span>
              <h2>
                {order.orderNumber}
                <button
                  className="icon-button"
                  onClick={() => copy(order.orderNumber)}
                  aria-label="คัดลอกเลขคำสั่งซื้อ"
                >
                  <Copy size={16} />
                </button>
              </h2>
              <span className="small muted">สั่งซื้อเมื่อ {dateTime(order.createdAt)}</span>
            </div>
            <button
              className="button button-small button-outline"
              disabled={busy}
              onClick={refresh}
            >
              <RefreshCw size={14} className={busy ? "spin" : ""} /> รีเฟรช
            </button>
          </div>
          <div className={`order-status ${order.status}`}>
            <Package size={21} />
            <div>
              <strong>{statusLabels[order.status]}</strong>
              <span>
                {order.status === "awaiting_payment"
                  ? `แนบสลิปก่อน ${dateTime(order.expiresAt)}`
                  : order.status === "slip_submitted"
                    ? "ได้รับสลิปแล้ว กำลังรอร้านตรวจสอบยอด"
                    : order.status === "shipped"
                      ? "อุปกรณ์กำลังเดินทางไปหาคุณ"
                      : order.status === "completed"
                        ? "ขอบคุณที่ให้ MacroCam เป็นส่วนหนึ่งของเรื่องราวค่ะ"
                        : order.status === "expired"
                          ? "ยังไม่ได้รับสลิปภายใน 1 ชั่วโมง ระบบคืนสต็อกแล้ว"
                          : "ตรวจสอบข้อมูลล่าสุดได้จากหน้านี้"}
              </span>
            </div>
          </div>
          <OrderItems order={order} />
          <div className="summary-total">
            <span>ยอดรวม · รวมค่าจัดส่งแล้ว</span>
            <strong>฿{money(order.total)}</strong>
          </div>
          {order.shippingCompany && (
            <div className="tracking-shipment">
              <Truck size={23} />
              <div>
                <span>จัดส่งโดย {order.shippingCompany}</span>
                <strong>{order.trackingNumber || "รอร้านระบุเลขพัสดุ"}</strong>
              </div>
              {order.trackingNumber && (
                <button
                  className="button button-small button-outline"
                  onClick={() => copy(order.trackingNumber!)}
                >
                  <Copy size={14} /> คัดลอกเลขพัสดุ
                </button>
              )}
            </div>
          )}
          <div className="tracking-actions">
            {["awaiting_payment", "slip_submitted"].includes(order.status) && (
              <Link href={`/payment?order=${order.orderNumber}`} className="button button-red">
                {order.status === "awaiting_payment"
                  ? "ชำระเงิน / แนบสลิป"
                  : "ดูรายละเอียดการชำระเงิน"}
                <QrCode size={18} />
              </Link>
            )}
            {order.status === "shipped" && (
              <button className="button button-dark" onClick={() => setConfirm(true)}>
                <CheckCircle2 size={18} /> ได้รับสินค้าแล้ว
              </button>
            )}
          </div>
        </section>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-receipt"
            className="confirmation-modal"
          >
            <CheckCircle2 size={40} />
            <h2 id="confirm-receipt">ได้รับสินค้าครบถ้วนแล้วใช่ไหมคะ?</h2>
            <p>การยืนยันจะปิดคำสั่งซื้อ และยังเก็บรายการนี้ไว้เป็นประวัติค่ะ</p>
            <div>
              <button className="button button-outline" autoFocus onClick={() => setConfirm(false)}>
                ยังไม่ยืนยัน
              </button>
              <button
                className="button button-dark"
                disabled={busy}
                onClick={async () => {
                  if (!order) return;
                  setBusy(true);
                  try {
                    setOrder(await completeOrder(order));
                    setConfirm(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "ยืนยันไม่สำเร็จ");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                ยืนยันรับสินค้าแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function OrderItems({ order }: { order: Order }) {
  return (
    <div className="mini-items">
      {order.items.map((item) => (
        <div key={item.productId}>
          <img src={item.image} alt="" width={65} height={55} />
          <span>
            {item.name}
            <small>จำนวน {item.quantity} ชิ้น</small>
          </span>
          <strong>฿{money(item.price * item.quantity)}</strong>
        </div>
      ))}
    </div>
  );
}
