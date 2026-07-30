import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Eski link tabanlı doğrulama sayfası — artık kullanılmıyor.
// Backend OTP (6 haneli kod) sistemine geçti.
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);
  return null;
}
