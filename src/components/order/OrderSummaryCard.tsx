import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrder } from "@/contexts/OrderContext";
import { useOrderPublicSettings } from "@/hooks/useOrderPublicSettings";
import { useOrderAddOns } from "@/hooks/useOrderAddOns";
import { useI18n } from "@/hooks/useI18n";
import { useMemo } from "react";
import { usePackageDurations } from "@/hooks/usePackageDurations";
import { computeDiscountedTotal } from "@/lib/packageDurations";

const USD_TO_IDR_RATE = 16000;

function formatIdr(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

export function OrderSummaryCard({ showEstPrice = true }: { showEstPrice?: boolean }) {
  const { t, lang } = useI18n();
  const { state } = useOrder();
  const { contact, subscriptionPlans, pricing } = useOrderPublicSettings(state.domain, state.selectedPackageId);
  const { rows: durationRows } = usePackageDurations(state.selectedPackageId);
  const { total: addOnsTotal } = useOrderAddOns({ packageId: state.selectedPackageId, quantities: state.addOns ?? {} });

  const whatsappHref = (() => {
    const phone = (contact.whatsapp_phone ?? "").replace(/\D/g, "");
    if (!phone) return null;
    const text = encodeURIComponent(
      contact.whatsapp_message || (lang === "id" ? "Halo, saya mau tanya order..." : "Hi, I have a question about my order..."),
    );
    return `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
  })();

  const emailHref = (() => {
    const to = (contact.email ?? "").trim();
    if (!to) return null;
    return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}`;
  })();

  const durationLabel = state.subscriptionYears
    ? lang === "id"
      ? `Durasi ${state.subscriptionYears} Tahun`
      : `Duration ${state.subscriptionYears} Year(s)`
    : lang === "id"
      ? "Durasi —"
      : "Duration —";

  const yearsLabel = state.subscriptionYears
    ? lang === "id"
      ? `${state.subscriptionYears} tahun`
      : `${state.subscriptionYears} year(s)`
    : "—";

  const discountByMonths = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of durationRows || []) {
      if (r?.is_active === false) continue;
      const months = Number((r as any).duration_months ?? 0);
      const discount = Number((r as any).discount_percent ?? 0);
      if (Number.isFinite(months) && months > 0) m.set(months, discount);
    }
    return m;
  }, [durationRows]);

  const baseTotalUsd = useMemo(() => {
    if (!showEstPrice) return null;
    if (!state.subscriptionYears) return null;

    const months = Number(state.subscriptionYears) * 12;
    const discountPercent = discountByMonths.get(months) ?? 0;

    // Prefer Duration & Discount config (package_durations) so it matches /order/subscription & /order/payment.
    if (discountByMonths.size > 0) {
      const domain = pricing.domainPriceUsd ?? null;
      const pkg = pricing.packagePriceUsd ?? null;
      if (domain == null || pkg == null) return null;

      const baseAnnual = domain + pkg;
      const monthly = baseAnnual / 12;
      return computeDiscountedTotal({ monthlyPrice: monthly, months, discountPercent }) + addOnsTotal;
    }

    // Fallback to legacy website_settings.order_subscription_plans price override.
    const selectedPlan = subscriptionPlans.find((p: any) => Number(p?.years) === Number(state.subscriptionYears));
    const planOverrideUsd =
      typeof (selectedPlan as any)?.price_usd === "number" && Number.isFinite((selectedPlan as any).price_usd)
        ? Number((selectedPlan as any).price_usd)
        : null;
    if (planOverrideUsd != null) return planOverrideUsd + addOnsTotal;

    const domainUsd = pricing.domainPriceUsd ?? null;
    const pkgUsd = pricing.packagePriceUsd ?? null;
    if (domainUsd == null || pkgUsd == null) return null;

    return (domainUsd + pkgUsd) * state.subscriptionYears + addOnsTotal;
  }, [addOnsTotal, discountByMonths, pricing.domainPriceUsd, pricing.packagePriceUsd, showEstPrice, state.subscriptionYears, subscriptionPlans]);

  const promoDiscountUsd = useMemo(() => {
    const d = state.appliedPromo?.discountUsd ?? 0;
    if (!Number.isFinite(d) || d <= 0) return 0;
    return d;
  }, [state.appliedPromo?.discountUsd]);

  const totalAfterPromoUsd = useMemo(() => {
    if (baseTotalUsd == null) return null;
    return Math.max(0, baseTotalUsd - promoDiscountUsd);
  }, [baseTotalUsd, promoDiscountUsd]);

  const totalAfterPromoIdr = useMemo(() => {
    if (totalAfterPromoUsd == null) return null;
    return Math.max(0, Math.round(totalAfterPromoUsd * USD_TO_IDR_RATE));
  }, [totalAfterPromoUsd]);

  const baseTotalIdr = useMemo(() => {
    if (baseTotalUsd == null) return null;
    return Math.max(0, Math.round(baseTotalUsd * USD_TO_IDR_RATE));
  }, [baseTotalUsd]);

  const promoDiscountIdr = useMemo(() => {
    if (!promoDiscountUsd) return 0;
    return Math.max(0, Math.round(promoDiscountUsd * USD_TO_IDR_RATE));
  }, [promoDiscountUsd]);

  const addOnsTotalIdr = useMemo(() => {
    if (!addOnsTotal) return 0;
    return Math.max(0, Math.round(addOnsTotal * USD_TO_IDR_RATE));
  }, [addOnsTotal]);

  const durationPriceIdr = useMemo(() => {
    if (!showEstPrice) return null;
    if (baseTotalIdr == null) return null;
    // Best-effort: show subscription subtotal excluding add-ons.
    return Math.max(0, baseTotalIdr - addOnsTotalIdr);
  }, [addOnsTotalIdr, baseTotalIdr, showEstPrice]);

  const displayTotalIdr = totalAfterPromoIdr ?? baseTotalIdr;

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("order.summary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.domain")}</span>
            <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{state.domain || "—"}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{durationLabel}</span>
            <span className="text-sm font-medium text-foreground">{durationPriceIdr == null ? "—" : formatIdr(durationPriceIdr)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.plan")}</span>
            <span className="text-sm font-medium text-foreground">{yearsLabel}</span>
          </div>

          {showEstPrice ? (
            <>
              {addOnsTotal > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Add-ons</span>
                  <span className="text-sm font-medium text-foreground">{formatIdr(addOnsTotalIdr)}</span>
                </div>
              ) : null}

              <div className="rounded-xl bg-muted/30 p-3">
                <h1 className="text-base font-bold text-foreground">Total Harga</h1>
                <p className="mt-1 text-2xl font-bold text-foreground">{displayTotalIdr == null ? "—" : formatIdr(displayTotalIdr)}</p>
              </div>

              {state.appliedPromo ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{t("order.promo")}</span>
                  <span className="text-sm font-medium text-foreground truncate max-w-[220px]">
                    {state.appliedPromo.code} (-{formatIdr(promoDiscountIdr)})
                  </span>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.status")}</span>
            <span className="text-sm">
              {state.domainStatus ? (
                <Badge variant={state.domainStatus === "available" ? "secondary" : "outline"}>{state.domainStatus}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("order.template")}</span>
            <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{state.selectedTemplateName || "—"}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("order.included")}</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>{lang === "id" ? "Desain website profesional" : "Professional website design"}</li>
            <li>{lang === "id" ? "Layout responsif mobile" : "Mobile responsive layout"}</li>
            <li>{lang === "id" ? "Setup SEO dasar" : "Basic SEO setup"}</li>
          </ul>
        </div>

        {(whatsappHref || emailHref) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{contact.heading}</p>
              {contact.description ? <p className="text-sm text-muted-foreground">{contact.description}</p> : null}
              <div className="flex flex-wrap gap-2">
                {whatsappHref ? (
                  <a className="text-sm underline text-foreground" href={whatsappHref} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
                {emailHref ? (
                  <a className="text-sm underline text-foreground" href={emailHref} target="_blank" rel="noreferrer">
                    Email
                  </a>
                ) : null}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
