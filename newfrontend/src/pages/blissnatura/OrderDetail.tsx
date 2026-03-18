import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BlissOrder } from "@/types";
import { fetchBlissOrders } from "@/services/api";

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<BlissOrder | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetchBlissOrders({ search: String(id ?? "") });
        const found = (resp.data || []).find((o) => String(o.order_id) === String(id));
        if (mounted) setOrder(found ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const statusName = useMemo(() => order?.status?.name ?? order?.order_status_id ?? "—", [order]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Pedido {id}</h1>
            <p className="page-subtitle">Detalhes do pedido</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <Link to="/blissnatura/orders" className="text-sm text-primary hover:underline">Voltar a Pedidos</Link>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-7 w-40" />
          </div>
        ) : order ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Cliente</div>
              <div className="text-lg font-semibold">{order.firstname} {order.lastname}</div>
              <div className="text-sm text-muted-foreground">{order.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-primary border-primary/30">
                {statusName}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{money.format(Number(order.total ?? 0))}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Data</div>
              <div className="text-lg font-semibold">{order.date_added ? new Date(order.date_added).toLocaleString("pt-PT") : "—"}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Pedido não encontrado.</div>
        )}
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="p-6 text-sm font-semibold">Produtos do Pedido</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">Produto</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Qtd</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={5}><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : order?.products?.length ? (
                order.products.map((p) => (
                  <tr key={p.order_product_id} className="border-t border-border/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.image_url || undefined} alt={p.name} />
                          <AvatarFallback>{(p.name?.[0] ?? '#').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>{p.name}</div>
                      </div>
                    </td>
                    <td className="p-3">{p.model}</td>
                    <td className="p-3">{p.quantity}</td>
                    <td className="p-3">{money.format(Number(p.price ?? 0))}</td>
                    <td className="p-3">{money.format(Number(p.total ?? 0))}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>Sem produtos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}