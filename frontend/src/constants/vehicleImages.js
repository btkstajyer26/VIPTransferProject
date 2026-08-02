import ekoVan from "@/assets/vehicles/eko-van.webp";
import businessVan from "@/assets/vehicles/business-van.webp";
import premiumVan from "@/assets/vehicles/premium-van.webp";
import premiumMinibus from "@/assets/vehicles/premium-minibus.webp";

const vehicleImageRules = [
  { match: ["sprinter"], image: premiumMinibus },
  { match: ["v-class"], image: premiumVan },
  { match: ["v class"], image: premiumVan },
  { match: ["vito"], image: businessVan },
  { match: ["custom"], image: businessVan },
  { match: ["traveller"], image: businessVan },
  { match: ["caravelle"], image: ekoVan },
  { match: ["jumpy"], image: ekoVan },
  { match: ["expert"], image: ekoVan },
  { match: ["zafira"], image: ekoVan },
];

export function isVipFleetVehicle(vehicle = {}) {
  const searchable = `${vehicle.brand || ""} ${vehicle.model || ""}`.toLowerCase();
  return [
    "caravelle", "jumpy", "expert", "zafira", "custom",
    "traveller", "vito", "v-class", "v class", "sprinter",
  ].some((term) => searchable.includes(term));
}

export function getVehicleImage(vehicle = {}) {
  if (vehicle.photoUrl) return vehicle.photoUrl;

  const searchable = `${vehicle.brand || ""} ${vehicle.model || ""}`.toLowerCase();
  return (
    vehicleImageRules.find(({ match }) =>
      match.some((term) => searchable.includes(term)),
    )?.image || premiumVan
  );
}
