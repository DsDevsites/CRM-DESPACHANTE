# CRM Despachante

Base inicial de um CRM SaaS multiempresa para despachantes de veículos.

## Stack
- React + TypeScript + Vite
- Supabase Auth + PostgreSQL + RLS
- Cloudflare Pages para hospedagem do frontend
- Edge/server functions reservadas para integrações que exigem segredo

## Módulos da base
Dashboard, Clientes, Veículos, Consultas, IPVA / SEFAZ-MG, Processos, Documentos, Agenda e Configurações.

## Segurança
Todas as entidades de negócio usam tenant_id. O isolamento entre despachantes deve ser garantido no PostgreSQL por RLS, não apenas pelo frontend.

Nunca coloque chaves secretas/service role no navegador.

## Desenvolvimento
npm install
cp .env.example .env.local
npm run dev

Variáveis:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## Cloudflare Pages
Build: npm run build
Output: dist
