import { authSession } from '@/features/auth/authSession';
import type {ApiProblem,Departure,FilterOptions,MarkReadyResponse,ShortfallContext,ShortfallResponse,StopItems,TodayLoadsResponse,TripDetail} from './types';
const base='/api/loading';
async function request<T>(path:string,init?:RequestInit):Promise<T>{const session=authSession.get();const headers=new Headers(init?.headers);if(!(init?.body instanceof FormData)){headers.set('Content-Type','application/json');}if(session?.accessToken){headers.set('Authorization',`Bearer ${session.accessToken}`);}const response=await fetch(`${base}${path}`,{credentials:'include',...init,headers});if(!response.ok){let body:any={};try{body=await response.json()}catch{}throw {status:response.status,code:body.code||`HTTP_${response.status}`,message:body.message||body.error||'Request failed',details:body} satisfies ApiProblem;}return response.status===204?undefined as T:response.json();}
export const loadingApi={
 trips:(params:URLSearchParams)=>request<TodayLoadsResponse>(`/trips?${params}`),filters:()=>request<FilterOptions>('/trips/filter-options'),trip:(id:string)=>request<TripDetail>(`/trips/${id}`),
 start:(trip:string,stop:string)=>request(`/trips/${trip}/stops/${stop}/start`,{method:'POST'}),items:(trip:string,stop:string)=>request<StopItems>(`/trips/${trip}/stops/${stop}/items`),check:(item:string,checked:boolean)=>request(`/items/${item}/check`,{method:'PUT',body:JSON.stringify({checked})}),confirm:(trip:string,stop:string)=>request(`/trips/${trip}/stops/${stop}/confirm`,{method:'POST'}),
 shortfallContext:(trip:string,stop:string)=>request<ShortfallContext>(`/trips/${trip}/shortfall-context?stopId=${encodeURIComponent(stop)}`),shortfall:(trip:string,data:FormData)=>request<ShortfallResponse>(`/trips/${trip}/shortfalls`,{method:'POST',body:data}),
 departure:(trip:string)=>request<Departure>(`/trips/${trip}/departure`),markReady:(trip:string)=>request<MarkReadyResponse>(`/trips/${trip}/mark-ready`,{method:'POST'}),
 latestChange:(trip:string)=>request<any>(`/trips/${trip}/plan-changes/latest`),ackChange:(trip:string,revision:number)=>request(`/trips/${trip}/plan-changes/${revision}/acknowledge`,{method:'POST'})
};
