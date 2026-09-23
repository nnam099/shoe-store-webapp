import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "./button";

const nav=[{to:"/",label:"Trang chủ"},{to:"/products",label:"Sản phẩm"},{to:"/categories",label:"Danh mục"},{to:"/orders/lookup",label:"Tra cứu đơn"}] as const;
export function StoreShell({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false); const path=useRouterState({select:s=>s.location.pathname});
 return <div className="min-h-screen bg-shop text-foreground">
  <header className="sticky top-0 z-40 border-b border-line bg-frost/80 backdrop-blur-xl">
   <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-5 px-4 sm:px-6">
    <Link to="/" className="flex shrink-0 items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-ink font-display text-sm font-bold text-primary-foreground">B</span><span className="font-display text-lg font-bold">BẠO<span className="text-cobalt">.sneak</span></span></Link>
    <nav className="hidden items-center gap-1 lg:flex">{nav.map(n=><Link key={n.to} to={n.to} className={`rounded-lg px-3 py-2 text-sm font-medium ${path===n.to?"bg-ink text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>{n.label}</Link>)}</nav>
    <div className="ml-auto hidden h-9 w-56 items-center gap-2 rounded-lg border border-line bg-surface-glass px-3 md:flex"><Search className="size-4 text-muted-foreground"/><input aria-label="Tìm kiếm" className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Tìm giày, hãng..."/></div>
    <Link to="/login" className="hidden sm:block"><Button variant="outline" className="h-9 min-h-9"><UserRound className="mr-2 size-4"/>Đăng nhập</Button></Link>
    <Link to="/cart"><Button variant="dark" className="h-9 min-h-9 px-3"><ShoppingBag className="mr-2 size-4"/>Giỏ hàng<span className="ml-2 grid size-5 place-items-center rounded-full bg-coral font-mono text-[11px]">2</span></Button></Link>
    <button aria-label="Mở menu" onClick={()=>setOpen(!open)} className="grid size-9 place-items-center rounded-lg border border-line bg-surface lg:hidden">{open?<X className="size-4"/>:<Menu className="size-4"/>}</button>
   </div>
   {open&&<nav className="border-t border-line bg-frost p-3 lg:hidden">{nav.map(n=><Link key={n.to} to={n.to} onClick={()=>setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium">{n.label}</Link>)}</nav>}
  </header>{children}
  <section className="border-t border-line bg-ink text-primary-foreground"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-6 px-6 py-5"><div><p className="font-display text-sm font-bold">Nhận hàng · Trả tiền tại nhà</p><p className="text-xs opacity-60">Thanh toán COD duy nhất, phí giao hàng 30.000₫.</p></div><div className="h-8 w-px bg-primary-foreground/15"/><div><p className="font-display text-sm font-bold">Tồn kho theo từng size</p><p className="text-xs opacity-60">Chọn đúng biến thể trước khi thêm vào giỏ.</p></div><Link to="/orders/lookup" className="ml-auto rounded-lg bg-primary-foreground/10 px-4 py-2 text-sm font-medium">Theo dõi đơn hàng</Link></div></section>
  <footer className="bg-footer text-primary-foreground/60"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm"><span className="font-display font-bold text-primary-foreground">BẠO.sneak</span><div className="flex flex-wrap gap-5"><Link to="/products">Sản phẩm</Link><Link to="/cart">Giỏ hàng</Link><Link to="/orders/lookup">Tra cứu đơn</Link><Link to="/admin">Quản trị</Link></div><span className="font-mono text-[11px]">© 2026 BẠO.sneak · Chỉ COD</span></div></footer>
 </div>
}
