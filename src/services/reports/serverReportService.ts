import { createClient } from '@/lib/supabase/server';
import { SalesOverview, DateRange } from '@/types/reports';

/**
 * Server-side helper to fetch sales overview
 */
export async function getServerSalesOverview(range: DateRange): Promise<SalesOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_sales_overview_report', {
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });

  const defaultOverview: SalesOverview = {
    total_sales: 0,
    paid_bills_count: 0,
    average_bill_value: 0,
    total_discounts: 0,
    gross_sales: 0,
    net_sales: 0,
    tax_amount: 0,
    rounding_amount: 0,
    discounted_bills_count: 0,
    total_complimentary_value: 0,
    complimentary_items_count: 0,
  };

  if (error || !data) {
    return defaultOverview;
  }

  const parsed = typeof data === 'string' ? JSON.parse(data) : data;

  return {
    ...defaultOverview,
    total_sales: Number(parsed.total_sales) || 0,
    paid_bills_count: Number(parsed.paid_bills_count) || 0,
    average_bill_value: Number(parsed.average_bill_value) || 0,
    total_discounts: Number(parsed.total_discounts) || 0,
  };
}
