import { apiRequest } from '@/shared/api/apiClient';
import type {ApiProblem,Departure,FilterOptions,MarkReadyResponse,ShortfallContext,ShortfallDetail,ShortfallResponse,StopItems,TodayLoadsResponse,TripDetail} from './types';
const base='/api/loading';
async function request<T>(path:string,init?:RequestInit):Promise<T>{try{return await apiRequest<T>(`${base}${path}`,init)}catch(error){throw {status:typeof error==='object'&&error&&'status' in error?Number((error as {status?:number}).status):0,code:'LOADING_REQUEST_FAILED',message:error instanceof Error?error.message:'Loading Service request failed',details:error} satisfies ApiProblem;}}
export const loadingApi={
 trips:(params:URLSearchParams)=>request<TodayLoadsResponse>(`/trips?${params}`),filters:()=>request<FilterOptions>('/trips/filter-options'),trip:(id:string)=>request<TripDetail>(`/trips/${id}`),
 start:(trip:string,stop:string)=>request(`/trips/${trip}/stops/${stop}/start`,{method:'POST'}),items:(trip:string,stop:string)=>request<StopItems>(`/trips/${trip}/stops/${stop}/items`),check:(item:string,checked:boolean)=>request(`/items/${item}/check`,{method:'PUT',body:JSON.stringify({checked})}),confirm:(trip:string,stop:string)=>request(`/trips/${trip}/stops/${stop}/confirm`,{method:'POST'}),
 shortfallContext:(trip:string,stop:string)=>request<ShortfallContext>(`/trips/${trip}/shortfall-context?stopId=${encodeURIComponent(stop)}`),shortfall:(trip:string,data:FormData)=>request<ShortfallResponse>(`/trips/${trip}/shortfalls`,{method:'POST',body:data}),
 departure:(trip:string)=>request<Departure>(`/trips/${trip}/departure`),markReady:(trip:string)=>request<MarkReadyResponse>(`/trips/${trip}/mark-ready`,{method:'POST'}),
 latestChange:(trip:string)=>request<any>(`/trips/${trip}/plan-changes/latest`),ackChange:(trip:string,revision:number)=>request(`/trips/${trip}/plan-changes/${revision}/acknowledge`,{method:'POST'}),
 shortfalls:(trip:string)=>request<ShortfallDetail[]>(`/trips/${trip}/shortfalls`),
 resolveShortfall:(issueId:string,notes:string)=>request<void>(`/shortfalls/${issueId}/resolve`,{method:'POST',body:JSON.stringify({notes})})
};
