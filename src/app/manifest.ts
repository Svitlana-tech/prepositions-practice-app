import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Preposition Master",
    // The label under the home-screen icon — short enough not to be cut off on iPhone,
    // and it spells out the three cards on the icon.
    short_name: "In·On·At",
    description: "Master English prepositions in 2 minutes a day.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android crops "maskable" icons to its own shape; this copy keeps the cards inside
      // the safe middle of the square.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
