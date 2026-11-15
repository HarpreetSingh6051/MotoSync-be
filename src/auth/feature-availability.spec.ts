import { AdminGuard } from './admin.guard';
describe('Feature availability enforcement',()=>{
 const context={getClass:()=>({name:'RidesController'}),getHandler:()=>({name:'findAll'}),switchToHttp:()=>({getRequest:()=>({method:'GET'})})} as any;
 function guard(status:string,error:any=null){return new AdminGuard({getClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{service_status:status,maintenance_message:'Back shortly'},error})})})})})} as any)}
 it('permits enabled features',async()=>expect(await guard('enabled').canActivate(context)).toBe(true));
 it('returns maintenance information',async()=>await expect(guard('maintenance').canActivate(context)).rejects.toThrow('Back shortly'));
 it('rejects disabled features',async()=>await expect(guard('disabled').canActivate(context)).rejects.toThrow('disabled'));
 it('fails closed when the availability table is unavailable',async()=>await expect(guard('enabled',{code:'42703'}).canActivate(context)).rejects.toThrow('migration 008'));
});
