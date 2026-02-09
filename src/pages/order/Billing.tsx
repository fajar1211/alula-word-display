import { Link, useNavigate } from "react-router-dom";

import { OrderLayout } from "@/components/order/OrderLayout";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/contexts/OrderContext";

export default function Billing() {
  const navigate = useNavigate();
  const { state } = useOrder();

  return (
    <OrderLayout title="Billing" step="payment" flow="plan" sidebar={<OrderSummaryCard />}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium text-foreground">{state.selectedPackageName || "—"}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Durasi</p>
              <p className="font-medium text-foreground">{state.subscriptionYears ? `${state.subscriptionYears} Tahun` : "—"}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Kontak</p>
              <p className="font-medium text-foreground">{state.details.name || "—"}</p>
              <p className="text-muted-foreground">{state.details.email || ""}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/order/subscribe")}>
            Kembali
          </Button>
          <Button type="button" size="lg" disabled={!state.selectedPackageId || !state.subscriptionYears} asChild>
            <Link to="/order/payment">Lanjut ke Pembayaran</Link>
          </Button>
        </div>
      </div>
    </OrderLayout>
  );
}
