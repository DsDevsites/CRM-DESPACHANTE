import {useEffect,useMemo,useState} from "react";
import type {FormEvent} from "react";
import {useAuth} from "../../context/AuthContext";
import {supabase} from "../../lib/supabase";

type Process={id:string;client_id:string|null;vehicle_id:string|null;protocol:string|null;status:string;service_type:string;notes:string|null;due_date:string|null;opened_at:string};
type Client={id:string;name:string};
type Vehicle={id:string;plate:string|null;brand:string|null;model:string|null};
type Doc={id:string;process_id:string;name:string;status:string;required:boolean;file_name:string|null;rejection_reason:string|null};
const statuses=[{value:"pre_cadastro",label:"Pré-cadastro"},{value:"aguardando_documentos",label:"Aguardando documentos"},{value:"documentacao_completa",label:"Documentação completa"},{value:"em_analise",label:"Em análise"},{value:"protocolo",label:"Protocolado"},{value:"concluido",label:"Concluído"}];
const docStatus:Record<string,string>={pending:"Pendente",uploaded:"Para validar",approved:"Aprovado",rejected:"Reprovado"};

export function ProcessesPage(){
 const{user}=useAuth();const[processes,setProcesses]=useState<Process[]>([]);const[clients,setClients]=useState<Client[]>([]);const[vehicles,setVehicles]=useState<Vehicle[]>([]);const[docs,setDocs]=useState<Doc[]>([]);
 const[open,setOpen]=useState(false);const[saving,setSaving]=useState(false);const[error,setError]=useState("");const[expanded,setExpanded]=useState<string|null>(null);
 const[form,setForm]=useState({client_id:"",vehicle_id:"",service_type:"transferencia",due_date:"",notes:""});
 async function tenantId(){if(!supabase||!user)return null;const{data}=await supabase.from("memberships").select("tenant_id").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();return data?.tenant_id||null}
 async function load(){const tenant=await tenantId();if(!tenant||!supabase)return;const[p,c,v,d]=await Promise.all([
  supabase.from("transfer_processes").select("id,client_id,vehicle_id,protocol,status,service_type,notes,due_date,opened_at").eq("tenant_id",tenant).order("opened_at",{ascending:false}),
  supabase.from("clients").select("id,name").eq("tenant_id",tenant).order("name"),
  supabase.from("vehicles").select("id,plate,brand,model").eq("tenant_id",tenant).order("created_at",{ascending:false}),
  supabase.from("process_documents").select("id,process_id,name,status,required,file_name,rejection_reason").eq("tenant_id",tenant).order("created_at",{ascending:false})
 ]);
 if(p.error)setError(p.error.message);else setProcesses((p.data||[]) as Process[]);if(!c.error)setClients((c.data||[]) as Client[]);if(!v.error)setVehicles((v.data||[]) as Vehicle[]);if(!d.error)setDocs((d.data||[]) as Doc[]);
 }
 useEffect(()=>{void load()},[user]);
 async function save(e:FormEvent){e.preventDefault();setError("");if(!form.client_id&&!form.vehicle_id){setError("Vincule pelo menos um cliente ou um veículo.");return}setSaving(true);const tenant=await tenantId();if(!tenant||!supabase){setError("Sessão do escritório não encontrada.");setSaving(false);return}const{error}=await supabase.from("transfer_processes").insert({tenant_id:tenant,client_id:form.client_id||null,vehicle_id:form.vehicle_id||null,service_type:form.service_type,notes:form.notes||null,due_date:form.due_date||null,created_by:user?.id||null});setSaving(false);if(error){setError(error.message);return}setForm({client_id:"",vehicle_id:"",service_type:"transferencia",due_date:"",notes:""});setOpen(false);void load()}
 function clientName(id:string|null){return clients.find(c=>c.id===id)?.name||"Sem cliente"}
 function vehicleLabel(id:string|null){const v=vehicles.find(x=>x.id===id);return v?(v.plate||"Sem placa")+" "+[v.brand,v.model].filter(Boolean).join(" "):"Sem veículo"}
 function serviceLabel(value:string){return value==="transferencia"?"Transferência":value==="licenciamento"?"Licenciamento":value==="primeiro_emplacamento"?"1º emplacamento":value==="segunda_via"?"2ª via":"Outro"}
 function processDocs(id:string){return docs.filter(d=>d.process_id===id)}
 function progress(id:string){const list=processDocs(id);if(!list.length)return {done:0,total:0,pending:0};return {done:list.filter(d=>d.status==="approved").length,total:list.length,pending:list.filter(d=>d.status!=="approved").length}}
 const expandedDocs=useMemo(()=>expanded?processDocs(expanded):[],[expanded,docs]);
 return <div className="page-stack">
  <section className="page-intro"><div><span className="eyebrow">FLUXO DE TRABALHO</span><h1>Processos</h1><p>Acompanhe cada serviço desde o cadastro inicial até a conclusão, com prazos e documentos organizados.</p></div><button className="primary-button" onClick={()=>setOpen(!open)}>+ Novo processo</button></section>
  {open&&<form className="panel data-form" onSubmit={save}><div className="form-grid">
   <label>Cliente<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">Selecionar cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>Veículo<select value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})}><option value="">Selecionar veículo</option>{vehicles.map(v=><option key={v.id} value={v.id}>{vehicleLabel(v.id)}</option>)}</select></label>
   <label>Tipo de serviço<select value={form.service_type} onChange={e=>setForm({...form,service_type:e.target.value})}><option value="transferencia">Transferência</option><option value="licenciamento">Licenciamento</option><option value="primeiro_emplacamento">1º emplacamento</option><option value="segunda_via">2ª via</option><option value="outro">Outro</option></select></label>
   <label>Prazo<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label>
  </div><label className="full-field">Observações<textarea className="settings-textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Informações importantes do processo"/></label>{error&&<p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving?"Salvando...":"Abrir processo"}</button></div></form>}
  {!open&&error&&<p className="form-error">{error}</p>}
  <div className="kanban">{statuses.map(s=>{const items=processes.filter(p=>p.status===s.value);return <div className="kanban-column" key={s.value}><div className="kanban-header"><strong>{s.label}</strong><span>{items.length}</span></div>{items.length===0?<div className="kanban-empty">Nenhum processo</div>:items.map(p=>{const pg=progress(p.id);const list=processDocs(p.id);return <div className="process-card" key={p.id}>
   <strong>{clientName(p.client_id)}</strong><span>{vehicleLabel(p.vehicle_id)}</span><small>{serviceLabel(p.service_type)}</small>{p.due_date&&<small>Prazo: {new Date(p.due_date+"T12:00:00").toLocaleDateString("pt-BR")}</small>}{p.protocol&&<small>Protocolo: {p.protocol}</small>}
   <div className="process-doc-progress"><div><span>Documentação</span><strong>{pg.total?pg.done+"/"+pg.total+" aprovados":"Nenhum documento"}</strong></div>{pg.total>0&&<div className="process-progress-bar"><i style={{width:Math.round((pg.done/pg.total)*100)+"%"}}/></div>}<button className="secondary-button compact" onClick={()=>setExpanded(expanded===p.id?null:p.id)}>{expanded===p.id?"Ocultar documentação":"Ver documentação"}</button></div>
   {expanded===p.id&&<div className="process-documents">{list.length===0?<div className="process-doc-empty">Nenhum documento vinculado a este processo.</div>:list.map(d=><div className="process-doc-row" key={d.id}><div><strong>{d.name}</strong><small>{d.required?"Obrigatório":"Opcional"}{d.file_name?" • "+d.file_name:""}</small>{d.rejection_reason&&<small className="document-rejection">Motivo: {d.rejection_reason}</small>}</div><span className={"doc-status-mini doc-mini-"+d.status}>{docStatus[d.status]||d.status}</span></div>)}</div>}
  </div>})}</div>})}</div>
  <div className="panel process-note"><strong>Documentação por processo</strong><p>Cada processo agora mostra o progresso documental e permite abrir sua documentação diretamente no cartão.</p></div>
 </div>
}