import { supabase } from '@/integrations/supabase/client';

export const logAdminAction = async (action: string, details?: string, tableName?: string, recordId?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    await supabase.from('admin_logs').insert({
      user_email: user.email,
      action,
      details: details || null,
      table_name: tableName || null,
      record_id: recordId || null,
    });
  } catch (err) {
    console.warn('Failed to log admin action:', err);
  }
};
