import {useState,type FormEvent} from "react";
import {supabase} from "../../lib/supabase";
import {useAuth} from "../../context/AuthContext";

export function OnboardingPage(){
  const {user}=useAuth();
  const [name,setName]=useState("");
  const [document,setDocument]=useState("");
  const [phone,setPhone]=useState("");
  const [city,setCity]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!supabase||!user)return;
    setBusy(true);setError("");
    const {error:profileError}=await supabase.from("profiles").upsert({id:user.id,full_name:user.user_metadata?.full_name??null});
    if(profileError){setError(profileError.message);setBusy(false);return;}
    const {data:tenant,error:tenantError}=await supabase.from("tenants").insert({
      name:name.trim(),document:document.trim()||null,phone:phone.trim()||null,
      email:user.email??null,city:city.trim()||null,state:"MG",created_by:user.id
    }).select().single();
    if(tenantError||!tenant){setError(tenantError?.message??"Não foi possível criar o escritório.");setBusy(false);return;}
    const {error:memberError}=await supabase.from("memberships").insert({
      tenant_id:tenant.id,user_id:user.id,role:"owner",active:true
    });
    if(memberError){
      await supabase.from("tenants").delete().eq("id",tenant.id);
      setError(memberError.message);setBusy(false);return;
    }
    window.location.hash="/dashboard";window.location.reload();
  }

  return <main className="auth-page"><section className="auth-card onboarding-card">
    <div className="brand-mark large">CD</div>
    <p className="eyebrow">CONFIGURAÇÃO INICIAL</p>
    <h1>Configure seu escritório</h1>
    <p className="muted">Essas informações identificam o seu escritório dentro do CRM. Você poderá atualizar os dados e adicionar usuários depois.</p>
    <form onSubmit={submit} className="form-stack">
      <label>Nome do escritório<input value={name} onChange={e=>setName(e.target.value)} placeholder="Despachante Exemplo" required/></label>
      <label>CPF/CNPJ<input value={document} onChange={e=>setDocument(e.target.value)} placeholder="00.000.000/0001-00"/></label>
      <label>Telefone / WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(31) 00000-0000"/></label>
      <label>Cidade<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ouro Branco"/></label>
      {error&&<div className="form-message">{error}</div>}
      <button className="primary-button" disabled={busy}>{busy?"Criando ambiente...":"Continuar para o CRM"}</button>
    </form>
  </section></main>
}