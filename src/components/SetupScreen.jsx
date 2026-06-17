import { useState } from 'react'
import { saveConfig } from '../supabaseClient'

export default function SetupScreen({ onDone }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')

  function handleSave() {
    if (!url.trim() || !key.trim()) {
      setErr('يرجى إدخال الرابط والمفتاح معاً.')
      return
    }
    if (!/^https:\/\/.+\.supabase\.co/.test(url.trim())) {
      setErr('رابط Supabase يجب أن يكون بالشكل: https://xxxx.supabase.co')
      return
    }
    saveConfig(url, key)
    onDone()
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <img className="mark" src="/logo.jpg" alt="شعار سماء الأدب" />
        <h1>سماء الأدب</h1>
        <p className="tagline">إعداد الاتصال بقاعدة البيانات</p>
        <div className="rule" />
      </header>

      <div className="card">
        <h2>ربط قاعدة البيانات</h2>
        <p className="subtle">أدخل بيانات مشروع Supabase الخاص بك لتشغيل الموقع. تُحفظ على هذا الجهاز فقط.</p>

        <div className="notice">
          تجدها في لوحة تحكم Supabase ضمن: Project Settings ← API. انسخ
          «Project URL» و«anon public key». ولا تنسَ تشغيل ملف
          <strong> supabase-schema.sql </strong> مرة واحدة لإنشاء الجداول.
        </div>

        <div className="field">
          <label>رابط المشروع (Project URL)</label>
          <input
            className="input"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="field">
          <label>المفتاح العام (anon key)</label>
          <input
            className="input"
            placeholder="eyJhbGci..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            dir="ltr"
          />
        </div>

        {err && <p className="error-text">{err}</p>}

        <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 8 }}>
          حفظ والبدء
        </button>
      </div>
    </div>
  )
}
