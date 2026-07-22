import BenefitsSection from "../../components/public/BenefitsSection";
import CustomerSummary from "../../components/public/CustomerSummary";
import HeroSection from "../../components/public/HeroSection";
import HowItWorks from "../../components/public/HowItWorks";
import VehicleShowcase from "../../components/public/VehicleShowcase";

function HomePage() {
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <VehicleShowcase />
      <HowItWorks />
      <CustomerSummary />
    </>
  );
}

export default HomePage;