import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "./button";
import { formatMoney, type products } from "./store-data";

type Product=(typeof products)[number];
export function ProductCard({product}:{product:Product}){const [size,setSize]=useState(product.sizes[0]); const [added,setAdded]=useState(false);return <article className="group rounded-lg border border-line bg-surface-glass p-3 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-surface">
 <Link to="/products/$slug" params={{slug:product.slug}} className="relative block overflow-hidden rounded-lg"><img src={product.image} alt={product.name} loading="lazy" width={816} height={816} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]"/><span className={`absolute left-2.5 top-2.5 rounded-lg px-2 py-1 font-mono text-[10px] uppercase ${product.badgeClass}`}>{product.badge}</span></Link>
 <div className="pt-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[11px] text-muted-foreground">{product.brand}</p><Link to="/products/$slug" params={{slug:product.slug}} className="font-display text-[15px] font-bold">{product.name}</Link></div><span className="rounded-lg bg-mint/15 px-2 py-1 font-mono text-[10px] text-mint">Còn {product.stock}</span></div>
 <div className="mt-2 flex gap-1.5">{product.sizes.map(s=><button key={s} onClick={()=>setSize(s)} className={`grid size-8 place-items-center rounded-lg border text-xs ${size===s?"border-ink bg-ink text-primary-foreground":"border-line"}`}>{s}</button>)}</div>
 <div className="mt-3 flex items-end justify-between gap-2"><p className="font-display text-lg font-bold">{formatMoney(product.price)}</p><Button onClick={()=>{setAdded(true);setTimeout(()=>setAdded(false),1400)}} className="h-9 min-h-9 px-3">{added?"Đã thêm":"Thêm"}</Button></div></div></article>}
