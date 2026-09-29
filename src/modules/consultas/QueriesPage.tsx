import {useState} from "react";
import {navigate} from "../../lib/router";

export function QueriesPage(){
 const[plate,setPlate]=useState("");
 const[message,setMessage]=useState("");
 const normalized=plate.replace(/[^a-zA-Z0-9]/g,"").toUpperCase();

 function handlePlateSearch(e:React.FormEvent){
  e.preventDefault();
  setMessage("");
  if(normalized.length<7){
   setMessage("Informe uma placa válida para iniciar a consulta.");
   return;
  }
  setMessage("A tela está pronta para a integração com a API de consulta veicular. A consulta será externa ao CRM e não ficará limitada aos veículos cadastrados.");
 }

 return <div className="page-stack">
  <section className="page-intro">
   <div>
    <span className="eyebrow">CENTRAL DE PESQUISA</span>
    <h1>Consultas</h1>
    <p>Concentre as consultas do escritório em um único ponto, sem limitar a pesquisa aos dados já cadastrados no CRM.</p>
   </div>
  </section>

  <div className="dashboard-grid">
   <article className="panel query-panel">
    <div className="panel-heading">
     <div>
      <span className="eyebrow">VEÍCULOS</span>
      <h3>Consulta por placa</h3>
     </div>
     <span className="query-badge">EXTERNA</span>
    </div>
    <p className="muted">Pesquise qualquer placa, mesmo que o veículo ainda não esteja cadastrado no Desp Fast. Depois da consulta, o resultado poderá ser cadastrado no CRM.</p>
    <form className="query-form" onSubmit={handlePlateSearch}>
     <label>Placa
      <input value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={8} autoCapitalize="characters" />
     </label>
     <button className="primary-button" type="submit">🔍 Consultar placa</button>
    </form>
    {message&&<div className="query-message">{message}</div>}
    <div className="query-flow">
     <span>1. Digite a placa</span><i>→</i><span>2. Consulte fonte externa</span><i>→</i><span>3. Cadastre se quiser</span>
    </div>
   </article>

   <article className="panel query-panel">
    <div className="panel-heading">
     <div>
      <span className="eyebrow">MINAS GERAIS</span>
      <h3>IPVA / SEF-MG</h3>
     </div>
     <span className="query-badge">OFICIAL</span>
    </div>
    <p className="muted">Acesse diretamente o portal oficial da Secretaria de Estado de Fazenda de Minas Gerais para realizar a consulta de IPVA.</p>
    <button className="primary-button" onClick={()=>window.open("https://veiculosmg.fazenda.mg.gov.br/","_blank","noopener,noreferrer")}>🔗 Abrir consulta SEF/MG</button>
    <button className="secondary-button query-secondary" onClick={()=>navigate("ipva")}>Ver módulo de IPVA →</button>
   </article>
  </div>

  <div className="panel process-note">
   <strong>Como a consulta por placa vai funcionar</strong>
   <p>A pesquisa será independente da carteira de veículos do CRM. Para trazer dados reais, precisamos conectar uma API veicular oficial ou autorizada e manter a credencial no backend/Cloudflare, nunca no navegador.</p>
  </div>
 </div>
}