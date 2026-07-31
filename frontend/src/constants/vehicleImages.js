const commons = (fileName) =>
  `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=1400`;

const vehicleImageRules = [
  {
    match: ["toyota", "corolla"],
    image: commons("2024 Toyota Corolla LE.jpg"),
  },
  {
    match: ["renault", "clio"],
    image: commons("Renault Clio V (2023) 1X7A1577.jpg"),
  },
  {
    match: ["mercedes", "c 200"],
    image: commons("Mercedes-Benz C-Klasse (W206) C 200 (2022) (53327170733).jpg"),
  },
  {
    match: ["mercedes", "e"],
    image:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1400&q=88",
  },
  {
    match: ["mercedes", "s"],
    image:
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1400&q=88",
  },
  {
    match: ["bmw", "7"],
    image:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=88",
  },
  {
    match: ["volkswagen", "caravelle"],
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=88",
  },
  {
    match: ["mercedes", "sprinter"],
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=88",
  },
  {
    match: ["toyota", "rav4"],
    image:
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1400&q=88",
  },
];

export function getVehicleImage(vehicle = {}) {
  if (vehicle.photoUrl) {
    return vehicle.photoUrl;
  }

  const searchable = `${vehicle.brand || ""} ${vehicle.model || ""}`.toLowerCase();
  const rule = vehicleImageRules.find(({ match }) =>
    match.every((term) => searchable.includes(term)),
  );

  return (
    rule?.image ||
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=88"
  );
}

