import { createClient } from '@/lib/supabase/client';
import { DateRange, DatePreset } from '@/types/reports';
import { getDateRangeFromPreset } from '@/services/reports/reportService';

export interface AuditLogItem {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  details?: Record<string, unknown> | null;
}

export interface AuditFilterParams {
  preset: DatePreset;
  customStart?: string;
  customEnd?: string;
  userFilter?: string;
  actionFilter?: string;
  entityFilter?: string;
  searchQuery?: string;
  page: number;
  pageSize: number;
}

/**
 * Fetch paginated & filtered audit logs from public.audit_logs
 */
export async function getAuditLogs(params: AuditFilterParams): Promise<{
  data: AuditLogItem[];
  totalCount: number;
}> {
  const supabase = createClient();
  const range = getDateRangeFromPreset(params.preset, params.customStart, params.customEnd);

  let query = supabase
    .from('audit_logs')
    .select('id, created_at, user_id, action, entity, entity_id, details', { count: 'exact' });

  // Date range filter
  if (params.preset !== 'custom' || (params.customStart && params.customEnd)) {
    query = query.gte('created_at', range.startDate).lte('created_at', range.endDate);
  }

  // User filter
  if (params.userFilter && params.userFilter !== 'all') {
    query = query.eq('user_id', params.userFilter);
  }

  // Action filter
  if (params.actionFilter && params.actionFilter !== 'all') {
    query = query.eq('action', params.actionFilter);
  }

  // Entity Type filter
  if (params.entityFilter && params.entityFilter !== 'all') {
    query = query.eq('entity', params.entityFilter);
  }

  // Search filter
  if (params.searchQuery && params.searchQuery.trim()) {
    const q = params.searchQuery.trim();
    query = query.or(`action.ilike.%${q}%,entity.ilike.%${q}%`);
  }

  // Pagination & Ordering
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  try {
    const [auditRes, usersRes] = await Promise.all([
      query.order('created_at', { ascending: false }).range(from, to),
      supabase.from('users').select('id, email, full_name'),
    ]);

    if (auditRes.error || !auditRes.data) {
      return { data: [], totalCount: 0 };
    }

    const userMap = new Map<string, string>();
    (usersRes.data || []).forEach((u) => {
      userMap.set(u.id, u.email || u.full_name || u.id);
    });

    const formatted: AuditLogItem[] = auditRes.data.map((log: any) => {
      let reasonVal: string | null = null;
      if (log.details && typeof log.details === 'object' && log.details.reason) {
        reasonVal = String(log.details.reason);
      } else if (typeof log.details === 'string') {
        reasonVal = log.details;
      }

      return {
        id: log.id,
        created_at: log.created_at,
        user_id: log.user_id,
        action: log.action,
        entity_type: log.entity || 'System',
        entity_id: log.entity_id ? String(log.entity_id) : null,
        reason: reasonVal,
        details: log.details && typeof log.details === 'object' ? log.details : null,
        user_email: log.user_id ? userMap.get(log.user_id) || 'System User' : 'System',
      };
    });

    return {
      data: formatted,
      totalCount: auditRes.count || 0,
    };
  } catch {
    return { data: [], totalCount: 0 };
  }
}

/**
 * Get list of distinct action names for filtering
 */
export async function getDistinctAuditActions(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('audit_logs').select('action').limit(200);

  if (error || !data) return [];
  const set = new Set<string>();
  data.forEach((d: any) => d.action && set.add(d.action));
  return Array.from(set);
}

/**
 * Get list of distinct entity types for filtering
 */
export async function getDistinctEntityTypes(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('audit_logs').select('entity').limit(200);

  if (error || !data) return [];
  const set = new Set<string>();
  data.forEach((d: any) => d.entity && set.add(d.entity));
  return Array.from(set);
}
