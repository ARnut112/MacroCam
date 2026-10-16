import Link from "next/link";
import { ArrowRight, ClipboardCheck, Package, QrCode, ShoppingBag } from "lucide-react";
import { Breadcrumb } from "@/components/shell";
export const metadata = { title: "วิธีสั่งซื้อและชำระเงิน" };
export default function Page() {
  return (
    <div className="container standard-page narrow-page">
      <Breadcrumb items={[{ label: "วิธีสั่งซื้อ" }]} />
      <div className="page-title">
        <span className="section-eyebrow">A SIMPLE START</span>
        <h1>อุปกรณ์ชิ้นใหม่ ในไม่กี่ขั้นตอน</h1>
        <p>ซื้อได้โดยไม่ต้องสมัครสมาชิก ร้านตรวจยอดและจัดส่งด้วยตนเองค่ะ</p>
      </div>
      <div className="guide-steps">
        {[
          {
            Icon: ShoppingBag,
            title: "เลือกอุปกรณ์ที่ชอบ",
            text: "ดูรูป สภาพ ตำหนิ อุปกรณ์ในชุด และเงื่อนไขประกันของสินค้าชิ้นนั้น แล้วเพิ่มลงตะกร้า ราคาทุกชิ้นรวมค่าจัดส่งแล้ว",
          },
          {
            Icon: ClipboardCheck,
            title: "กรอกข้อมูลจัดส่งและบันทึกคำสั่งซื้อ",
            text: "ตรวจชื่อ เบอร์โทร ที่อยู่ และรายการให้ครบ ระบบจะออกเลขคำสั่งซื้อและจองสินค้าไว้ 1 ชั่วโมง เก็บเลขนี้ไว้ใช้ติดตามด้วยนะคะ",
          },
          {
            Icon: QrCode,
            title: "สแกน QR กรอกยอด และแนบสลิป",
            text: "หน้าชำระเงินจะแสดง QR ของร้านและยอดที่ต้องกรอกเอง ตรวจชื่อผู้รับก่อนโอน แล้วกลับมาแนบรูปสลิป JPG, PNG หรือ WebP ไม่เกิน 4 MB ภายใน 1 ชั่วโมง",
          },
          {
            Icon: Package,
            title: "รอร้านตรวจยอด แล้วติดตามการจัดส่ง",
            text: "ได้รับสลิปแล้วจะขึ้นสถานะรอตรวจสอบ การชำระเงินสมบูรณ์เมื่อร้านยืนยันเท่านั้น ติดตามด้วยเลขคำสั่งซื้อคู่กับเบอร์โทร และยืนยันรับสินค้าได้หลังร้านจัดส่ง",
          },
        ].map(({ Icon, title, text }, i) => (
          <article key={title}>
            <div className="guide-step-icon">
              <Icon size={26} />
              <span>0{i + 1}</span>
            </div>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="inline-notice">
        หากปิดหน้าเว็บหรือไปแอปธนาคาร ใช้เลขคำสั่งซื้อและเบอร์โทรกลับมาทำรายการเดิมต่อได้
        ไม่ต้องสั่งใหม่ค่ะ รายการที่ยังไม่ส่งสลิปจะหมดอายุใน 1 ชั่วโมง
      </div>
      <Link className="button button-red" href="/products">
        เลือกอุปกรณ์ของคุณ <ArrowRight size={17} />
      </Link>
    </div>
  );
}
