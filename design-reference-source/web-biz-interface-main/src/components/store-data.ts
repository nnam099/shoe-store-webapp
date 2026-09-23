import courtSneaker from "@/assets/court-sneaker.jpg";
import runSneaker from "@/assets/run-sneaker.jpg";
import lifestyleSneaker from "@/assets/lifestyle-sneaker.jpg";

export const products = [
  { slug: "bao-court-01-white", brand: "BẠO", name: "Court 01 White", price: 1290000, stock: 14, sizes: [39,40,41,42], image: courtSneaker, badge: "Nổi bật", badgeClass: "bg-coral text-primary-foreground" },
  { slug: "bao-run-flux-02", brand: "BẠO", name: "Run Flux 02", price: 1020000, stock: 8, sizes: [40,41,42,43], image: runSneaker, badge: "Bán chạy", badgeClass: "bg-amber text-ink" },
  { slug: "bao-loaf-street-03", brand: "BẠO", name: "Loaf Street 03", price: 990000, stock: 3, sizes: [38,39,40,41], image: lifestyleSneaker, badge: "Mới", badgeClass: "bg-ink text-primary-foreground" },
];
export const formatMoney = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
