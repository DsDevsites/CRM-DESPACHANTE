import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from "react";
import type {Session,User} from "@supabase/supabase-js";
import {isSupabaseConfigured,supabase} from "../lib/supabase";

interface AuthValue{session:Session|null;user:User|null;loading:boolean;demoMode:boolean;hasTenant:boolean;tenantLoading:boolean;isSiteAdmin:boolean;signIn:(e:string,p:string)=>Promise<{error:string|null}>;signUp:(e:string,p:string,n:string)=>Promise<{error:string|null}>;signOut:()=>Promise<void>;enterDemo:()=>void}
const C=createContext<AuthValue|undefined>(undefined);

const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

async function loadTenant(client:NonNullable<typeof supabase>,userId:string){
  try{
    const result=await Promise.race([
      client.from("memberships").select("id").eq("user_id",userId).eq("active",true).limit(1),
      wait(8000).then(()=>null)
    ]);
    return Boolean(result && "data" in result && result.data?.length);
  }catch{return false}
}

export function AuthProvider({children}:{children:ReactNode}){
  const[session,setSession]=useState<Session|null>(null);
  const[user,setUser]=useState<User|null>(null);
  const isSiteAdmin=Boolean(user?.email&&user.email.toLowerCase()==="vitordisanzio71@gmail.com");
  const[loading,setLoading]=useState(isSupabaseConfigured);
  const[demoMode,setDemo]=useState(false);
  const[hasTenant,setHasTenant]=useState(false);
  const[tenantLoading,setTenantLoading]=useState(true);

  useEffect(()=>{
    if(!supabase){
      setLoading(false);setTenantLoading(false);return;
    }
    const client=supabase;
    let alive=true;

    async function hydrate(nextSession:Session|null){
      if(!alive)return;
      setSession(nextSession);setUser(nextSession?.user??null);
      if(!nextSession){
        setHasTenant(false);setTenantLoading(false);setLoading(false);return;
      }
      setTenantLoading(true);
      const tenant=await loadTenant(client,nextSession.user.id);
      if(!alive)return;
      setHasTenant(tenant);
      setTenantLoading(false);
      setLoading(false);
    }

    const fallback=setTimeout(()=>{
      if(!alive)return;
      setLoading(false);
      setTenantLoading(false);
    },10000);

    void client.auth.getSession()
      .then(({data})=>{void hydrate(data.session??null);})
      .catch(()=>{if(alive){setLoading(false);setTenantLoading(false);}});

    const{data}=client.auth.onAuthStateChange((_event,nextSession)=>{
      // Não consultar o banco diretamente dentro do callback do Supabase Auth.
      // Isso evita deadlock no iOS/Safari e em alguns fluxos de refresh de sessão.
      setTimeout(()=>{void hydrate(nextSession);},0);
    });

    return()=>{
      alive=false;
      clearTimeout(fallback);
      data.subscription.unsubscribe();
    };
  },[]);

  const value=useMemo<AuthValue>(()=>({
    session,user,loading,demoMode,hasTenant,tenantLoading,isSiteAdmin,
    async signIn(e,p){
      if(!supabase)return{error:"Supabase ainda não foi configurado."};
      const{error}=await supabase.auth.signInWithPassword({email:e,password:p});
      return{error:error?.message??null};
    },
    async signUp(e,p,n){
      if(!supabase)return{error:"Supabase ainda não foi configurado."};
      const{error}=await supabase.auth.signUp({email:e,password:p,options:{data:{full_name:n},emailRedirectTo:`${window.location.origin}/`}});
      return{error:error?.message??null};
    },
    async signOut(){
      if(supabase)await supabase.auth.signOut();
      setDemo(false);setSession(null);setUser(null);setHasTenant(false);setTenantLoading(false);
    },
    enterDemo(){setDemo(true);}
  }),[session,user,loading,demoMode,hasTenant,tenantLoading,isSiteAdmin]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAuth(){const c=useContext(C);if(!c)throw new Error("useAuth deve ser usado dentro de AuthProvider");return c}