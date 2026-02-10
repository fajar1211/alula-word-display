import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type SubscriptionAddOn = {
  id: string;
  label: string;
  description: string | null;
  price_idr: number;
  is_active: boolean;
  sort_order: number;
};

export function useSubscriptionAddOns(params: { selected: Record<string, boolean>; packageId: string | null }) {
  const { selected, packageId } = params;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SubscriptionAddOn[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!packageId) {
          if (mounted) setItems([]);
          return;
        }

        // Use edge function to avoid RLS blocking public/order pages.
        const { data, error } = await supabase.functions.invoke<{ items: SubscriptionAddOn[] }>("order-subscription-addons", {
          body: { packageId },
        });
        if (error) throw error;
        if (!mounted) return;
        setItems(((data as any)?.items ?? []) as any);
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [packageId]);

  const total = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((sum, a) => {
      if (!selected?.[a.id]) return sum;
      return sum + Number(a.price_idr ?? 0);
    }, 0);
  }, [items, selected]);

  return { loading, items, total };
}
