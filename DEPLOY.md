# نشر منصة «صوت موثّق» على GitHub و Vercel

المشروع مجهّز بالكامل بملف `vercel.json` ومدخل Serverless (`api/index.js`) ومستودع Git جاهز للرفع المباشر.

---

## الخطوة ١: الرفع على GitHub

لو عندك GitHub Personal Access Token (يبدأ بـ `ghp_` أو `github_pat_`)، تقدر تبعته لي وهارفع لك المستودع وأربطه فورًا، أو ارفعه بنفسك بالأوامر دي:

```bash
git remote add origin https://github.com/<USERNAME>/soot-mawathaq.git
git branch -M main
git push -u origin main
```

---

## الخطوة ٢: النشر على Vercel (في دقيقة واحدة)

1. افتح [vercel.com/new](https://vercel.com/new) واختار مستودع **`soot-mawathaq`** من GitHub.
2. في خانة **Environment Variables** ضيف المتغيرات دي من مشروع Supabase بتاعك:

| المتغير | القيمة |
|---|---|
| `SUPABASE_URL` | `https://cpgzbvurtjuuleedjxwn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح `service_role` من Supabase → Settings → API |
| `SESSION_SECRET` | أي نص سري طويل عشوائي (لتوقيع الجلسات) |
| `ADMIN_KEY` | كلمة سر لوحة الإدارة (`/admin`) — افتراضيًا `per-aa-admin` |
| `OTP_MODE` | `console` (لعرض الكود على الشاشة للتجربة) أو `sms` |
| `VERIFY_PROVIDER` | `demo` (المحرك المدمج لمطابقة البطاقات) أو `facepp` / `rekognition` / `azure` |

3. اضغط **Deploy** — المنصة هتشتغل فورًا، وبطاقة **علي أحمد علي محمد** (`31005292501518`) مسجّلة وجاهزة في قاعدة بيانات Supabase ومرفقة في `/cards/31005292501518.jpg`.
