import { ImageResponse } from "next/og";

export const alt = "알잘딱 — 공시, 알아서 잘 딱 깔끔하게";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0a1e 0%, #1a1035 40%, #0d1a2d 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "200px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-50px",
            right: "150px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            marginBottom: "32px",
            boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
          }}
        >
          <span style={{ fontSize: "36px", fontWeight: 900, color: "#fff" }}>A</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "56px",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            알잘딱
          </span>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 500,
              background: "linear-gradient(90deg, #c4b5fd, #93c5fd)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            공시, 알아서 잘 딱 깔끔하게
          </span>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "40px",
          }}
        >
          {["AI 공시 분석", "호재/악재 판별", "관심종목 추적", "텔레그램 알림"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderRadius: "100px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            background: "linear-gradient(90deg, #7c3aed, #6366f1, #3b82f6, #7c3aed)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
