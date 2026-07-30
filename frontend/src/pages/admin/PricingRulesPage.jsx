import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";

import apiClient from "@/api/apiClient";
import {
  createPricingRule,
  deletePricingRule,
  getPricingRules,
  updatePricingRule,
} from "@/api/pricingRuleApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyForm = {
  name: "", dayOfWeek: "", startTime: "00:00", endTime: "23:59",
  multiplier: "1.00", reason: "", validFrom: "", validTo: "",
};

export default function PricingRulesPage() {
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState("");
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiClient.get("/pricing-zones")
      .then(({ data }) => {
        const list = data?.data ?? data ?? [];
        setZones(list);
        if (list[0]) setZoneId(String(list[0].id));
      })
      .catch(() => setError("Fiyat bölgeleri yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    // Loading state belongs to the selected zone request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getPricingRules(zoneId)
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => setError("Fiyat kuralları yüklenemedi."))
      .finally(() => setLoading(false));
  }, [zoneId]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (form.startTime === form.endTime) {
      setError("Başlangıç ve bitiş saati aynı olamaz.");
      setSaving(false);
      return;
    }

    const overnight = form.endTime < form.startTime;
    if (overnight && (!form.validFrom || !form.validTo)) {
      setError("Gece yarısını aşan kurallarda başlangıç ve bitiş tarihi zorunludur.");
      setSaving(false);
      return;
    }

    if (overnight && form.dayOfWeek !== "") {
      setError("Gece yarısını aşan kurallarda gün seçilmemelidir.");
      setSaving(false);
      return;
    }
    const payload = {
      ...form,
      zoneId: Number(zoneId),
      dayOfWeek: form.dayOfWeek === "" ? null : Number(form.dayOfWeek),
      multiplier: Number(form.multiplier),
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
    };
    try {
      const saved = editingId
        ? await updatePricingRule(editingId, payload)
        : await createPricingRule(payload);
      setRules((current) =>
        editingId
          ? current.map((rule) => rule.id === editingId ? saved : rule)
          : [...current, saved],
      );
      setEditingId(null);
      setForm(emptyForm);
      setSuccess(editingId ? "Fiyat kuralı güncellendi." : "Fiyat kuralı oluşturuldu.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const edit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name || "", dayOfWeek: rule.dayOfWeek ?? "",
      startTime: rule.startTime?.slice(0, 5) || "00:00",
      endTime: rule.endTime?.slice(0, 5) || "23:59",
      multiplier: String(rule.multiplier ?? 1), reason: rule.reason || "",
      validFrom: rule.validFrom || "", validTo: rule.validTo || "",
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Bu fiyat kuralı pasife alınsın mı?")) return;
    try {
      await deletePricingRule(id);
      setRules((current) => current.filter((rule) => rule.id !== id));
    } catch {
      setError("Fiyat kuralı silinemedi.");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Fiyat Kuralları</h2>
        <p className="mt-1 text-sm text-muted-foreground">Bölgeye, güne ve saat aralığına göre fiyat çarpanlarını yönetin.</p>
      </div>
      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="size-5" />{error}</div>}
      {success && <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="size-5" />{success}</div>}
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle>{editingId ? "Kuralı düzenle" : "Yeni fiyat kuralı"}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <Field label="Fiyat bölgesi">
                <select className="h-10 w-full rounded-md border bg-white px-3" value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
                  {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                </select>
              </Field>
              <Field label="Kural adı"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gece tarifesi" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç"><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></Field>
                <Field label="Bitiş"><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gün">
                  <select className="h-10 w-full rounded-md border bg-white px-3" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                    <option value="">Her gün</option>
                    {["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"].map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </Field>
                <Field label="Çarpan"><Input type="number" min="0.01" step="0.01" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} required /></Field>
              </div>
              <Field label="Açıklama"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Geçerlilik başlangıcı">
                  <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                </Field>
                <Field label="Geçerlilik bitişi">
                  <Input type="date" value={form.validTo} min={form.validFrom || undefined} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
                </Field>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Gece yarısını aşan tarifelerde tarihler zorunludur ve bitiş tarihi başlangıcın ertesi günü olmalıdır.
              </p>
              <Button
                type="submit"
                className="w-full"
                disabled={saving || !zoneId}
              >
                <Save className="mr-2 size-4" />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              {editingId && <Button type="button" variant="ghost" className="w-full" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Vazgeç</Button>}
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Tanımlı kurallar <span className="text-sm font-normal text-muted-foreground">{rules.length} kayıt</span></CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p> : rules.length === 0 ? (
              <div className="rounded-xl border border-dashed py-14 text-center"><Plus className="mx-auto mb-3 size-8 text-muted-foreground" /><p>Bu bölge için fiyat kuralı bulunmuyor.</p></div>
            ) : <div className="space-y-3">{rules.map((rule) => (
              <div key={rule.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <button className="text-left" onClick={() => edit(rule)}>
                  <strong>{rule.name || "Adsız fiyat kuralı"}</strong>
                  <p className="mt-1 text-sm text-muted-foreground">{rule.startTime?.slice(0,5)}–{rule.endTime?.slice(0,5)} · ×{rule.multiplier} · {rule.dayOfWeek == null ? "Her gün" : ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"][rule.dayOfWeek]}</p>
                </button>
                <Button size="icon" variant="ghost" className="text-red-600" onClick={() => remove(rule.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}</div>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item.message || item.defaultMessage || String(item))
      .join(" ");
  }
  return data?.message || data?.error || error?.message || "Fiyat kuralı kaydedilemedi.";
}
