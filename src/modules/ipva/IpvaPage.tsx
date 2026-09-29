export function IpvaPage(){
 return <div className="page-stack">
  <section className="page-intro">
   <div><span className="eyebrow">MINAS GERAIS</span><h1>IPVA / SEF-MG</h1><p>Consulte o IPVA diretamente no portal oficial e mantenha o módulo preparado para histórico e integrações futuras.</p></div>
  </section>

  <div className="search-card ipva-official-card">
   <div>
    <span className="eyebrow">CONSULTA OFICIAL</span>
    <h3>IPVA Digital — Secretaria de Estado de Fazenda de Minas Gerais</h3>
    <p>A consulta oficial é realizada no portal da SEF/MG. O Desp Fast abre o endereço oficial em uma nova aba para você continuar o atendimento.</p>
   </div>
   <button className="primary-button" onClick={()=>window.open("https://veiculosmg.fazenda.mg.gov.br/","_blank","noopener,noreferrer")}>🔗 Abrir SEF/MG</button>
  </div>

  <div className="panel process-note">
   <strong>Consulta externa</strong>
   <p>O portal oficial pode solicitar os dados e autenticações exigidos pela SEF/MG. O CRM não contorna CAPTCHA, login ou outras proteções de acesso.</p>
  </div>
 </div>
}