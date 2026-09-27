import {useEffect,useMemo,useState} from "react";
import type {FormEvent,ChangeEvent} from "react";
import {useAuth} from "../../context/AuthContext";
import {supabase} from "../../lib/supabase";

type Doc={
 id:string;process_id:string;name:string;document_type:string|null;required:boolean;
 status:string;notes:string|null;storage_path:string|null;file_name:string|null;
 file_size:number|null;mime_type:string|null;uploaded_at:string|null;
 rejection_reason:string|null;reviewed_at:string|null;
};
type Process={id:string;service_type:string;protocol:string|null};
const labels=[["rg_cpf","RG / CPF"],["crlv","CRLV"],["atpv","ATPV-e"],["comprovante_endereco","Comprovante de endereço"],["procuracao","Procuração"],["outro","Outro"]];
const statusLabel:Record<string,string>={pending:"Pendente",uploaded:"Enviado",approved:"Aprovado",rejected:"Reprovado"};
const statusClass:Record<string,string>={pending:"doc-status-pending",uploaded:"doc-status-uploaded",approved:"doc-status-approved",rejected:"doc-status-rejected"};
const maxFileSize=10*1024*1024;

export function DocumentsPage(){
 const{user}=useAuth();
 const[docs,setDocs]=useState<Doc[]>([]);const[processes,setProcesses]=useState<Process[]>([]);
 const[open,setOpen]=useState(false);const[saving,setSaving]=useState(false);const[uploading,setUploading]=useState<string|null>(null);
 const[error,setError]=useState("");const[filter,setFilter]=useState("all");const[search,setSearch]=useState("");
 const[form,setForm]=useState({process_id:"",name:"",document_type:"outro",required:true,notes:""});

 async function tenantId(){
  if(!supabase||!user)return null;
  const{data}=await supabase.from("memberships").select("tenant_id").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
  return data?.tenant_id||null;
 }
 async function load(){
  const tenant=await tenantId();if(!tenant||!supabase)return;
  const[d,p]=await Promise.all([
   supabase.from("process_documents").select("id,process_id,name,document_type,required,status,notes,storage_path,file_name,file_size,mime_type,uploaded_at,rejection_reason,reviewed_at").eq("tenant_id",tenant).order("created_at",{ascending:false}),
   supabase.from("transfer_processes").select("id,service_type,protocol").eq("tenant_id",tenant).order("opened_at",{ascending:false})
  ]);
  if(d.error)setError(d.error.message);else setDocs((d.data||[]) as Doc[]);
  if(!p.error)setProcesses((p.data||[]) as Process[]);
 }
 useEffect(()=>{void load()},[user]);

 async function save(e:FormEvent){
  e.preventDefault();setError("");
  if(!form.process_id||!form.name.trim()){setError("Selecione o processo e informe o documento.");return}
  setSaving(true);const tenant=await tenantId();
  if(!tenant||!supabase){setError("Sessão do escritório não encontrada.");setSaving(false);return}
  const{error}=await supabase.from("process_documents").insert({
   tenant_id:tenant,process_id:form.process_id,name:form.name.trim(),document_type:form.document_type,
   required:form.required,status:"pending",notes:form.notes||null
  });
  setSaving(false);
  if(error){setError(error.message);return}
  setForm({process_id:"",name:"",document_type:"outro",required:true,notes:""});setOpen(false);void load();
 }

 function processLabel(id:string){
  const p=processes.find(x=>x.id===id);return p?p.service_type+(p.protocol?" • "+p.protocol:""):"Processo";
 }
 function formatSize(size:number|null){if(!size)return "";return size<1024*1024?Math.round(size/1024)+" KB":(size/1024/1024).toFixed(1)+" MB"}
 async function handleFile(e:ChangeEvent<HTMLInputElement>,doc:Doc){
  const file=e.target.files?.[0];e.target.value="";if(!file||!supabase)return;
  setError("");
  if(file.size>maxFileSize){setError("O arquivo deve ter no máximo 10 MB.");return}
  const allowed=["application/pdf","image/jpeg","image/png"];
  if(!allowed.includes(file.type)){setError("Formato não permitido. Use PDF, JPG ou PNG.");return}
  const tenant=await tenantId();if(!tenant)return;
  setUploading(doc.id);
  const path=tenant+"/"+doc.process_id+"/"+doc.id+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const{error:uploadError}=await supabase.storage.from("process-documents").upload(path,file,{upsert:true,contentType:file.type});
  if(uploadError){setError("Não foi possível enviar o arquivo: "+uploadError.message);setUploading(null);return}
  const{error:updateError}=await supabase.from("process_documents").update({
   storage_path:path,file_name:file.name,file_size:file.size,mime_type:file.type,uploaded_at:new Date().toISOString(),status:"uploaded",rejection_reason:null
  }).eq("id",doc.id).eq("tenant_id",tenant);
  if(updateError){await supabase.storage.from("process-documents").remove([path]);setError(updateError.message)}
  setUploading(null);void load();
 }
 async function openFile(doc:Doc){
  if(!supabase||!doc.storage_path)return;
  const{data,error}=await supabase.storage.from("process-documents").createSignedUrl(doc.storage_path,300);
  if(error||!data?.signedUrl){setError("Não foi possível abrir o arquivo.");return}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function setStatus(doc:Doc,status:"approved"|"rejected"){
  if(!supabase)return;const tenant=await tenantId();if(!tenant)return;
  let reason=null;
  if(status==="rejected"){reason=window.prompt("Informe o motivo da reprovação:","Documento ilegível ou incompleto")?.trim()||"Documento precisa ser corrigido."}
  const{error}=await supabase.from("process_documents").update({status,rejection_reason:reason,reviewed_at:new Date().toISOString(),reviewed_by:user?.id||null}).eq("id",doc.id).eq("tenant_id",tenant);
  if(error)setError(error.message);else void load();
 }

 const visible=useMemo(()=>docs.filter(d=>{
  const matchesFilter=filter==="all"||d.status===filter;
  const q=search.trim().toLowerCase();
  const matchesSearch=!q||d.name.toLowerCase().includes(q)||processLabel(d.process_id).toLowerCase().includes(q);
  return matchesFilter&&matchesSearch;
 }),[docs,filter,search,processes]);
 const counts=useMemo(()=>({all:docs.length,pending:docs.filter(d=>d.status==="pending").length,uploaded:docs.filter(d=>d.status==="uploaded").length,approved:docs.filter(d=>d.status==="approved").length,rejected:docs.filter(d=>d.status==="rejected").length}),[docs]);

 return <div className="page-stack">
  <section className="page-intro"><div><span className="eyebrow">GESTÃO DOCUMENTAL</span><h1>Documentos</h1><p>Centralize arquivos dos processos, valide documentos e saiba exatamente o que falta.</p></div><button className="primary-button" onClick={()=>setOpen(!open)}>+ Adicionar documento</button></section>
  <section className="doc-summary-grid">
   <button className={filter==="all"?"doc-summary active":"doc-summary"} onClick={()=>setFilter("all")}><strong>{counts.all}</strong><span>Total</span></button>
   <button className={filter==="pending"?"doc-summary active":"doc-summary"} onClick={()=>setFilter("pending")}><strong>{counts.pending}</strong><span>Pendentes</span></button>
   <button className={filter==="uploaded"?"doc-summary active":"doc-summary"} onClick={()=>setFilter("uploaded")}><strong>{counts.uploaded}</strong><span>Para validar</span></button>
   <button className={filter==="approved"?"doc-summary active":"doc-summary"} onClick={()=>setFilter("approved")}><strong>{counts.approved}</strong><span>Aprovados</span></button>
   <button className={filter==="rejected"?"doc-summary active":"doc-summary"} onClick={()=>setFilter("rejected")}><strong>{counts.rejected}</strong><span>Reprovados</span></button>
  </section>
  {open&&<form className="panel data-form" onSubmit={save}>
   <div className="panel-heading"><div><span className="eyebrow">NOVO DOCUMENTO</span><h3>Adicionar exigência</h3></div></div>
   <div className="form-grid">
    <label>Processo<select value={form.process_id} onChange={e=>setForm({...form,process_id:e.target.value})}><option value="">Selecionar processo</option>{processes.map(p=><option key={p.id} value={p.id}>{processLabel(p.id)}</option>)}</select></label>
    <label>Tipo<select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}>{labels.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>Nome do documento<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Documento do proprietário"/></label>
    <label className="checkbox-field"><input type="checkbox" checked={form.required} onChange={e=>setForm({...form,required:e.target.checked})}/> Documento obrigatório</label>
   </div>
   <label className="full-field">Observações<textarea className="settings-textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Orientações para o cliente ou equipe"/></label>
   {error&&<p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving?"Salvando...":"Adicionar documento"}</button></div>
  </form>}
  {!open&&error&&<p className="form-error">{error}</p>}
  <section className="panel">
   <div className="panel-heading"><div><span className="eyebrow">ACERVO</span><h3>Documentos dos processos</h3></div><span className="muted">{visible.length} de {docs.length}</span></div>
   <div className="doc-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar documento ou processo..."/><span>PDF, JPG ou PNG • até 10 MB</span></div>
   {visible.length===0?<div className="empty-inline">Nenhum documento encontrado para este filtro.</div>:<div className="document-list">{visible.map(d=><article className="document-card" key={d.id}>
    <div className="document-main"><div className="document-icon">DOC</div><div className="document-info"><div className="document-title"><strong>{d.name}</strong><span className={"doc-status "+(statusClass[d.status]||"doc-status-pending")}>{statusLabel[d.status]||d.status}</span></div><small>{processLabel(d.process_id)} • {d.required?"Obrigatório":"Opcional"}</small>{d.file_name&&<small className="document-file">📎 {d.file_name} {formatSize(d.file_size)? "• "+formatSize(d.file_size):""}</small>}{d.rejection_reason&&<small className="document-rejection">Motivo: {d.rejection_reason}</small>}</div></div>
    <div className="document-actions">{d.storage_path&&<button className="secondary-button" onClick={()=>void openFile(d)}>Visualizar</button>}<label className="secondary-button file-button">{uploading===d.id?"Enviando...":d.storage_path?"Substituir arquivo":"Enviar arquivo"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={uploading===d.id} onChange={e=>void handleFile(e,d)}/></label>{d.storage_path&&d.status==="uploaded"&&<><button className="approve-button" onClick={()=>void setStatus(d,"approved")}>Aprovar</button><button className="reject-button" onClick={()=>void setStatus(d,"rejected")}>Reprovar</button></>}{d.status==="rejected"&&d.storage_path&&<button className="approve-button" onClick={()=>void setStatus(d,"approved")}>Aprovar novamente</button>}</div>
   </article>)}</div>}
  </section>
 </div>
}