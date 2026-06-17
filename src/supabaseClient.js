import { createClient } from '@supabase/supabase-js'

// نقرأ بيانات الاتصال من: متغيرات البيئة (.env) أولاً، ثم من إعدادات المستخدم المحفوظة محلياً.
function getConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const localUrl = localStorage.getItem('SUPABASE_URL')
  const localKey = localStorage.getItem('SUPABASE_ANON_KEY')
  return {
    url: envUrl || localUrl || '',
    key: envKey || localKey || '',
  }
}

export function isConfigured() {
  const { url, key } = getConfig()
  return Boolean(url && key)
}

export function saveConfig(url, key) {
  localStorage.setItem('SUPABASE_URL', url.trim())
  localStorage.setItem('SUPABASE_ANON_KEY', key.trim())
}

let _client = null
export function getSupabase() {
  if (_client) return _client
  const { url, key } = getConfig()
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
}
