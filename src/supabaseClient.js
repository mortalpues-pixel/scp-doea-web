import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ungdzjozzdixkrcgftrh.supabase.co';
const supabaseKey = 'sb_publishable_VkCC7MswL-vqvDanSF_6cQ_It_6V4pc';
export const supabase = createClient(supabaseUrl, supabaseKey);
