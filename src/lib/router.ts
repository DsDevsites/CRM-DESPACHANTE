import {useEffect,useState} from "react";
export type AppRoute="dashboard"|"clientes"|"veiculos"|"consultas"|"ipva"|"processos"|"documentos"|"agenda"|"configuracoes";
const routes:AppRoute[]=["dashboard","clientes","veiculos","consultas","ipva","processos","documentos","agenda","configuracoes"];
function current():AppRoute{const r=window.location.hash.replace("#/","").split("/")[0] as AppRoute;return routes.includes(r)?r:"dashboard"}
export function navigate(route:AppRoute){window.location.hash="/"+route}
export function useAppRoute(){const[r,setR]=useState<AppRoute>(current);useEffect(()=>{const f=()=>setR(current());window.addEventListener("hashchange",f);return()=>window.removeEventListener("hashchange",f)},[]);return r}