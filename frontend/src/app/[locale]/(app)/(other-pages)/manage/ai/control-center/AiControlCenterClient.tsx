'use client'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAiControlCenterOverview, type AiControlCenterOverview } from '@/lib/travel-api'
import { Activity, Brain, CircleDollarSign, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import type { ElementType } from 'react'
import { useCallback, useEffect, useState } from 'react'

export default function AiControlCenterClient() {
  const [data,setData]=useState<AiControlCenterOverview|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const load=useCallback(async()=>{const token=getStoredAuthToken();if(!token)return;setLoading(true);try{setData(await getAiControlCenterOverview(token));setError(null)}catch{setError('AI kontrol merkezi yüklenemedi.')}finally{setLoading(false)}},[])
  useEffect(()=>{void load()},[load])
  const cards: Array<[string,string|number,ElementType]>=data?[['Kuyruk',data.counts.queued+data.counts.running,Activity],['Onay',data.counts.awaiting_approval,ShieldCheck],['Kalite',Number(data.quality.average_7d).toFixed(1),Brain],['Bilgi kaynağı',data.counts.knowledge_sources,Database],['30 günlük maliyet',`$${Number(data.cost.usd_30d).toFixed(2)}`,CircleDollarSign]]:[]
  return <div className="p-6 lg:p-8"><div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600">AI işletim sistemi</p><h1 className="mt-1 text-2xl font-bold">Kontrol Merkezi</h1><p className="mt-1 text-sm text-neutral-500">Ajan sağlığı, kalite, maliyet, bilgi kapsamı ve istisnalar.</p></div><button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white"><RefreshCw className={loading?'size-4 animate-spin':'size-4'}/>Yenile</button></div>{error?<p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}{data?<><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label,value,Icon])=><div key={String(label)} className="rounded-2xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><Icon className="size-5 text-violet-600"/><p className="mt-3 text-2xl font-bold">{String(value)}</p><p className="text-xs text-neutral-500">{String(label)}</p></div>)}</div><section className="mt-6 rounded-2xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"><h2 className="font-semibold">AI kadrosu</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.agents.map(a=><div key={a.code} className="rounded-xl border p-3 dark:border-neutral-800"><div className="flex justify-between gap-2"><p className="text-sm font-semibold">{a.display_name}</p><span className={a.status==='active'?'text-xs text-emerald-600':'text-xs text-neutral-400'}>{a.status}</span></div><p className="mt-2 text-xs text-neutral-500">24s: {a.succeeded_24h} başarılı · {a.failed_24h} hata</p><p className="mt-1 text-xs text-neutral-500">Kalite: {Number(a.quality_7d).toFixed(1)} · 30g: ${Number(a.cost_30d).toFixed(3)}</p></div>)}</div></section></>:loading?<p className="py-20 text-center text-neutral-400">Yükleniyor…</p>:null}</div>
}
