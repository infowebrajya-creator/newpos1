import { createClient } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { AuditLogReportItem } from '@/types/reports';

/**
 * Fetch all staff members from public.users
 */
export async function getStaffMembers(): Promise<UserProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role, is_active, phone_number, email, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching staff list:', error);
    return [];
  }

  return data as UserProfile[];
}

/**
 * Update staff member role
 */
export async function updateStaffRole(
  userId: string,
  newRole: UserRole,
  performingUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('users')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update staff role:', error);
    return { success: false, error: error.message };
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      user_id: performingUserId || null,
      action: 'UPDATE_STAFF_ROLE',
      entity_type: 'staff',
      entity_id: userId,
      reason: `Staff role updated to ${newRole}`,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit error
  }

  return { success: true };
}

/**
 * Toggle staff active/inactive status
 */
export async function updateStaffStatus(
  userId: string,
  isActive: boolean,
  performingUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update staff status:', error);
    return { success: false, error: error.message };
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      user_id: performingUserId || null,
      action: isActive ? 'REACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
      entity_type: 'staff',
      entity_id: userId,
      reason: `Staff member ${isActive ? 'reactivated' : 'deactivated'}`,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit error
  }

  return { success: true };
}

/**
 * Update non-sensitive staff profile information
 */
export async function updateStaffProfile(
  userId: string,
  updates: { full_name?: string; phone_number?: string; email?: string },
  performingUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update staff profile:', error);
    return { success: false, error: error.message };
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      user_id: performingUserId || null,
      action: 'UPDATE_STAFF_PROFILE',
      entity_type: 'staff',
      entity_id: userId,
      reason: `Staff profile updated: ${Object.keys(updates).join(', ')}`,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit error
  }

  return { success: true };
}

/**
 * Fetch recent audit activity logs for a specific staff member
 */
export async function getStaffAuditLogs(userId: string): Promise<AuditLogReportItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, created_at, user_id, action, entity_type, entity_id, reason')
    .or(`user_id.eq.${userId},entity_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return data as AuditLogReportItem[];
}
