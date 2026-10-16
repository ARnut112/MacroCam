"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container standard-page empty-state">
      <h1>ร้านกำลังเชื่อมต่อข้อมูลค่ะ</h1>
      <p>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      <button className="button button-dark" onClick={reset}>
        ลองอีกครั้ง
      </button>
    </div>
  );
}
