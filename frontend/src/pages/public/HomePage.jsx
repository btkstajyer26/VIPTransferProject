import BenefitsSection from "../../components/public/BenefitsSection";
import CustomerSummary from "../../components/public/CustomerSummary";
import HeroSection from "../../components/public/HeroSection";
import HowItWorks from "../../components/public/HowItWorks";
import VehicleShowcase from "../../components/public/VehicleShowcase";
import TravelDiscoverySections, {
  CampaignSlider,
} from "../../components/public/TravelDiscoverySections";

function HomePage() {
  return (
    <>
      <HeroSection />
      <CampaignSlider />
      <BenefitsSection />
      <VehicleShowcase />
      <HowItWorks />
      <CustomerSummary />
      <TravelDiscoverySections />
    </>
  );
}

export default HomePage;
