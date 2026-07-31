import { useCallback, useEffect, useMemo, useState } from "react";
import { Languages, LoaderCircle, Plus, Save, Search, Trash2 } from "lucide-react";
import { createTranslation, deleteTranslation, getAdminTranslations, updateTranslation } from "@/api/translationApi";

const languages = ["tr", "en", "ru", "sq"];

export default function TranslationsPage() {
  const [items, setItems] = useState([]);
  const [langCode, setLangCode] = useState("tr");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [draft, setDraft] = useState({ transKey: "", value: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setLoading(true); setError(""); setItems(await getAdminTranslations(langCode)); }
    catch (e) { setError(e?.response?.data?.message || "Çeviriler alınamadı."); }
    finally { setLoading(false); }
  }, [langCode]);

  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => items.filter((x) => `${x.transKey} ${x.value}`.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const add = async (event) => {
    event.preventDefault();
    if (!draft.transKey.trim() || !draft.value.trim()) return;
    try { setBusyId("new"); await createTranslation({ ...draft, transKey: draft.transKey.trim(), langCode }); setDraft({ transKey: "", value: "" }); await load(); }
    catch (e) { setError(e?.response?.data?.message || "Çeviri eklenemedi."); }
    finally { setBusyId(null); }
  };

  const save = async (item) => {
    try { setBusyId(item.id); await updateTranslation(item.id, item.value); await load(); }
    catch (e) { setError(e?.response?.data?.message || "Çeviri güncellenemedi."); }
    finally { setBusyId(null); }
  };

  const remove = async (item) => {
    if (!window.confirm(`${item.transKey} silinsin mi?`)) return;
    try { setBusyId(item.id); await deleteTranslation(item.id); setItems((current) => current.filter((x) => x.id !== item.id)); }
    catch (e) { setError(e?.response?.data?.message || "Çeviri silinemedi."); }
    finally { setBusyId(null); }
  };

  return <section className="space-y-6">
    <header><p className="text-sm font-semibold text-blue-600">İçerik yönetimi</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Çeviri Yönetimi</h1><p className="mt-2 text-sm text-slate-500">Arayüz ve dinamik içerik metinlerini dil bazında yönetin.</p></header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 rounded-2xl border bg-white p-5 lg:grid-cols-[160px_1fr]">
      <select value={langCode} onChange={(e) => setLangCode(e.target.value)} className="h-11 rounded-xl border px-3">{languages.map((code) => <option key={code} value={code}>{code.toUpperCase()}</option>)}</select>
      <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Anahtar veya metin ara" className="h-11 w-full rounded-xl border pl-10 pr-3" /></label>
    </div>
    <form onSubmit={add} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 md:grid-cols-[260px_1fr_auto]">
      <input value={draft.transKey} onChange={(e) => setDraft((x) => ({...x, transKey:e.target.value}))} placeholder="örn. nav.home" className="h-11 rounded-xl border px-3" />
      <input value={draft.value} onChange={(e) => setDraft((x) => ({...x, value:e.target.value}))} placeholder="Yeni çeviri metni" className="h-11 rounded-xl border px-3" />
      <button disabled={busyId === "new"} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white"><Plus size={17}/> Ekle</button>
    </form>
    <div className="overflow-hidden rounded-2xl border bg-white">
      {loading ? <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="animate-spin"/></div> : filtered.length === 0 ? <div className="p-12 text-center text-slate-500"><Languages className="mx-auto mb-3"/>Çeviri bulunamadı.</div> : <div className="divide-y">{filtered.map((item) => <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[260px_1fr_auto] md:items-center"><code className="break-all text-xs font-semibold text-blue-700">{item.transKey}</code><textarea value={item.value} onChange={(e) => setItems((current) => current.map((x) => x.id === item.id ? {...x,value:e.target.value}:x))} className="min-h-20 rounded-xl border p-3 text-sm"/><div className="flex gap-2"><button onClick={() => save(item)} disabled={busyId === item.id} className="rounded-xl border border-emerald-200 p-2.5 text-emerald-700" title="Kaydet"><Save size={17}/></button><button onClick={() => remove(item)} disabled={busyId === item.id} className="rounded-xl border border-red-200 p-2.5 text-red-600" title="Sil"><Trash2 size={17}/></button></div></div>)}</div>}
    </div>
  </section>;
}
