import {useEffect,useState} from "react";
import {useAuth} from "../../context/AuthContext";
import {supabase} from "../../lib/supabase";

type SiteSettings={system_name:string;system_subtitle:string;dashboard_title:string;dashboard_description:string;hero_status:string;hero_card_title:string;hero_card_description:string};

const defaults:SiteSettings={system_name:"DESP FAST",system_subtitle:"GESTÃO PARA DESPACHANTES",dashboard_title:"Seu escritório organizado em um só lugar.",dashboard_description:"Tenha uma visão clara da operação e concentre clientes, veículos, processos, documentos, consultas e atendimentos em um único ambiente.",hero_status:"CENTRAL DE OPERAÇÃO",hero_card_title:"Estrutura pronta para a operação",hero_card_description:"Os módulos estão organizados para receber os dados reais do escritório com segurança e isolamento por empresa."};

export function SettingsPage(){
  const{user,isSiteAdmin}=useAuth();
  const[settings,setSettings]=useState<SiteSettings>(defaults);
  const[tenantId,setTenantId]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[msg,setMsg]=useState("");
  useEffect(()=>{async function load(){if(!supabase||!user||!isSiteAdmin){setLoading(false);return;}const{data:m}=await supabase.from("memberships").select("tenant_id").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();if(!m?.tenant_id){setLoading(false);return;}setTenantId(m.tenant_id);const{data}=await supabase.from("site_settings").select("settings").eq("tenant_id",m.tenant_id).maybeSingle();if(data?.settings)setSettings({...defaults,...data.settings});setLoading(false);}void load();},[user,isSiteAdmin]);
  function update(key:keyof SiteSettings,value:string){setSettings(s=>({...s,[key]:value}));}
  async function save(){if(!supabase||!tenantId||!isSiteAdmin)return;setSaving(true);setMsg("");const{error}=await supabase.from("site_settings").upsert({tenant_id:tenantId,settings}, {onConflict:"tenant_id"});setMsg(error?error.message:"Configurações salvas com sucesso.");setSaving(false);}
  if(!isSiteAdmin)return <div className="panel empty-state"><div className="empty-icon">🔒</div><h3>Acesso restrito</h3><p>As configurações do site estão disponíveis somente para o administrador autorizado.</p></div>;
  if(loading)return <div className="panel empty-state"><div className="spinner"/><p>Carregando configurações...</p></div>;
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">ADMINISTRAÇÃO EXCLUSIVA</span><h1>Configurações do site</h1><p>Personalize os textos principais do DESP FAST. Este painel é exclusivo da conta administradora autorizada.</p></div><button className="primary-button" onClick={()=>void save()} disabled={saving}>{saving?"Salvando...":"Salvar alterações"}</button></section>
    {msg&&<div className={msg.includes("sucesso")?"form-message success":"form-message"}>{msg}</div>}
    <div className="settings-grid">
      <article className="panel settings-section"><h3>Identidade do sistema</h3><label>Nome do sistema<input value={settings.system_name} onChange={e=>update("system_name",e.target.value)}/></label><label>Subtítulo<input value={settings.system_subtitle} onChange={e=>update("system_subtitle",e.target.value)}/></label></article>
      <article className="panel settings-section"><h3>Tela inicial</h3><label>Título principal<input value={settings.dashboard_title} onChange={e=>update("dashboard_title",e.target.value)}/></label><label>Descrição principal<textarea className="settings-textarea" value={settings.dashboard_description} onChange={e=>update("dashboard_description",e.target.value)}/></label></article>
      <article className="panel settings-section"><h3>Card de apresentação</h3><label>Etiqueta<input value={settings.hero_status} onChange={e=>update("hero_status",e.target.value)}/></label><label>Título do card<input value={settings.hero_card_title} onChange={e=>update("hero_card_title",e.target.value)}/></label><label>Descrição do card<textarea className="settings-textarea" value={settings.hero_card_description} onChange={e=>update("hero_card_description",e.target.value)}/></label></article>
      <article className="panel settings-section"><h3>Controle de acesso</h3><p className="muted">Administrador autorizado:</p><strong>{user?.email}</strong><p className="muted">Usuários comuns não recebem o botão e não podem acessar esta rota pelo CRM. Os dados desta configuração também possuem RLS no Supabase.</p></article>
    </div></div>;
}