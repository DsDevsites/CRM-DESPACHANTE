import {useEffect,useState} from "react";
import {useAuth} from "../../context/AuthContext";
import {supabase} from "../../lib/supabase";

type SiteSettings={system_name:string;system_subtitle:string;dashboard_title:string;dashboard_description:string;hero_status:string;hero_card_title:string;hero_card_description:string;logo_url:string};
const defaults:SiteSettings={system_name:"DESP FAST",system_subtitle:"GESTÃO PARA DESPACHANTES",dashboard_title:"Seu escritório organizado em um só lugar.",dashboard_description:"Tenha uma visão clara da operação e concentre clientes, veículos, processos, documentos, consultas e atendimentos em um único ambiente.",hero_status:"CENTRAL DE OPERAÇÃO",hero_card_title:"Estrutura pronta para a operação",hero_card_description:"Os módulos estão organizados para receber os dados reais do escritório com segurança e isolamento por empresa.",logo_url:""};

export function SettingsPage(){
  const{user,isSiteAdmin}=useAuth();
  const[settings,setSettings]=useState<SiteSettings>(defaults);
  const[tenantId,setTenantId]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[msg,setMsg]=useState("");

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      if(!supabase||!user||!isSiteAdmin){if(!cancelled)setLoading(false);return;}
      setLoading(true);setMsg("");
      try{
        const membership=await Promise.race([
          supabase.from("memberships").select("tenant_id").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle(),
          new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Tempo limite ao carregar o escritório.")),10000))
        ]);
        if(cancelled)return;
        if(membership.error)throw membership.error;
        const tenant=membership.data?.tenant_id;
        if(!tenant){setMsg("Sua conta ainda não está vinculada a um escritório.");setLoading(false);return;}
        setTenantId(tenant);
        const result=await Promise.race([
          supabase.from("site_settings").select("settings").eq("tenant_id",tenant).maybeSingle(),
          new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Tempo limite ao carregar as configurações.")),10000))
        ]);
        if(cancelled)return;
        if(result.error)throw result.error;
        if(result.data?.settings)setSettings({...defaults,...result.data.settings});
      }catch(error){
        if(!cancelled)setMsg(error instanceof Error?error.message:"Não foi possível carregar as configurações.");
      }finally{
        if(!cancelled)setLoading(false);
      }
    }
    void load();
    return()=>{cancelled=true};
  },[user,isSiteAdmin]);

  function update(key:keyof SiteSettings,value:string){setSettings(s=>({...s,[key]:value}));}

  async function uploadLogo(file:File|null){
    if(!file||!supabase||!tenantId||!isSiteAdmin)return;
    setMsg("");
    if(!["image/png","image/jpeg","image/webp","image/svg+xml"].includes(file.type)){setMsg("Use uma imagem PNG, JPG, WEBP ou SVG.");return;}
    if(file.size>3*1024*1024){setMsg("A logo deve ter no máximo 3 MB.");return;}
    setUploading(true);
    try{
      const ext=file.name.split(".").pop()?.toLowerCase()||"png";
      const path=tenantId+"/logo-"+Date.now()+"."+ext;
      const{error}=await supabase.storage.from("site-assets").upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
      if(error)throw error;
      const{data}=supabase.storage.from("site-assets").getPublicUrl(path);
      setSettings(s=>({...s,logo_url:data.publicUrl}));
      setMsg("Logo carregada. Clique em “Salvar alterações” para aplicar no site.");
    }catch(error){setMsg(error instanceof Error?error.message:"Não foi possível enviar a logo.");}
    finally{setUploading(false);}
  }

  async function save(){
    if(!supabase||!tenantId||!isSiteAdmin)return;
    setSaving(true);setMsg("");
    const{error}=await supabase.from("site_settings").upsert({tenant_id:tenantId,settings},{onConflict:"tenant_id"});
    setMsg(error?error.message:"Configurações salvas com sucesso.");
    setSaving(false);
  }

  if(!isSiteAdmin)return <div className="panel empty-state"><div className="empty-icon">🔒</div><h3>Acesso restrito</h3><p>As configurações do site estão disponíveis somente para o administrador autorizado.</p></div>;
  if(loading)return <div className="panel settings-loading"><div className="spinner"/><h3>Carregando configurações...</h3><p className="muted">Conectando ao escritório com segurança.</p></div>;

  return <div className="page-stack">
    <section className="page-intro"><div><span className="eyebrow">ADMINISTRAÇÃO EXCLUSIVA</span><h1>Configurações do site</h1><p>Personalize identidade, textos e a logo do DESP FAST.</p></div><button className="primary-button" onClick={()=>void save()} disabled={saving||uploading}>{saving?"Salvando...":"Salvar alterações"}</button></section>
    {msg&&<div className={msg.includes("sucesso")||msg.includes("carregada")?"form-message success":"form-message"}>{msg}</div>}
    <div className="settings-grid">
      <article className="panel settings-section"><h3>Identidade do sistema</h3><label>Nome do sistema<input value={settings.system_name} onChange={e=>update("system_name",e.target.value)}/></label><label>Subtítulo<input value={settings.system_subtitle} onChange={e=>update("system_subtitle",e.target.value)}/></label></article>
      <article className="panel settings-section"><h3>Logo do sistema</h3><p className="muted">Envie a logo oficial para usar no CRM. PNG transparente ou SVG são recomendados.</p><label className="logo-upload"><span>{uploading?"Enviando logo...":"Selecionar imagem"}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>void uploadLogo(e.target.files?.[0]||null)} disabled={uploading}/></label>{settings.logo_url?<div className="logo-preview"><img src={settings.logo_url} alt="Logo do DESP FAST"/><button type="button" className="secondary-button compact" onClick={()=>update("logo_url","")}>Remover logo</button></div>:<div className="logo-placeholder">Nenhuma logo personalizada enviada.</div>}</article>
      <article className="panel settings-section"><h3>Tela inicial</h3><label>Título principal<input value={settings.dashboard_title} onChange={e=>update("dashboard_title",e.target.value)}/></label><label>Descrição principal<textarea className="settings-textarea" value={settings.dashboard_description} onChange={e=>update("dashboard_description",e.target.value)}/></label></article>
      <article className="panel settings-section"><h3>Card de apresentação</h3><label>Etiqueta<input value={settings.hero_status} onChange={e=>update("hero_status",e.target.value)}/></label><label>Título do card<input value={settings.hero_card_title} onChange={e=>update("hero_card_title",e.target.value)}/></label><label>Descrição do card<textarea className="settings-textarea" value={settings.hero_card_description} onChange={e=>update("hero_card_description",e.target.value)}/></label></article>
      <article className="panel settings-section"><h3>Controle de acesso</h3><p className="muted">Administrador autorizado:</p><strong>{user?.email}</strong><p className="muted">Usuários comuns não recebem o botão e não podem acessar esta rota.</p></article>
    </div>
  </div>;
}