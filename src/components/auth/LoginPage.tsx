import {useState,type FormEvent} from "react";
import {isSupabaseConfigured} from "../../lib/supabase";
import {useAuth} from "../../context/AuthContext";

function friendlyAuthError(message:string){
  const m=message.toLowerCase();
  if(m.includes("rate limit")||m.includes("email rate limit"))
    return "O serviço de e-mail atingiu o limite temporário de envio. Não clique novamente várias vezes. Aguarde alguns minutos e tente de novo. Se a conta já tiver sido criada, use “Já tenho uma conta” para entrar.";
  if(m.includes("already registered")||m.includes("already been registered"))
    return "Este e-mail já possui uma conta. Use “Já tenho uma conta” para entrar.";
  if(m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  return message;
}

export function LoginPage(){
  const{signIn,signUp,enterDemo}=useAuth();
  const[mode,setMode]=useState<"login"|"signup">("login");
  const[name,setName]=useState("");const[email,setEmail]=useState("");const[password,setPassword]=useState("");
  const[msg,setMsg]=useState("");const[busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;
    setBusy(true);setMsg("");
    const r=mode==="login"?await signIn(email.trim(),password):await signUp(email.trim(),password,name.trim());
    setMsg(r.error?friendlyAuthError(r.error):(mode==="login"?"Login realizado.":"Conta criada. Se a confirmação de e-mail estiver ativa, confira sua caixa de entrada antes de entrar."));
    setBusy(false);
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="brand-lockup"><div className="brand-mark large">DF</div><div><p className="eyebrow">DESP FAST</p><span className="brand-subtitle">GESTÃO PARA DESPACHANTES</span></div></div>
      <h1>{mode==="login"?"Acesse seu escritório":"Crie sua conta"}</h1>
      <p className="muted">{mode==="login"?"Centralize clientes, veículos, processos, documentos e atendimentos em um único ambiente.":"Crie seu acesso e organize a operação do escritório em um só lugar."}</p>
      <form onSubmit={submit} className="form-stack">
        {mode==="signup"&&<label>Nome do responsável<input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome completo" required/></label>}
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email" required/></label>
        <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete={mode==="login"?"current-password":"new-password"} minLength={6} required/></label>
        {msg&&<div className={msg.toLowerCase().includes("criada")||msg.toLowerCase().includes("realizado")?"form-message success":"form-message"}>{msg}</div>}
        <button className="primary-button" disabled={busy}>{busy?(mode==="login"?"Entrando...":"Criando conta..."):mode==="login"?"Entrar no CRM":"Criar conta"}</button>
      </form>
      {!isSupabaseConfigured&&<button className="secondary-button full" onClick={enterDemo}>Entrar em modo demonstração</button>}
      <button className="link-button" onClick={()=>{setMsg("");setMode(mode==="login"?"signup":"login")}}>{mode==="login"?"Ainda não tenho uma conta":"Já tenho uma conta"}</button>
    </section>
  </main>
}