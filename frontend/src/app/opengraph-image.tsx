import { ImageResponse } from "next/og";

export const alt = "공시딱 | AI 공시 요약과 배당 기준일";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const featurePills = ["AI 공시 요약", "배당 기준일", "관심종목", "재무 흐름"];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #1f140d 0%, #2c1a0f 42%, #4a2d1a 100%)",
          color: "#fff7ef",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0",
            display: "flex",
            background:
              "radial-gradient(circle at 18% 18%, rgba(244, 191, 117, 0.22) 0%, transparent 34%), radial-gradient(circle at 86% 20%, rgba(251, 191, 36, 0.12) 0%, transparent 28%), radial-gradient(circle at 76% 84%, rgba(217, 119, 6, 0.16) 0%, transparent 32%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "48px",
            right: "56px",
            display: "flex",
            width: "220px",
            height: "220px",
            borderRadius: "40px",
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
            transform: "rotate(12deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-28px",
            right: "188px",
            display: "flex",
            width: "160px",
            height: "160px",
            borderRadius: "999px",
            background: "rgba(245, 158, 11, 0.16)",
            filter: "blur(8px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 60px 52px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                boxShadow: "0 14px 32px rgba(234, 88, 12, 0.28)",
                color: "#fffaf3",
                fontSize: "34px",
                fontWeight: 900,
              }}
            >
              딱
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "rgba(255,247,239,0.96)",
                }}
              >
                공시딱
              </span>
              <span
                style={{
                  display: "flex",
                  fontSize: "16px",
                  color: "rgba(255,240,224,0.72)",
                }}
              >
                DART 기반 한국 주식 공시·배당 서비스
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxWidth: "760px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "fit-content",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
                padding: "10px 18px",
                fontSize: "16px",
                fontWeight: 700,
                color: "#fde6cd",
              }}
            >
              AI 공시 요약과 배당 기준일
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "62px",
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: "-0.04em",
                color: "#fffaf5",
              }}
            >
              중요한 공시만 빠르게 보고
              <br />
              배당 일정까지 한눈에 확인
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: "760px",
                fontSize: "24px",
                lineHeight: 1.45,
                color: "rgba(255,241,229,0.78)",
              }}
            >
              종목별 공시 흐름, 최근 배당 기준일 이력, 관심종목 대시보드를
              하나의 화면에서 정리합니다.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                maxWidth: "840px",
              }}
            >
              {featurePills.map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.08)",
                    padding: "10px 18px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "rgba(255,247,239,0.92)",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "178px",
                height: "58px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                color: "#fffaf3",
                fontSize: "20px",
                fontWeight: 800,
                boxShadow: "0 18px 36px rgba(234, 88, 12, 0.22)",
              }}
            >
              gongsittak.com
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
