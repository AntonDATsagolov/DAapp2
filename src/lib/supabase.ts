import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://huajxbmapmlprcyytsvu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZTIrnSQwmENwq0dFumJq1Q_HnbscpEm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type BusinessType = 'cafe' | 'shop' | 'beauty' | 'hotel';

export interface Business {
  id: string;
  name: string;
  business_type: BusinessType;
  address: string;
  description: string;
  whatsapp_number: string;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
}
