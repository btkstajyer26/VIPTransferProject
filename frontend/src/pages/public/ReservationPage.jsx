import { useTranslation } from "react-i18next";

function ReservationPage() {
  const { t } = useTranslation();
  return <h1>{t("reservationSystem.title")}</h1>;
}

export default ReservationPage;